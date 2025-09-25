const express = require('express');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken } = require('../middleware/auth');
const Minutes = require('../models/Minutes');
const Meeting = require('../models/Meeting');
const User = require('../models/User');
const Archive = require('../models/Archive');

const router = express.Router();

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Dữ liệu không hợp lệ',
      errors: errors.array()
    });
  }
  next();
};

// @route   GET /api/minutes
// @desc    Lấy danh sách biên bản
// @access  Private
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { meeting, status, latest } = req.query;

    
    let query = {};
    
    if (meeting) {
      // Validate meeting ID format (MongoDB ObjectId format)
      if (typeof meeting !== 'string' || !/^[0-9a-fA-F]{24}$/.test(meeting)) {
        return res.status(400).json({ 
          message: 'Meeting ID không hợp lệ', 
          received: meeting,
          type: typeof meeting 
        });
      }
      query.meeting = meeting;
    }
    if (status) query.status = status;
    
    let minutes;
    
    if (meeting && latest === 'true') {
      // Lấy biên bản mới nhất cho meeting cụ thể
      minutes = await Minutes.find(query)
        .populate('meeting', 'title startTime endTime location organizer attendees')
        .populate('secretary', 'fullName email avatar')
        .populate('approvedBy', 'fullName email avatar')
        .populate('votes.user', 'fullName email avatar')
        .sort({ createdAt: -1 })
        .limit(1);
    } else {
      // Lấy tất cả biên bản
      minutes = await Minutes.find(query)
        .populate('meeting', 'title startTime endTime location organizer attendees')
        .populate('secretary', 'fullName email avatar')
        .populate('approvedBy', 'fullName email avatar')  
        .populate('votes.user', 'fullName email avatar')
        .sort({ createdAt: -1 });
    }
    
    res.json({ minutes });
  } catch (error) {
    res.status(500).json({
      message: 'Lỗi server khi lấy danh sách biên bản',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   GET /api/minutes/:id
// @desc    Lấy chi tiết biên bản
// @access  Private
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const minutes = await Minutes.findById(req.params.id)
      .populate('meeting', 'title startTime endTime location organizer attendees')
      .populate('secretary', 'fullName email avatar department')
      .populate('votes.user', 'fullName email avatar department position')
      .populate('approvedBy', 'fullName email avatar')
      .populate('decisions.responsible', 'fullName email avatar');

    if (!minutes) {
      return res.status(404).json({
        message: 'Biên bản không tồn tại'
      });
    }

    // Kiểm tra quyền truy cập
    const canAccess = 
      req.user.role === 'admin' ||
      minutes.secretary._id.toString() === req.user._id.toString() ||
      minutes.meeting.organizer.toString() === req.user._id.toString() ||
      minutes.meeting.attendees.some(att => att.user.toString() === req.user._id.toString());

    if (!canAccess) {
      return res.status(403).json({
        message: 'Bạn không có quyền xem biên bản này'
    });
    }

    // Tự động đóng vote nếu hết hạn
    if (minutes.closeVotingIfExpired()) {
      await minutes.save();
    }

    res.json(minutes);
  } catch (error) {
    res.status(500).json({
      message: 'Lỗi server khi lấy biên bản',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   POST /api/minutes
// @desc    Tạo biên bản mới
// @access  Private (Secretary, Manager, Admin)
router.post('/', authenticateToken, [
  body('meeting').isMongoId().withMessage('ID cuộc họp không hợp lệ'),
  body('title').trim().isLength({ min: 3, max: 200 }).withMessage('Tiêu đề phải từ 3-200 ký tự'),
  body('content').trim().isLength({ min: 10, max: 10000 }).withMessage('Nội dung phải từ 10-10000 ký tự'),
  body('voteDeadline').custom((value) => {
    const deadline = new Date(value);
    if (isNaN(deadline.getTime())) {
      throw new Error('Hạn chót bỏ phiếu không hợp lệ');
    }
    if (deadline <= new Date()) {
      throw new Error('Hạn chót bỏ phiếu phải trong tương lai');
    }
    return true;
  })
], handleValidationErrors, async (req, res) => {
  try {
    // Kiểm tra quyền tạo biên bản
    if (!['admin', 'manager', 'secretary', 'assistant', 'technician'].includes(req.user.role)) {
      return res.status(403).json({
        message: 'Bạn không có quyền tạo biên bản'
      });
    }

    const { meeting: meetingId, title, content, voteDeadline, decisions } = req.body;

    // Kiểm tra meeting tồn tại
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return res.status(404).json({
        message: 'Cuộc họp không tồn tại'
      });
    }

    // Kiểm tra đã có biên bản đang active chưa (chưa đóng phiếu và chưa approved)
    const existingActiveMinutes = await Minutes.findOne({ 
      meeting: meetingId, 
      isVotingClosed: false,
      status: { $in: ['draft', 'pending_review', 'pending_approval'] }
    });
    if (existingActiveMinutes) {
      return res.status(400).json({
        message: 'Cuộc họp này đang có biên bản đang hoạt động. Vui lòng hoàn tất biên bản hiện tại trước khi tạo mới.'
      });
    }

    // Tính toán metadata
    const attendeeCount = meeting.attendees.length;
    // Tính cả organizer nếu organizer không phải là attendee
    const isOrganizerAlsoAttendee = meeting.attendees.some(
      att => att.user.toString() === meeting.organizer.toString()
    );
    const totalVoters = isOrganizerAlsoAttendee ? attendeeCount : attendeeCount + 1;

    const minutes = new Minutes({
      meeting: meetingId,
      title,
      content,
      voteDeadline: new Date(voteDeadline),
      decisions: decisions || [],
      secretary: req.user._id,
      metadata: {
        attendeeCount,
        requiredVoteCount: totalVoters
      }
    });

    await minutes.save();

    // Populate để trả về data đầy đủ
    await minutes.populate([
      { path: 'meeting', select: 'title startTime endTime location' },
      { path: 'secretary', select: 'fullName email avatar' }
    ]);

    // Cập nhật meeting reference
    meeting.minutes = minutes._id;
    await meeting.save();

    // push snapshot vào archive
    try {
      await Archive.updateOne({ meeting: meetingId }, { $push: { minutesSnapshots: minutes } });
    } catch(e) { console.error('push minutes snapshot error', e.message);}

    res.status(201).json({
      message: 'Tạo biên bản thành công',
      minutes
    });
  } catch (error) {
    res.status(500).json({
      message: 'Lỗi server khi tạo biên bản',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   POST /api/minutes/:id/vote
// @desc    Bỏ phiếu cho biên bản
// @access  Private (Attendees)
router.post('/:id/vote', authenticateToken, [
  body('voteType').isIn(['agree', 'agree_with_comments', 'disagree']).withMessage('Loại vote không hợp lệ'),
  body('comment').optional().trim().isLength({ max: 1000 }).withMessage('Bình luận không được vượt quá 1000 ký tự')
], handleValidationErrors, async (req, res) => {
  try {
    const minutes = await Minutes.findById(req.params.id)
      .populate('meeting', 'attendees organizer');

    if (!minutes) {
      return res.status(404).json({
        message: 'Biên bản không tồn tại'
      });
    }

    // Kiểm tra quyền vote (phải là attendee hoặc organizer của meeting)
    const isAttendee = minutes.meeting.attendees.some(
      att => att.user.toString() === req.user._id.toString()
    );
    
    const isOrganizer = minutes.meeting.organizer.toString() === req.user._id.toString();

    if (!isAttendee && !isOrganizer) {
      return res.status(403).json({
        message: 'Bạn không có quyền bỏ phiếu cho biên bản này'
      });
    }

    // Kiểm tra có thể vote không
    if (!minutes.canVote()) {
      return res.status(400).json({
        message: 'Không thể bỏ phiếu lúc này (đã đóng hoặc hết hạn)'
      });
    }

    // Kiểm tra đã vote chưa
    if (minutes.hasUserVoted(req.user._id)) {
      return res.status(400).json({
        message: 'Bạn đã bỏ phiếu cho biên bản này'
      });
    }

    const { voteType, comment } = req.body;

    // Thêm vote
    minutes.votes.push({
      user: req.user._id,
      voteType,
      comment: comment || ''
    });

    await minutes.save();

    await minutes.populate('votes.user', 'fullName email avatar');

    res.json({
      message: 'Bỏ phiếu thành công',
      vote: minutes.votes[minutes.votes.length - 1],
      metadata: minutes.metadata
    });
  } catch (error) {
    res.status(500).json({
      message: 'Lỗi server khi bỏ phiếu',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   PUT /api/minutes/:id/vote
// @desc    Cập nhật phiếu bầu
// @access  Private (User đã vote)
router.put('/:id/vote', authenticateToken, [
  body('voteType').isIn(['agree', 'agree_with_comments', 'disagree']).withMessage('Loại vote không hợp lệ'),
  body('comment').optional().trim().isLength({ max: 1000 }).withMessage('Bình luận không được vượt quá 1000 ký tự')
], handleValidationErrors, async (req, res) => {
  try {
    const minutes = await Minutes.findById(req.params.id)
      .populate('meeting', 'attendees organizer');

    if (!minutes) {
      return res.status(404).json({
        message: 'Biên bản không tồn tại'
      });
    }

    // Kiểm tra quyền vote (phải là attendee hoặc organizer của meeting)
    const isAttendee = minutes.meeting.attendees.some(
      att => att.user.toString() === req.user._id.toString()
    );
    
    const isOrganizer = minutes.meeting.organizer.toString() === req.user._id.toString();

    if (!isAttendee && !isOrganizer) {
      return res.status(403).json({
        message: 'Bạn không có quyền cập nhật phiếu bầu cho biên bản này'
      });
    }

    // Kiểm tra có thể vote không
    if (!minutes.canVote()) {
      return res.status(400).json({
        message: 'Không thể cập nhật phiếu bầu lúc này (đã đóng hoặc hết hạn)'
      });
    }

    // Tìm vote của user
    const userVote = minutes.getUserVote(req.user._id);
    if (!userVote) {
      return res.status(400).json({
        message: 'Bạn chưa bỏ phiếu cho biên bản này'
      });
    }

    const { voteType, comment } = req.body;

    // Cập nhật vote
    userVote.voteType = voteType;
    userVote.comment = comment || '';
    userVote.votedAt = new Date();

    await minutes.save();

    await minutes.populate('votes.user', 'fullName email avatar');

    res.json({
      message: 'Cập nhật phiếu bầu thành công',
      vote: userVote,
      metadata: minutes.metadata
    });
  } catch (error) {
    res.status(500).json({
      message: 'Lỗi server khi cập nhật phiếu bầu',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   POST /api/minutes/:id/close-voting
// @desc    Đóng bỏ phiếu và hoàn thiện biên bản
// @access  Private (Secretary, Manager, Admin)
router.post('/:id/close-voting', authenticateToken, async (req, res) => {
  try {
    const minutes = await Minutes.findById(req.params.id);

    if (!minutes) {
      return res.status(404).json({
        message: 'Biên bản không tồn tại'
      });
    }

    // Kiểm tra quyền đóng vote
    const canClose = 
      req.user.role === 'admin' ||
      minutes.secretary.toString() === req.user._id.toString();

    if (!canClose) {
      return res.status(403).json({
        message: 'Bạn không có quyền đóng bỏ phiếu'
      });
    }

    if (minutes.isVotingClosed) {
      return res.status(400).json({
        message: 'Bỏ phiếu đã được đóng'
      });
    }

    // Đóng vote và finalize biên bản
    minutes.isVotingClosed = true;
    minutes.status = 'approved'; // Chuyển sang trạng thái đã phê duyệt
    minutes.approvedBy = req.user._id;
    minutes.approvedAt = new Date();
    
    await minutes.save();

    // cập nhật snapshot trong archive
    try {
      await Archive.updateOne({ meeting: minutes.meeting, 'minutesSnapshots._id': minutes._id }, { 'minutesSnapshots.$': minutes });
    } catch(e){ console.error('update minutes snapshot error', e.message);}

    // Populate để trả về thông tin đầy đủ
    await minutes.populate([
      { path: 'secretary', select: 'fullName email avatar' },
      { path: 'approvedBy', select: 'fullName email avatar' },
      { path: 'votes.user', select: 'fullName email avatar' }
    ]);

    res.json({
      message: 'Đóng bỏ phiếu và lưu biên bản thành công',
      minutes: {
        _id: minutes._id,
        isVotingClosed: minutes.isVotingClosed,
        status: minutes.status,
        approvedBy: minutes.approvedBy,
        approvedAt: minutes.approvedAt,
        metadata: minutes.metadata
      }
    });
  } catch (error) {
    res.status(500).json({
      message: 'Lỗi server khi đóng bỏ phiếu',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   POST /api/minutes/:id/approve
// @desc    Phê duyệt biên bản
// @access  Private (Manager, Admin)
router.post('/:id/approve', authenticateToken, async (req, res) => {
  try {
    const minutes = await Minutes.findById(req.params.id);

    if (!minutes) {
      return res.status(404).json({
        message: 'Biên bản không tồn tại'
      });
    }

    // Kiểm tra quyền phê duyệt
    if (!['admin', 'manager'].includes(req.user.role)) {
      return res.status(403).json({
        message: 'Bạn không có quyền phê duyệt biên bản'
      });
    }

    if (minutes.isApproved) {
      return res.status(400).json({
        message: 'Biên bản đã được phê duyệt'
      });
    }

    minutes.isApproved = true;
    minutes.approvedBy = req.user._id;
    minutes.approvedAt = new Date();
    minutes.status = 'approved';

    await minutes.save();

    await minutes.populate('approvedBy', 'fullName email');

    res.json({
      message: 'Phê duyệt biên bản thành công',
      minutes: {
        isApproved: minutes.isApproved,
        approvedBy: minutes.approvedBy,
        approvedAt: minutes.approvedAt,
        status: minutes.status
      }
    });
  } catch (error) {
    res.status(500).json({
      message: 'Lỗi server khi phê duyệt biên bản',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   GET /api/minutes/:id/export
// @desc    Xuất biên bản thành JSON để frontend xử lý
// @access  Private
router.get('/:id/export', authenticateToken, async (req, res) => {
  try {
    const minutes = await Minutes.findById(req.params.id)
      .populate('meeting', 'title startTime endTime location organizer attendees')
      .populate('secretary', 'fullName email')
      .populate('votes.user', 'fullName email department position')
      .populate('approvedBy', 'fullName email')
      .populate('decisions.responsible', 'fullName email');

    if (!minutes) {
      return res.status(404).json({
        message: 'Biên bản không tồn tại'
      });
    }

    // Kiểm tra quyền truy cập
    const canAccess = 
      req.user.role === 'admin' ||
      minutes.secretary._id.toString() === req.user._id.toString() ||
      minutes.meeting.organizer.toString() === req.user._id.toString() ||
      minutes.meeting.attendees.some(att => att.user.toString() === req.user._id.toString());

    if (!canAccess) {
      return res.status(403).json({
        message: 'Bạn không có quyền xuất biên bản này'
      });
    }

    // Trả về data để frontend xử lý export
    const exportData = {
      title: 'BIÊN BẢN CUỘC HỌP',
      meetingTitle: minutes.meeting.title,
      meetingTime: `${new Date(minutes.meeting.startTime).toLocaleString('vi-VN')} - ${new Date(minutes.meeting.endTime).toLocaleString('vi-VN')}`,
      location: minutes.meeting.location,
      secretary: minutes.secretary.fullName,
      content: minutes.content,
      decisions: minutes.decisions.map(decision => ({
        title: decision.title,
        description: decision.description,
        responsible: decision.responsible ? decision.responsible.fullName : '',
        deadline: decision.deadline ? new Date(decision.deadline).toLocaleDateString('vi-VN') : '',
        status: decision.status,
        priority: decision.priority
      })),
      votes: minutes.votes.map(vote => ({
        userName: vote.user.fullName,
        department: vote.user.department || '',
        position: vote.user.position || '',
        voteType: vote.voteType === 'agree' ? 'Đồng ý' : 
                  vote.voteType === 'agree_with_comments' ? 'Đồng ý có ý kiến' : 'Không đồng ý',
        comment: vote.comment || '',
        votedAt: new Date(vote.votedAt).toLocaleString('vi-VN')
      })),
      statistics: {
        totalRequired: minutes.metadata.requiredVoteCount,
        totalReceived: minutes.metadata.receivedVoteCount,
        agreeCount: minutes.metadata.agreeCount,
        agreeWithCommentsCount: minutes.metadata.agreeWithCommentsCount,
        disagreeCount: minutes.metadata.disagreeCount,
        agreementRate: minutes.agreementRate,
        participationRate: minutes.participationRate
      },
      approval: {
        isApproved: minutes.isApproved,
        approvedBy: minutes.approvedBy ? minutes.approvedBy.fullName : '',
        approvedAt: minutes.approvedAt ? new Date(minutes.approvedAt).toLocaleString('vi-VN') : ''
      },
      exportedAt: new Date().toLocaleString('vi-VN'),
      exportedBy: req.user.fullName
    };

    res.json({
      message: 'Lấy dữ liệu xuất biên bản thành công',
      data: exportData
    });

  } catch (error) {
    res.status(500).json({
      message: 'Lỗi server khi xuất biên bản',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

module.exports = router; 