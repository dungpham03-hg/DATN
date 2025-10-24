const express = require('express');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const Meeting = require('../models/Meeting');
const Notification = require('../models/Notification');
const Archive = require('../models/Archive');
const { 
  authenticateToken, 
  checkResourceOwnership,
  checkDepartmentAccess,
  requireTechnicianOrAdmin
} = require('../middleware/auth');
const { sendBulkNotifications } = require('../utils/notificationHelper');

const router = express.Router();
// Thống kê: tần suất sử dụng phòng họp, mức độ, số người tham gia
router.get('/stats/summary', authenticateToken, async (req, res) => {
  try {
    // Chỉ cho admin và manager
    if (!['admin', 'manager'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Không có quyền xem thống kê' });
    }

    const { from, to } = req.query;
    const match = {};
    if (from || to) {
      match.startTime = {};
      if (from) match.startTime.$gte = new Date(from);
      if (to) match.startTime.$lte = new Date(to);
    }

    const pipeline = [
      { $match: match },
      {
        $facet: {
          byRoom: [
            { $group: { _id: '$room', count: { $sum: 1 } } },
            { $lookup: { from: 'meetingrooms', localField: '_id', foreignField: '_id', as: 'room' } },
            { $unwind: { path: '$room', preserveNullAndEmptyArrays: true } },
            { $project: { _id: 0, roomId: '$_id', roomName: '$room.name', count: 1 } },
            { $sort: { count: -1 } }
          ],
          byPriority: [
            { $group: { _id: '$priority', count: { $sum: 1 } } },
            { $project: { _id: 0, priority: '$_id', count: 1 } },
            { $sort: { count: -1 } }
          ],
          byAttendees: [
            { $project: { attendeeCount: { $size: { $ifNull: ['$attendees', []] } } } },
            { $bucket: { groupBy: '$attendeeCount', boundaries: [0,1,3,6,11,21,51,101,10000], default: 'Khác', output: { count: { $sum: 1 } } } }
          ],
          timelineMonthly: [
            { $group: { _id: { y: { $year: '$startTime' }, m: { $month: '$startTime' } }, count: { $sum: 1 } } },
            { $project: { _id: 0, year: '$_id.y', month: '$_id.m', count: 1 } },
            { $sort: { year: 1, month: 1 } }
          ]
        }
      }
    ];

    const result = await require('../models/Meeting').aggregate(pipeline);
    const data = result[0] || { byRoom: [], byPriority: [], byAttendees: [], timelineMonthly: [] };
    res.json({ message: 'OK', data });
  } catch (e) {
    console.error('Stats summary error:', e);
    res.status(500).json({ message: 'Lỗi server khi tổng hợp thống kê' });
  }
});

// Test endpoint để kiểm tra server (không cần auth)
router.get('/test', (req, res) => {
  console.log('✅ Meetings test endpoint reached');
  res.json({ 
    message: 'Meetings routes working', 
    timestamp: new Date(),
    endpoints: {
      submitMinutes: 'POST /:id/minutes/:minutesId/submit'
    }
  });
});

// Helper function để fix meeting cũ không có createdBy
const fixMeetingCreatedBy = (meeting) => {
  if (!meeting.createdBy && meeting.organizer) {
    meeting.createdBy = meeting.organizer;
    console.log(`Auto-fixing: Set createdBy = organizer for meeting ${meeting._id}`);
  }
};

// Helper function để so sánh ObjectId an toàn
const isUserMatch = (objectId, userId) => {
  if (!objectId || !userId) return false;
  return objectId.toString() === userId.toString();
};

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../uploads/meetings');
    if (!fs.existsSync(uploadPath)) { 
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    // Giữ nguyên tên file gốc để tránh lỗi encoding
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(originalName));
  }
});

const fileFilter = (req, file, cb) => {
  // Allowed file extensions
  const allowedExtensions = /\.(jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|ppt|pptx|txt)$/i;
  const extname = allowedExtensions.test(file.originalname);
  
  // Allowed MIME types (including Word files)
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',                    // .doc
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/vnd.ms-excel',              // .xls
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-powerpoint',         // .ppt
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
    'text/plain',                            // .txt
    'application/octet-stream'               // Fallback for some Word files
  ];
  
  const mimetype = allowedMimeTypes.includes(file.mimetype);
  
  if (extname && (mimetype || file.mimetype === 'application/octet-stream')) {
    return cb(null, true);
  } else {
    console.log('File rejected:', {
      filename: file.originalname,
      mimetype: file.mimetype,
      extname: path.extname(file.originalname)
    });
    cb(new Error('Định dạng file không được hỗ trợ'));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit
    fieldSize: 50 * 1024 * 1024,  // 50MB cho text fields
    files: 20,                    // Tối đa 20 files cùng lúc
    fields: 50                    // Tối đa 50 fields
  },
  fileFilter: fileFilter
});

// Middleware xử lý lỗi upload
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          success: false,
          message: 'File quá lớn! Dung lượng tối đa là 500MB.',
          error: 'FILE_TOO_LARGE'
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          success: false,
          message: 'Quá nhiều file! Tối đa 20 files cùng lúc.',
          error: 'TOO_MANY_FILES'
        });
      case 'LIMIT_FIELD_COUNT':
        return res.status(400).json({
          success: false,
          message: 'Quá nhiều trường dữ liệu!',
          error: 'TOO_MANY_FIELDS'
        });
      case 'LIMIT_FIELD_VALUE':
        return res.status(400).json({
          success: false,
          message: 'Giá trị trường quá lớn!',
          error: 'FIELD_VALUE_TOO_LARGE'
        });
      default:
        return res.status(400).json({
          success: false,
          message: 'Lỗi upload file: ' + error.message,
          error: 'UPLOAD_ERROR'
        });
    }
  }
  
  if (error.message === 'Định dạng file không được hỗ trợ') {
    return res.status(400).json({
      success: false,
      message: 'Định dạng file không được hỗ trợ. Chỉ hỗ trợ: PDF, DOC, DOCX, TXT, JPG, PNG',
      error: 'INVALID_FILE_TYPE'
    });
  }
  
  next(error);
};

// Validation rules cho tạo meeting mới
const meetingValidation = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Tiêu đề cuộc họp phải từ 3-200 ký tự'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Mô tả không được vượt quá 1000 ký tự'),
  
  body('startTime')
    .isISO8601()
    .withMessage('Thời gian bắt đầu không hợp lệ')
    .custom((value) => {
      if (new Date(value) <= new Date()) {
        throw new Error('Thời gian bắt đầu phải trong tương lai');
      }
      return true;
    }),
  
  body('endTime')
    .isISO8601()
    .withMessage('Thời gian kết thúc không hợp lệ')
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.startTime)) {
        throw new Error('Thời gian kết thúc phải sau thời gian bắt đầu');
      }
      return true;
    }),
  
  body('location')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Địa điểm không được vượt quá 200 ký tự'),
  
  body('meetingLink')
    .optional()
    .custom((value) => {
      // Cho phép empty string hoặc phải là URL hợp lệ
      if (value === '' || value === null || value === undefined) {
        return true;
      }
      const str = String(value).trim();
      try {
        const toCheck = /^https?:\/\//i.test(str) ? str : `https://${str}`;
        new URL(toCheck);
        return true;
      } catch {
        throw new Error('Link cuộc họp phải là URL hợp lệ');
      }
    }),
  body('roomApproval')
    .optional()
    .custom((v) => {
      if (!v) return true;
      if (v.status && !['pending','approved','rejected','not_required'].includes(v.status)) {
        throw new Error('Trạng thái duyệt phòng không hợp lệ');
      }
      return true;
    }),
  
  body('meetingType')
    .optional()
    .isIn(['offline', 'online', 'hybrid'])
    .withMessage('Loại cuộc họp không hợp lệ'),
  
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Mức độ ưu tiên không hợp lệ'),
  
  body('attendees')
    .optional()
    .isArray()
    .withMessage('Danh sách tham gia phải là mảng'),
  
  body('attendees.*')
    .optional()
    .isMongoId()
    .withMessage('ID người tham gia không hợp lệ'),
  
  body('organizer')
    .optional()
    .isMongoId()
    .withMessage('ID người chủ trì không hợp lệ'),
  
  body('secretary')
    .optional()
    .isMongoId()
    .withMessage('ID thư ký không hợp lệ'),
  
  body('room')
    .optional()
    .isMongoId()
    .withMessage('ID phòng họp không hợp lệ')
];

// Validation rules riêng cho update meeting
const updateMeetingValidation = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Tiêu đề cuộc họp phải từ 3-200 ký tự'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Mô tả không được vượt quá 1000 ký tự'),
  
  body('startTime')
    .optional()
    .isISO8601()
    .withMessage('Thời gian bắt đầu không hợp lệ'),
  
  body('endTime')
    .optional()
    .isISO8601()
    .withMessage('Thời gian kết thúc không hợp lệ')
    .custom((value, { req }) => {
      // Chỉ kiểm tra nếu cả startTime và endTime đều có
      if (value && req.body.startTime) {
        if (new Date(value) <= new Date(req.body.startTime)) {
          throw new Error('Thời gian kết thúc phải sau thời gian bắt đầu');
        }
      }
      return true;
    }),
  
    body('location')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Địa điểm không được vượt quá 200 ký tự'),
  
  body('meetingLink')
    .optional()
    .custom((value) => {
      // Cho phép empty string hoặc phải là URL hợp lệ
      if (value === '' || value === null || value === undefined) {
        return true;
      }
      // Kiểm tra URL hợp lệ
      try {
        new URL(value);
        return true;
      } catch {
        throw new Error('Link cuộc họp phải là URL hợp lệ');
      }
    }),
  
  body('meetingType')
    .optional()
    .isIn(['offline', 'online', 'hybrid'])
    .withMessage('Loại cuộc họp không hợp lệ'),

  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Mức độ ưu tiên không hợp lệ'),

  body('status')
    .optional()
    .isIn(['scheduled', 'ongoing', 'completed', 'cancelled', 'postponed'])
    .withMessage('Trạng thái cuộc họp không hợp lệ'),

  body('postponeReason')
    .optional()
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Lý do hoãn phải từ 1-500 ký tự')
    .custom((value, { req }) => {
      if (req.body.status === 'postponed' && !value) {
        throw new Error('Lý do hoãn là bắt buộc khi hoãn cuộc họp');
      }
      return true;
    }),

  body('cancelReason')
    .optional()
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Lý do hủy phải từ 1-500 ký tự')
    .custom((value, { req }) => {
      if (req.body.status === 'cancelled' && !value) {
        throw new Error('Lý do hủy là bắt buộc khi hủy cuộc họp');
      }
      return true;
    }),
  
  body('attendees')
    .optional()
    .isArray()
    .withMessage('Danh sách tham gia phải là mảng'),
  
  body('attendees.*')
    .optional()
    .isMongoId()
    .withMessage('ID người tham gia không hợp lệ'),
  
  body('organizer')
    .optional()
    .isMongoId()
    .withMessage('ID người chủ trì không hợp lệ'),
  
  body('secretary')
    .optional()
    .isMongoId()
    .withMessage('ID thư ký không hợp lệ')
];

// Helper function để xử lý validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('📋 Validation errors:', errors.array());
    console.log('📋 Request body:', req.body);
    
    return res.status(400).json({
      message: 'Dữ liệu không hợp lệ',
      errors: errors.array(),
      details: errors.array().map(err => `${err.param}: ${err.msg}`)
    });
  }
  next();
};

// Middleware để sửa các cuộc họp cũ có location chứa room name
const fixOldMeetings = async (req, res, next) => {
  try {
    // Chỉ chạy một lần khi server khởi động
    if (!global.meetingsFixed) {
      console.log('🔧 Checking for old meetings that need room field fix...');

      const MeetingRoom = require('../models/MeetingRoom');
      const oldMeetings = await Meeting.find({
        location: { $exists: true, $ne: null },
        room: { $exists: false }
      });

      console.log(`📋 Found ${oldMeetings.length} old meetings to fix`);

      for (const meeting of oldMeetings) {
        if (meeting.location) {
          // Tìm phòng họp theo tên (location)
          const room = await MeetingRoom.findOne({ name: meeting.location });
          if (room) {
            console.log(`✅ Fixing meeting "${meeting.title}": setting room=${room._id} for location="${meeting.location}"`);
            await Meeting.findByIdAndUpdate(meeting._id, {
              $set: { room: room._id },
              $unset: { location: "" }
            });
          } else {
            console.log(`⚠️ No room found for location "${meeting.location}" in meeting "${meeting.title}"`);
          }
        }
      }

      global.meetingsFixed = true;
      console.log('✅ Old meetings fix completed');
    }
  } catch (error) {
    console.error('❌ Error fixing old meetings:', error);
  }
  next();
};

// @route   GET /api/meetings
// @desc    Lấy danh sách cuộc họp
// @access  Private
router.get('/', authenticateToken, checkDepartmentAccess, fixOldMeetings, async (req, res) => {
  try {
    console.log('🔍 GET /api/meetings - User:', {
      id: req.user._id,
      role: req.user.role,
      department: req.user.department
    });

    const { 
      page = 1, 
      limit = 1000, // Tăng limit rất cao để fetch tất cả cuộc họp
      status, 
      priority,
      startDate,
      endDate,
      search,
      department,
      newMeetingId
    } = req.query;

    console.log('🔍 Query parameters:', req.query);

    // Build query điều kiện AND (status, priority, time...) và OR (quyền truy cập)
    const andConditions = [];

    // Department được gửi từ query (có thể auto-insert bởi middleware)
    const requestedDept = department;

    if (status) andConditions.push({ status });
    if (priority) andConditions.push({ priority });

    if (startDate || endDate) {
      const timeCond = {};
      if (startDate) timeCond.$gte = new Date(startDate);
      if (endDate) timeCond.$lte = new Date(endDate);
      andConditions.push({ startTime: timeCond });
    }

    if (search) {
      andConditions.push({
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ]
      });
    }

    // Quyền truy cập
    let orConditions = [];

    if (req.user.role === 'admin' || req.user.role === 'assistant') {
      orConditions = [{}]; // admin và assistant thấy tất cả
      console.log('🔍 Admin/Assistant - can see all meetings');
    } else if (req.user.role === 'manager' || req.user.role === 'secretary') {
      // Manager và Secretary thấy:
      // 1. Họp mình tổ chức
      orConditions.push({ organizer: req.user._id });
      // 2. Họp mình được mời
      orConditions.push({ 'attendees.user': req.user._id });
      // 3. Mọi cuộc họp công khai
      orConditions.push({ isPrivate: false });
      // 4. Cuộc họp riêng tư cùng phòng ban
      if (req.user.department) {
        orConditions.push({ 
          isPrivate: true, 
          department: req.user.department 
        });
      }
      console.log('🔍 Manager/Secretary - orConditions:', orConditions);
    } else {
      // Employee chỉ thấy:
      // 1. Họp mình tổ chức (nếu có)
      orConditions.push({ organizer: req.user._id });
      // 2. Họp mình được mời
      orConditions.push({ 'attendees.user': req.user._id });
      // 3. Cuộc họp công khai
      orConditions.push({ isPrivate: false });
      // Không thấy cuộc họp riêng tư cùng phòng ban nếu không được mời
      console.log('🔍 Employee - orConditions:', orConditions);
    }

    const query = {
      $and: [ ...andConditions, { $or: orConditions } ]
    };

    console.log('🔍 Final query:', JSON.stringify(query, null, 2));

    // If we're looking for a specific newly created meeting, increase the limit
    // to ensure we can find it even if it's not in the first page
    let adjustedLimit = parseInt(limit);
    if (newMeetingId) {
      adjustedLimit = Math.max(adjustedLimit, 1000); // Increase limit to 1000 to ensure we find the new meeting
      console.log('🔍 New meeting ID provided, increasing limit to:', adjustedLimit);
    }

    const options = {
      page: parseInt(page),
      limit: adjustedLimit,
      sort: { startTime: 1 },
      populate: [
        { path: 'organizer', select: 'fullName email avatar position department role' },
        { path: 'secretary', select: 'fullName email avatar position department role' },
        { path: 'attendees.user', select: 'fullName email avatar position department role' },
        { path: 'room', select: 'name location capacity' }
      ]
    };

    const result = await Meeting.paginate(query, options);

    console.log('🔍 Query result:', {
      totalDocs: result.totalDocs,
      docs: result.docs.length,
      meetings: result.docs.map(m => ({
        id: m._id,
        title: m.title,
        organizer: m.organizer?._id,
        isPrivate: m.isPrivate,
        department: m.department,
        attendees: m.attendees?.map(a => a.user) || [],
        room: m.room,
        location: m.location,
        hasRoom: !!m.room,
        roomName: m.room?.name
      }))
    });
    
    // Debug: Check if the newly created meeting is in the results
    const newlyCreatedMeetingId = req.query.newMeetingId;
    if (newlyCreatedMeetingId) {
      const foundMeeting = result.docs.find(m => m._id.toString() === newlyCreatedMeetingId);
      console.log('🔍 Looking for newly created meeting:', newlyCreatedMeetingId);
      console.log('🔍 Found in results:', foundMeeting ? 'YES' : 'NO');
      if (foundMeeting) {
        console.log('🔍 New meeting details:', {
          id: foundMeeting._id,
          title: foundMeeting.title,
          organizer: foundMeeting.organizer?._id,
          isPrivate: foundMeeting.isPrivate,
          department: foundMeeting.department
        });
      }
    }

    res.json({
      message: 'Lấy danh sách cuộc họp thành công',
      meetings: result.docs,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.totalDocs,
        pages: result.totalPages,
        hasNextPage: result.hasNextPage,
        hasPrevPage: result.hasPrevPage
      }
    });

  } catch (error) {
    console.error('❌ Get meetings error:', error);
    res.status(500).json({
      message: 'Lỗi server khi lấy danh sách cuộc họp',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// ===== Decisions & Voting =====
// Tạo quyết định (chỉ thư ký của cuộc họp, organizer, admin, assistant)
router.post('/:id/decisions', authenticateToken, [
  body('title').isString().trim().notEmpty().withMessage('Tiêu đề là bắt buộc'),
  body('description').optional().isString()
], async (req, res) => {
  try {
    console.log('➡️  Create decision called for meeting:', req.params.id, 'by user:', req.user?._id);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Dữ liệu không hợp lệ', errors: errors.array() });
    }

    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) {
      console.log('❌ Meeting not found for decision creation:', req.params.id);
      return res.status(404).json({ message: 'Cuộc họp không tồn tại' });
    }

    const isSecretary = meeting.secretary && meeting.secretary.toString() === req.user._id.toString();
    const isOrganizer = meeting.organizer && meeting.organizer.toString() === req.user._id.toString();
    const isPrivileged = ['admin', 'assistant'].includes(req.user.role);
    if (!(isSecretary || isOrganizer || isPrivileged)) {
      return res.status(403).json({ message: 'Chỉ thư ký/organizer mới được tạo quyết định' });
    }

    const { title, description = '' } = req.body;

    const decision = {
      title: title.trim(),
      description: description.trim(),
      createdBy: req.user._id,
      createdAt: new Date(),
      votes: []
    };

    if (!Array.isArray(meeting.decisions)) meeting.decisions = [];
    meeting.decisions.push(decision);
    await meeting.save();

    const created = meeting.decisions[meeting.decisions.length - 1];
    return res.json({ message: 'Đã tạo quyết định', decision: created, meetingId: meeting._id });
  } catch (error) {
    console.error('Create decision error:', error);
    return res.status(500).json({ message: 'Lỗi server khi tạo quyết định' });
  }
});

// Bỏ phiếu cho quyết định (attendee của cuộc họp)
router.post('/:id/decisions/:decisionId/vote', authenticateToken, [
  body('choice').isIn(['yes', 'no', 'abstain']).withMessage('Lựa chọn không hợp lệ')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Dữ liệu không hợp lệ', errors: errors.array() });
    }

    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) return res.status(404).json({ message: 'Cuộc họp không tồn tại' });

    // Kiểm tra user thuộc attendees
    const isAttendee = meeting.attendees.some(a => a.user.toString() === req.user._id.toString());
    const isOrganizer = meeting.organizer && meeting.organizer.toString() === req.user._id.toString();
    const isSecretary = meeting.secretary && meeting.secretary.toString() === req.user._id.toString();
    if (!(isAttendee || isOrganizer || isSecretary || ['admin','assistant'].includes(req.user.role))) {
      return res.status(403).json({ message: 'Bạn không thuộc cuộc họp này' });
    }

    const decision = meeting.decisions.id(req.params.decisionId);
    if (!decision) return res.status(404).json({ message: 'Quyết định không tồn tại' });

    const { choice } = req.body;
    if (decision.finalized) {
      return res.status(400).json({ message: 'Quyết định đã được chốt, không thể bỏ phiếu' });
    }
    const existing = decision.votes.find(v => v.user.toString() === req.user._id.toString());
    if (existing) {
      existing.choice = choice;
      existing.votedAt = new Date();
    } else {
      decision.votes.push({ user: req.user._id, choice, votedAt: new Date() });
    }

    await meeting.save();

    const counts = decision.votes.reduce((acc, v) => {
      acc[v.choice] = (acc[v.choice] || 0) + 1;
      return acc;
    }, { yes: 0, no: 0, abstain: 0 });

    return res.json({ message: 'Đã ghi nhận phiếu', decision: decision, counts });
  } catch (error) {
    console.error('Vote decision error:', error);
    return res.status(500).json({ message: 'Lỗi server khi bỏ phiếu' });
  }
});

// Cập nhật tiêu đề/mô tả quyết định (organizer/secretary/admin/assistant)
router.put('/:id/decisions/:decisionId', authenticateToken, [
  body('title').optional().isString().trim().notEmpty(),
  body('description').optional().isString()
], async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) return res.status(404).json({ message: 'Cuộc họp không tồn tại' });

    const isOrganizer = meeting.organizer && meeting.organizer.toString() === req.user._id.toString();
    const isSecretary = meeting.secretary && meeting.secretary.toString() === req.user._id.toString();
    const isPrivileged = ['admin','assistant'].includes(req.user.role);
    if (!(isOrganizer || isSecretary || isPrivileged)) {
      return res.status(403).json({ message: 'Bạn không có quyền chỉnh sửa quyết định' });
    }

    const decision = meeting.decisions.id(req.params.decisionId);
    if (!decision) return res.status(404).json({ message: 'Quyết định không tồn tại' });

    if (decision.finalized) {
      return res.status(400).json({ message: 'Quyết định đã được chốt, không thể chỉnh sửa' });
    }

    const { title, description } = req.body;
    if (title !== undefined) decision.title = String(title).trim();
    if (description !== undefined) decision.description = String(description).trim();
    decision.updatedAt = new Date();
    await meeting.save();
    return res.json({ message: 'Đã cập nhật quyết định', decision });
  } catch (error) {
    console.error('Update decision error:', error);
    return res.status(500).json({ message: 'Lỗi server khi cập nhật quyết định' });
  }
});

// Xóa quyết định (organizer/secretary/admin/assistant)
router.delete('/:id/decisions/:decisionId', authenticateToken, async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) return res.status(404).json({ message: 'Cuộc họp không tồn tại' });

    const isOrganizer = meeting.organizer && meeting.organizer.toString() === req.user._id.toString();
    const isSecretary = meeting.secretary && meeting.secretary.toString() === req.user._id.toString();
    const isPrivileged = ['admin','assistant'].includes(req.user.role);
    if (!(isOrganizer || isSecretary || isPrivileged)) {
      return res.status(403).json({ message: 'Bạn không có quyền xóa quyết định' });
    }

    const decision = meeting.decisions.id(req.params.decisionId);
    if (!decision) return res.status(404).json({ message: 'Quyết định không tồn tại' });
    if (decision.finalized) {
      return res.status(400).json({ message: 'Quyết định đã được chốt, không thể xóa' });
    }
    decision.remove();
    await meeting.save();
    return res.json({ message: 'Đã xóa quyết định' });
  } catch (error) {
    console.error('Delete decision error:', error);
    return res.status(500).json({ message: 'Lỗi server khi xóa quyết định' });
  }
});

// Chốt kết quả quyết định (organizer có toàn quyền; thư ký được phép nếu organizer hoặc admin/assistant)
router.post('/:id/decisions/:decisionId/finalize', authenticateToken, async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) return res.status(404).json({ message: 'Cuộc họp không tồn tại' });

    const isOrganizer = meeting.organizer && meeting.organizer.toString() === req.user._id.toString();
    const isSecretary = meeting.secretary && meeting.secretary.toString() === req.user._id.toString();
    const isPrivileged = ['admin','assistant'].includes(req.user.role);
    if (!(isOrganizer || isSecretary || isPrivileged)) {
      return res.status(403).json({ message: 'Bạn không có quyền chốt quyết định' });
    }

    const decision = meeting.decisions.id(req.params.decisionId);
    if (!decision) return res.status(404).json({ message: 'Quyết định không tồn tại' });

    const counts = (decision.votes || []).reduce((acc, v) => {
      acc[v.choice] = (acc[v.choice] || 0) + 1;
      return acc;
    }, { yes: 0, no: 0, abstain: 0 });

    decision.finalized = true;
    if (counts.yes > counts.no) decision.finalResult = 'approved';
    else if (counts.no > counts.yes) decision.finalResult = 'rejected';
    else if (counts.yes === counts.no && (counts.yes !== 0 || counts.no !== 0)) decision.finalResult = 'tied';
    else decision.finalResult = 'none';

    await meeting.save();
    return res.json({ message: 'Đã chốt kết quả', decision, counts });
  } catch (error) {
    console.error('Finalize decision error:', error);
    return res.status(500).json({ message: 'Lỗi server khi chốt quyết định' });
  }
});

// ===== Tasks APIs =====
// Tạo task và gán cho attendee
router.post('/:id/tasks', authenticateToken, [
  body('title').isString().trim().notEmpty().withMessage('Tiêu đề là bắt buộc'),
  body('assignee').optional().isString(),
  body('dueDate').optional().isISO8601()
], async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) return res.status(404).json({ message: 'Cuộc họp không tồn tại' });

    const isOrganizer = meeting.organizer && meeting.organizer.toString() === req.user._id.toString();
    const isSecretary = meeting.secretary && meeting.secretary.toString() === req.user._id.toString();
    const isPrivileged = ['admin','assistant','manager'].includes(req.user.role);
    if (!(isOrganizer || isSecretary || isPrivileged)) {
      return res.status(403).json({ message: 'Bạn không có quyền tạo nhiệm vụ' });
    }

    const { title, assignee, dueDate } = req.body;
    // Nếu có assignee, đảm bảo người này nằm trong attendees
    if (assignee) {
      const inAttendees = meeting.attendees.some(a => a.user.toString() === assignee.toString());
      if (!inAttendees) {
        return res.status(400).json({ message: 'Người được giao không có trong danh sách tham gia' });
      }
    }

    if (!Array.isArray(meeting.tasks)) meeting.tasks = [];
    meeting.tasks.push({
      title: title.trim(),
      assignee: assignee || undefined,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      createdBy: req.user._id
    });
    await meeting.save();

    const createdTask = meeting.tasks[meeting.tasks.length - 1];
    return res.json({ message: 'Đã tạo nhiệm vụ', task: createdTask });
  } catch (error) {
    console.error('Create task error:', error);
    return res.status(500).json({ message: 'Lỗi server khi tạo nhiệm vụ' });
  }
});

// Cập nhật trạng thái hoàn thành
router.put('/:id/tasks/:taskId/toggle', authenticateToken, async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) return res.status(404).json({ message: 'Cuộc họp không tồn tại' });
    const task = meeting.tasks.id(req.params.taskId);
    if (!task) return res.status(404).json({ message: 'Nhiệm vụ không tồn tại' });

    const canToggle = ['admin','assistant','manager'].includes(req.user.role) ||
      meeting.organizer.toString() === req.user._id.toString() ||
      (task.assignee && task.assignee.toString() === req.user._id.toString());
    if (!canToggle) return res.status(403).json({ message: 'Bạn không có quyền cập nhật nhiệm vụ' });

    task.completed = !task.completed;
    task.updatedAt = new Date();
    await meeting.save();
    return res.json({ message: 'Đã cập nhật nhiệm vụ', task });
  } catch (error) {
    console.error('Toggle task error:', error);
    return res.status(500).json({ message: 'Lỗi server khi cập nhật nhiệm vụ' });
  }
});

// @route   GET /api/meetings/invitations
// @desc    Lấy danh sách lời mời của user hiện tại (chỉ lời mời chưa phản hồi và chưa kết thúc)
// @access  Private
router.get('/invitations', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const { status = 'all', includePast = 'false' } = req.query;
    console.log('Finding invitations for user:', userId, { status, includePast });

    const now = new Date();

    // Điều kiện thời gian
    const timeCond = includePast === 'true' ? {} : { endTime: { $gt: now } };

    // Điều kiện chính
    let query;
    if (status === 'all') {
      query = {
        ...timeCond,
        $or: [
          { 'attendees.user': userId },
          { organizer: userId },
          { secretary: userId }
        ]
      };
    } else {
      const mappedStatus = status === 'pending' ? 'invited' : status;
      query = {
        ...timeCond,
        attendees: {
          $elemMatch: { user: userId, status: mappedStatus }
        }
      };
    }

    let meetings = await Meeting.find(query)
      .populate('organizer', 'fullName email avatar position department role')
      .populate('secretary', 'fullName email avatar position department role')
      .populate('attendees.user', 'fullName email avatar position department role')
      .populate('room', 'name location')
      .sort({ startTime: 1 });

    console.log('Found meetings:', meetings.length);


    const invitations = meetings.map(meeting => {
      const userAttendee = meeting.attendees.find(att => {
        const attUserId = att.user?._id ? att.user._id.toString() : att.user?.toString?.();
        return attUserId === userId.toString();
      });

      const isStarted = now >= new Date(meeting.startTime);
      const isEnded = now >= new Date(meeting.endTime);

      let timeStatus = 'upcoming';
      if (isEnded) timeStatus = 'ended';
      else if (isStarted) timeStatus = 'ongoing';

      // Xác định vai trò nếu không có bản ghi attendee (xử lý cả populated và ObjectId)
      const organizerId = meeting.organizer?._id ? meeting.organizer._id.toString() : meeting.organizer?.toString?.();
      const secretaryId = meeting.secretary?._id ? meeting.secretary._id.toString() : meeting.secretary?.toString?.();
      const userIdStr = userId.toString();
      const roleAs = userAttendee ? 'attendee'
        : organizerId === userIdStr ? 'organizer'
        : secretaryId === userIdStr ? 'secretary'
        : 'other';

      return {
        _id: meeting._id,
        title: meeting.title,
        description: meeting.description,
        startTime: meeting.startTime,
        endTime: meeting.endTime,
        location: meeting.location,
        room: meeting.room ? { name: meeting.room.name, location: meeting.room.location } : undefined,
        meetingLink: meeting.meetingLink,
        meetingType: meeting.meetingType,
        status: meeting.status,
        timeStatus,
        organizer: meeting.organizer,
        secretary: meeting.secretary,
        attendeeStatus: userAttendee?.status || (roleAs === 'organizer' ? 'organizer' : roleAs === 'secretary' ? 'secretary' : 'invited'),
        invitedAt: userAttendee?.invitedAt || meeting.createdAt,
        respondedAt: userAttendee?.respondedAt,
        declineReason: userAttendee?.declineReason,
        canRespond: (roleAs === 'attendee' && userAttendee?.status === 'invited' && timeStatus !== 'ended')
      };
    });

    res.json({
      message: 'Lấy danh sách lời mời thành công',
      invitations
    });

  } catch (error) {
    console.error('Get invitations error:', error?.message, error?.stack);
    res.status(500).json({
      message: 'Lỗi server khi lấy danh sách lời mời',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   GET /api/meetings/:id
// @desc    Lấy thông tin chi tiết cuộc họp
// @access  Private
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id)
      .populate('organizer', 'fullName email avatar department position role')
      .populate('secretary', 'fullName email avatar department position role')
      .populate('attendees.user', 'fullName email avatar department position role')
      .populate('tasks.assignee', 'fullName email avatar position')
      .populate('agenda')
      .populate('minutesHistory.reviewer', 'fullName email avatar position')
      .populate('minutesHistory.createdBy', 'fullName email avatar position')
      .populate('minutesHistory.attachment.uploadedBy', 'fullName email avatar position')
      .populate('messages.sender', 'fullName email avatar position')
      .populate('summaryMessages.author', 'fullName email avatar position')
      .populate('summaryFiles.uploadedBy', 'fullName email avatar position')
      .populate('attachments.uploadedBy', 'fullName email avatar position')
      .populate('notes.author', 'fullName email avatar position')
      .populate('room', 'name location capacity');

    if (!meeting) {
      return res.status(404).json({
        message: 'Cuộc họp không tồn tại'
      });
    }

    // Kiểm tra quyền truy cập chi tiết
    let canAccess = false;
    
    if (req.user.role === 'admin') {
      // Admin thấy tất cả
      canAccess = true;
    } else if (req.user.role === 'manager' || req.user.role === 'secretary') {
      // Manager và Secretary thấy:
      canAccess = 
        meeting.organizer._id.toString() === req.user._id.toString() || // Mình tổ chức
        meeting.attendees.some(att => att.user._id.toString() === req.user._id.toString()) || // Được mời
        !meeting.isPrivate || // Công khai
        (meeting.isPrivate && meeting.department === req.user.department); // Riêng tư cùng phòng ban
    } else {
      // Employee chỉ thấy:
      canAccess = 
        meeting.organizer._id.toString() === req.user._id.toString() || // Mình tổ chức
        meeting.attendees.some(att => att.user._id.toString() === req.user._id.toString()) || // Được mời
        !meeting.isPrivate; // Công khai
    }

    if (!canAccess) {
      return res.status(403).json({
        message: 'Bạn không có quyền truy cập cuộc họp này'
      });
    }

    console.log('📋 Meeting attachments count:', meeting.attachments?.length || 0);
    console.log('📋 Meeting attachments:', meeting.attachments?.map(att => ({
      id: att._id,
      name: att.name,
      path: att.path
    })));

    const meetingJson = meeting.toObject();
    if (meetingJson.room && typeof meetingJson.room === 'object') {
      meetingJson.roomName = meetingJson.room.name;
      meetingJson.roomLocationFloor = (meetingJson.room.location && (meetingJson.room.location.floor || meetingJson.room.location)) || undefined;
      // Đồng nhất location để client cũ hiển thị đúng
      const displayLocation = [meetingJson.roomName, meetingJson.roomLocationFloor].filter(Boolean).join(' - ');
      if (displayLocation) {
        meetingJson.location = displayLocation;
      }
    }

    res.json({
      message: 'Lấy thông tin cuộc họp thành công',
      meeting: meetingJson
    });

  } catch (error) {
    console.error('Get meeting error:', error);
    res.status(500).json({
      message: 'Lỗi server khi lấy thông tin cuộc họp',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   POST /api/meetings
// @desc    Tạo cuộc họp mới
// @access  Private
router.post('/', authenticateToken, meetingValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Dữ liệu không hợp lệ', 
        errors: errors.array() 
      });
    }

    const {
      title,
      description,
      startTime,
      endTime,
      location,
      meetingLink,
      attendees,
      secretary,
      organizer,
      isPrivate,
      department,
      priority,
      room,
      meetingType
    } = req.body;

    console.log('🔍 Creating meeting with data:', req.body);

    // Chuẩn hóa và phòng vệ dữ liệu đầu vào để tránh 500
    const attendeesArray = Array.isArray(attendees) ? attendees : [];
    const parsedStartTime = startTime ? new Date(startTime) : null;
    const parsedEndTime = endTime ? new Date(endTime) : null;
    const isOnline = meetingType === 'online';

    const meetingData = {
      title,
      description,
      startTime: parsedStartTime,
      endTime: parsedEndTime,
      location: isOnline ? meetingLink : location, // Chỉ set location cho online meetings hoặc nếu có location string
      room: isOnline ? undefined : room, // Lưu room ID cho cuộc họp offline
      attendees: attendeesArray.map(userId => ({
          user: userId,
        status: 'invited',
        isOrganizer: organizer && userId.toString() === organizer.toString()
      })),
      secretary,
      organizer: organizer || req.user._id,
      createdBy: req.user._id,
      isPrivate: isPrivate || false,
      department: department || req.user.department,
      priority: priority || 'medium'
    };

    // Set trạng thái phê duyệt phòng khi có chọn phòng
    if (!isOnline && room) {
      meetingData.roomApproval = { status: 'pending' };
    } else {
      meetingData.roomApproval = { status: 'not_required' };
    }

    console.log('🔍 Meeting data to save:', meetingData);
    console.log('🔍 Room field in meetingData:', meetingData.room);
    console.log('🔍 Location field in meetingData:', meetingData.location);

    const meeting = new Meeting(meetingData);
    console.log('🔍 Saving meeting...');
    await meeting.save();
    console.log('🔍 Meeting saved successfully');

    // Populate the saved meeting with user details
    await meeting.populate([
      { path: 'organizer', select: 'fullName email avatar position department role' },
      { path: 'secretary', select: 'fullName email avatar position department role' },
      { path: 'attendees.user', select: 'fullName email avatar position department role' },
      { path: 'room', select: 'name location capacity' }
    ]);

    console.log('🔍 Saved meeting details:', {
      id: meeting._id,
      title: meeting.title,
      organizer: meeting.organizer?._id,
      isPrivate: meeting.isPrivate,
      department: meeting.department,
      attendees: meeting.attendees?.length || 0,
      room: meeting.room,
      location: meeting.location,
      hasRoom: !!meeting.room,
      roomName: meeting.room?.name
    });

    // Gửi thông báo lời mời cho attendees với improved handling
    try {
      const recipients = (meeting.attendees || [])
        .map(att => att.user && (att.user._id || att.user))
        .filter(uid => uid && uid.toString() !== req.user._id.toString());

      if (recipients.length > 0) {
        const notifications = recipients.map(recipientId => ({
          recipient: recipientId,
          sender: req.user._id,
          type: 'meeting_invite',
          title: 'Lời mời tham gia cuộc họp',
          message: `${req.user.fullName} đã mời bạn tham gia cuộc họp "${meeting.title}"`,
          data: { meetingId: meeting._id }
        }));

        const io = req.app.get('io');
        await sendBulkNotifications(io, notifications);
      }
    } catch (notifError) {
      // Không fail request nếu notification lỗi
    }

    res.status(201).json({
      message: 'Tạo cuộc họp thành công',
      meeting
    });

  } catch (error) {
    console.error('Error creating meeting:', error);
    res.status(500).json({
      message: 'Có lỗi xảy ra khi tạo cuộc họp',
      error: error.message 
    });
  }
});

// @route   PUT /api/meetings/:id
// @desc    Cập nhật cuộc họp
// @access  Private
router.put('/:id', authenticateToken, checkResourceOwnership('organizer'), updateMeetingValidation, handleValidationErrors, async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    
    if (!meeting) {
      return res.status(404).json({
        message: 'Cuộc họp không tồn tại'
      });
    }

    // Kiểm tra quyền chỉnh sửa
    const isOwnerOrAdmin = req.user.role === 'admin' || req.user.role === 'assistant' || isUserMatch(meeting.organizer, req.user._id);
    const canEditAgenda = ['admin', 'manager', 'secretary', 'assistant', 'technician'].includes(req.user.role);
    
    // Nếu chỉ update agenda, secretary/manager có thể edit
    const onlyUpdatingAgenda = Object.keys(req.body).length === 1 && req.body.agenda !== undefined;
    
    if (!isOwnerOrAdmin && !(onlyUpdatingAgenda && canEditAgenda)) {
      return res.status(403).json({
        message: onlyUpdatingAgenda 
          ? 'Bạn không có quyền chỉnh sửa chương trình cuộc họp'
          : 'Chỉ người tổ chức hoặc admin mới có thể chỉnh sửa cuộc họp'
      });
    }

    // Kiểm tra cuộc họp đã bắt đầu chưa
    // Cho phép chỉnh sửa cuộc họp cancelled/postponed để có thể khôi phục
    if (meeting.status === 'ongoing' || meeting.status === 'completed') {
      return res.status(400).json({
        message: 'Không thể chỉnh sửa cuộc họp đang diễn ra hoặc đã kết thúc'
      });
    }

    const {
      title,
      description,
      startTime,
      endTime,
      location,
      meetingLink,
      meetingType,
      priority,
      status,
      postponeReason,
      cancelReason,
      attendees,
      tags,
      isPrivate,
      agenda,
      organizer,
      secretary
    } = req.body;

    // Cập nhật dữ liệu chỉ cho các trường có truyền lên
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (startTime !== undefined && startTime !== '') {
      const d = new Date(startTime);
      if (!isNaN(d.valueOf())) updateData.startTime = d;
    }
    if (endTime !== undefined && endTime !== '') {
      const d2 = new Date(endTime);
      if (!isNaN(d2.valueOf())) updateData.endTime = d2;
    }
    if (location !== undefined) updateData.location = location;
    if (meetingLink !== undefined) updateData.meetingLink = meetingLink;
    if (meetingType !== undefined) updateData.meetingType = meetingType;
    if (priority !== undefined) updateData.priority = priority;
    if (status !== undefined) updateData.status = status;
    if (postponeReason !== undefined) updateData.postponeReason = postponeReason;
    if (cancelReason !== undefined) updateData.cancelReason = cancelReason;
    if (tags !== undefined) updateData.tags = tags;
    if (isPrivate !== undefined) updateData.isPrivate = isPrivate;
    if (agenda !== undefined) updateData.agenda = agenda;
    if (organizer !== undefined) updateData.organizer = organizer;
    if (secretary !== undefined) updateData.secretary = secretary;

    // Cập nhật attendees nếu có
    if (attendees) {
      // Lấy thông tin user để kiểm tra role
      const User = require('../models/User');
      const attendeeUsers = await User.find({ _id: { $in: attendees } }).select('_id role');
      
      updateData.attendees = attendees.map(userId => {
        // Giữ lại status cũ nếu user đã có trong danh sách
        const existingAttendee = meeting.attendees.find(
          att => att.user.toString() === userId.toString()
        );
        
        const attendeeUser = attendeeUsers.find(u => u._id.toString() === userId.toString());
        
        // Chủ trì, thư ký được chỉ định, hoặc user có role secretary/assistant tự động accepted
        const isOrganizer = userId.toString() === (organizer || meeting.organizer).toString();
        const isAssignedSecretary = (secretary && userId.toString() === secretary.toString()) ||
                                   (meeting.secretary && userId.toString() === meeting.secretary.toString());
        const hasSecretaryRole = attendeeUser && ['secretary', 'assistant'].includes(attendeeUser.role);
        
        const shouldAutoAccept = isOrganizer || isAssignedSecretary || hasSecretaryRole;
        
        let status = 'invited';
        let responseDate = undefined;
        
        if (shouldAutoAccept) {
          status = 'accepted';
          responseDate = new Date();
        } else if (existingAttendee) {
          status = existingAttendee.status;
          responseDate = existingAttendee.responseDate;
        }
        
        return {
          user: userId,
          status,
          responseDate
        };
      });
    }

    const updatedMeeting = await Meeting.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate([
      { path: 'organizer', select: 'fullName email avatar position department role' },
      { path: 'secretary', select: 'fullName email avatar position department role' },
      { path: 'attendees.user', select: 'fullName email avatar position department role' }
    ]);

    // Gửi thông báo khi thay đổi trạng thái
    if (status && status !== meeting.status) {
      try {
        const Notification = require('../models/Notification');
        let notificationTitle = '';
        let notificationMessage = '';
        
        if (status === 'cancelled') {
          notificationTitle = 'Cuộc họp đã bị hủy';
          notificationMessage = `Cuộc họp "${updatedMeeting.title}" đã bị hủy${cancelReason ? `. Lý do: ${cancelReason}` : ''}`;
        } else if (status === 'postponed') {
          notificationTitle = 'Cuộc họp đã bị hoãn';
          notificationMessage = `Cuộc họp "${updatedMeeting.title}" đã bị hoãn${postponeReason ? `. Lý do: ${postponeReason}` : ''}`;
        }
        
        if (notificationTitle) {
          // Lấy danh sách người nhận (tất cả attendees)
          const recipients = updatedMeeting.attendees.map(att => att.user._id);
          
          // Tạo thông báo cho từng người
          const notifications = recipients.map(userId => ({
            recipient: userId,
            sender: req.user._id,
            type: status === 'cancelled' ? 'meeting_cancelled' : 'meeting_postponed',
            title: notificationTitle,
            message: notificationMessage,
            data: { meetingId: updatedMeeting._id }
          }));
          
          await Notification.insertMany(notifications);
          
          // Gửi socket notification nếu có
          const io = req.app.get('io');
          if (io) {
            recipients.forEach(userId => {
              io.to(`user_${userId.toString()}`).emit('newNotification', {
                type: status === 'cancelled' ? 'meeting_cancelled' : 'meeting_postponed',
                title: notificationTitle,
                message: notificationMessage,
                data: { meetingId: updatedMeeting._id },
                sender: {
                  _id: req.user._id,
                  fullName: req.user.fullName,
                  avatar: req.user.avatar
                }
              });
            });
          }
        }
      } catch (notifError) {
        console.error('Error sending status change notifications:', notifError);
        // Không fail request nếu notification lỗi
      }
    }

    res.json({
      message: 'Cập nhật cuộc họp thành công',
      meeting: updatedMeeting
    });

  } catch (error) {
    console.error('Update meeting error:', error);
    res.status(500).json({
      message: 'Lỗi server khi cập nhật cuộc họp',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   PUT /api/meetings/:id/room-approval
// @desc    Kỹ thuật duyệt hoặc từ chối phòng họp
// @access  Technician/Admin/Assistant
router.put('/:id/room-approval', authenticateToken, requireTechnicianOrAdmin, async (req, res) => {
  try {
    const { status, note } = req.body; // approved | rejected
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Trạng thái không hợp lệ' });
    }
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) return res.status(404).json({ message: 'Cuộc họp không tồn tại' });
    if (!meeting.room) return res.status(400).json({ message: 'Cuộc họp không có phòng để duyệt' });

    meeting.roomApproval = {
      status,
      approvedBy: req.user._id,
      approvedAt: new Date(),
      note: note || ''
    };
    await meeting.save();

    res.json({ message: 'Cập nhật phê duyệt phòng thành công', meeting });
  } catch (error) {
    console.error('Room approval error:', error);
    res.status(500).json({ message: 'Lỗi server khi duyệt phòng', error: error.message });
  }
});

// @route   DELETE /api/meetings/:id
// @desc    Xóa cuộc họp
// @access  Private
router.delete('/:id', authenticateToken, checkResourceOwnership('organizer'), async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    
    if (!meeting) {
      return res.status(404).json({
        message: 'Cuộc họp không tồn tại'
      });
    }

    // Kiểm tra quyền xóa
    if (req.user.role !== 'admin' && !isUserMatch(meeting.organizer, req.user._id)) {
      return res.status(403).json({
        message: 'Chỉ người tổ chức hoặc admin mới có thể xóa cuộc họp'
      });
    }

    // Không cho phép xóa cuộc họp đang diễn ra hoặc đã hoàn thành
    if (meeting.status === 'ongoing' || meeting.status === 'completed') {
      return res.status(400).json({
        message: 'Không thể xóa cuộc họp đang diễn ra hoặc đã hoàn thành'
      });
    }

    await Meeting.findByIdAndDelete(req.params.id);

    res.json({
      message: 'Xóa cuộc họp thành công'
    });

  } catch (error) {
    console.error('Delete meeting error:', error);
    res.status(500).json({
      message: 'Lỗi server khi xóa cuộc họp',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   PUT /api/meetings/:id/respond
// @desc    Phản hồi lời mời tham gia cuộc họp
// @access  Private
router.put('/:id/respond', authenticateToken, [
  body('status')
    .isIn(['accepted', 'declined', 'tentative'])
    .withMessage('Trạng thái phản hồi không hợp lệ')
], handleValidationErrors, async (req, res) => {
  try {
    const { status } = req.body;
    const meeting = await Meeting.findById(req.params.id);
    
    if (!meeting) {
      return res.status(404).json({
        message: 'Cuộc họp không tồn tại'
      });
    }

    // Kiểm tra user có trong danh sách attendees không
    const attendeeIndex = meeting.attendees.findIndex(
      att => att.user.toString() === req.user._id.toString()
    );

    if (attendeeIndex === -1) {
      return res.status(400).json({
        message: 'Bạn không có trong danh sách tham gia cuộc họp này'
      });
    }

    // Cập nhật status
    meeting.attendees[attendeeIndex].status = status;
    meeting.attendees[attendeeIndex].responseDate = new Date();
    
    await meeting.save();

    res.json({
      message: `Phản hồi lời mời thành công: ${status}`,
      meeting
    });

  } catch (error) {
    console.error('Respond meeting error:', error);
    res.status(500).json({
      message: 'Lỗi server khi phản hồi lời mời',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   POST /api/meetings/:id/messages
// @desc    Gửi lời nhắn đến organizer/admin
// @access  Private
router.post('/:id/messages', authenticateToken, [
  body('text').trim().isLength({ min:1, max:1000 }).withMessage('Nội dung lời nhắn phải từ 1-1000 ký tự')
], handleValidationErrors, async (req, res)=>{
  try {
    const meeting = await Meeting.findById(req.params.id);
    if(!meeting) return res.status(404).json({ message:'Cuộc họp không tồn tại' });

    meeting.messages.push({ sender: req.user._id, text: req.body.text });
    await meeting.save();

    res.status(201).json({ message:'Gửi lời nhắn thành công' });
  } catch(err){
    console.error('Add message error:', err);
    res.status(500).json({ message:'Lỗi server khi gửi lời nhắn'});
  }
});

// @route GET /api/meetings/summary
router.get('/summary/stats', authenticateToken, async (req,res)=>{
  try{
    const userDept = req.user.department;
    const baseMatch = { department: userDept }; // chỉ lấy cùng phòng ban

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()+1);

    const [todayCount, upcomingCount, completedCount] = await Promise.all([
      Meeting.countDocuments({ ...baseMatch, startTime:{ $gte: startOfToday, $lt: endOfToday } }),
      Meeting.countDocuments({ ...baseMatch, startTime:{ $gt: now } }),
      Meeting.countDocuments({ ...baseMatch, status:'completed' })
    ]);

    res.json({ today: todayCount, upcoming: upcomingCount, completed: completedCount });
  }catch(err){
    res.status(500).json({ message:'Lỗi server khi lấy thống kê' });
  }
});

// @route   PUT /api/meetings/:id/close
// @desc    Đóng cuộc họp thủ công
// @access  Private (Admin, Manager, Secretary)
router.put('/:id/close', authenticateToken, async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    
    if (!meeting) {
      return res.status(404).json({
        message: 'Cuộc họp không tồn tại'
      });
    }

    // Kiểm tra quyền: Admin, Assistant, Manager hoặc người tổ chức
    const canClose = 
      req.user.role === 'admin' ||
      req.user.role === 'assistant' ||
      req.user.role === 'manager' ||
      (req.user.role === 'secretary' && meeting.organizer.toString() === req.user._id.toString()) ||
      meeting.organizer.toString() === req.user._id.toString();

    if (!canClose) {
      return res.status(403).json({
        message: 'Bạn không có quyền đóng cuộc họp này'
      });
    }

    // Kiểm tra trạng thái cuộc họp
    if (meeting.status === 'completed') {
      return res.status(400).json({
        message: 'Cuộc họp đã được đóng'
      });
    }

    if (meeting.status === 'cancelled') {
      return res.status(400).json({
        message: 'Cuộc họp đã bị hủy'
      });
    }

    // Cập nhật trạng thái và thời gian kết thúc thực tế
    meeting.status = 'completed';
    meeting.actualEndTime = new Date();
    await meeting.save();

    // Populate để trả về thông tin đầy đủ
    await meeting.populate([
      { path: 'organizer', select: 'fullName email avatar position department role' },
      { path: 'attendees.user', select: 'fullName email avatar position department role' }
    ]);

    res.json({
      message: 'Đã đóng cuộc họp thành công',
      meeting
    });

  } catch (error) {
    console.error('Close meeting error:', error);
    res.status(500).json({
      message: 'Lỗi server khi đóng cuộc họp',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   POST /api/meetings/:id/files
// @desc    Upload file đính kèm cho cuộc họp
// @access  Private
router.post('/:id/files', authenticateToken, upload.single('file'), handleUploadError, async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    
    if (!meeting) {
      return res.status(404).json({
        message: 'Cuộc họp không tồn tại'
      });
    }

    // Kiểm tra quyền upload: attendees hoặc organizer
    const canUpload = 
      meeting.organizer.toString() === req.user._id.toString() ||
      meeting.attendees.some(att => att.user.toString() === req.user._id.toString()) ||
      req.user.role === 'admin' ||
      req.user.role === 'assistant';

    if (!canUpload) {
      return res.status(403).json({
        message: 'Bạn không có quyền upload file cho cuộc họp này'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        message: 'Vui lòng chọn file để upload'
      });
    }

    // Xử lý encoding UTF-8 cho tên file
    let originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
    try {
      // Thử decode UTF-8 nếu có vấn đề encoding
      if (Buffer.isEncoding('utf8')) {
        const buffer = Buffer.from(originalName, 'latin1');
        originalName = buffer.toString('utf8');
      }
    } catch (error) {
      console.log('File name encoding fix failed, using original:', originalName);
    }

    // Thêm thông tin file vào meeting
    const attachment = {
      name: originalName,
      originalName: Buffer.from(req.file.originalname, 'latin1').toString('utf8'), // Lưu tên gốc để backup
      path: `/uploads/meetings/${req.file.filename}`,
      size: req.file.size,
      uploadedBy: req.user._id,
      uploadedAt: new Date()
    };

    // Fix cho meeting cũ không có createdBy
    fixMeetingCreatedBy(meeting);

    meeting.attachments.push(attachment);
    await meeting.save();

    // Lấy attachment đã được lưu với _id
    const savedAttachment = meeting.attachments[meeting.attachments.length - 1];

    res.json({
      message: 'Upload file thành công',
      attachment: {
        ...savedAttachment.toObject(),
        uploadedBy: {
          _id: req.user._id,
          fullName: req.user.fullName
        }
      }
    });

  } catch (error) {
    console.error('Upload file error:', error);
    
    // Xóa file nếu có lỗi
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting file:', unlinkError);
      }
    }
    
    res.status(500).json({
      message: 'Lỗi server khi upload file',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   POST /api/meetings/:id/files/register
// @desc    Đăng ký một file có sẵn (đã được lưu vào uploads) vào danh sách attachments của meeting để cấp _id
// @access  Private
router.post('/:id/files/register', authenticateToken, async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) {
      return res.status(404).json({ message: 'Cuộc họp không tồn tại' });
    }

    const { name, path: filePath, size } = req.body || {};
    if (!name || !filePath) {
      return res.status(400).json({ message: 'Thiếu thông tin file (name, path)' });
    }

    if (!Array.isArray(meeting.attachments)) meeting.attachments = [];

    const att = {
      name,
      path: filePath.startsWith('/uploads') ? filePath : `/uploads${filePath.startsWith('/') ? '' : '/'}${filePath}`,
      size: Number(size) || 0,
      uploadedBy: req.user?._id,
      uploadedAt: new Date()
    };

    meeting.attachments.push(att);
    await meeting.save();

    const created = meeting.attachments[meeting.attachments.length - 1];
    return res.status(201).json({
      message: 'Đăng ký file thành công',
      file: created,
      fileId: created._id
    });
  } catch (e) {
    console.error('register file error:', e);
    return res.status(500).json({ message: 'Lỗi server khi đăng ký file' });
  }
});

// @route   POST /api/meetings/:id/archive/documents/register
// @desc    Đẩy một file (name, path, size) vào mục tài liệu của bản lưu trữ (Archive) hiện tại của cuộc họp
// @access  Private
router.post('/:id/archive/documents/register', authenticateToken, async (req, res) => {
  try {
    const meetingId = req.params.id;
    const { name, path: filePath, size, type } = req.body || {};
    if (!name || !filePath) {
      return res.status(400).json({ message: 'Thiếu thông tin file (name, path)' });
    }
    const archive = await require('../models/Archive').findOne({ meeting: meetingId });
    if (!archive) {
      return res.status(404).json({ message: 'Chưa có bản lưu trữ cho cuộc họp này' });
    }

    if (!Array.isArray(archive.documents)) archive.documents = [];
    const doc = {
      name,
      originalPath: filePath,
      archivePath: filePath,
      size: Number(size) || 0,
      type: type || 'minutes_attachment',
      uploadedBy: req.user?._id,
      uploadedAt: new Date()
    };
    archive.documents.push(doc);
    archive.statistics = archive.statistics || { totalDocuments: 0, totalSize: 0 };
    archive.statistics.totalDocuments = (archive.statistics.totalDocuments || 0) + 1;
    archive.statistics.totalSize = (archive.statistics.totalSize || 0) + (Number(size) || 0);
    await archive.save();

    return res.status(201).json({ message: 'Đã thêm vào tài liệu lưu trữ', document: archive.documents[archive.documents.length - 1] });
  } catch (e) {
    console.error('register archive document error:', e);
    return res.status(500).json({ message: 'Lỗi server khi thêm tài liệu vào lưu trữ' });
  }
});

// @route   DELETE /api/meetings/:id/files/:fileId
// @desc    Xóa file đính kèm
// @access  Private
router.delete('/:id/files/:fileId', authenticateToken, async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    
    if (!meeting) {
      return res.status(404).json({
        message: 'Cuộc họp không tồn tại'
      });
    }

    // Kiểm tra quyền xóa: người upload, organizer hoặc admin
    const fileIndex = meeting.attachments.findIndex(
      att => att._id.toString() === req.params.fileId
    );

    if (fileIndex === -1) {
      return res.status(404).json({
        message: 'File không tồn tại'
      });
    }

    const attachment = meeting.attachments[fileIndex];
    
    const canDelete = 
      attachment.uploadedBy?.toString() === req.user._id.toString() ||
      meeting.organizer.toString() === req.user._id.toString() ||
      req.user.role === 'admin' ||
      req.user.role === 'assistant';

    if (!canDelete) {
      return res.status(403).json({
        message: 'Bạn không có quyền xóa file này'
      });
    }

    // Xóa file từ server
    const filePath = path.join(__dirname, '../', attachment.path);
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error('Error deleting file from disk:', error);
    }

    // Fix cho meeting cũ không có createdBy
    fixMeetingCreatedBy(meeting);

    // Xóa attachment từ database
    meeting.attachments.splice(fileIndex, 1);
    await meeting.save();

    res.json({
      message: 'Xóa file thành công'
    });

  } catch (error) {
    console.error('Delete attachment error:', error);
    res.status(500).json({
      message: 'Lỗi server khi xóa file',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   POST /api/meetings/:id/summary-image
// @desc    Upload ảnh tóm tắt cuộc họp
// @access  Private (Secretary, Manager, Admin)
router.post('/:id/summary-image', authenticateToken, upload.single('summaryImage'), handleUploadError, async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    
    if (!meeting) {
      return res.status(404).json({
        message: 'Cuộc họp không tồn tại'
      });
    }

    // Kiểm tra quyền upload summary: secretary, manager, admin, assistant hoặc organizer
    const canUploadSummary = 
      req.user.role === 'admin' ||
      req.user.role === 'assistant' ||
      req.user.role === 'manager' ||
      req.user.role === 'secretary' ||
      meeting.organizer.toString() === req.user._id.toString();

    if (!canUploadSummary) {
      return res.status(403).json({
        message: 'Bạn không có quyền upload ảnh tóm tắt cuộc họp'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        message: 'Vui lòng chọn ảnh để upload'
      });
    }

    // Kiểm tra file phải là ảnh
    const imageTypes = /jpeg|jpg|png|gif/;
    const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
    const isImage = imageTypes.test(path.extname(originalName).toLowerCase());
    
    if (!isImage) {
      fs.unlinkSync(req.file.path); // Xóa file không hợp lệ
      return res.status(400).json({
        message: 'File phải là ảnh (JPEG, JPG, PNG, GIF)'
      });
    }

    // Xóa ảnh cũ nếu có
    if (meeting.summaryImage) {
      const oldImagePath = path.join(__dirname, '../', meeting.summaryImage);
      try {
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      } catch (error) {
        console.error('Error deleting old summary image:', error);
      }
    }

    // Cập nhật đường dẫn ảnh tóm tắt
    meeting.summaryImage = `/uploads/meetings/${req.file.filename}`;
    await meeting.save();

    res.json({
      message: 'Upload ảnh tóm tắt thành công',
      imageUrl: meeting.summaryImage
    });

  } catch (error) {
    console.error('Upload summary image error:', error);
    
    // Xóa file nếu có lỗi
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting file:', unlinkError);
      }
    }
    
    res.status(500).json({
      message: 'Lỗi server khi upload ảnh tóm tắt',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   DELETE /api/meetings/:id/summary-image
// @desc    Xóa ảnh tóm tắt cuộc họp
// @access  Private (Secretary, Manager, Admin)
router.delete('/:id/summary-image', authenticateToken, async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    
    if (!meeting) {
      return res.status(404).json({
        message: 'Cuộc họp không tồn tại'
      });
    }

    // Kiểm tra quyền xóa ảnh summary
    const canDeleteSummaryImage = 
      req.user.role === 'admin' ||
      req.user.role === 'assistant' ||
      req.user.role === 'manager' ||
      req.user.role === 'secretary' ||
      meeting.organizer.toString() === req.user._id.toString();

    if (!canDeleteSummaryImage) {
      return res.status(403).json({
        message: 'Bạn không có quyền xóa ảnh tóm tắt cuộc họp'
      });
    }

    // Xóa file ảnh nếu có
    if (meeting.summaryImage) {
      const imagePath = path.join(__dirname, '../', meeting.summaryImage);
      try {
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      } catch (error) {
        console.error('Error deleting summary image file:', error);
      }
    }

    // Xóa đường dẫn ảnh trong database
    meeting.summaryImage = null;
    await meeting.save();

    res.json({
      message: 'Xóa ảnh tóm tắt thành công'
    });

  } catch (error) {
    console.error('Delete summary image error:', error);
    res.status(500).json({
      message: 'Lỗi server khi xóa ảnh tóm tắt',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   PUT /api/meetings/:id/summary
// @desc    Cập nhật tóm tắt cuộc họp
// @access  Private (Secretary, Manager, Admin)
router.put('/:id/summary', authenticateToken, [
  body('summary').optional().trim().isLength({ max: 5000 }).withMessage('Tóm tắt không được vượt quá 5000 ký tự')
], handleValidationErrors, async (req, res) => {
  try {
    console.log('=== BACKEND SUMMARY UPDATE ===');
    console.log('Meeting ID:', req.params.id);
    console.log('Request body:', req.body);
    console.log('User:', req.user.fullName, req.user.role);
    
    const meeting = await Meeting.findById(req.params.id);
    
    if (!meeting) {
      console.log('Meeting not found!');
      return res.status(404).json({
        message: 'Cuộc họp không tồn tại'
      });
    }

    console.log('Current meeting summary:', meeting.summary);

    // Kiểm tra quyền cập nhật summary
    const canUpdateSummary = 
      req.user.role === 'admin' ||
      req.user.role === 'assistant' ||
      req.user.role === 'manager' ||
      req.user.role === 'secretary' ||
      meeting.organizer.toString() === req.user._id.toString();

    console.log('Can update summary:', canUpdateSummary);

    if (!canUpdateSummary) {
      return res.status(403).json({
        message: 'Bạn không có quyền cập nhật tóm tắt cuộc họp'
      });
    }

    const oldSummary = meeting.summary;
    meeting.summary = req.body.summary;
    await meeting.save();

    console.log('Summary updated from:', JSON.stringify(oldSummary));
    console.log('Summary updated to:', JSON.stringify(meeting.summary));

    res.json({
      message: 'Cập nhật tóm tắt cuộc họp thành công',
      summary: meeting.summary
    });

  } catch (error) {
    console.error('Update summary error:', error);
    res.status(500).json({
      message: 'Lỗi server khi cập nhật tóm tắt',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});


// @route   POST /api/meetings/:id/invite
// @desc    Mời thêm người tham gia cuộc họp
// @access  Private (Organizer, Admin, Manager)
router.post('/:id/invite', authenticateToken, [
  body('email').isEmail().withMessage('Email không hợp lệ')
], handleValidationErrors, async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    
    if (!meeting) {
      return res.status(404).json({
        message: 'Cuộc họp không tồn tại'
      });
    }

    // Kiểm tra quyền mời
    const isOrganizer = meeting.organizer.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    const isManager = req.user.role === 'manager';
    const isSecretary = req.user.role === 'secretary';
    const isAssistant = req.user.role === 'assistant';
    const canInvite = isOrganizer || isAdmin || isManager || isSecretary || isAssistant;

    

    if (!canInvite) {
      return res.status(403).json({
        message: `Bạn không có quyền mời người tham gia cuộc họp này. Chỉ người tổ chức, admin, manager, assistant, technician hoặc secretary mới có thể mời.`
      });
    }

    // Tìm user theo email
    const User = require('../models/User');
    const userToInvite = await User.findOne({ email: req.body.email });
    
    if (!userToInvite) {
      return res.status(404).json({
        message: 'Không tìm thấy người dùng với email này'
      });
    }

    // Kiểm tra user đã được mời chưa
    const alreadyInvited = meeting.attendees.some(
      att => att.user.toString() === userToInvite._id.toString()
    );

    if (alreadyInvited) {
      return res.status(400).json({
        message: 'Người dùng đã được mời tham gia cuộc họp này'
      });
    }

    // Thêm vào danh sách attendees
    meeting.attendees.push({
      user: userToInvite._id,
      status: 'invited'
    });

    await meeting.save();

    // Gửi thông báo cho người được mời
    try {
      const notification = await Notification.create({
        recipient: userToInvite._id,
        sender: req.user._id,
        type: 'meeting_invite',
        title: 'Lời mời tham gia cuộc họp',
        message: `${req.user.fullName} đã mời bạn tham gia cuộc họp "${meeting.title}"`,
        data: { meetingId: meeting._id }
      });

      // Gửi real-time notification
      const io = req.app.get('io');
      if (io) {
        await notification.populate('sender', 'fullName email avatar position');
        io.to(`user_${userToInvite._id.toString()}`).emit('newNotification', notification);
      }
    } catch (notifError) {
      console.error('Error sending notification:', notifError);
    }

    res.json({
      message: 'Mời người tham gia thành công',
      invitedUser: {
        _id: userToInvite._id,
        fullName: userToInvite.fullName,
        email: userToInvite.email
      }
    });

  } catch (error) {
    console.error('Invite user error:', error);
    res.status(500).json({
      message: 'Lỗi server khi mời người tham gia',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   DELETE /api/meetings/:id/attendees/:userId
// @desc    Loại bỏ người tham gia khỏi cuộc họp
// @access  Private (Organizer, Admin, Manager)
router.delete('/:id/attendees/:userId', authenticateToken, async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    
    if (!meeting) {
      return res.status(404).json({
        message: 'Cuộc họp không tồn tại'
      });
    }

    // Kiểm tra quyền remove attendee
    const canRemove = 
      meeting.organizer.toString() === req.user._id.toString() ||
      req.user.role === 'admin' ||
      req.user.role === 'manager' ||
      req.user.role === 'secretary' ||
      req.user.role === 'assistant';

    if (!canRemove) {
      return res.status(403).json({
        message: 'Bạn không có quyền loại bỏ người tham gia khỏi cuộc họp này. Chỉ người tổ chức, admin, manager, assistant, technician hoặc secretary mới có thể xóa người tham gia.'
      });
    }

    // Kiểm tra không thể remove chính người tổ chức
    if (meeting.organizer.toString() === req.params.userId) {
      return res.status(400).json({
        message: 'Không thể loại bỏ người tổ chức khỏi cuộc họp'
      });
    }

    // Tìm attendee trong danh sách
    const attendeeIndex = meeting.attendees.findIndex(
      att => att.user.toString() === req.params.userId
    );

    if (attendeeIndex === -1) {
      return res.status(404).json({
        message: 'Người dùng không có trong danh sách tham gia cuộc họp'
      });
    }

    // Lấy thông tin attendee trước khi xóa
    const removedAttendee = meeting.attendees[attendeeIndex];
    
    // Xóa khỏi danh sách attendees
    meeting.attendees.splice(attendeeIndex, 1);
    await meeting.save();

    // Populate để trả về thông tin đầy đủ
    await meeting.populate([
      { path: 'organizer', select: 'fullName email avatar position department role' },
      { path: 'attendees.user', select: 'fullName email avatar position department role' }
    ]);

    res.json({
      message: 'Loại bỏ người tham gia thành công',
      meeting
    });

  } catch (error) {
    console.error('Remove attendee error:', error);
    res.status(500).json({
      message: 'Lỗi server khi loại bỏ người tham gia',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   GET /api/meetings/:id/files/:fileId/download
// @desc    Tải xuống file đính kèm
// @access  Public (với optional token check)
router.get('/:id/files/:fileId/download', async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    
    if (!meeting) {
      return res.status(404).json({
        message: 'Cuộc họp không tồn tại'
      });
    }

    // Public download - không cần kiểm tra quyền
    console.log('🔧 [DOWNLOAD] Public download access - no authentication required');

    // Tìm file trong attachments
    const attachment = meeting.attachments.find(
      att => att._id.toString() === req.params.fileId
    );

    if (!attachment) {
      return res.status(404).json({
        message: 'File không tồn tại'
      });
    }

    // Đường dẫn file trên server
    const filePath = path.join(__dirname, '../', attachment.path);
    
    // Kiểm tra file có tồn tại không
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        message: 'File không tìm thấy trên server'
      });
    }

    // Xác định MIME type nhưng luôn force download
    const ext = path.extname(attachment.name).toLowerCase();
    let mimeType = 'application/octet-stream'; // Default to force download
    
    const mimeTypes = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.txt': 'text/plain',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    };

    if (mimeTypes[ext]) {
      mimeType = mimeTypes[ext];
    }

    // Kiểm tra file có thể hiển thị inline không
    const viewableTypes = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.svg', '.txt', '.html'];
    const canViewInline = viewableTypes.includes(ext);
    
    console.log(`📖 [DOWNLOAD] File: ${attachment.name} (${ext}), Can view inline: ${canViewInline}`);

    // Set headers để hiển thị inline - FIX TRIỆT ĐỂ
    // Xóa tất cả cache headers có thể gây conflict
    res.removeHeader('Cache-Control');
    res.removeHeader('Pragma');
    res.removeHeader('Expires');
    
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (canViewInline) {
      // GIẢI PHÁP ĐƠN GIẢN: Chỉ set Content-Type, KHÔNG set Content-Disposition
      // Để browser tự quyết định cách hiển thị
      res.setHeader('Content-Type', mimeType);
      
      // KHÔNG set Content-Disposition - để browser tự động hiển thị inline
      console.log('✅ [DOWNLOAD] Setting ONLY Content-Type:', mimeType, '- NO Content-Disposition');
    } else {
      // Force download cho file không thể xem
    res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${attachment.name}"`);
      console.log('⬇️ [DOWNLOAD] Setting ATTACHMENT disposition for non-viewable file');
    }
    
    // Stream file về client
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('Download file error:', error);
    res.status(500).json({
      message: 'Lỗi server khi tải file',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   GET /api/meetings/:id/files/:fileId/direct
// @desc    Direct file access for testing (bypass permission temporarily)
// @access  Public (với token trong query)
router.get('/:id/files/:fileId/direct', async (req, res) => {
  const authToken = req.query.token;
  
  if (!authToken) {
    return res.status(401).json({
      message: 'Access token không tồn tại'
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(authToken, process.env.JWT_SECRET);
    req.user = decoded;
    
    console.log('🔍 [DIRECT] User role:', req.user.role);
    console.log('🔍 [DIRECT] User ID:', req.user._id);
    
    const meeting = await Meeting.findById(req.params.id);
    
    if (!meeting) {
      return res.status(404).json({
        message: 'Cuộc họp không tồn tại'
      });
    }
    
    if (!meeting.attachments) meeting.attachments = [];
    
    console.log('🔍 [DIRECT] Looking for file:', req.params.fileId);
    console.log('🔍 [DIRECT] Available files:', meeting.attachments.map(att => att._id?.toString()));
    
    let attachment = meeting.attachments.find(
      att => att._id && att._id.toString() === req.params.fileId
    );

    if (!attachment) {
      return res.status(404).json({
        message: 'File không tồn tại'
      });
    }

    const filePath = path.join(__dirname, '../', attachment.path);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        message: 'File không tìm thấy trên server'
      });
    }

    // Set headers
    const ext = path.extname(attachment.name).toLowerCase();
    let mimeType = 'application/octet-stream';
    
    const mimeTypes = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.txt': 'text/plain',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    };

    if (mimeTypes[ext]) {
      mimeType = mimeTypes[ext];
    }

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${attachment.name}"`);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('Direct file access error:', error);
    return res.status(500).json({
      message: 'Lỗi server khi serve file',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   GET /api/meetings/:id/files/:fileId/public
// @desc    Serve file công khai cho external viewer (Google Docs, Office Online)
// @access  Public (với token trong query)
router.get('/:id/files/:fileId/public', async (req, res) => {
  // Kiểm tra token từ query parameter
  const authToken = req.query.token;
  
  if (!authToken) {
    return res.status(401).json({
      message: 'Access token không tồn tại'
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(authToken, process.env.JWT_SECRET);
    req.user = decoded;
  } catch (error) {
    return res.status(401).json({
      message: 'Token không hợp lệ'
    });
  }

  try {
    const meeting = await Meeting.findById(req.params.id);
    
    if (!meeting) {
      return res.status(404).json({
        message: 'Cuộc họp không tồn tại'
      });
    }
    
    // Đảm bảo attachments là array
    if (!meeting.attachments) meeting.attachments = [];
    
    // Debug thông tin user và meeting
    console.log('🔍 [PUBLIC] Current user ID:', req.user._id);
    console.log('🔍 [PUBLIC] Current user role:', req.user.role);
    console.log('🔍 [PUBLIC] Meeting organizer:', meeting.organizer);
    console.log('🔍 [PUBLIC] Meeting attendees:', meeting.attendees?.map(att => ({
      user: att.user,
      status: att.status
    })));
    
    // Kiểm tra quyền truy cập file
    const isOrganizer = isUserMatch(meeting.organizer, req.user._id);
    const isAttendee = meeting.attendees && meeting.attendees.some(att => isUserMatch(att.user, req.user._id));
    const isAdmin = req.user.role === 'admin';
    
    console.log('🔍 [PUBLIC] Is organizer:', isOrganizer);
    console.log('🔍 [PUBLIC] Is attendee:', isAttendee);
    console.log('🔍 [PUBLIC] Is admin:', isAdmin);
    
    // Permission check đã được bỏ - tất cả user có thể xem file
    console.log('✅ [PUBLIC] Permission check bypassed - allowing access');
    console.log('🔍 [PUBLIC] User:', req.user._id, 'Role:', req.user.role);

    // Tìm file
    console.log('🔍 [PUBLIC] Looking for file ID:', req.params.fileId);
    console.log('🔍 [PUBLIC] Available attachments:', meeting.attachments?.map(att => ({
      id: att._id?.toString(),
      name: att.name,
      path: att.path
    })));
    
    let attachment = meeting.attachments.find(
      att => att._id && att._id.toString() === req.params.fileId
    );
    
    console.log('🔍 [PUBLIC] Found attachment:', attachment ? {
      id: attachment._id?.toString(),
      name: attachment.name,
      path: attachment.path
    } : null);

    if (!attachment) {
      console.log('❌ [PUBLIC] File not found');
      return res.status(404).json({
        message: 'File không tồn tại'
      });
    }

    // Đường dẫn file trên server
    const filePath = path.join(__dirname, '../', attachment.path);
    
    // Kiểm tra file có tồn tại không
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        message: 'File không tìm thấy trên server'
      });
    }

    // Set headers để serve file
    const ext = path.extname(attachment.name).toLowerCase();
    let mimeType = 'application/octet-stream';
    
    const mimeTypes = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.txt': 'text/plain',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    };

    if (mimeTypes[ext]) {
      mimeType = mimeTypes[ext];
    }

    // Set headers để external viewer có thể truy cập
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${attachment.name}"`);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Stream file về client
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('Serve public file error:', error);
    res.status(500).json({
      message: 'Lỗi server khi serve file',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   GET /api/meetings/:id/files/:fileId/open
// @desc    Mở file để xem (public access)
// @access  Public
router.get('/:id/files/:fileId/open', async (req, res) => {
  console.log('🔧 [OPEN] Public file access - no authentication');
  console.log('🔍 [OPEN] Meeting ID:', req.params.id);
  console.log('🔍 [OPEN] File ID:', req.params.fileId);

  try {
    const meeting = await Meeting.findById(req.params.id);
    
    if (!meeting) {
      return res.status(404).json({
        message: 'Cuộc họp không tồn tại'
      });
    }
    
    if (!meeting.attachments) meeting.attachments = [];
    
    let attachment = meeting.attachments.find(
      att => att._id && att._id.toString() === req.params.fileId
    );

    if (!attachment) {
      return res.status(404).json({
        message: 'File không tồn tại'
      });
    }

    const filePath = path.join(__dirname, '../', attachment.path);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        message: 'File không tìm thấy trên server'
      });
    }

    // Xác định MIME type đơn giản cho force download
    const ext = path.extname(attachment.name).toLowerCase();
    let mimeType = 'application/octet-stream';
    
    const mimeTypes = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.txt': 'text/plain',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };

    if (mimeTypes[ext]) {
      mimeType = mimeTypes[ext];
    }

    console.log(`⬇️ [OPEN] File: ${attachment.name} (${ext}) - Force download (đã đổi chức năng)`);

    // Set headers để force download - TRIỆT ĐỂ
    res.removeHeader('Cache-Control');
    res.removeHeader('Pragma'); 
    res.removeHeader('Expires');
    
    // Force download với octet-stream và attachment
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${attachment.name}"`);
    res.setHeader('Content-Transfer-Encoding', 'binary');
    
    console.log('⬇️ [OPEN] FORCE DOWNLOAD - octet-stream + attachment disposition');
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('Open file error:', error);
    res.status(500).json({
      message: 'Lỗi server khi mở file',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   GET /api/meetings/:id/files/:fileId/simple
// @desc    Route đơn giản nhất để test inline display
// @access  Public
router.get('/:id/files/:fileId/simple', async (req, res) => {
  try {
    console.log('🔬 [SIMPLE] Testing simplest possible inline display');
    
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    const attachment = meeting.attachments.find(att => att._id.toString() === req.params.fileId);
    if (!attachment) {
      return res.status(404).json({ message: 'File not found' });
    }

    const filePath = path.join(__dirname, '../', attachment.path);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found on server' });
    }

    const ext = path.extname(attachment.name).toLowerCase();
    console.log(`🔬 [SIMPLE] File: ${attachment.name}, Extension: ${ext}`);
    
    // CHỈ set Content-Type, KHÔNG set gì khác
    if (ext === '.pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      console.log('🔬 [SIMPLE] Set Content-Type: application/pdf');
    } else if (['.jpg', '.jpeg'].includes(ext)) {
      res.setHeader('Content-Type', 'image/jpeg');
      console.log('🔬 [SIMPLE] Set Content-Type: image/jpeg');
    } else if (ext === '.png') {
      res.setHeader('Content-Type', 'image/png');
      console.log('🔬 [SIMPLE] Set Content-Type: image/png');
    } else {
      res.setHeader('Content-Type', 'application/octet-stream');
      console.log('🔬 [SIMPLE] Set Content-Type: application/octet-stream');
    }
    
    console.log('🔬 [SIMPLE] NO other headers set - browser should display inline');
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('Simple test error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/meetings/:id/files/:fileId/force-inline
// @desc    Force inline display với Content-Disposition: inline
// @access  Public
router.get('/:id/files/:fileId/force-inline', async (req, res) => {
  try {
    console.log('🎯 [FORCE-INLINE] Force inline display with Content-Disposition: inline');
    
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    const attachment = meeting.attachments.find(att => att._id.toString() === req.params.fileId);
    if (!attachment) {
      return res.status(404).json({ message: 'File not found' });
    }

    const filePath = path.join(__dirname, '../', attachment.path);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found on server' });
    }

    const ext = path.extname(attachment.name).toLowerCase();
    console.log(`🎯 [FORCE-INLINE] File: ${attachment.name}, Extension: ${ext}`);
    
    // Set Content-Type và Content-Disposition: inline
    if (ext === '.pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline');
      console.log('🎯 [FORCE-INLINE] Set Content-Type: application/pdf, Content-Disposition: inline');
    } else if (['.jpg', '.jpeg'].includes(ext)) {
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Content-Disposition', 'inline');
      console.log('🎯 [FORCE-INLINE] Set Content-Type: image/jpeg, Content-Disposition: inline');
    } else if (ext === '.png') {
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Disposition', 'inline');
      console.log('🎯 [FORCE-INLINE] Set Content-Type: image/png, Content-Disposition: inline');
    } else {
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', 'attachment');
      console.log('🎯 [FORCE-INLINE] Set Content-Type: application/octet-stream, Content-Disposition: attachment');
    }
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('Force inline error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/meetings/:id/files/:fileId/iframe
// @desc    Hiển thị PDF trong iframe
// @access  Public
router.get('/:id/files/:fileId/iframe', async (req, res) => {
  try {
    console.log('🖼️ [IFRAME] Creating iframe page for PDF display');
    
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) {
      return res.status(404).send('Meeting not found');
    }

    const attachment = meeting.attachments.find(att => att._id.toString() === req.params.fileId);
    if (!attachment) {
      return res.status(404).send('File not found');
    }

    const ext = path.extname(attachment.name).toLowerCase();
    console.log(`🖼️ [IFRAME] File: ${attachment.name}, Extension: ${ext}`);
    
    if (ext !== '.pdf') {
      return res.status(400).send('Only PDF files are supported for iframe display');
    }

    // Tạo HTML page với iframe để hiển thị PDF
    const pdfUrl = `${req.protocol}://${req.get('host')}/api/meetings/${req.params.id}/files/${req.params.fileId}/simple`;
    
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>${attachment.name}</title>
        <style>
            body { margin: 0; padding: 0; }
            iframe { width: 100vw; height: 100vh; border: none; }
        </style>
    </head>
    <body>
        <iframe src="${pdfUrl}" type="application/pdf"></iframe>
    </body>
    </html>
    `;
    
    res.setHeader('Content-Type', 'text/html');
    res.send(html);

  } catch (error) {
    console.error('Iframe error:', error);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/meetings/:id/files/:fileId/pdfjs
// @desc    Hiển thị PDF bằng PDF.js viewer
// @access  Public
router.get('/:id/files/:fileId/pdfjs', async (req, res) => {
  try {
    console.log('📄 [PDFJS] Creating PDF.js viewer page');
    
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) {
      return res.status(404).send('Meeting not found');
    }

    const attachment = meeting.attachments.find(att => att._id.toString() === req.params.fileId);
    if (!attachment) {
      return res.status(404).send('File not found');
    }

    const ext = path.extname(attachment.name).toLowerCase();
    console.log(`📄 [PDFJS] File: ${attachment.name}, Extension: ${ext}`);
    
    if (ext !== '.pdf') {
      return res.status(400).send('Only PDF files are supported');
    }

    // Tạo URL cho PDF file
    const pdfUrl = `${req.protocol}://${req.get('host')}/api/meetings/${req.params.id}/files/${req.params.fileId}/simple`;
    
    // HTML page với PDF.js viewer
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>${attachment.name}</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            body { margin: 0; padding: 0; }
            #viewer { width: 100vw; height: 100vh; }
        </style>
    </head>
    <body>
        <div id="viewer"></div>
        
        <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
        <script>
            // Cấu hình PDF.js
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            
            // Load PDF
            const loadingTask = pdfjsLib.getDocument('${pdfUrl}');
            loadingTask.promise.then(function(pdf) {
                console.log('PDF loaded');
                
                // Hiển thị trang đầu tiên
                pdf.getPage(1).then(function(page) {
                    const scale = 1.5;
                    const viewport = page.getViewport({scale: scale});
                    
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;
                    
                    const renderContext = {
                        canvasContext: context,
                        viewport: viewport
                    };
                    
                    page.render(renderContext).promise.then(function() {
                        document.getElementById('viewer').appendChild(canvas);
                    });
                });
            }).catch(function(error) {
                console.error('Error loading PDF:', error);
                document.getElementById('viewer').innerHTML = '<p style="text-align: center; margin-top: 50px;">Không thể tải PDF. Vui lòng thử tải xuống.</p>';
            });
        </script>
    </body>
    </html>
    `;
    
    res.setHeader('Content-Type', 'text/html');
    res.send(html);

  } catch (error) {
    console.error('PDF.js error:', error);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/meetings/:id/files/:fileId/google-viewer
// @desc    Hiển thị PDF bằng Google Docs Viewer
// @access  Public
router.get('/:id/files/:fileId/google-viewer', async (req, res) => {
  try {
    console.log('🌐 [GOOGLE-VIEWER] Creating Google Docs Viewer page');
    
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) {
      return res.status(404).send('Meeting not found');
    }

    const attachment = meeting.attachments.find(att => att._id.toString() === req.params.fileId);
    if (!attachment) {
      return res.status(404).send('File not found');
    }

    const ext = path.extname(attachment.name).toLowerCase();
    console.log(`🌐 [GOOGLE-VIEWER] File: ${attachment.name}, Extension: ${ext}`);
    
    if (ext !== '.pdf') {
      return res.status(400).send('Only PDF files are supported');
    }

    // Tạo URL cho PDF file
    const pdfUrl = `${req.protocol}://${req.get('host')}/api/meetings/${req.params.id}/files/${req.params.fileId}/simple`;
    
    // HTML page với Google Docs Viewer
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>${attachment.name}</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            body { margin: 0; padding: 0; }
            iframe { width: 100vw; height: 100vh; border: none; }
        </style>
    </head>
    <body>
        <iframe src="https://docs.google.com/gview?url=${encodeURIComponent(pdfUrl)}&embedded=true" 
                width="100%" 
                height="100%" 
                frameborder="0">
        </iframe>
    </body>
    </html>
    `;
    
    res.setHeader('Content-Type', 'text/html');
    res.send(html);

  } catch (error) {
    console.error('Google viewer error:', error);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/meetings/:id/files/:fileId/base64-viewer
// @desc    Hiển thị PDF bằng base64 embedding
// @access  Public
router.get('/:id/files/:fileId/base64-viewer', async (req, res) => {
  try {
    console.log('📄 [BASE64-VIEWER] Creating base64 PDF viewer page');
    
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) {
      return res.status(404).send('Meeting not found');
    }

    const attachment = meeting.attachments.find(att => att._id.toString() === req.params.fileId);
    if (!attachment) {
      return res.status(404).send('File not found');
    }

    const ext = path.extname(attachment.name).toLowerCase();
    console.log(`📄 [BASE64-VIEWER] File: ${attachment.name}, Extension: ${ext}`);
    
    if (ext !== '.pdf') {
      return res.status(400).send('Only PDF files are supported');
    }

    // Đọc file và convert sang base64
    const filePath = path.join(__dirname, '..', attachment.path);
    console.log(`📄 [BASE64-VIEWER] Reading file: ${filePath}`);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).send('File not found on disk');
    }

    const fileBuffer = fs.readFileSync(filePath);
    const base64Data = fileBuffer.toString('base64');
    const dataUrl = `data:application/pdf;base64,${base64Data}`;
    
    console.log(`📄 [BASE64-VIEWER] File size: ${fileBuffer.length} bytes, Base64 length: ${base64Data.length}`);
    
    // HTML page với embedded PDF
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>${attachment.name}</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            body { 
                margin: 0; 
                padding: 0; 
                background: #f0f0f0;
                font-family: Arial, sans-serif;
            }
            .header {
                background: #1976d2;
                color: white;
                padding: 10px 20px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .header h1 {
                margin: 0;
                font-size: 18px;
            }
            iframe { 
                width: 100vw; 
                height: calc(100vh - 60px); 
                border: none; 
                background: white;
            }
            .loading {
                text-align: center;
                padding: 50px;
                color: #666;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>📄 ${attachment.name}</h1>
        </div>
        <div class="loading" id="loading">Đang tải PDF...</div>
        <iframe 
            id="pdfFrame"
            src="${dataUrl}" 
            style="display: none;"
            onload="document.getElementById('loading').style.display='none'; this.style.display='block';">
        </iframe>
    </body>
    </html>
    `;
    
    res.setHeader('Content-Type', 'text/html');
    res.send(html);

  } catch (error) {
    console.error('Base64 viewer error:', error);
    res.status(500).send('Server error: ' + error.message);
  }
});

// @route   GET /api/meetings/:id/files/:fileId/direct-view
// @desc    Hiển thị file trực tiếp trong iframe (sử dụng logic cũ đã hoạt động)
// @access  Public
router.get('/:id/files/:fileId/direct-view', async (req, res) => {
  try {
    console.log('🎯 [DIRECT-VIEW] Creating direct file viewer page');
    
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) {
      return res.status(404).send('Meeting not found');
    }

    const attachment = meeting.attachments.find(att => att._id.toString() === req.params.fileId);
    if (!attachment) {
      return res.status(404).send('File not found');
    }

    const ext = path.extname(attachment.name).toLowerCase();
    console.log(`🎯 [DIRECT-VIEW] File: ${attachment.name}, Extension: ${ext}`);
    
    // Tạo URL trực tiếp đến file (sử dụng static file serving)
    const fileUrl = `${req.protocol}://${req.get('host')}${attachment.path}`;
    console.log(`🎯 [DIRECT-VIEW] File URL: ${fileUrl}`);
    
    // HTML page với iframe
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>${attachment.name}</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            body { 
                margin: 0; 
                padding: 0; 
                background: #f0f0f0;
                font-family: Arial, sans-serif;
            }
            .header {
                background: #1976d2;
                color: white;
                padding: 10px 20px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .header h1 {
                margin: 0;
                font-size: 18px;
            }
            iframe { 
                width: 100vw; 
                height: calc(100vh - 60px); 
                border: none; 
                background: white;
            }
            .loading {
                text-align: center;
                padding: 50px;
                color: #666;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>📄 ${attachment.name}</h1>
        </div>
        <div class="loading" id="loading">Đang tải file...</div>
        <iframe 
            id="fileFrame"
            src="${fileUrl}" 
            style="display: none;"
            onload="document.getElementById('loading').style.display='none'; this.style.display='block';"
            onerror="document.getElementById('loading').innerHTML='Không thể tải file. Vui lòng thử tải xuống.'">
        </iframe>
    </body>
    </html>
    `;
    
    res.setHeader('Content-Type', 'text/html');
    res.send(html);

  } catch (error) {
    console.error('Direct view error:', error);
    res.status(500).send('Server error: ' + error.message);
  }
});

// @route   GET /api/meetings/:id/files/:fileId/edge-view
// @desc    Hiển thị file tối ưu cho Edge browser
// @access  Public
router.get('/:id/files/:fileId/edge-view', async (req, res) => {
  try {
    console.log('🌐 [EDGE-VIEW] Creating Edge-optimized file viewer page');
    
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) {
      return res.status(404).send('Meeting not found');
    }

    const attachment = meeting.attachments.find(att => att._id.toString() === req.params.fileId);
    if (!attachment) {
      return res.status(404).send('File not found');
    }

    const ext = path.extname(attachment.name).toLowerCase();
    console.log(`🌐 [EDGE-VIEW] File: ${attachment.name}, Extension: ${ext}`);
    
    // Tạo URL trực tiếp đến file
    const fileUrl = `${req.protocol}://${req.get('host')}${attachment.path}`;
    console.log(`🌐 [EDGE-VIEW] File URL: ${fileUrl}`);
    
    // HTML page tối ưu cho Edge
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>${attachment.name}</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <style>
            body { 
                margin: 0; 
                padding: 0; 
                background: #f0f0f0;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            }
            .header {
                background: #0078d4;
                color: white;
                padding: 10px 20px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .header h1 {
                margin: 0;
                font-size: 18px;
            }
            .content {
                height: calc(100vh - 60px);
                display: flex;
                flex-direction: column;
            }
            iframe { 
                flex: 1;
                border: none; 
                background: white;
            }
            .loading {
                text-align: center;
                padding: 50px;
                color: #666;
                font-size: 16px;
            }
            .error {
                text-align: center;
                padding: 50px;
                color: #d13438;
                font-size: 16px;
            }
            .fallback {
                text-align: center;
                padding: 20px;
                background: #fff;
                border: 1px solid #ddd;
                margin: 20px;
                border-radius: 4px;
            }
            .fallback a {
                color: #0078d4;
                text-decoration: none;
                font-weight: bold;
            }
            .fallback a:hover {
                text-decoration: underline;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>📄 ${attachment.name}</h1>
        </div>
        <div class="content">
            <div class="loading" id="loading">Đang tải file...</div>
            <iframe 
                id="fileFrame"
                src="${fileUrl}" 
                style="display: none;"
                onload="handleLoad()"
                onerror="handleError()">
            </iframe>
            <div class="fallback" id="fallback" style="display: none;">
                <p>Nếu file không hiển thị, bạn có thể:</p>
                <p><a href="${fileUrl}" target="_blank">Mở file trong tab mới</a></p>
                <p><a href="${API_BASE_URL}/meetings/${req.params.id}/files/${req.params.fileId}/open" target="_blank">Tải xuống file</a></p>
            </div>
        </div>
        
        <script>
            function handleLoad() {
                document.getElementById('loading').style.display = 'none';
                document.getElementById('fileFrame').style.display = 'block';
            }
            
            function handleError() {
                document.getElementById('loading').style.display = 'none';
                document.getElementById('fallback').style.display = 'block';
            }
            
            // Timeout fallback
            setTimeout(function() {
                if (document.getElementById('loading').style.display !== 'none') {
                    handleError();
                }
            }, 10000);
        </script>
    </body>
    </html>
    `;
    
    res.setHeader('Content-Type', 'text/html');
    res.send(html);

  } catch (error) {
    console.error('Edge view error:', error);
    res.status(500).send('Server error: ' + error.message);
  }
});

// @route   GET /api/meetings/:id/files/:fileId/view
// @desc    Xem file đính kèm trong browser
// @access  Private
router.get('/:id/files/:fileId/view', async (req, res) => {
  // Bỏ hoàn toàn authentication check - public access  
  console.log('🔧 [VIEW] Public access - no authentication required');
  req.user = { _id: 'public-user', role: 'admin', email: 'public@test.com' };
  try {
    console.log('🔍 Looking for meeting:', req.params.id);
    console.log('🔍 Looking for file:', req.params.fileId);
    
    const meeting = await Meeting.findById(req.params.id);
    
    if (!meeting) {
      return res.status(404).json({
        message: 'Cuộc họp không tồn tại'
      });
    }
    
    // Đảm bảo attachments là array
    if (!meeting.attachments) meeting.attachments = [];
    if (!meeting.summaryFiles) meeting.summaryFiles = [];
    
    console.log('🔍 Meeting found, attachments count:', meeting.attachments.length);
    console.log('🔍 Summary files count:', meeting.summaryFiles.length);

    // Permission check đã được bỏ - tất cả user có thể xem file
    console.log('✅ [VIEW] Permission check bypassed - allowing access');
    console.log('🔍 [VIEW] User:', req.user._id, 'Role:', req.user.role);

    // Tìm file trong attachments - thử nhiều cách
    console.log('🔍 Searching for file ID:', req.params.fileId);
    console.log('🔍 Available attachments:', meeting.attachments.map(a => ({ id: a._id, name: a.name, path: a.path })));
    
    let attachment = meeting.attachments.find(
      att => att._id && att._id.toString() === req.params.fileId
    );

    if (attachment) {
      console.log('🔍 Found attachment by _id:', attachment);
    } else {
    // Nếu không tìm thấy bằng _id, thử tìm bằng path
      console.log('🔍 Trying to find by path...');
      attachment = meeting.attachments.find(
        att => att.path && att.path.includes(req.params.fileId)
      );
      if (attachment) {
        console.log('🔍 Found attachment by path:', attachment);
      } else {
    // Nếu vẫn không tìm thấy, thử tìm trong summaryFiles
      console.log('🔍 Trying to find in summaryFiles...');
      attachment = meeting.summaryFiles.find(
        att => att._id && att._id.toString() === req.params.fileId
      );
      if (attachment) {
        console.log('🔍 Found attachment in summaryFiles:', attachment);
        }
      }
    }

    if (!attachment) {
      return res.status(404).json({
        message: 'File không tồn tại'
      });
    }

    // Đường dẫn file trên server
    const filePath = path.join(__dirname, '../', attachment.path);
    
    console.log('🔍 File path:', filePath);
    console.log('🔍 Attachment path:', attachment.path);
    console.log('🔍 __dirname:', __dirname);
    
    // Kiểm tra file có tồn tại không
    if (!fs.existsSync(filePath)) {
      console.log('🔍 File not found at path:', filePath);
      return res.status(404).json({
        message: 'File không tìm thấy trên server'
      });
    }

    // Xác định MIME type và khả năng hiển thị inline
    const ext = path.extname(attachment.name).toLowerCase();
    let mimeType = 'application/octet-stream';
    let canViewInline = false;
    
    // Chỉ những file này có thể xem trực tiếp trong browser
    const viewableTypes = {
      '.pdf': { mime: 'application/pdf', inline: true },
      '.jpg': { mime: 'image/jpeg', inline: true },
      '.jpeg': { mime: 'image/jpeg', inline: true },
      '.png': { mime: 'image/png', inline: true },
      '.gif': { mime: 'image/gif', inline: true },
      '.svg': { mime: 'image/svg+xml', inline: true },
      '.txt': { mime: 'text/plain', inline: true },
      '.html': { mime: 'text/html', inline: true },
      '.css': { mime: 'text/css', inline: true },
      '.js': { mime: 'application/javascript', inline: true },
      '.json': { mime: 'application/json', inline: true }
    };

    // File Office và các file khác sẽ được tải về
    const downloadTypes = {
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.zip': 'application/zip',
      '.rar': 'application/x-rar-compressed',
      '.mp4': 'video/mp4',
      '.mp3': 'audio/mpeg'
    };

    if (viewableTypes[ext]) {
      mimeType = viewableTypes[ext].mime;
      canViewInline = viewableTypes[ext].inline;
    } else if (downloadTypes[ext]) {
      mimeType = downloadTypes[ext];
      canViewInline = false;
    }

    console.log(`🔍 [VIEW] File: ${attachment.name}`);
    console.log(`🔍 [VIEW] Extension: ${ext}, MIME: ${mimeType}, Can view inline: ${canViewInline}`);

    // Set headers dựa trên khả năng hiển thị
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    if (canViewInline) {
      // Hiển thị inline trong browser
      res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(attachment.name)}`);
      console.log('✅ [VIEW] Setting INLINE disposition for viewable file');
      console.log(`✅ [VIEW] Headers set - Content-Type: ${mimeType}, Content-Disposition: inline`);
    } else {
      // Force download cho file không thể xem inline
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(attachment.name)}`);
      console.log('⬇️ [VIEW] Setting ATTACHMENT disposition for non-viewable file');
    }
    
    // Stream file về client
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('View file error:', error);
    res.status(500).json({
      message: 'Lỗi server khi xem file',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   POST /api/meetings/:id/summary-message
// @desc    Thêm summary message với attachments
// @access  Private (Secretary, Manager, Admin)
router.post('/:id/summary-message', authenticateToken, upload.array('attachments', 5), handleUploadError, async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    
    if (!meeting) {
      return res.status(404).json({
        message: 'Cuộc họp không tồn tại'
      });
    }

    // Kiểm tra quyền thêm summary message
    const canAddSummary = 
      req.user.role === 'admin' ||
      req.user.role === 'manager' ||
      req.user.role === 'secretary' ||
      meeting.organizer.toString() === req.user._id.toString();

    if (!canAddSummary) {
      return res.status(403).json({
        message: 'Bạn không có quyền thêm tóm tắt cuộc họp'
      });
    }

    const { text } = req.body;
    
    // Kiểm tra có ít nhất text hoặc files
    if (!text && (!req.files || req.files.length === 0)) {
      return res.status(400).json({
        message: 'Vui lòng nhập nội dung hoặc đính kèm file'
      });
    }

    // Xử lý attachments
    const attachments = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        // Xử lý encoding UTF-8 cho tên file
        const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');

        const extension = path.extname(originalName).toLowerCase();
        const imageTypes = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
        
        attachments.push({
          name: originalName,
          originalName: file.originalname, // Lưu tên gốc để backup
          path: `/uploads/meetings/${file.filename}`,
          size: file.size,
          type: imageTypes.includes(extension) ? 'image' : 'file'
        });
      }
    }

    // Tạo summary message
    const summaryMessage = {
      author: req.user._id,
      text: text || '',
      attachments: attachments,
      createdAt: new Date()
    };

    // Thêm vào array summaryMessages
    if (!meeting.summaryMessages) {
      meeting.summaryMessages = [];
    }
    
    meeting.summaryMessages.push(summaryMessage);
    await meeting.save();

    // Populate author info
    await meeting.populate('summaryMessages.author', 'fullName email avatar position');
    const addedMessage = meeting.summaryMessages[meeting.summaryMessages.length - 1];

    res.json({
      message: 'Thêm tóm tắt cuộc họp thành công',
      summaryMessage: addedMessage
    });

  } catch (error) {
    console.error('Add summary message error:', error);
    
    // Xóa files nếu có lỗi
    if (req.files) {
      for (const file of req.files) {
        try {
          fs.unlinkSync(file.path);
        } catch (unlinkError) {
          console.error('Error deleting file:', unlinkError);
        }
      }
    }
    
    res.status(500).json({
      message: 'Lỗi server khi thêm tóm tắt cuộc họp',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   PUT /api/meetings/:id/summary-message/:messageId
// @desc    Cập nhật summary message
// @access  Private (Author, Admin)
router.put('/:id/summary-message/:messageId', authenticateToken, [
  body('text').optional().trim().isLength({ max: 5000 }).withMessage('Nội dung không được vượt quá 5000 ký tự')
], handleValidationErrors, async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    
    if (!meeting) {
      return res.status(404).json({
        message: 'Cuộc họp không tồn tại'
      });
    }

    // Tìm message trong summaryMessages
    const messageIndex = meeting.summaryMessages.findIndex(
      msg => msg._id.toString() === req.params.messageId
    );

    if (messageIndex === -1) {
      return res.status(404).json({
        message: 'Tóm tắt không tồn tại'
      });
    }

    const message = meeting.summaryMessages[messageIndex];

    // Kiểm tra quyền chỉnh sửa (author hoặc admin)
    const canEdit = 
      req.user.role === 'admin' ||
      message.author.toString() === req.user._id.toString();

    if (!canEdit) {
      return res.status(403).json({
        message: 'Bạn không có quyền chỉnh sửa tóm tắt này'
      });
    }

    // Cập nhật nội dung
    meeting.summaryMessages[messageIndex].text = req.body.text;
    await meeting.save();

    // Populate author info
    await meeting.populate('summaryMessages.author', 'fullName email avatar position');
    const updatedMessage = meeting.summaryMessages[messageIndex];

    res.json({
      message: 'Cập nhật tóm tắt thành công',
      summaryMessage: updatedMessage
    });

  } catch (error) {
    console.error('Update summary message error:', error);
    res.status(500).json({
      message: 'Lỗi server khi cập nhật tóm tắt',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   DELETE /api/meetings/:id/summary-message/:messageId
// @desc    Xóa summary message
// @access  Private (Author, Admin)
router.delete('/:id/summary-message/:messageId', authenticateToken, async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    
    if (!meeting) {
      return res.status(404).json({
        message: 'Cuộc họp không tồn tại'
      });
    }

    // Tìm message trong summaryMessages
    const messageIndex = meeting.summaryMessages.findIndex(
      msg => msg._id.toString() === req.params.messageId
    );

    if (messageIndex === -1) {
      return res.status(404).json({
        message: 'Tóm tắt không tồn tại'
      });
    }

    const message = meeting.summaryMessages[messageIndex];

    // Kiểm tra quyền xóa (author hoặc admin)
    const canDelete = 
      req.user.role === 'admin' ||
      message.author.toString() === req.user._id.toString();

    if (!canDelete) {
      return res.status(403).json({
        message: 'Bạn không có quyền xóa tóm tắt này'
      });
    }

    // Xóa files đính kèm từ server nếu có
    if (message.attachments && message.attachments.length > 0) {
      for (const attachment of message.attachments) {
        const filePath = path.join(__dirname, '../', attachment.path);
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (error) {
          console.error('Error deleting attachment file:', error);
        }
      }
    }

    // Xóa message từ database
    meeting.summaryMessages.splice(messageIndex, 1);
    await meeting.save();

    res.json({
      message: 'Xóa tóm tắt thành công'
    });

  } catch (error) {
    console.error('Delete summary message error:', error);
    res.status(500).json({
      message: 'Lỗi server khi xóa tóm tắt',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   POST /api/meetings/:id/summary-files
// @desc    Upload files vào summary của cuộc họp
// @access  Private (Secretary, Manager, Admin)
router.post('/:id/summary-files', authenticateToken, upload.array('files', 10), handleUploadError, async (req, res) => {
  try {
    console.log('Summary files upload request - Meeting ID:', req.params.id);
    console.log('Files received:', req.files?.length || 0);
    
    const meeting = await Meeting.findById(req.params.id);
    
    if (!meeting) {
      return res.status(404).json({
        message: 'Cuộc họp không tồn tại'
      });
    }

    // Kiểm tra quyền upload file vào summary
    const canUploadSummaryFiles = 
      req.user.role === 'admin' ||
      req.user.role === 'manager' ||
      req.user.role === 'secretary' ||
      meeting.organizer.toString() === req.user._id.toString();

    if (!canUploadSummaryFiles) {
      return res.status(403).json({
        message: 'Bạn không có quyền upload file vào tóm tắt cuộc họp'
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        message: 'Vui lòng chọn ít nhất một file để upload'
      });
    }

    // Thêm files vào summaryFiles array
    if (!meeting.summaryFiles) {
      meeting.summaryFiles = [];
    }

    const uploadedFiles = [];
    for (const file of req.files) {
      // Xử lý encoding UTF-8 cho tên file
      const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');

      const fileData = {
        name: originalName,
        originalName: file.originalname, // Lưu tên gốc để backup
        path: `/uploads/meetings/${file.filename}`,
        size: file.size,
        uploadedBy: req.user._id,
        uploadedAt: new Date()
      };
      
      meeting.summaryFiles.push(fileData);
      uploadedFiles.push(fileData);
      
      console.log('Added file:', originalName, 'at path:', fileData.path);
    }

    await meeting.save();
    
    // Populate để lấy thông tin user
    await meeting.populate('summaryFiles.uploadedBy', 'fullName email avatar');

    // Gửi real-time update cho tất cả participants
    const io = req.app.get('io');
    if (io) {
      const meetingRoomId = `meeting_${meeting._id}`;
      
      // Emit update về summary files
      io.to(meetingRoomId).emit('summaryFilesUpdated', {
        meetingId: meeting._id,
        files: uploadedFiles,
        uploadedBy: {
          _id: req.user._id,
          fullName: req.user.fullName
        }
      });
      
      // Emit general meeting update
      io.to(meetingRoomId).emit('meetingUpdated', {
        meetingId: meeting._id,
        type: 'summary_files_added',
        filesCount: req.files.length,
        uploadedBy: req.user.fullName
      });
      
      console.log('Emitted real-time updates for summary files upload');
    }

    res.json({
      message: `Upload ${req.files.length} file vào tóm tắt thành công`,
      filesCount: req.files.length,
      files: uploadedFiles
    });

  } catch (error) {
    console.error('Upload summary files error:', error);
    
    // Xóa files nếu có lỗi
    if (req.files) {
      for (const file of req.files) {
        try {
          fs.unlinkSync(file.path);
        } catch (unlinkError) {
          console.error('Error deleting file:', unlinkError);
        }
      }
    }
    
    res.status(500).json({
      message: 'Lỗi server khi upload file vào tóm tắt',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   DELETE /api/meetings/:id/summary-files/:fileId
// @desc    Xóa file từ summary của cuộc họp
// @access  Private (Secretary, Manager, Admin)
router.delete('/:id/summary-files/:fileId', authenticateToken, async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    
    if (!meeting) {
      return res.status(404).json({
        message: 'Cuộc họp không tồn tại'
      });
    }

    // Kiểm tra quyền xóa file từ summary
    const canDeleteSummaryFiles = 
      req.user.role === 'admin' ||
      req.user.role === 'manager' ||
      req.user.role === 'secretary' ||
      meeting.organizer.toString() === req.user._id.toString();

    if (!canDeleteSummaryFiles) {
      return res.status(403).json({
        message: 'Bạn không có quyền xóa file từ tóm tắt cuộc họp'
      });
    }

    // Tìm file trong summaryFiles
    const fileIndex = meeting.summaryFiles.findIndex(
      file => file._id.toString() === req.params.fileId
    );

    if (fileIndex === -1) {
      return res.status(404).json({
        message: 'File không tồn tại trong tóm tắt'
      });
    }

    const fileToDelete = meeting.summaryFiles[fileIndex];

    // Xóa file trên server
    const filePath = path.join(__dirname, '../', fileToDelete.path);
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error('Error deleting file from disk:', error);
    }

    // Xóa file từ database
    meeting.summaryFiles.splice(fileIndex, 1);
    await meeting.save();

    res.json({
      message: 'Xóa file từ tóm tắt thành công'
    });

  } catch (error) {
    console.error('Delete summary file error:', error);
    res.status(500).json({
      message: 'Lỗi server khi xóa file từ tóm tắt',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   GET /api/meetings/:id/summary-files/:fileId/view
// @desc    Xem file từ summary trong browser
// @access  Private
router.get('/:id/summary-files/:fileId/view', authenticateToken, async (req, res) => {
  try {
    console.log('View summary file request - Meeting ID:', req.params.id, 'File ID:', req.params.fileId);
    
    const meeting = await Meeting.findById(req.params.id);
    
    if (!meeting) {
      console.log('Meeting not found:', req.params.id);
      return res.status(404).json({
        message: 'Cuộc họp không tồn tại'
      });
    }

    // Kiểm tra quyền truy cập file
    const canAccess = 
      meeting.organizer.toString() === req.user._id.toString() ||
      meeting.attendees.some(att => att.user.toString() === req.user._id.toString()) ||
      req.user.role === 'admin';

    if (!canAccess) {
      console.log('Access denied for user:', req.user._id);
      return res.status(403).json({
        message: 'Bạn không có quyền truy cập file này'
      });
    }


    
    // Tìm file trong summaryFiles
    const summaryFile = meeting.summaryFiles?.find(
      file => file._id.toString() === req.params.fileId
    );

    if (!summaryFile) {
      console.log('❌ File NOT FOUND in database');
      return res.status(404).json({
        message: 'File không tồn tại trong database'
      });
    }

    console.log('Found file:', summaryFile.name, 'Path:', summaryFile.path);

    // Đường dẫn file trên server - simplified
    let filePath = path.join(__dirname, '../uploads/meetings', path.basename(summaryFile.path));
    console.log('File path:', filePath);
    
    // Kiểm tra file có tồn tại không
    if (!fs.existsSync(filePath)) {
      console.log('File not found:', filePath);
      return res.status(404).json({
        message: 'File không tìm thấy trên server'
      });
    }

    // Xác định MIME type
    const ext = path.extname(summaryFile.name).toLowerCase();
    let mimeType = 'application/octet-stream';
    
    const mimeTypes = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.txt': 'text/plain',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    };

    if (mimeTypes[ext]) {
      mimeType = mimeTypes[ext];
    }

    console.log('Serving file with MIME type:', mimeType);

    // Set headers để xem inline
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${summaryFile.name}"`);
    
    // Stream file về client
    const fileStream = fs.createReadStream(filePath);
    fileStream.on('error', (error) => {
      console.error('File stream error:', error);
      res.status(500).json({ message: 'Lỗi đọc file' });
    });
    
    fileStream.pipe(res);

  } catch (error) {
    console.error('View summary file error:', error);
    res.status(500).json({
      message: 'Lỗi server khi xem file',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   GET /api/meetings/:id/summary-files/:fileId/download
// @desc    Tải xuống file từ summary
// @access  Private
router.get('/:id/summary-files/:fileId/download', authenticateToken, async (req, res) => {
  try {
    console.log('Download summary file request - Meeting ID:', req.params.id, 'File ID:', req.params.fileId);
    
    const meeting = await Meeting.findById(req.params.id);
    
    if (!meeting) {
      console.log('Meeting not found:', req.params.id);
      return res.status(404).json({
        message: 'Cuộc họp không tồn tại'
      });
    }

    // Kiểm tra quyền truy cập file
    const canAccess = 
      meeting.organizer.toString() === req.user._id.toString() ||
      meeting.attendees.some(att => att.user.toString() === req.user._id.toString()) ||
      req.user.role === 'admin';

    if (!canAccess) {
      console.log('Access denied for user:', req.user._id);
      return res.status(403).json({
        message: 'Bạn không có quyền truy cập file này'
      });
    }

    // Tìm file trong summaryFiles
    const summaryFile = meeting.summaryFiles.find(
      file => file._id.toString() === req.params.fileId
    );

    if (!summaryFile) {
      console.log('File not found in summaryFiles:', req.params.fileId);
      console.log('Available files:', meeting.summaryFiles.map(f => ({ id: f._id, name: f.name })));
      return res.status(404).json({
        message: 'File không tồn tại trong tóm tắt'
      });
    }

    console.log('Found file for download:', summaryFile.name, 'Path:', summaryFile.path);

    // Đường dẫn file trên server - simplified  
    let filePath = path.join(__dirname, '../uploads/meetings', path.basename(summaryFile.path));
    console.log('Download file path:', filePath);
    
    // Kiểm tra file có tồn tại không
    if (!fs.existsSync(filePath)) {
      console.log('Download file not found:', filePath);
      return res.status(404).json({
        message: 'File không tìm thấy trên server'
      });
    }

    console.log('Downloading file from path:', filePath);

    // Set headers để download
    res.setHeader('Content-Disposition', `attachment; filename="${summaryFile.name}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    
    // Stream file về client
    const fileStream = fs.createReadStream(filePath);
    fileStream.on('error', (error) => {
      console.error('Download file stream error:', error);
      res.status(500).json({ message: 'Lỗi đọc file để download' });
    });
    
    fileStream.pipe(res);

  } catch (error) {
    console.error('Download summary file error:', error);
    res.status(500).json({
      message: 'Lỗi server khi tải file',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// ===== Biên bản (Minutes Draft) Endpoints =====

// GET minutes history
router.get('/:id/minutes', authenticateToken, async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id)
      .populate('minutesHistory.reviewer', 'fullName email avatar position')
      .populate('minutesHistory.createdBy', 'fullName email avatar position')
      .populate('minutesHistory.attachment.uploadedBy', 'fullName email avatar position');
    
    if (!meeting) return res.status(404).json({ message: 'Cuộc họp không tồn tại' });

    // Kiểm tra quyền xem: admin, manager, secretary, assistant, technician, organizer hoặc attendee
    const canView = req.user.role === 'admin' || req.user.role === 'manager' || req.user.role === 'secretary' || req.user.role === 'assistant' || req.user.role === 'technician' || meeting.organizer.toString() === req.user._id.toString() || meeting.attendees.some(att => att.user.toString() === req.user._id.toString());

    if (!canView) return res.status(403).json({ message: 'Bạn không có quyền xem biên bản' });

    res.json({
      minutesHistory: meeting.minutesHistory || []
    });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
});

// Create new minutes draft (secretary)
router.post('/:id/minutes', authenticateToken, async (req, res) => {
  try {
    const { content } = req.body;
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) return res.status(404).json({ message: 'Cuộc họp không tồn tại' });

    // Cho phép admin, manager, assistant, technician hoặc bất kỳ secretary tạo biên bản
    if (!['admin', 'manager', 'secretary', 'assistant', 'technician'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Bạn không có quyền tạo biên bản' });
    }

    // Tạo biên bản mới
    const newMinutes = {
      content: content,
      status: 'draft',
      createdBy: req.user._id,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    meeting.minutesHistory.push(newMinutes);
    await meeting.save();

    // Lấy lại phần tử vừa thêm từ DB để chắc chắn có _id
    const created = meeting.minutesHistory[meeting.minutesHistory.length - 1];

    res.json({ 
      message: 'Tạo biên bản thành công',
      minutes: created
    });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
});

// Update minutes draft
router.put('/:id/minutes/:minutesId', authenticateToken, async (req, res) => {
  try {
    const { content } = req.body;
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) return res.status(404).json({ message: 'Cuộc họp không tồn tại' });

    // Cho phép admin, manager, assistant, technician hoặc bất kỳ secretary cập nhật biên bản
    if (!['admin', 'manager', 'secretary', 'assistant', 'technician'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Bạn không có quyền cập nhật biên bản' });
    }

    const minutesIndex = meeting.minutesHistory.findIndex(m => m._id.toString() === req.params.minutesId);
    if (minutesIndex === -1) {
      return res.status(404).json({ message: 'Biên bản không tồn tại' });
    }

    // Chỉ cho phép cập nhật biên bản ở trạng thái draft
    if (meeting.minutesHistory[minutesIndex].status !== 'draft') {
      return res.status(400).json({ message: 'Chỉ có thể cập nhật biên bản ở trạng thái nháp' });
    }

    meeting.minutesHistory[minutesIndex].content = content;
    meeting.minutesHistory[minutesIndex].updatedAt = new Date();
    await meeting.save();

    res.json({ 
      message: 'Cập nhật biên bản thành công',
      minutes: meeting.minutesHistory[minutesIndex]
    });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
});

// Submit draft for approval
router.post('/:id/minutes/:minutesId/submit', authenticateToken, async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) return res.status(404).json({ message: 'Cuộc họp không tồn tại' });

    // Cho phép admin, manager, assistant, technician hoặc bất kỳ secretary gửi duyệt
    if (!['admin', 'manager', 'secretary', 'assistant', 'technician'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Bạn không có quyền gửi duyệt biên bản' });
    }

    const minutesIndex = meeting.minutesHistory.findIndex(m => m._id.toString() === req.params.minutesId);
    if (minutesIndex === -1) {
      return res.status(404).json({ message: 'Biên bản không tồn tại' });
    }

    // Chỉ cho phép submit biên bản ở trạng thái draft
    if (meeting.minutesHistory[minutesIndex].status !== 'draft') {
      return res.status(400).json({ message: 'Chỉ có thể gửi duyệt biên bản ở trạng thái nháp' });
    }

    // Cập nhật content nếu có trong request body
    if (req.body.content !== undefined) {
      console.log('📝 Updating content before submit');
      meeting.minutesHistory[minutesIndex].content = req.body.content;
    }

    meeting.minutesHistory[minutesIndex].status = 'pending';
    meeting.minutesHistory[minutesIndex].reviewer = meeting.organizer; // chủ trì
    meeting.minutesHistory[minutesIndex].submittedAt = new Date();
    await meeting.save();

    // Tạo notification cho organizer
    const notification = await Notification.create({
      recipient: meeting.organizer,
      sender: req.user._id,
      type: 'minutes_pending',
      title: 'Biên bản cần phê duyệt',
      message: `${req.user.fullName} đã gửi biên bản cho cuộc họp "${meeting.title}" chờ bạn phê duyệt`,
      data: { meetingId: meeting._id }
    });

    // Gửi real-time qua socket
    const io = req.app.get('io');
    if (io) {
      await notification.populate('sender', 'fullName email avatar position');
      io.to(`user_${meeting.organizer.toString()}`).emit('newNotification', notification);
    }

    res.json({ message: 'Gửi duyệt biên bản thành công' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
});

// Delete minutes draft from history
router.delete('/:id/minutes/:minutesId', authenticateToken, async (req, res) => {
  try {
    console.log('Delete minutes request:', { meetingId: req.params.id, minutesId: req.params.minutesId });
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) {
      console.log('Meeting not found:', req.params.id);
      return res.status(404).json({ message: 'Cuộc họp không tồn tại' });
    }

    // Cho phép admin, manager, assistant, technician hoặc secretary xoá; và organizer
    if (!['admin', 'manager', 'secretary', 'assistant', 'technician'].includes(req.user.role)
        && meeting.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Bạn không có quyền xoá biên bản' });
    }

    console.log('Meeting minutesHistory:', meeting.minutesHistory?.map(m => ({ id: m._id.toString(), status: m.status })));
    const index = meeting.minutesHistory.findIndex(m => m._id.toString() === req.params.minutesId);
    console.log('Found minutes index:', index);
    if (index === -1) {
      console.log('Minutes not found in history');
      return res.status(404).json({ message: 'Biên bản không tồn tại' });
    }

    // Xoá file đính kèm trên disk nếu có
    try {
      const att = meeting.minutesHistory[index].attachment;
      if (att && att.path) {
        const filePath = path.join(__dirname, '..', att.path);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
    } catch (e) {
      console.error('delete minutes attachment error', e.message);
    }

    // Lưu id để cập nhật archive
    const deletedId = meeting.minutesHistory[index]._id;

    // Xoá khỏi mảng
    meeting.minutesHistory.splice(index, 1);
    await meeting.save();

    // Gỡ snapshot tương ứng trong Archive.protocolSnapshots
    try {
      await Archive.updateMany(
        { meeting: meeting._id },
        { $pull: { protocolSnapshots: { _id: deletedId } } }
      );
    } catch (e) {
      console.error('remove protocol snapshot from archive error', e.message);
    }

    res.json({ message: 'Đã xoá biên bản khỏi lịch sử' });
  } catch (err) {
    console.error('Delete minutes error:', err);
    res.status(500).json({ message: 'Lỗi server khi xoá biên bản', error: err.message });
  }
});

// Upload minutes attachment
router.post('/:id/minutes/:minutesId/attachment', authenticateToken, upload.single('attachment'), async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) return res.status(404).json({ message: 'Cuộc họp không tồn tại' });

    // Kiểm tra quyền: secretary, admin, manager
    const canEdit = req.user.role === 'secretary' || req.user.role === 'admin' || req.user.role === 'manager';
    if (!canEdit) return res.status(403).json({ message: 'Bạn không có quyền upload file đính kèm biên bản' });

    if (!req.file) {
      return res.status(400).json({ message: 'Vui lòng chọn file để upload' });
    }

    // Kiểm tra minutesHistory có tồn tại không
    if (!meeting.minutesHistory || !Array.isArray(meeting.minutesHistory)) {
      return res.status(400).json({ message: 'Lịch sử biên bản không tồn tại' });
    }

    const minutesIndex = meeting.minutesHistory.findIndex(m => m._id.toString() === req.params.minutesId);
    if (minutesIndex === -1) {
      return res.status(404).json({ message: 'Biên bản không tồn tại' });
    }

    // Xóa file cũ nếu có
    if (meeting.minutesHistory[minutesIndex].attachment && meeting.minutesHistory[minutesIndex].attachment.path) {
      const oldFilePath = path.join(__dirname, '..', meeting.minutesHistory[minutesIndex].attachment.path);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
    }

    // Lưu thông tin file mới
    const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
    meeting.minutesHistory[minutesIndex].attachment = {
      name: originalName,
      path: req.file.path,
      size: req.file.size,
      uploadedBy: req.user._id,
      uploadedAt: new Date()
    };


    await meeting.save();

    // Đẩy vào archive.documents nếu chưa có
    try {
      if (req.file && req.file.path) {
        const archive = await Archive.findOne({ meeting: meeting._id });
        if (archive) {
          const exists = (archive.documents || []).some(d => d.originalPath === req.file.path);
          if (!exists) {
            archive.documents.push({
              name: originalName,
              originalPath: req.file.path,
              archivePath: req.file.path,
              size: req.file.size,
              type: 'minutes_attachment',
              uploadedBy: req.user._id,
              uploadedAt: new Date()
            });
            await archive.save();
          }
        }
      }
    } catch (e) {
      console.error('Push minutes attachment to archive error:', e.message);
    }

    res.json({
      message: 'Upload file đính kèm biên bản thành công',
      attachment: meeting.minutesHistory[minutesIndex].attachment
    });
  } catch (err) {
    console.error('Upload minutes attachment error:', err);
    console.error('Error details:', {
      meetingId: req.params.id,
      minutesId: req.params.minutesId,
      userId: req.user?._id,
      fileName: req.file?.originalname,
      error: err.message,
      stack: err.stack
    });
    res.status(500).json({ message: 'Lỗi server khi upload file', error: err.message });
  }
});

// Upload nhiều file đính kèm cho biên bản (mới)
router.post('/:id/minutes/:minutesId/attachments', authenticateToken, upload.array('attachments', 10), async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) return res.status(404).json({ message: 'Cuộc họp không tồn tại' });

    const canEdit = req.user.role === 'secretary' || req.user.role === 'admin' || req.user.role === 'manager';
    if (!canEdit) return res.status(403).json({ message: 'Bạn không có quyền upload file đính kèm biên bản' });

    if (!Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({ message: 'Vui lòng chọn file để upload' });
    }

    const idx = meeting.minutesHistory.findIndex(m => m._id.toString() === req.params.minutesId);
    if (idx === -1) return res.status(404).json({ message: 'Biên bản không tồn tại' });

    if (!Array.isArray(meeting.minutesHistory[idx].attachments)) {
      meeting.minutesHistory[idx].attachments = [];
    }

    const saved = [];
    for (const f of req.files) {
      const originalName = Buffer.from(f.originalname, 'latin1').toString('utf8');
      const item = {
        name: originalName,
        path: f.path,
        size: f.size,
        uploadedBy: req.user._id,
        uploadedAt: new Date()
      };
      meeting.minutesHistory[idx].attachments.push(item);
      saved.push(item);
    }

    await meeting.save();

    res.json({ message: 'Upload file đính kèm thành công', attachments: saved });
  } catch (err) {
    console.error('Upload multi minutes attachments error:', err);
    res.status(500).json({ message: 'Lỗi server khi upload file', error: err.message });
  }
});

// View a specific minutes attachment in attachments array (inline)
router.get('/:id/minutes/:minutesId/attachments/:attachmentId/view', authenticateToken, async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) return res.status(404).json({ message: 'Cuộc họp không tồn tại' });

    const idx = meeting.minutesHistory.findIndex(m => m._id.toString() === req.params.minutesId);
    if (idx === -1) return res.status(404).json({ message: 'Biên bản không tồn tại' });

    const items = meeting.minutesHistory[idx].attachments || [];
    const att = items.find(a => (a._id?.toString?.() || a.id) === req.params.attachmentId);
    if (!att) return res.status(404).json({ message: 'File đính kèm không tồn tại' });

    const filePath = path.join(__dirname, '..', att.path);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File không tồn tại trên server' });
    }

    res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(att.name || 'attachment')}`);
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  } catch (err) {
    console.error('View minutes attachment error:', err);
    res.status(500).json({ message: 'Lỗi server khi xem file', error: err.message });
  }
});

// Download a specific minutes attachment in attachments array
router.get('/:id/minutes/:minutesId/attachments/:attachmentId/download', authenticateToken, async (req, res) => {
  try {
    console.log('🔧 [MINUTES ATTACHMENT DOWNLOAD] Request params:', req.params);
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) {
      console.log('❌ Meeting not found:', req.params.id);
      return res.status(404).json({ message: 'Cuộc họp không tồn tại' });
    }

    const idx = meeting.minutesHistory.findIndex(m => m._id.toString() === req.params.minutesId);
    console.log('🔍 Minutes history index:', idx);
    if (idx === -1) {
      console.log('❌ Minutes not found in history. Available:', meeting.minutesHistory.map(m => m._id.toString()));
      return res.status(404).json({ message: 'Biên bản không tồn tại' });
    }

    const items = meeting.minutesHistory[idx].attachments || [];
    console.log('🔍 Attachments in minutes:', items.map(a => ({ id: a._id?.toString(), name: a.name })));
    console.log('🔍 Looking for attachment ID:', req.params.attachmentId);
    
    const att = items.find(a => (a._id?.toString?.() || a.id) === req.params.attachmentId);
    if (!att) {
      console.log('❌ Attachment not found. Available IDs:', items.map(a => a._id?.toString()));
      return res.status(404).json({ message: 'File đính kèm không tồn tại' });
    }
    
    console.log('✅ Found attachment:', att.name, 'Path:', att.path);

    const filePath = path.join(__dirname, '..', att.path);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File không tồn tại trên server' });
    }

    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(att.name || 'attachment')}`);
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  } catch (err) {
    console.error('Download minutes attachment error:', err);
    res.status(500).json({ message: 'Lỗi server khi tải file', error: err.message });
  }
});

// Open minutes attachment (download/inline)
router.get('/:id/minutes/:minutesId/attachment/open', authenticateToken, async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) return res.status(404).json({ message: 'Cuộc họp không tồn tại' });

    const minutesIndex = meeting.minutesHistory.findIndex(m => m._id.toString() === req.params.minutesId);
    if (minutesIndex === -1) {
      return res.status(404).json({ message: 'Biên bản không tồn tại' });
    }

    const att = meeting.minutesHistory[minutesIndex].attachment;
    if (!att || !att.path) {
      return res.status(404).json({ message: 'Không tìm thấy file đính kèm' });
    }

    const filePath = path.join(__dirname, '..', att.path);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File không tồn tại trên máy chủ' });
    }

    res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(att.name || 'attachment')}`);
    res.setHeader('Content-Type', 'application/octet-stream');
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  } catch (err) {
    console.error('Open minutes attachment error:', err);
    res.status(500).json({ message: 'Lỗi server khi mở file', error: err.message });
  }
});

// Delete minutes attachment
router.delete('/:id/minutes/:minutesId/attachment', authenticateToken, async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) return res.status(404).json({ message: 'Cuộc họp không tồn tại' });

    // Kiểm tra quyền: secretary, admin, manager
    const canEdit = req.user.role === 'secretary' || req.user.role === 'admin' || req.user.role === 'manager';
    if (!canEdit) return res.status(403).json({ message: 'Bạn không có quyền xóa file đính kèm biên bản' });

    const minutesIndex = meeting.minutesHistory.findIndex(m => m._id.toString() === req.params.minutesId);
    if (minutesIndex === -1) {
      return res.status(404).json({ message: 'Biên bản không tồn tại' });
    }

    if (!meeting.minutesHistory[minutesIndex].attachment) {
      return res.status(404).json({ message: 'Không có file đính kèm để xóa' });
    }

    // Xóa file từ disk
    const filePath = path.join(__dirname, '..', meeting.minutesHistory[minutesIndex].attachment.path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Xóa thông tin file từ database
    meeting.minutesHistory[minutesIndex].attachment = undefined;
    await meeting.save();

    res.json({ message: 'Xóa file đính kèm biên bản thành công' });
  } catch (err) {
    console.error('Delete minutes attachment error:', err);
    res.status(500).json({ message: 'Lỗi server khi xóa file', error: err.message });
  }
});

// Delete ALL minutes attachments (array version)
router.delete('/:id/minutes/:minutesId/attachments', authenticateToken, async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) return res.status(404).json({ message: 'Cuộc họp không tồn tại' });

    const canEdit = req.user.role === 'secretary' || req.user.role === 'admin' || req.user.role === 'manager';
    if (!canEdit) return res.status(403).json({ message: 'Bạn không có quyền xóa file đính kèm biên bản' });

    const idx = meeting.minutesHistory.findIndex(m => m._id.toString() === req.params.minutesId);
    if (idx === -1) return res.status(404).json({ message: 'Biên bản không tồn tại' });

    const items = meeting.minutesHistory[idx].attachments || [];
    for (const item of items) {
      if (item?.path) {
        const filePath = path.join(__dirname, '..', item.path);
        if (fs.existsSync(filePath)) {
          try { fs.unlinkSync(filePath); } catch (_) {}
        }
      }
    }
    meeting.minutesHistory[idx].attachments = [];
    await meeting.save();
    res.json({ message: 'Đã xóa tất cả file đính kèm' });
  } catch (err) {
    console.error('Delete minutes attachments error:', err);
    res.status(500).json({ message: 'Lỗi server khi xóa file', error: err.message });
  }
});

// Approve or reject
router.post('/:id/minutes/approve', authenticateToken, async (req, res) => {
  try {
    const { approve } = req.body; // boolean
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) return res.status(404).json({ message: 'Cuộc họp không tồn tại' });

    // chỉ organizer hoặc admin
    const isOrganizer = meeting.organizer.toString() === req.user._id.toString();
    if (!isOrganizer && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Bạn không có quyền phê duyệt biên bản' });
    }

    if (meeting.minutesStatus !== 'pending') {
      return res.status(400).json({ message: 'Biên bản không ở trạng thái chờ duyệt' });
    }

    meeting.minutesStatus = approve ? 'approved' : 'rejected';
    await meeting.save();
    res.json({ message: approve ? 'Đã phê duyệt biên bản' : 'Đã từ chối biên bản' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
});

// Approve or reject a specific minutes item in minutesHistory
router.post('/:id/minutes/:minutesId/approve', authenticateToken, async (req, res) => {
  try {
    const { approve } = req.body; // boolean
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) return res.status(404).json({ message: 'Cuộc họp không tồn tại' });

    // Only organizer or admin can approve/reject
    const isOrganizer = meeting.organizer.toString() === req.user._id.toString();
    if (!isOrganizer && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Bạn không có quyền phê duyệt biên bản' });
    }

    const index = meeting.minutesHistory.findIndex(m => m._id.toString() === req.params.minutesId);
    if (index === -1) {
      return res.status(404).json({ message: 'Biên bản không tồn tại' });
    }

    const item = meeting.minutesHistory[index];
    if (item.status !== 'pending') {
      return res.status(400).json({ message: 'Biên bản không ở trạng thái chờ duyệt' });
    }

    item.status = approve ? 'approved' : 'rejected';
    item.reviewer = req.user._id;
    item.reviewedAt = new Date();
    await meeting.save();

    return res.json({ message: approve ? 'Đã phê duyệt biên bản' : 'Đã từ chối biên bản' });
  } catch (err) {
    return res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
});

// POST /api/meetings/:id/respond-invite
router.post('/:id/respond-invite', authenticateToken, async (req, res) => {
  try {
    console.log('Respond invite request body:', req.body);
    const { response, reason = '' } = req.body;
    console.log('Extracted response:', response, 'reason:', reason);
    
    if (!['accepted', 'declined'].includes(response)) {
      console.log('Invalid response status:', response);
      return res.status(400).json({ message: 'Trạng thái không hợp lệ' });
    }

    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) return res.status(404).json({ message: 'Cuộc họp không tồn tại' });

    const attendee = meeting.attendees.find(a => a.user.toString() === req.user._id.toString());
    if (!attendee) return res.status(403).json({ message: 'Bạn không nằm trong danh sách mời' });
    
    console.log('Current attendee status:', attendee.status);
    // Cho phép thay đổi phản hồi nếu cuộc họp chưa kết thúc
    const now = new Date();
    const meetingEnd = new Date(meeting.endTime);
    
    if (attendee.status !== 'invited' && now >= meetingEnd) {
      console.log('Attendee has already responded and meeting has ended:', attendee.status);
      return res.status(400).json({ message: 'Cuộc họp đã kết thúc, không thể thay đổi phản hồi' });
    }

    attendee.status = response;
    attendee.responseDate = new Date();
    if (response === 'declined') attendee.declineReason = reason.trim();
    await meeting.save();

    // Gửi thông báo cho organizer
    let notificationMessage = `${req.user.fullName} đã ${response === 'accepted' ? 'chấp nhận' : 'từ chối'} tham gia cuộc họp "${meeting.title}"`;
    
    // Thêm lý do từ chối vào notification nếu có
    if (response === 'declined' && reason.trim()) {
      notificationMessage += `\nLý do: ${reason.trim()}`;
    }
    
    const notification = await Notification.create({
      recipient: meeting.organizer,
      sender: req.user._id,
      type: 'invite_response',
      title: 'Phản hồi lời mời',
      message: notificationMessage,
      data: { 
        meetingId: meeting._id,
        response,
        reason: response === 'declined' ? reason.trim() : undefined
      }
    });

    // Real-time notification và meeting update
    const io = req.app.get('io');
    if (io) {
      await notification.populate('sender', 'fullName email avatar position');
      
      // Gửi notification cho organizer
      io.to(`user_${meeting.organizer.toString()}`).emit('newNotification', notification);
      
      // Gửi meeting update cho tất cả attendees và organizer
      const meetingRoomId = `meeting_${meeting._id}`;
      io.to(meetingRoomId).emit('meetingUpdated', {
        meetingId: meeting._id,
        type: 'attendee_response',
        userId: req.user._id,
        response,
        reason
      });
    }

    res.json({ success: true, status: response });
  } catch (e) {
    console.error('respond invite error', e);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// @route   POST /api/meetings/fix-created-by
// @desc    Fix field createdBy cho meetings cũ không có field này
// @access  Private (Admin only)
router.post('/fix-created-by', authenticateToken, async (req, res) => {
  try {
    // Chỉ admin mới có thể chạy script này
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Chỉ admin mới có thể chạy lệnh này' });
    }

    // Lấy tất cả meetings không có createdBy
    const meetings = await Meeting.find({ 
      $or: [
        { createdBy: { $exists: false } },
        { createdBy: null }
      ]
    });
    
    let updatedCount = 0;

    for (const meeting of meetings) {
      // Set createdBy = organizer nếu không có
      meeting.createdBy = meeting.organizer;
      await meeting.save();
      updatedCount++;
      console.log(`Updated meeting ${meeting._id}: set createdBy = ${meeting.organizer}`);
    }

    res.json({
      message: `Đã cập nhật createdBy cho ${updatedCount} cuộc họp`,
      updatedMeetings: updatedCount
    });

  } catch (error) {
    console.error('Fix createdBy error:', error);
    res.status(500).json({
      message: 'Lỗi server khi fix createdBy',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   POST /api/meetings/fix-secretary-status
// @desc    Fix trạng thái cho secretary/assistant trong meetings hiện có
// @access  Private (Admin only)
router.post('/fix-secretary-status', authenticateToken, async (req, res) => {
  try {
    // Chỉ admin mới có thể chạy script này
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Chỉ admin mới có thể chạy lệnh này' });
    }

    const User = require('../models/User');
    
    // Lấy tất cả meetings
    const meetings = await Meeting.find({});
    let updatedCount = 0;

    for (const meeting of meetings) {
      let hasChanges = false;
      
      for (const attendee of meeting.attendees) {
        // Kiểm tra nếu attendee có role secretary/assistant nhưng status vẫn là invited
        const user = await User.findById(attendee.user).select('role');
        
        if (user && ['secretary', 'assistant'].includes(user.role) && attendee.status === 'invited') {
          attendee.status = 'accepted';
          attendee.responseDate = new Date();
          hasChanges = true;
          console.log(`Updated ${user.role} ${attendee.user} to accepted in meeting ${meeting._id}`);
        }
      }
      
      if (hasChanges) {
        await meeting.save();
        updatedCount++;
      }
    }

    res.json({
      message: `Đã cập nhật trạng thái cho ${updatedCount} cuộc họp`,
      updatedMeetings: updatedCount
    });

  } catch (error) {
    console.error('Fix secretary status error:', error);
    res.status(500).json({
      message: 'Lỗi server khi fix trạng thái secretary',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   GET /api/meetings/:id/summary-messages/:messageId/files/:fileId
// @desc    Xem file từ summary message
// @access  Private
router.get('/:id/summary-messages/:messageId/files/:fileId', authenticateToken, async (req, res) => {
  try {
    console.log('View message file request - Meeting ID:', req.params.id, 'Message ID:', req.params.messageId, 'File ID:', req.params.fileId);
    
    const meeting = await Meeting.findById(req.params.id);
    
    if (!meeting) {
      console.log('Meeting not found:', req.params.id);
      return res.status(404).json({
        message: 'Cuộc họp không tồn tại'
      });
    }

    // Kiểm tra quyền truy cập file
    const canAccess = 
      meeting.organizer.toString() === req.user._id.toString() ||
      meeting.attendees.some(att => att.user.toString() === req.user._id.toString()) ||
      req.user.role === 'admin';

    if (!canAccess) {
      console.log('Access denied for user:', req.user._id);
      return res.status(403).json({
        message: 'Bạn không có quyền truy cập file này'
      });
    }

    // Tìm message trong summaryMessages
    const message = meeting.summaryMessages?.find(
      msg => msg._id.toString() === req.params.messageId
    );

    if (!message) {
      console.log('Message not found:', req.params.messageId);
      return res.status(404).json({
        message: 'Message không tồn tại'
      });
    }

    // Tìm file trong message attachments
    const messageFile = message.attachments?.find(
      file => file._id.toString() === req.params.fileId
    );

    if (!messageFile) {
      console.log('File not found in message attachments:', req.params.fileId);
      return res.status(404).json({
        message: 'File không tồn tại trong message'
      });
    }

    console.log('Found message file:', messageFile.name, 'Path:', messageFile.path);

    // Đường dẫn file trên server
    let filePath = path.join(__dirname, '../uploads/meetings', path.basename(messageFile.path));
    console.log('Message file path:', filePath);
    
    // Kiểm tra file có tồn tại không
    if (!fs.existsSync(filePath)) {
      console.log('Message file not found:', filePath);
      return res.status(404).json({
        message: 'File không tìm thấy trên server'
      });
    }

    // Xác định MIME type
    const ext = path.extname(messageFile.name).toLowerCase();
    let mimeType = 'application/octet-stream';
    
    const mimeTypes = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.txt': 'text/plain',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    };

    if (mimeTypes[ext]) {
      mimeType = mimeTypes[ext];
    }

    console.log('Serving message file with MIME type:', mimeType);

    // Set headers để xem inline
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${messageFile.name}"`);
    
    // Stream file về client
    const fileStream = fs.createReadStream(filePath);
    fileStream.on('error', (error) => {
      console.error('Message file stream error:', error);
      res.status(500).json({ message: 'Lỗi đọc file' });
    });
    
    fileStream.pipe(res);

  } catch (error) {
    console.error('View message file error:', error);
    res.status(500).json({
      message: 'Lỗi server khi xem file từ message',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   GET /api/meetings/:id/summary-messages/:messageId/files/:fileId/download
// @desc    Tải xuống file từ summary message
// @access  Private
router.get('/:id/summary-messages/:messageId/files/:fileId/download', authenticateToken, async (req, res) => {
  try {
    console.log('Download message file request - Meeting ID:', req.params.id, 'Message ID:', req.params.messageId, 'File ID:', req.params.fileId);
    
    const meeting = await Meeting.findById(req.params.id);
    
    if (!meeting) {
      console.log('Meeting not found:', req.params.id);
      return res.status(404).json({
        message: 'Cuộc họp không tồn tại'
      });
    }

    // Kiểm tra quyền truy cập file
    const canAccess = 
      meeting.organizer.toString() === req.user._id.toString() ||
      meeting.attendees.some(att => att.user.toString() === req.user._id.toString()) ||
      req.user.role === 'admin';

    if (!canAccess) {
      console.log('Access denied for user:', req.user._id);
      return res.status(403).json({
        message: 'Bạn không có quyền truy cập file này'
      });
    }

    // Tìm message trong summaryMessages
    const message = meeting.summaryMessages?.find(
      msg => msg._id.toString() === req.params.messageId
    );

    if (!message) {
      console.log('Message not found:', req.params.messageId);
      return res.status(404).json({
        message: 'Message không tồn tại'
      });
    }

    // Tìm file trong message attachments
    const messageFile = message.attachments?.find(
      file => file._id.toString() === req.params.fileId
    );

    if (!messageFile) {
      console.log('File not found in message attachments:', req.params.fileId);
      return res.status(404).json({
        message: 'File không tồn tại trong message'
      });
    }

    console.log('Found message file for download:', messageFile.name, 'Path:', messageFile.path);

    // Đường dẫn file trên server
    let filePath = path.join(__dirname, '../uploads/meetings', path.basename(messageFile.path));
    console.log('Download message file path:', filePath);
    
    // Kiểm tra file có tồn tại không
    if (!fs.existsSync(filePath)) {
      console.log('Download message file not found:', filePath);
      return res.status(404).json({
        message: 'File không tìm thấy trên server'
      });
    }

    console.log('Downloading message file from path:', filePath);

    // Set headers để download
    res.setHeader('Content-Disposition', `attachment; filename="${messageFile.name}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    
    // Stream file về client
    const fileStream = fs.createReadStream(filePath);
    fileStream.on('error', (error) => {
      console.error('Download message file stream error:', error);
      res.status(500).json({ message: 'Lỗi đọc file để download' });
    });
    
    fileStream.pipe(res);

  } catch (error) {
    console.error('Download message file error:', error);
    res.status(500).json({
      message: 'Lỗi server khi tải file từ message',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// ===== AGENDA ROUTES =====

// @route   POST /api/meetings/:id/agenda
// @desc    Thêm mục chương trình họp
// @access  Private
router.post('/:id/agenda', authenticateToken, async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    
    if (!meeting) {
      return res.status(404).json({
        message: 'Cuộc họp không tồn tại'
      });
    }

    // Kiểm tra quyền thêm agenda
    const canEditAgenda = 
      meeting.organizer.toString() === req.user._id.toString() ||
      req.user.role === 'admin' ||
      req.user.role === 'manager' ||
      req.user.role === 'secretary';

    if (!canEditAgenda) {
      return res.status(403).json({
        message: 'Bạn không có quyền chỉnh sửa chương trình họp'
      });
    }

    const { title, description, order } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        message: 'Tiêu đề mục là bắt buộc'
      });
    }

    const agendaItem = {
      title: title.trim(),
      description: description ? description.trim() : '',
      order: order || (meeting.agenda.length + 1),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    meeting.agenda.push(agendaItem);
    await meeting.save();

    // Lấy agenda item vừa thêm với _id
    const savedAgendaItem = meeting.agenda[meeting.agenda.length - 1];

    res.status(201).json({
      message: 'Thêm mục chương trình thành công',
      agendaItem: savedAgendaItem
    });

  } catch (error) {
    console.error('Add agenda item error:', error);
    res.status(500).json({
      message: 'Lỗi server khi thêm mục chương trình',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   PUT /api/meetings/:id/agenda/:agendaId
// @desc    Cập nhật mục chương trình họp
// @access  Private
router.put('/:id/agenda/:agendaId', authenticateToken, async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    
    if (!meeting) {
      return res.status(404).json({
        message: 'Cuộc họp không tồn tại'
      });
    }

    // Kiểm tra quyền chỉnh sửa agenda
    const canEditAgenda = 
      meeting.organizer.toString() === req.user._id.toString() ||
      req.user.role === 'admin' ||
      req.user.role === 'manager' ||
      req.user.role === 'secretary';

    if (!canEditAgenda) {
      return res.status(403).json({
        message: 'Bạn không có quyền chỉnh sửa chương trình họp'
      });
    }

    const agendaItem = meeting.agenda.id(req.params.agendaId);
    
    if (!agendaItem) {
      return res.status(404).json({
        message: 'Mục chương trình không tồn tại'
      });
    }

    const { title, description, order } = req.body;

    if (title !== undefined) {
      if (!title || !title.trim()) {
        return res.status(400).json({
          message: 'Tiêu đề mục là bắt buộc'
        });
      }
      agendaItem.title = title.trim();
    }

    if (description !== undefined) {
      agendaItem.description = description ? description.trim() : '';
    }

    if (order !== undefined) {
      agendaItem.order = order;
    }

    agendaItem.updatedAt = new Date();
    await meeting.save();

    res.json({
      message: 'Cập nhật mục chương trình thành công',
      agendaItem: agendaItem
    });

  } catch (error) {
    console.error('Update agenda item error:', error);
    res.status(500).json({
      message: 'Lỗi server khi cập nhật mục chương trình',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   DELETE /api/meetings/:id/agenda/:agendaId
// @desc    Xóa mục chương trình họp
// @access  Private
router.delete('/:id/agenda/:agendaId', authenticateToken, async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    
    if (!meeting) {
      return res.status(404).json({
        message: 'Cuộc họp không tồn tại'
      });
    }

    // Kiểm tra quyền xóa agenda
    const canEditAgenda = 
      meeting.organizer.toString() === req.user._id.toString() ||
      req.user.role === 'admin' ||
      req.user.role === 'manager' ||
      req.user.role === 'secretary';

    if (!canEditAgenda) {
      return res.status(403).json({
        message: 'Bạn không có quyền chỉnh sửa chương trình họp'
      });
    }

    const agendaItem = meeting.agenda.id(req.params.agendaId);
    
    if (!agendaItem) {
      return res.status(404).json({
        message: 'Mục chương trình không tồn tại'
      });
    }

    meeting.agenda.pull(req.params.agendaId);
    await meeting.save();

    res.json({
      message: 'Xóa mục chương trình thành công'
    });

  } catch (error) {
    console.error('Delete agenda item error:', error);
    res.status(500).json({
      message: 'Lỗi server khi xóa mục chương trình',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// ===== NOTES ROUTES =====

// @route   POST /api/meetings/:id/notes
// @desc    Thêm ghi chú cho cuộc họp
// @access  Private
router.post('/:id/notes', authenticateToken, [
  body('text').trim().isLength({ min: 1, max: 1000 }).withMessage('Ghi chú phải từ 1-1000 ký tự')
], handleValidationErrors, async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    
    if (!meeting) {
      return res.status(404).json({
        message: 'Cuộc họp không tồn tại'
      });
    }

    // Kiểm tra quyền thêm ghi chú: attendees hoặc organizer
    const canAddNote = 
      meeting.organizer.toString() === req.user._id.toString() ||
      meeting.attendees.some(att => att.user.toString() === req.user._id.toString()) ||
      req.user.role === 'admin' ||
      req.user.role === 'assistant';

    if (!canAddNote) {
      return res.status(403).json({
        message: 'Bạn không có quyền thêm ghi chú cho cuộc họp này'
      });
    }

    // Thêm ghi chú vào meeting
    if (!meeting.notes) {
      meeting.notes = [];
    }

    const note = {
      text: req.body.text,
      author: req.user._id,
      createdAt: new Date()
    };

    meeting.notes.push(note);
    await meeting.save();

    // Populate author info
    await meeting.populate('notes.author', 'fullName email avatar position');
    const addedNote = meeting.notes[meeting.notes.length - 1];

    res.json({
      message: 'Thêm ghi chú thành công',
      note: addedNote
    });

  } catch (error) {
    console.error('Add note error:', error);
    res.status(500).json({
      message: 'Lỗi server khi thêm ghi chú',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   DELETE /api/meetings/:id/notes/:noteId
// @desc    Xóa ghi chú của cuộc họp
// @access  Private (Author, Admin)
router.delete('/:id/notes/:noteId', authenticateToken, async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    
    if (!meeting) {
      return res.status(404).json({
        message: 'Cuộc họp không tồn tại'
      });
    }

    // Tìm note trong meeting.notes
    const noteIndex = meeting.notes.findIndex(
      note => note._id.toString() === req.params.noteId
    );

    if (noteIndex === -1) {
      return res.status(404).json({
        message: 'Ghi chú không tồn tại'
      });
    }

    const note = meeting.notes[noteIndex];

    // Kiểm tra quyền xóa (author hoặc admin)
    const canDelete = 
      req.user.role === 'admin' ||
      req.user.role === 'assistant' ||
      note.author.toString() === req.user._id.toString();

    if (!canDelete) {
      return res.status(403).json({
        message: 'Bạn không có quyền xóa ghi chú này'
      });
    }

    // Xóa note từ database
    meeting.notes.splice(noteIndex, 1);
    await meeting.save();

    res.json({
      message: 'Xóa ghi chú thành công'
    });

  } catch (error) {
    console.error('Delete note error:', error);
    res.status(500).json({
      message: 'Lỗi server khi xóa ghi chú',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});


module.exports = router; 