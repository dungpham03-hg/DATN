const express = require('express');
const { body, validationResult } = require('express-validator');
const FollowUp = require('../models/FollowUp');
const Meeting = require('../models/Meeting');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/**
 * @route   GET /api/followups
 * @desc    Lấy danh sách follow-ups với filter
 * @access  Private
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const {
      status,
      priority,
      assignee,
      meeting,
      overdue,
      dueSoon,
      page = 1,
      limit = 20
    } = req.query;
    
    // Build query
    const query = {};
    
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (assignee) query.assignee = assignee;
    if (meeting) query.meeting = meeting;
    
    // Filter by overdue
    if (overdue === 'true') {
      query.status = { $nin: ['completed', 'cancelled'] };
      query.dueDate = { $lt: new Date() };
    }
    
    // Filter by due soon (next 3 days)
    if (dueSoon === 'true') {
      const now = new Date();
      const future = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      query.status = { $nin: ['completed', 'cancelled'] };
      query.dueDate = { $gte: now, $lte: future };
    }
    
    // Permission check: user can only see their own tasks or tasks they created
    if (req.user.role !== 'admin') {
      query.$or = [
        { assignee: req.user._id },
        { createdBy: req.user._id }
      ];
    }
    
    const followUps = await FollowUp.find(query)
      .populate('assignee', 'fullName email avatar position department')
      .populate('createdBy', 'fullName email avatar')
      .populate('meeting', 'title startTime')
      .populate('escalation.escalateTo', 'fullName email')
      .sort({ dueDate: 1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    
    const total = await FollowUp.countDocuments(query);
    
    res.json({
      followUps,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
    
  } catch (error) {
    console.error('Error fetching follow-ups:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

/**
 * @route   GET /api/followups/my-tasks
 * @desc    Lấy tasks của user hiện tại
 * @access  Private
 */
router.get('/my-tasks', authenticateToken, async (req, res) => {
  try {
    const { status } = req.query;
    
    const query = { assignee: req.user._id };
    if (status && status !== 'all') {
      query.status = status;
    }
    
    const tasks = await FollowUp.find(query)
      .populate('createdBy', 'fullName email avatar')
      .populate('meeting', 'title startTime')
      .sort({ dueDate: 1 });
    
    // Group by status
    const grouped = {
      notStarted: tasks.filter(t => t.status === 'not_started'),
      inProgress: tasks.filter(t => t.status === 'in_progress'),
      blocked: tasks.filter(t => t.status === 'blocked'),
      completed: tasks.filter(t => t.status === 'completed'),
      overdue: tasks.filter(t => t.isOverdue && t.status !== 'completed')
    };
    
    res.json({ tasks, grouped });
    
  } catch (error) {
    console.error('Error fetching my tasks:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

/**
 * @route   GET /api/followups/:id
 * @desc    Lấy chi tiết follow-up
 * @access  Private
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const followUp = await FollowUp.findById(req.params.id)
      .populate('assignee', 'fullName email avatar position department')
      .populate('createdBy', 'fullName email avatar')
      .populate('meeting', 'title startTime endTime organizer attendees')
      .populate('escalation.escalateTo', 'fullName email')
      .populate('comments.user', 'fullName email avatar')
      .populate('subtasks.assignee', 'fullName email avatar')
      .populate('dependencies');
    
    if (!followUp) {
      return res.status(404).json({ message: 'Không tìm thấy follow-up' });
    }
    
    // Permission check
    if (req.user.role !== 'admin') {
      if (followUp.assignee._id.toString() !== req.user._id.toString() &&
          followUp.createdBy._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Không có quyền truy cập' });
      }
    }
    
    res.json(followUp);
    
  } catch (error) {
    console.error('Error fetching follow-up detail:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

/**
 * @route   POST /api/followups
 * @desc    Tạo follow-up mới
 * @access  Private
 */
router.post('/', authenticateToken, [
  body('meeting').notEmpty().withMessage('Meeting ID là bắt buộc'),
  body('title').trim().notEmpty().withMessage('Tiêu đề là bắt buộc')
    .isLength({ max: 200 }).withMessage('Tiêu đề không quá 200 ký tự'),
  body('assignee').notEmpty().withMessage('Người thực hiện là bắt buộc'),
  body('dueDate').isISO8601().withMessage('Ngày hạn không hợp lệ')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Dữ liệu không hợp lệ', errors: errors.array() });
    }
    
    const {
      meeting,
      title,
      description,
      assignee,
      dueDate,
      priority = 'medium',
      subtasks = [],
      escalation = {}
    } = req.body;
    
    // Check meeting exists
    const meetingDoc = await Meeting.findById(meeting);
    if (!meetingDoc) {
      return res.status(404).json({ message: 'Không tìm thấy cuộc họp' });
    }
    
    // Create follow-up
    const followUp = await FollowUp.create({
      meeting,
      title,
      description,
      assignee,
      createdBy: req.user._id,
      dueDate,
      priority,
      subtasks,
      escalation: {
        enabled: escalation.enabled || false,
        escalateTo: escalation.escalateTo,
        escalateAfterDays: escalation.escalateAfterDays || 3
      }
    });
    
    await followUp.populate([
      { path: 'assignee', select: 'fullName email avatar' },
      { path: 'createdBy', select: 'fullName email avatar' },
      { path: 'meeting', select: 'title startTime' }
    ]);
    
    // Create reminders (1 day before, 3 hours before)
    const due = new Date(dueDate);
    followUp.reminders = [
      {
        type: 'both',
        sendAt: new Date(due.getTime() - 24 * 60 * 60 * 1000), // 1 day before
        sent: false
      },
      {
        type: 'both',
        sendAt: new Date(due.getTime() - 3 * 60 * 60 * 1000), // 3 hours before
        sent: false
      }
    ];
    
    await followUp.save();
    
    console.log('✅ Created follow-up:', followUp.title);
    
    res.status(201).json({ message: 'Tạo follow-up thành công', followUp });
    
  } catch (error) {
    console.error('Error creating follow-up:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

/**
 * @route   PUT /api/followups/:id
 * @desc    Cập nhật follow-up
 * @access  Private
 */
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const followUp = await FollowUp.findById(req.params.id);
    
    if (!followUp) {
      return res.status(404).json({ message: 'Không tìm thấy follow-up' });
    }
    
    // Permission check
    if (req.user.role !== 'admin' && 
        followUp.createdBy.toString() !== req.user._id.toString() &&
        followUp.assignee.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Không có quyền cập nhật' });
    }
    
    const {
      title,
      description,
      assignee,
      dueDate,
      priority,
      status,
      progress,
      subtasks,
      escalation,
      tags
    } = req.body;
    
    // Update fields
    if (title) followUp.title = title;
    if (description !== undefined) followUp.description = description;
    if (assignee) followUp.assignee = assignee;
    if (dueDate) followUp.dueDate = dueDate;
    if (priority) followUp.priority = priority;
    if (status) {
      followUp.status = status;
      if (status === 'completed') {
        followUp.completedAt = new Date();
        followUp.timeTracking.completedAt = new Date();
      }
    }
    if (progress !== undefined) followUp.progress = progress;
    if (subtasks) followUp.subtasks = subtasks;
    if (escalation) followUp.escalation = { ...followUp.escalation, ...escalation };
    if (tags) followUp.tags = tags;
    
    await followUp.save();
    await followUp.populate([
      { path: 'assignee', select: 'fullName email avatar' },
      { path: 'createdBy', select: 'fullName email avatar' },
      { path: 'meeting', select: 'title startTime' }
    ]);
    
    res.json({ message: 'Cập nhật thành công', followUp });
    
  } catch (error) {
    console.error('Error updating follow-up:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

/**
 * @route   POST /api/followups/:id/comments
 * @desc    Thêm comment vào follow-up
 * @access  Private
 */
router.post('/:id/comments', authenticateToken, [
  body('text').trim().notEmpty().withMessage('Nội dung comment là bắt buộc')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Dữ liệu không hợp lệ', errors: errors.array() });
    }
    
    const followUp = await FollowUp.findById(req.params.id);
    
    if (!followUp) {
      return res.status(404).json({ message: 'Không tìm thấy follow-up' });
    }
    
    const { text, attachments = [] } = req.body;
    
    await followUp.addComment(req.user._id, text, attachments);
    await followUp.populate('comments.user', 'fullName email avatar');
    
    res.json({ message: 'Thêm comment thành công', comments: followUp.comments });
    
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

/**
 * @route   PUT /api/followups/:id/progress
 * @desc    Cập nhật progress
 * @access  Private
 */
router.put('/:id/progress', authenticateToken, [
  body('progress').isInt({ min: 0, max: 100 }).withMessage('Progress phải từ 0-100')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Dữ liệu không hợp lệ', errors: errors.array() });
    }
    
    const followUp = await FollowUp.findById(req.params.id);
    
    if (!followUp) {
      return res.status(404).json({ message: 'Không tìm thấy follow-up' });
    }
    
    // Only assignee can update progress
    if (followUp.assignee.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Chỉ người được giao mới có thể cập nhật tiến độ' });
    }
    
    await followUp.updateProgress(req.body.progress);
    
    res.json({ message: 'Cập nhật tiến độ thành công', followUp });
    
  } catch (error) {
    console.error('Error updating progress:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

/**
 * @route   PUT /api/followups/:id/complete
 * @desc    Đánh dấu hoàn thành
 * @access  Private
 */
router.put('/:id/complete', authenticateToken, async (req, res) => {
  try {
    const followUp = await FollowUp.findById(req.params.id);
    
    if (!followUp) {
      return res.status(404).json({ message: 'Không tìm thấy follow-up' });
    }
    
    // Only assignee or creator can mark as completed
    if (followUp.assignee.toString() !== req.user._id.toString() &&
        followUp.createdBy.toString() !== req.user._id.toString() &&
        req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Không có quyền đánh dấu hoàn thành' });
    }
    
    await followUp.complete();
    
    res.json({ message: 'Đánh dấu hoàn thành thành công', followUp });
    
  } catch (error) {
    console.error('Error completing follow-up:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

/**
 * @route   DELETE /api/followups/:id
 * @desc    Xóa follow-up
 * @access  Private
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const followUp = await FollowUp.findById(req.params.id);
    
    if (!followUp) {
      return res.status(404).json({ message: 'Không tìm thấy follow-up' });
    }
    
    // Only creator or admin can delete
    if (followUp.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Không có quyền xóa' });
    }
    
    await followUp.deleteOne();
    
    res.json({ message: 'Xóa follow-up thành công' });
    
  } catch (error) {
    console.error('Error deleting follow-up:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

/**
 * @route   GET /api/followups/stats/overview
 * @desc    Lấy thống kê overview (personal stats)
 * @access  Private
 */
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    let { meeting, scope = 'my' } = req.query;

    // Normalize scope if user không đủ quyền xem toàn bộ
    if (scope === 'all' && !['admin', 'manager'].includes(req.user.role)) {
      scope = 'accessible';
    }

    const baseQuery = {};
    if (meeting) {
      baseQuery.meeting = meeting;
    }

    const createScopedQuery = (extra = {}) => {
      const query = { ...baseQuery, ...extra };

      if (scope === 'all') {
        return query;
      }

      if (scope === 'accessible') {
        query.$or = [
          { assignee: userId },
          { createdBy: userId }
        ];
        return query;
      }

      // default: chỉ các task được giao cho người dùng
      query.assignee = userId;
      return query;
    };

    const now = new Date();
    const soon = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

    const stats = {
      total: await FollowUp.countDocuments(createScopedQuery()),
      notStarted: await FollowUp.countDocuments(createScopedQuery({ status: 'not_started' })),
      inProgress: await FollowUp.countDocuments(createScopedQuery({ status: 'in_progress' })),
      blocked: await FollowUp.countDocuments(createScopedQuery({ status: 'blocked' })),
      completed: await FollowUp.countDocuments(createScopedQuery({ status: 'completed' })),
      overdue: await FollowUp.countDocuments(createScopedQuery({
        status: { $nin: ['completed', 'cancelled'] },
        dueDate: { $lt: now }
      })),
      dueSoon: await FollowUp.countDocuments(createScopedQuery({
        status: { $nin: ['completed', 'cancelled'] },
        dueDate: { $gte: now, $lte: soon }
      }))
    };
    
    res.json(stats);
    
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

/**
 * @route   GET /api/followups/stats/report
 * @desc    Báo cáo thống kê chi tiết về Follow-ups/Tasks (Admin, Manager)
 * @access  Private (Admin, Manager)
 */
router.get('/stats/report', authenticateToken, async (req, res) => {
  try {
    // Permission check
    if (!['admin', 'manager', 'secretary'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Không có quyền xem báo cáo' });
    }

    const { from, to } = req.query;
    const match = {};
    
    if (from || to) {
      match.createdAt = {};
      if (from) match.createdAt.$gte = new Date(from);
      if (to) match.createdAt.$lte = new Date(to);
    }

    // Aggregate comprehensive statistics
    const stats = await FollowUp.aggregate([
      { $match: match },
      {
        $facet: {
          // Tổng quan
          overview: [
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                notStarted: { $sum: { $cond: [{ $eq: ['$status', 'not_started'] }, 1, 0] } },
                inProgress: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
                blocked: { $sum: { $cond: [{ $eq: ['$status', 'blocked'] }, 1, 0] } },
                completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
                cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
                avgProgress: { $avg: '$progress' },
                avgEstimatedHours: { $avg: '$timeTracking.estimatedHours' },
                avgActualHours: { $avg: '$timeTracking.actualHours' }
              }
            }
          ],
          
          // Overdue analysis
          overdueAnalysis: [
            {
              $match: {
                status: { $nin: ['completed', 'cancelled'] },
                dueDate: { $lt: new Date() }
              }
            },
            {
              $group: {
                _id: null,
                totalOverdue: { $sum: 1 },
                byPriority: {
                  $push: {
                    priority: '$priority',
                    title: '$title'
                  }
                }
              }
            }
          ],
          
          // Theo trạng thái
          byStatus: [
            { $group: { _id: '$status', count: { $sum: 1 } } },
            { $project: { _id: 0, status: '$_id', count: 1 } },
            { $sort: { count: -1 } }
          ],
          
          // Theo mức độ ưu tiên
          byPriority: [
            { $group: { _id: '$priority', count: { $sum: 1 } } },
            { $project: { _id: 0, priority: '$_id', count: 1 } },
            { $sort: { count: -1 } }
          ],
          
          // Theo người thực hiện
          byAssignee: [
            { $group: { 
              _id: '$assignee', 
              count: { $sum: 1 },
              completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
              overdue: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $ne: ['$status', 'completed'] },
                        { $ne: ['$status', 'cancelled'] },
                        { $lt: ['$dueDate', new Date()] }
                      ]
                    },
                    1,
                    0
                  ]
                }
              }
            }},
            { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
            { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
            { $project: {
              _id: 0,
              assigneeId: '$_id',
              assigneeName: '$user.fullName',
              assigneeDepartment: '$user.department',
              totalTasks: '$count',
              completedTasks: '$completed',
              overdueTasks: '$overdue',
              completionRate: {
                $cond: [
                  { $gt: ['$count', 0] },
                  { $multiply: [{ $divide: ['$completed', '$count'] }, 100] },
                  0
                ]
              }
            }},
            { $sort: { totalTasks: -1 } },
            { $limit: 15 }
          ],
          
          // Timeline theo tháng
          timelineMonthly: [
            { $group: {
              _id: {
                year: { $year: '$createdAt' },
                month: { $month: '$createdAt' }
              },
              total: { $sum: 1 },
              completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
              overdue: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $ne: ['$status', 'completed'] },
                        { $ne: ['$status', 'cancelled'] },
                        { $lt: ['$dueDate', new Date()] }
                      ]
                    },
                    1,
                    0
                  ]
                }
              }
            }},
            { $project: {
              _id: 0,
              year: '$_id.year',
              month: '$_id.month',
              total: 1,
              completed: 1,
              overdue: 1,
              completionRate: {
                $cond: [
                  { $gt: ['$total', 0] },
                  { $multiply: [{ $divide: ['$completed', '$total'] }, 100] },
                  0
                ]
              }
            }},
            { $sort: { year: 1, month: 1 } }
          ],
          
          // Phân tích completion time
          completionTimeAnalysis: [
            { $match: { status: 'completed', 'timeTracking.completedAt': { $exists: true } } },
            {
              $project: {
                completionDays: {
                  $divide: [
                    { $subtract: ['$timeTracking.completedAt', '$createdAt'] },
                    1000 * 60 * 60 * 24
                  ]
                },
                onTime: {
                  $cond: [
                    { $lte: ['$timeTracking.completedAt', '$dueDate'] },
                    1,
                    0
                  ]
                }
              }
            },
            {
              $group: {
                _id: null,
                avgCompletionDays: { $avg: '$completionDays' },
                onTimeCount: { $sum: '$onTime' },
                totalCompleted: { $sum: 1 }
              }
            }
          ],
          
          // Theo phòng ban
          byDepartment: [
            { $lookup: { from: 'users', localField: 'assignee', foreignField: '_id', as: 'assigneeUser' } },
            { $unwind: { path: '$assigneeUser', preserveNullAndEmptyArrays: true } },
            { $group: {
              _id: '$assigneeUser.department',
              total: { $sum: 1 },
              completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
              inProgress: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
              overdue: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $ne: ['$status', 'completed'] },
                        { $ne: ['$status', 'cancelled'] },
                        { $lt: ['$dueDate', new Date()] }
                      ]
                    },
                    1,
                    0
                  ]
                }
              },
              avgProgress: { $avg: '$progress' }
            }},
            { $project: {
              _id: 0,
              department: { $ifNull: ['$_id', 'Chưa phân loại'] },
              total: 1,
              completed: 1,
              inProgress: 1,
              overdue: 1,
              avgProgress: { $ifNull: ['$avgProgress', 0] },
              completionRate: {
                $cond: [
                  { $gt: ['$total', 0] },
                  { $multiply: [{ $divide: ['$completed', '$total'] }, 100] },
                  0
                ]
              }
            }},
            { $sort: { total: -1 } }
          ],
          
          // Theo meeting
          byMeeting: [
            { $match: { meeting: { $exists: true, $ne: null } } },
            { $lookup: { from: 'meetings', localField: 'meeting', foreignField: '_id', as: 'meetingDoc' } },
            { $unwind: { path: '$meetingDoc', preserveNullAndEmptyArrays: true } },
            { $group: {
              _id: '$meeting',
              meetingTitle: { $first: '$meetingDoc.title' },
              total: { $sum: 1 },
              completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } }
            }},
            { $project: {
              _id: 0,
              meetingId: '$_id',
              meetingTitle: { $ifNull: ['$meetingTitle', 'Cuộc họp không xác định'] },
              total: 1,
              completed: 1,
              completionRate: {
                $cond: [
                  { $gt: ['$total', 0] },
                  { $multiply: [{ $divide: ['$completed', '$total'] }, 100] },
                  0
                ]
              }
            }},
            { $sort: { total: -1 } },
            { $limit: 10 }
          ],
          
          // Thống kê subtasks và comments
          subtasksAndComments: [
            {
              $group: {
                _id: null,
                totalSubtasks: { $sum: { $size: { $ifNull: ['$subtasks', []] } } },
                completedSubtasks: {
                  $sum: {
                    $size: {
                      $filter: {
                        input: { $ifNull: ['$subtasks', []] },
                        as: 'st',
                        cond: { $eq: ['$$st.completed', true] }
                      }
                    }
                  }
                },
                totalComments: { $sum: { $size: { $ifNull: ['$comments', []] } } },
                tasksWithSubtasks: {
                  $sum: {
                    $cond: [
                      { $gt: [{ $size: { $ifNull: ['$subtasks', []] } }, 0] },
                      1,
                      0
                    ]
                  }
                },
                tasksWithComments: {
                  $sum: {
                    $cond: [
                      { $gt: [{ $size: { $ifNull: ['$comments', []] } }, 0] },
                      1,
                      0
                    ]
                  }
                }
              }
            }
          ]
        }
      }
    ]);

    const result = stats[0] || {};
    const overview = result.overview[0] || {};
    const overdueAnalysis = result.overdueAnalysis[0] || {};
    const completionTime = result.completionTimeAnalysis[0] || {};
    const subtasksAndComments = result.subtasksAndComments[0] || {};

    res.json({
      message: 'OK',
      data: {
        overview: {
          total: overview.total || 0,
          notStarted: overview.notStarted || 0,
          inProgress: overview.inProgress || 0,
          blocked: overview.blocked || 0,
          completed: overview.completed || 0,
          cancelled: overview.cancelled || 0,
          avgProgress: Math.round(overview.avgProgress || 0),
          avgEstimatedHours: Math.round((overview.avgEstimatedHours || 0) * 10) / 10,
          avgActualHours: Math.round((overview.avgActualHours || 0) * 10) / 10,
          completionRate: overview.total > 0
            ? Math.round((overview.completed / overview.total) * 100)
            : 0
        },
        overdueAnalysis: {
          totalOverdue: overdueAnalysis.totalOverdue || 0,
          overdueRate: overview.total > 0
            ? Math.round(((overdueAnalysis.totalOverdue || 0) / overview.total) * 100)
            : 0
        },
        completionTimeAnalysis: {
          avgDays: Math.round((completionTime.avgCompletionDays || 0) * 10) / 10,
          onTimeRate: completionTime.totalCompleted > 0
            ? Math.round((completionTime.onTimeCount / completionTime.totalCompleted) * 100)
            : 0,
          totalCompleted: completionTime.totalCompleted || 0
        },
        byStatus: result.byStatus || [],
        byPriority: result.byPriority || [],
        byAssignee: result.byAssignee || [],
        byDepartment: result.byDepartment || [],
        byMeeting: result.byMeeting || [],
        timelineMonthly: result.timelineMonthly || [],
        subtasksAndComments: {
          totalSubtasks: subtasksAndComments.totalSubtasks || 0,
          completedSubtasks: subtasksAndComments.completedSubtasks || 0,
          totalComments: subtasksAndComments.totalComments || 0,
          tasksWithSubtasks: subtasksAndComments.tasksWithSubtasks || 0,
          tasksWithComments: subtasksAndComments.tasksWithComments || 0,
          subtaskCompletionRate: (subtasksAndComments.totalSubtasks || 0) > 0
            ? Math.round(((subtasksAndComments.completedSubtasks || 0) / subtasksAndComments.totalSubtasks) * 100)
            : 0
        }
      }
    });

  } catch (error) {
    console.error('Error fetching follow-up report:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

module.exports = router;

