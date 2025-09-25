const express = require('express');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Archive = require('../models/Archive');
const Meeting = require('../models/Meeting');
const Minutes = require('../models/Minutes');
const Protocol = require('../models/Protocol');
const Notification = require('../models/Notification');
const { 
  authenticateToken, 
  checkResourceOwnership,
  checkDepartmentAccess 
} = require('../middleware/auth');

const router = express.Router();

// Tải xuống tài liệu trong archive
router.get('/:id/documents/:docIndex/download', authenticateToken, async (req, res) => {
  try {
    const { id, docIndex } = req.params;
    const archive = await Archive.findById(id);
    if (!archive) {
      return res.status(404).json({ message: 'Lưu trữ không tồn tại' });
    }

    // Kiểm tra quyền truy cập
    const canAccess = archive.canAccess(req.user._id, req.user.role, req.user.department);
    if (!canAccess) {
      return res.status(403).json({ message: 'Bạn không có quyền truy cập lưu trữ này' });
    }

    const index = parseInt(docIndex, 10);
    if (Number.isNaN(index) || index < 0 || index >= archive.documents.length) {
      return res.status(400).json({ message: 'Tài liệu không hợp lệ' });
    }

    const doc = archive.documents[index];
    const filePath = path.join(__dirname, '..', doc.archivePath.startsWith('/') ? `.${doc.archivePath}` : doc.archivePath);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Không tìm thấy file trên máy chủ' });
    }

    // Tăng thống kê tải xuống (không chặn response)
    archive.incrementDownloadCount().catch(() => {});

    res.download(filePath, doc.name);
  } catch (error) {
    console.error('Archive document download error:', error);
    res.status(500).json({ message: 'Lỗi server khi tải file' });
  }
});

// Test endpoint để kiểm tra server (phải đặt trước các route có parameter)
router.get('/test', (req, res) => {
  console.log('✅ Test endpoint reached');
  res.json({ 
    message: 'Archives routes working', 
    timestamp: new Date(),
    models: {
      Archive: !!Archive,
      Meeting: !!Meeting,
      Minutes: !!Minutes,
      Protocol: !!Protocol
    }
  });
});

// Test endpoint để kiểm tra protocolSnapshots hiện tại
router.get('/test-protocols/:id', async (req, res) => {
  try {
    const archive = await Archive.findById(req.params.id);
    if (!archive) {
      return res.status(404).json({ message: 'Archive not found' });
    }
    
    res.json({
      message: 'Current protocolSnapshots',
      archiveId: req.params.id,
      protocolSnapshots: archive.protocolSnapshots || [],
      count: archive.protocolSnapshots?.length || 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint để force update tất cả protocolSnapshots với STT mới (không cần auth cho test)
router.put('/force-update-all-protocols', async (req, res) => {
  try {
    console.log('🔄 [FORCE-UPDATE] Starting bulk update of all protocolSnapshots...');
    
    // Lấy tất cả archives
    const archives = await Archive.find({});
    console.log(`📋 Found ${archives.length} archives to update`);
    
    let updatedCount = 0;
    let errorCount = 0;
    
    for (const archive of archives) {
      try {
        console.log(`🔄 Processing archive: ${archive.title} (${archive._id})`);
        
        // Lấy meeting với minutesHistory
        const meeting = await Meeting.findById(archive.meeting)
          .populate('minutesHistory.createdBy', 'fullName email')
          .populate('minutesHistory.reviewer', 'fullName email');
        
        if (!meeting || !meeting.minutesHistory || meeting.minutesHistory.length === 0) {
          console.log(`⚠️ No minutesHistory found for archive ${archive._id}`);
          continue;
        }
        
        // Cập nhật protocolSnapshots với STT mới
        archive.protocolSnapshots = meeting.minutesHistory.map((protocol, index) => {
          const statusText = protocol.status === 'draft' ? 'Bản nháp' : 
                            protocol.status === 'pending' ? 'Chờ duyệt' :
                            protocol.status === 'approved' ? 'Đã duyệt' : 'Từ chối';
          const createdDate = new Date(protocol.createdAt).toLocaleDateString('vi-VN');
          const stt = String(index + 1).padStart(2, '0');
          const title = `Biên bản STT-${stt} (${statusText}) - ${createdDate}`;
          
          return {
            _id: protocol._id,
            title: title,
            content: protocol.content,
            status: protocol.status,
            secretary: protocol.createdBy,
            approvedBy: protocol.reviewer,
            approvedAt: protocol.reviewedAt,
            rejectedBy: protocol.status === 'rejected' ? protocol.reviewer : null,
            rejectedAt: protocol.status === 'rejected' ? protocol.reviewedAt : null,
            rejectionReason: protocol.rejectionReason || null,
            createdAt: protocol.createdAt,
            submittedAt: protocol.submittedAt
          };
        });
        
        await archive.save();
        updatedCount++;
        console.log(`✅ Updated archive ${archive._id} with ${archive.protocolSnapshots.length} protocols`);
        
      } catch (archiveError) {
        console.error(`❌ Error updating archive ${archive._id}:`, archiveError.message);
        errorCount++;
      }
    }
    
    console.log(`🎉 Bulk update completed! Updated: ${updatedCount}, Errors: ${errorCount}`);
    
    res.json({
      message: `Force update completed! Updated ${updatedCount} archives, ${errorCount} errors`,
      updatedCount,
      errorCount,
      totalArchives: archives.length
    });
    
  } catch (error) {
    console.error('❌ Force update error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint test đơn giản để force update (GET method, không cần auth)
router.get('/force-update-test', async (req, res) => {
  try {
    console.log('🔄 [FORCE-UPDATE-TEST] Starting bulk update of all protocolSnapshots...');
    
    // Lấy tất cả archives
    const archives = await Archive.find({});
    console.log(`📋 Found ${archives.length} archives to update`);
    
    let updatedCount = 0;
    let errorCount = 0;
    
    for (const archive of archives) {
      try {
        console.log(`🔄 Processing archive: ${archive.title} (${archive._id})`);
        
        // Lấy meeting với minutesHistory
        const meeting = await Meeting.findById(archive.meeting)
          .populate('minutesHistory.createdBy', 'fullName email')
          .populate('minutesHistory.reviewer', 'fullName email');
        
        if (!meeting || !meeting.minutesHistory || meeting.minutesHistory.length === 0) {
          console.log(`⚠️ No minutesHistory found for archive ${archive._id}`);
          continue;
        }
        
        // Cập nhật protocolSnapshots với STT mới
        archive.protocolSnapshots = meeting.minutesHistory.map((protocol, index) => {
          const statusText = protocol.status === 'draft' ? 'Bản nháp' : 
                            protocol.status === 'pending' ? 'Chờ duyệt' :
                            protocol.status === 'approved' ? 'Đã duyệt' : 'Từ chối';
          const createdDate = new Date(protocol.createdAt).toLocaleDateString('vi-VN');
          const stt = String(index + 1).padStart(2, '0');
          const title = `Biên bản STT-${stt} (${statusText}) - ${createdDate}`;
          
          return {
            _id: protocol._id,
            title: title,
            content: protocol.content,
            status: protocol.status,
            secretary: protocol.createdBy,
            approvedBy: protocol.reviewer,
            approvedAt: protocol.reviewedAt,
            rejectedBy: protocol.status === 'rejected' ? protocol.reviewer : null,
            rejectedAt: protocol.status === 'rejected' ? protocol.reviewedAt : null,
            rejectionReason: protocol.rejectionReason || null,
            createdAt: protocol.createdAt,
            submittedAt: protocol.submittedAt
          };
        });
        
        await archive.save();
        updatedCount++;
        console.log(`✅ Updated archive ${archive._id} with ${archive.protocolSnapshots.length} protocols`);
        
      } catch (archiveError) {
        console.error(`❌ Error updating archive ${archive._id}:`, archiveError.message);
        errorCount++;
      }
    }
    
    console.log(`🎉 Bulk update completed! Updated: ${updatedCount}, Errors: ${errorCount}`);
    
    res.json({
      message: `Force update completed! Updated ${updatedCount} archives, ${errorCount} errors`,
      updatedCount,
      errorCount,
      totalArchives: archives.length
    });
    
  } catch (error) {
    console.error('❌ Force update error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test meeting minutesHistory
router.get('/test-meeting/:meetingId', authenticateToken, async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.meetingId)
      .populate('minutesHistory.createdBy', 'fullName email')
      .populate('minutesHistory.reviewer', 'fullName email');
    
    console.log(`🔍 Meeting "${meeting?.title}" has ${meeting?.minutesHistory?.length || 0} minutes in history`);
    
    res.json({
      meetingId: req.params.meetingId,
      meetingTitle: meeting?.title,
      minutesHistoryCount: meeting?.minutesHistory?.length || 0,
      minutesHistory: meeting?.minutesHistory || []
    });
  } catch (error) {
    console.error('Test meeting error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Debug endpoint để kiểm tra data cho meeting
router.get('/debug/:meetingId', authenticateToken, async (req, res) => {
  try {
    const { meetingId } = req.params;
    console.log(`🔍 Debug data for meeting: ${meetingId}`);
    
    // Lấy meeting với minutesHistory
    const meeting = await Meeting.findById(meetingId)
      .populate('minutesHistory.createdBy', 'fullName email')
      .populate('minutesHistory.reviewer', 'fullName email');
    
    console.log(`📋 Meeting "${meeting?.title}" minutesHistory:`, meeting?.minutesHistory?.length || 0);
    meeting?.minutesHistory?.forEach((m, index) => {
      console.log(`  ${index + 1}. Status: ${m.status} - CreatedBy: ${m.createdBy?.fullName} - Content length: ${m.content?.length || 0}`);
    });
    
    // Lấy tất cả protocols và minutes từ collections
    const [minutes, protocols] = await Promise.all([
      Minutes.find({ meeting: meetingId }).populate('secretary', 'fullName email'),
      Protocol.find({ meeting: meetingId }).populate('secretary', 'fullName email')
    ]);
    
    console.log(`📊 Debug results - Minutes collection: ${minutes.length}, Protocols collection: ${protocols.length}, MinutesHistory: ${meeting?.minutesHistory?.length || 0}`);
    
    res.json({
      meetingId,
      meetingTitle: meeting?.title,
      minutesHistory: meeting?.minutesHistory?.map(m => ({
        _id: m._id,
        status: m.status,
        createdBy: m.createdBy,
        reviewer: m.reviewer,
        createdAt: m.createdAt,
        submittedAt: m.submittedAt,
        reviewedAt: m.reviewedAt,
        contentLength: m.content?.length || 0
      })) || [],
      minutes: minutes.map(m => ({
        _id: m._id,
        title: m.title,
        status: m.status,
        secretary: m.secretary,
        createdAt: m.createdAt
      })),
      protocols: protocols.map(p => ({
        _id: p._id,
        title: p.title,
        status: p.status,
        secretary: p.secretary,
        createdAt: p.createdAt
      }))
    });
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ error: error.message });
  }
});

// @route   GET /api/archives/statistics/overview
// @desc    Lấy thống kê tổng quan về lưu trữ
// @access  Private
router.get('/statistics/overview', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;
    const userDepartment = req.user.department;

    // Build access query based on role
    let accessQuery = { status: 'active' };
    
    if (userRole !== 'admin') {
      const accessConditions = [
        { createdBy: userId },
        { 'access.isPublic': true },
        { 'access.allowedUsers': userId },
        { 'meetingSnapshot.organizer._id': userId },
        { 'meetingSnapshot.attendees.user._id': userId }
      ];

      if (userRole === 'manager' || userRole === 'secretary') {
        accessConditions.push(
          { 'access.allowedDepartments': userDepartment },
          { 'meetingSnapshot.secretary._id': userId }
        );
      }

      accessQuery.$or = accessConditions;
      accessQuery['access.restrictedUsers'] = { $ne: userId };
    }

    const [
      totalArchives,
      archivesByType,
      archivesByDepartment,
      recentArchives,
      totalSize
    ] = await Promise.all([
      Archive.countDocuments(accessQuery),
      Archive.aggregate([
        { $match: accessQuery },
        { $group: { _id: '$archiveType', count: { $sum: 1 } } }
      ]),
      Archive.aggregate([
        { $match: accessQuery },
        { $group: { _id: '$meetingSnapshot.department', count: { $sum: 1 } } }
      ]),
      Archive.find(accessQuery)
        .sort({ archivedAt: -1 })
        .limit(5)
        .populate('createdBy', 'fullName')
        .select('title archivedAt createdBy meetingSnapshot.title'),
      Archive.aggregate([
        { $match: accessQuery },
        { $group: { _id: null, totalSize: { $sum: '$statistics.totalSize' } } }
      ])
    ]);

    res.json({
      message: 'Lấy thống kê thành công',
      statistics: {
        totalArchives,
        archivesByType,
        archivesByDepartment,
        recentArchives,
        totalSizeMB: totalSize[0] ? Math.round((totalSize[0].totalSize / (1024 * 1024)) * 100) / 100 : 0
      }
    });

  } catch (error) {
    console.error('Get archive statistics error:', error);
    res.status(500).json({
      message: 'Lỗi server khi lấy thống kê',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// Multer configuration for archive file uploads
const archiveStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../uploads/archives');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'archive-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const archiveUpload = multer({
  storage: archiveStorage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit cho archive files
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|ppt|pptx|txt|zip|rar/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    if (extname) {
      return cb(null, true);
    } else {
      cb(new Error('Định dạng file không được hỗ trợ trong lưu trữ'));
    }
  }
});

// Validation rules cho archive
const archiveValidation = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 300 })
    .withMessage('Tiêu đề lưu trữ phải từ 3-300 ký tự'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Mô tả không được vượt quá 2000 ký tự'),
  
  body('archiveType')
    .optional()
    .isIn(['complete', 'documents_only', 'minutes_only', 'summary_only', 'custom'])
    .withMessage('Loại lưu trữ không hợp lệ'),
  
  body('meetingId')
    .isMongoId()
    .withMessage('ID cuộc họp không hợp lệ'),
  
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags phải là mảng'),
  
  body('tags.*')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Mỗi tag không được vượt quá 50 ký tự')
];

// Helper function để xử lý validation errors
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

// @route   GET /api/archives
// @desc    Lấy danh sách lưu trữ
// @access  Private
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      archiveType,
      status,
      search,
      department,
      tags,
      startDate,
      endDate,
      sortBy = 'archivedAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query conditions
    const andConditions = [];

    if (archiveType) andConditions.push({ archiveType });
    if (status) andConditions.push({ status });
    if (department) andConditions.push({ 'meetingSnapshot.department': department });
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      andConditions.push({ tags: { $in: tagArray } });
    }

    if (startDate || endDate) {
      const timeCond = {};
      if (startDate) timeCond.$gte = new Date(startDate);
      if (endDate) timeCond.$lte = new Date(endDate);
      andConditions.push({ archivedAt: timeCond });
    }

    if (search) {
      andConditions.push({
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { 'meetingSnapshot.title': { $regex: search, $options: 'i' } }
        ]
      });
    }

    // Quyền truy cập theo role
    let accessConditions = [];

    if (req.user.role === 'admin') {
      // Admin thấy tất cả
      accessConditions = [{}];
    } else if (req.user.role === 'manager' || req.user.role === 'secretary') {
      accessConditions = [
        { createdBy: req.user._id },
        { 'access.isPublic': true },
        { 'access.allowedUsers': req.user._id },
        { 'access.allowedDepartments': req.user.department },
        { 'meetingSnapshot.organizer._id': req.user._id },
        { 'meetingSnapshot.secretary._id': req.user._id },
        { 'meetingSnapshot.attendees.user._id': req.user._id }
      ];
    } else {
      accessConditions = [
        { createdBy: req.user._id },
        { 'access.isPublic': true },
        { 'access.allowedUsers': req.user._id },
        { 'meetingSnapshot.organizer._id': req.user._id },
        { 'meetingSnapshot.attendees.user._id': req.user._id }
      ];
    }

    andConditions.push({ $or: accessConditions });
    
    // Loại bỏ restricted users
    andConditions.push({ 'access.restrictedUsers': { $ne: req.user._id } });

    const query = { $and: andConditions };

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: sortOptions,
      populate: [
        { path: 'createdBy', select: 'fullName email avatar department' },
        { path: 'meeting', select: 'title startTime status' }
      ]
    };

    const result = await Archive.paginate(query, options);

    res.json({
      message: 'Lấy danh sách lưu trữ thành công',
      archives: result.docs,
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
    console.error('Get archives error:', error);
    res.status(500).json({
      message: 'Lỗi server khi lấy danh sách lưu trữ',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   GET /api/archives/:id
// @desc    Lấy chi tiết lưu trữ
// @access  Private
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const archive = await Archive.findById(req.params.id)
      .populate('createdBy', 'fullName email avatar department position')
      .populate('meeting', 'title startTime endTime status location')
      .populate('notes.author', 'fullName email avatar');

    if (!archive) {
      return res.status(404).json({
        message: 'Lưu trữ không tồn tại'
      });
    }

    // Kiểm tra quyền truy cập
    const canAccess = archive.canAccess(req.user._id, req.user.role, req.user.department);
    
    if (!canAccess) {
      return res.status(403).json({
        message: 'Bạn không có quyền truy cập lưu trữ này'
      });
    }

    // Tăng view count
    await archive.incrementViewCount();

    res.json({
      message: 'Lấy thông tin lưu trữ thành công',
      archive
    });

  } catch (error) {
    console.error('Get archive error:', error);
    res.status(500).json({
      message: 'Lỗi server khi lấy thông tin lưu trữ',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   POST /api/archives
// @desc    Tạo lưu trữ mới từ cuộc họp
// @access  Private
router.post('/', authenticateToken, archiveValidation, handleValidationErrors, async (req, res) => {
  try {
    const {
      meetingId,
      title,
      description,
      archiveType,
      tags,
      summaryText,
      keyPoints,
      actionItems,
      nextSteps,
      isPublic,
      allowedDepartments,
      allowedUsers,
      deleteAfterYears
    } = req.body;

    // Lấy thông tin cuộc họp
    const meeting = await Meeting.findById(meetingId)
      .populate('organizer', 'fullName email department position')
      .populate('secretary', 'fullName email department position')
      .populate('attendees.user', 'fullName email department position')
      .populate('minutes');

    if (!meeting) {
      return res.status(404).json({
        message: 'Cuộc họp không tồn tại'
      });
    }

    // Kiểm tra quyền tạo lưu trữ
    const canCreateArchive = 
      req.user.role === 'admin' ||
      meeting.organizer._id.toString() === req.user._id.toString() ||
      (meeting.secretary && meeting.secretary._id.toString() === req.user._id.toString()) ||
      req.user.role === 'manager';

    if (!canCreateArchive) {
      return res.status(403).json({
        message: 'Bạn không có quyền tạo lưu trữ cho cuộc họp này'
      });
    }

    // Tạo meeting snapshot
    const meetingSnapshot = {
      title: meeting.title,
      description: meeting.description,
      startTime: meeting.startTime,
      endTime: meeting.endTime,
      actualEndTime: meeting.actualEndTime,
      location: meeting.location,
      meetingType: meeting.meetingType,
      status: meeting.status,
      priority: meeting.priority,
      department: meeting.department,
      organizer: meeting.organizer,
      secretary: meeting.secretary,
      attendees: meeting.attendees,
      attendeeCount: meeting.attendees.length,
      duration: Math.round((meeting.endTime - meeting.startTime) / (1000 * 60))
    };

    // Tạo archive data
    const archiveData = {
      meeting: meetingId,
      title: title || `Lưu trữ - ${meeting.title}`,
      description,
      archiveType: archiveType || 'complete',
      meetingSnapshot,
      createdBy: req.user._id,
      tags: tags || [],
      access: {
        isPublic: isPublic || false,
        allowedDepartments: allowedDepartments || [],
        allowedUsers: allowedUsers || []
      },
      retentionPolicy: {
        deleteAfterYears: deleteAfterYears || 7
      }
    };

    // Thêm tài liệu nếu là complete hoặc documents_only
    if (archiveType === 'complete' || archiveType === 'documents_only') {
      const documents = [];
      
      // Copy meeting attachments
      if (meeting.attachments && meeting.attachments.length > 0) {
        for (const attachment of meeting.attachments) {
          documents.push({
            name: attachment.name,
            originalPath: attachment.path,
            archivePath: attachment.path, // Có thể copy file đến thư mục archive riêng
            size: attachment.size,
            type: 'meeting_attachment',
            uploadedBy: attachment.uploadedBy,
            uploadedAt: attachment.uploadedAt
          });
        }
      }

      // Copy summary files
      if (meeting.summaryFiles && meeting.summaryFiles.length > 0) {
        for (const file of meeting.summaryFiles) {
          documents.push({
            name: file.name,
            originalPath: file.path,
            archivePath: file.path,
            size: file.size,
            type: 'summary_file',
            uploadedBy: file.uploadedBy,
            uploadedAt: file.uploadedAt
          });
        }
      }

      // Copy summary message attachments
      if (meeting.summaryMessages && meeting.summaryMessages.length > 0) {
        for (const message of meeting.summaryMessages) {
          if (message.attachments && message.attachments.length > 0) {
            for (const attachment of message.attachments) {
              documents.push({
                name: attachment.name,
                originalPath: attachment.path,
                archivePath: attachment.path,
                size: attachment.size,
                type: 'summary_message_attachment',
                uploadedBy: message.author,
                uploadedAt: attachment.uploadedAt || message.createdAt,
                messageId: message._id,
                messageAuthor: message.author
              });
            }
          }
        }
      }

      archiveData.documents = documents;
    }

    // Thêm minutes snapshots nếu có
    if ((archiveType === 'complete' || archiveType === 'minutes_only')) {
      // Lấy tất cả biên bản của cuộc họp
      const allMinutes = await Minutes.find({ meeting: meetingId })
        .populate('secretary', 'fullName email')
        .populate('approvedBy', 'fullName email')
        .populate('decisions.responsible', 'fullName email')
        .populate('votes.user', 'fullName email')
        .sort({ createdAt: 1 }); // Sắp xếp theo thời gian tạo

      archiveData.minutesSnapshots = allMinutes.map(minutes => ({
        _id: minutes._id,
        title: minutes.title,
        content: minutes.content,
        status: minutes.status,
        decisions: minutes.decisions || [],
        votes: minutes.votes || [],
        voteDeadline: minutes.voteDeadline,
        isVotingClosed: minutes.isVotingClosed || false,
        isApproved: Boolean(minutes.approvedBy && minutes.approvedAt), // Kiểm tra có người phê duyệt và thời gian phê duyệt
        approvedBy: minutes.approvedBy,
        approvedAt: minutes.approvedAt,
        secretary: minutes.secretary,
        createdAt: minutes.createdAt
      }));

      // Sắp xếp: biên bản đã phê duyệt lên trước, mới nhất lên đầu
      archiveData.minutesSnapshots.sort((a, b) => {
        if (a.isApproved !== b.isApproved) return b.isApproved - a.isApproved;
        return new Date(b.approvedAt || b.createdAt) - new Date(a.approvedAt || a.createdAt);
      });

      // Copy minutes attachments vào documents nếu có
      for (const minutes of allMinutes) {
        if (minutes.attachments && minutes.attachments.length > 0) {
          for (const attachment of minutes.attachments) {
            archiveData.documents.push({
              name: attachment.name,
              originalPath: attachment.path,
              archivePath: attachment.path,
              size: attachment.size,
              type: 'minutes_attachment',
              uploadedBy: attachment.uploadedBy,
              uploadedAt: attachment.uploadedAt
            });
          }
        }
      }
    }

    // Thêm summary nếu có
    if (archiveType === 'complete' || archiveType === 'summary_only') {
      archiveData.summary = {
        text: summaryText || meeting.summary,
        keyPoints: keyPoints || [],
        actionItems: actionItems || [],
        nextSteps: nextSteps || ''
      };
    }

    // Lấy notifications liên quan
    const notifications = await Notification.find({
      'data.meetingId': meetingId
    }).populate('sender', 'fullName email').limit(50);

    archiveData.notifications = notifications.map(notif => ({
      _id: notif._id,
      type: notif.type,
      title: notif.title,
      message: notif.message,
      createdAt: notif.createdAt,
      sender: notif.sender
    }));

    const archive = new Archive(archiveData);
    await archive.save();

    await archive.populate([
      { path: 'createdBy', select: 'fullName email avatar department' },
      { path: 'meeting', select: 'title startTime status' }
    ]);

    res.status(201).json({
      message: 'Tạo lưu trữ thành công',
      archive
    });

  } catch (error) {
    console.error('Create archive error:', error);
    res.status(500).json({
      message: 'Lỗi server khi tạo lưu trữ',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   PUT /api/archives/:id
// @desc    Cập nhật lưu trữ
// @access  Private
router.put('/:id', authenticateToken, archiveValidation, handleValidationErrors, async (req, res) => {
  try {
    const archive = await Archive.findById(req.params.id);
    
    if (!archive) {
      return res.status(404).json({
        message: 'Lưu trữ không tồn tại'
      });
    }

    // Kiểm tra quyền chỉnh sửa
    const canEdit = 
      req.user.role === 'admin' ||
      archive.createdBy.toString() === req.user._id.toString();

    if (!canEdit) {
      return res.status(403).json({
        message: 'Bạn không có quyền chỉnh sửa lưu trữ này'
      });
    }

    const {
      title,
      description,
      tags,
      summaryText,
      keyPoints,
      actionItems,
      nextSteps,
      isPublic,
      allowedDepartments,
      allowedUsers,
      restrictedUsers
    } = req.body;

    // Cập nhật dữ liệu
    const updateData = {
      title,
      description,
      tags,
      'access.isPublic': isPublic,
      'access.allowedDepartments': allowedDepartments,
      'access.allowedUsers': allowedUsers,
      'access.restrictedUsers': restrictedUsers
    };

    // Cập nhật summary nếu có
    if (summaryText || keyPoints || actionItems || nextSteps) {
      updateData.summary = {
        text: summaryText || archive.summary?.text,
        keyPoints: keyPoints || archive.summary?.keyPoints || [],
        actionItems: actionItems || archive.summary?.actionItems || [],
        nextSteps: nextSteps || archive.summary?.nextSteps
      };
    }

    const updatedArchive = await Archive.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate([
      { path: 'createdBy', select: 'fullName email avatar department' },
      { path: 'meeting', select: 'title startTime status' }
    ]);

    res.json({
      message: 'Cập nhật lưu trữ thành công',
      archive: updatedArchive
    });

  } catch (error) {
    console.error('Update archive error:', error);
    res.status(500).json({
      message: 'Lỗi server khi cập nhật lưu trữ',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   POST /api/archives/:id/notes
// @desc    Thêm ghi chú vào lưu trữ
// @access  Private
router.post('/:id/notes', authenticateToken, async (req, res) => {
  try {
    const { text, isImportant } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        message: 'Nội dung ghi chú không được để trống'
      });
    }

    const archive = await Archive.findById(req.params.id);
    
    if (!archive) {
      return res.status(404).json({
        message: 'Lưu trữ không tồn tại'
      });
    }

    // Kiểm tra quyền truy cập
    const canAccess = archive.canAccess(req.user._id, req.user.role, req.user.department);
    
    if (!canAccess) {
      return res.status(403).json({
        message: 'Bạn không có quyền thêm ghi chú vào lưu trữ này'
      });
    }

    const note = {
      text: text.trim(),
      author: req.user._id,
      isImportant: isImportant || false
    };

    archive.notes.push(note);
    await archive.save();

    await archive.populate('notes.author', 'fullName email avatar');

    res.status(201).json({
      message: 'Thêm ghi chú thành công',
      note: archive.notes[archive.notes.length - 1]
    });

  } catch (error) {
    console.error('Add note error:', error);
    res.status(500).json({
      message: 'Lỗi server khi thêm ghi chú',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   POST /api/archives/:id/upload
// @desc    Upload thêm tài liệu vào lưu trữ
// @access  Private
router.post('/:id/upload', authenticateToken, archiveUpload.array('files', 10), async (req, res) => {
  try {
    const archive = await Archive.findById(req.params.id);
    
    if (!archive) {
      return res.status(404).json({
        message: 'Lưu trữ không tồn tại'
      });
    }

    // Kiểm tra quyền upload
    const canUpload = 
      req.user.role === 'admin' ||
      archive.createdBy.toString() === req.user._id.toString() ||
      archive.access.allowedUsers.includes(req.user._id);

    if (!canUpload) {
      return res.status(403).json({
        message: 'Bạn không có quyền upload tài liệu vào lưu trữ này'
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        message: 'Không có file nào được upload'
      });
    }

    const uploadedFiles = [];

    for (const file of req.files) {
      const document = {
        name: file.originalname,
        originalPath: file.path,
        archivePath: file.path,
        size: file.size,
        type: 'additional',
        uploadedBy: req.user._id,
        uploadedAt: new Date()
      };

      archive.documents.push(document);
      uploadedFiles.push(document);
    }

    await archive.save();

    res.status(201).json({
      message: 'Upload tài liệu thành công',
      files: uploadedFiles
    });

  } catch (error) {
    console.error('Upload archive files error:', error);
    res.status(500).json({
      message: 'Lỗi server khi upload tài liệu',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   DELETE /api/archives/:id
// @desc    Xóa lưu trữ (soft delete)
// @access  Private
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const archive = await Archive.findById(req.params.id);
    
    if (!archive) {
      return res.status(404).json({
        message: 'Lưu trữ không tồn tại'
      });
    }

    // Kiểm tra quyền xóa
    const canDelete = 
      req.user.role === 'admin' ||
      archive.createdBy.toString() === req.user._id.toString();

    if (!canDelete) {
      return res.status(403).json({
        message: 'Bạn không có quyền xóa lưu trữ này'
      });
    }

    // Soft delete
    archive.status = 'deleted';
    await archive.save();

    res.json({
      message: 'Xóa lưu trữ thành công'
    });

  } catch (error) {
    console.error('Delete archive error:', error);
    res.status(500).json({
      message: 'Lỗi server khi xóa lưu trữ',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   PUT /api/archives/:id/update-minutes
// @desc    Cập nhật lại tất cả biên bản cho archive
// @access  Private
router.put('/:id/update-minutes', authenticateToken, async (req, res) => {
  console.log(`🔄 [UPDATE-MINUTES] Request received for archive: ${req.params.id}`);
  console.log(`🔄 [UPDATE-MINUTES] User: ${req.user._id}, Role: ${req.user.role}`);
  
  try {
    console.log(`🔍 [UPDATE-MINUTES] Finding archive: ${req.params.id}`);
    const archive = await Archive.findById(req.params.id);
    
    if (!archive) {
      return res.status(404).json({
        message: 'Lưu trữ không tồn tại'
      });
    }

    // Kiểm tra quyền chỉnh sửa
    const canEdit = 
      req.user.role === 'admin' ||
      archive.createdBy.toString() === req.user._id.toString();

    if (!canEdit) {
      return res.status(403).json({
        message: 'Bạn không có quyền cập nhật lưu trữ này'
      });
    }

    // Lấy tất cả biên bản và thống nhất của cuộc họp
    console.log(`🔄 Fetching protocols and minutes for meeting: ${archive.meeting}`);
    // Lấy meeting với minutesHistory (biên bản được lưu trong meeting)
    const meetingWithMinutes = await Meeting.findById(archive.meeting)
      .populate('minutesHistory.createdBy', 'fullName email')
      .populate('minutesHistory.reviewer', 'fullName email');
    
    console.log(`📋 Meeting minutesHistory count: ${meetingWithMinutes?.minutesHistory?.length || 0}`);
    
    // Lấy biên bản từ minutesHistory của meeting
    const allProtocols = meetingWithMinutes?.minutesHistory || [];
    
    // Lấy thống nhất từ Minutes collection (nếu có)
    const allMinutes = await Minutes.find({ meeting: archive.meeting })
      .populate('secretary', 'fullName email')
      .populate('approvedBy', 'fullName email')
      .populate('decisions.responsible', 'fullName email')
      .populate('votes.user', 'fullName email')
      .sort({ createdAt: -1 });
    
    // Debug: In ra chi tiết từng biên bản từ minutesHistory
    console.log(`📋 Protocol details from minutesHistory:`);
    allProtocols.forEach((p, index) => {
      console.log(`  ${index + 1}. Status: ${p.status} - CreatedBy: ${p.createdBy?.fullName || 'None'} - Created: ${p.createdAt}`);
    });
    
    console.log(`📝 Minutes details from Minutes collection:`);
    allMinutes.forEach((m, index) => {
      console.log(`  ${index + 1}. "${m.title}" - Status: ${m.status} - Secretary: ${m.secretary?.fullName || 'None'} - Created: ${m.createdAt}`);
    });

    console.log(`📊 Found ${allMinutes.length} minutes and ${allProtocols.length} protocols`);

    // Cập nhật minutesSnapshots (thống nhất)
    archive.minutesSnapshots = allMinutes.map(minutes => ({
      _id: minutes._id,
      title: minutes.title,
      content: minutes.content,
      status: minutes.status,
      decisions: minutes.decisions || [],
      votes: minutes.votes || [],
      voteDeadline: minutes.voteDeadline,
      isVotingClosed: minutes.isVotingClosed || false,
      isApproved: Boolean(minutes.approvedBy && minutes.approvedAt),
      approvedBy: minutes.approvedBy,
      approvedAt: minutes.approvedAt,
      secretary: minutes.secretary,
      createdAt: minutes.createdAt
    }));

    // Cập nhật protocolSnapshots (biên bản từ minutesHistory)
    console.log(`📝 [UPDATE-PROTOCOLS-MINUTES] Updating protocolSnapshots...`);
    archive.protocolSnapshots = allProtocols.map((protocol, index) => {
      // Tạo tên biên bản có ý nghĩa với STT rõ ràng
      const statusText = protocol.status === 'draft' ? 'Bản nháp' : 
                        protocol.status === 'pending' ? 'Chờ duyệt' :
                        protocol.status === 'approved' ? 'Đã duyệt' : 'Từ chối';
      const createdDate = new Date(protocol.createdAt).toLocaleDateString('vi-VN');
      const stt = String(index + 1).padStart(2, '0'); // STT có 2 chữ số, ví dụ: 01, 02, 03
      const title = `Biên bản STT-${stt} (${statusText}) - ${createdDate}`;
      
      console.log(`📝 [UPDATE-PROTOCOLS-MINUTES] Creating protocol STT-${stt} with title: "${title}"`);
      
      return {
        _id: protocol._id,
        title: title,
        content: protocol.content,
        status: protocol.status,
        secretary: protocol.createdBy, // Trong minutesHistory, createdBy là người tạo
        approvedBy: protocol.reviewer, // reviewer là người duyệt
        approvedAt: protocol.reviewedAt,
        rejectedBy: protocol.status === 'rejected' ? protocol.reviewer : null,
        rejectedAt: protocol.status === 'rejected' ? protocol.reviewedAt : null,
        rejectionReason: protocol.rejectionReason || null,
        createdAt: protocol.createdAt,
        submittedAt: protocol.submittedAt
      };
    });

    // Sắp xếp: biên bản đã phê duyệt lên trước, mới nhất lên đầu
    archive.minutesSnapshots.sort((a, b) => {
      if (a.isApproved !== b.isApproved) return b.isApproved - a.isApproved;
      return new Date(b.approvedAt || b.createdAt) - new Date(a.approvedAt || a.createdAt);
    });

    archive.protocolSnapshots.sort((a, b) => {
      const aApproved = a.status === 'approved';
      const bApproved = b.status === 'approved';
      if (aApproved !== bApproved) return bApproved - aApproved;
      return new Date(b.approvedAt || b.createdAt) - new Date(a.approvedAt || a.createdAt);
    });

    // Cập nhật documents nếu có attachments mới từ các biên bản
    const existingDocPaths = archive.documents.map(doc => doc.originalPath);
    
    for (const minutes of allMinutes) {
      if (minutes.attachments && minutes.attachments.length > 0) {
        for (const attachment of minutes.attachments) {
          // Chỉ thêm attachment chưa tồn tại
          if (!existingDocPaths.includes(attachment.path)) {
            archive.documents.push({
              name: attachment.name,
              originalPath: attachment.path,
              archivePath: attachment.path,
              size: attachment.size,
              type: 'minutes_attachment',
              uploadedBy: attachment.uploadedBy,
              uploadedAt: attachment.uploadedAt
            });
          }
        }
      }
    }

    await archive.save();

    res.json({
      message: 'Cập nhật biên bản thành công',
      archive
    });

  } catch (error) {
    console.error('Update minutes error:', error);
    res.status(500).json({
      message: 'Lỗi server khi cập nhật biên bản',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   PUT /api/archives/:id/sync-all
// @desc    Đồng bộ toàn bộ dữ liệu cho archive (tài liệu, biên bản, thống nhất)
// @access  Private
router.put('/:id/sync-all', authenticateToken, async (req, res) => {
  console.log(`🔄 [SYNC-ALL] Request received for archive: ${req.params.id}`);
  console.log(`🔄 [SYNC-ALL] User: ${req.user._id}, Role: ${req.user.role}`);
  console.log(`🔄 [SYNC-ALL] Request body:`, req.body);
  
  try {
    console.log(`🔄 Starting full sync for archive: ${req.params.id}`);
    
    const archive = await Archive.findById(req.params.id);
    if (!archive) {
      console.log(`❌ Archive not found: ${req.params.id}`);
      return res.status(404).json({ message: 'Archive không tồn tại' });
    }
    
    console.log(`✅ Archive found: ${archive.title}, Meeting ID: ${archive.meeting}`);

    // Kiểm tra quyền
    const meeting = await Meeting.findById(archive.meeting);
    if (!meeting) {
      console.log(`❌ Meeting not found: ${archive.meeting}`);
      return res.status(404).json({ message: 'Cuộc họp không tồn tại' });
    }
    
    const isOrganizer = meeting.organizer.toString() === req.user._id.toString();
    if (req.user.role !== 'admin' && !isOrganizer) {
      return res.status(403).json({ message: 'Không có quyền đồng bộ lưu trữ này' });
    }

    // Đồng bộ tất cả dữ liệu
    console.log(`🔍 Fetching data for meeting: ${archive.meeting}`);
    let minutes, protocols;
    
    try {
      console.log(`🔍 Fetching minutes...`);
      minutes = await Minutes.find({ meeting: archive.meeting })
        .populate('secretary', 'fullName email')
        .populate('approvedBy', 'fullName email')
        .populate('decisions.responsible', 'fullName email')
        .populate('votes.user', 'fullName email')
        .sort({ createdAt: 1 });
      console.log(`✅ Found ${minutes.length} minutes`);
    } catch (minutesError) {
      console.error('❌ Error fetching minutes:', minutesError);
      minutes = [];
    }
    
    try {
      console.log(`🔍 Fetching protocols...`);
      protocols = await Protocol.find({ meeting: archive.meeting })
        .populate('secretary', 'fullName email')
        .populate('approvedBy', 'fullName email')
        .populate('rejectedBy', 'fullName email')
        .sort({ createdAt: 1 });
      console.log(`✅ Found ${protocols.length} protocols`);
    } catch (protocolsError) {
      console.error('❌ Error fetching protocols:', protocolsError);
      protocols = [];
    }
    
    console.log(`📊 Total: ${minutes.length} minutes and ${protocols.length} protocols`);

    // Cập nhật snapshots
    console.log(`📝 Processing ${minutes.length} minutes for snapshots...`);
    archive.minutesSnapshots = minutes.map((m, index) => {
      console.log(`📝 Minutes ${index + 1}: ${m.title}, Status: ${m.status}, Secretary: ${m.secretary?.fullName}`);
      return {
        _id: m._id,
        title: m.title,
        content: m.content,
        status: m.status,
        decisions: m.decisions || [],
        votes: m.votes || [],
        voteDeadline: m.voteDeadline,
        isVotingClosed: m.isVotingClosed || false,
        isApproved: Boolean(m.approvedBy && m.approvedAt),
        approvedBy: m.approvedBy,
        approvedAt: m.approvedAt,
        secretary: m.secretary,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt
      };
    });

    console.log(`📋 Processing ${protocols.length} protocols for snapshots...`);
    archive.protocolSnapshots = protocols.map((p, index) => {
      // Tạo tên biên bản có ý nghĩa với STT rõ ràng
      const statusText = p.status === 'draft' ? 'Bản nháp' : 
                        p.status === 'pending' ? 'Chờ duyệt' :
                        p.status === 'approved' ? 'Đã duyệt' : 'Từ chối';
      const createdDate = new Date(p.createdAt).toLocaleDateString('vi-VN');
      const stt = String(index + 1).padStart(2, '0'); // STT có 2 chữ số, ví dụ: 01, 02, 03
      const title = p.title || `Biên bản STT-${stt} (${statusText}) - ${createdDate}`;
      
      console.log(`📋 Protocol STT-${stt}: ${title}, Status: ${p.status}, Secretary: ${p.secretary?.fullName}`);
      return {
        _id: p._id,
        title: title,
        content: p.content,
        status: p.status,
        secretary: p.secretary,
        approvedBy: p.approvedBy,
        approvedAt: p.approvedAt,
        rejectedBy: p.rejectedBy,
        rejectedAt: p.rejectedAt,
        rejectionReason: p.rejectionReason,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt
      };
    });

    // Khởi tạo documents array nếu chưa có
    if (!archive.documents) {
      archive.documents = [];
    }

    // Đồng bộ tất cả tài liệu
    const existingDocPaths = archive.documents.map(doc => doc.originalPath) || [];
    let addedFilesCount = 0;
    
    console.log(`📁 Starting file sync. Existing documents: ${archive.documents.length}`);

    // Sync summary files
    console.log(`📁 Syncing summary files: ${meeting.summaryFiles?.length || 0}`);
    if (meeting.summaryFiles && Array.isArray(meeting.summaryFiles)) {
      for (const file of meeting.summaryFiles) {
        if (file && file.path && !existingDocPaths.includes(file.path)) {
          archive.documents.push({
            name: file.name || 'Unknown file',
            originalPath: file.path,
            archivePath: file.path,
            size: file.size || 0,
            type: 'summary_file',
            uploadedBy: file.uploadedBy,
            uploadedAt: file.uploadedAt || new Date()
          });
          existingDocPaths.push(file.path);
          addedFilesCount++;
        }
      }
    }

    // Sync summary message attachments
    console.log(`📁 Syncing summary message attachments: ${meeting.summaryMessages?.length || 0} messages`);
    if (meeting.summaryMessages && Array.isArray(meeting.summaryMessages)) {
      for (const message of meeting.summaryMessages) {
        if (message && message.attachments && Array.isArray(message.attachments)) {
          for (const attachment of message.attachments) {
            if (attachment && attachment.path && !existingDocPaths.includes(attachment.path)) {
              archive.documents.push({
                name: attachment.name || 'Unknown attachment',
                originalPath: attachment.path,
                archivePath: attachment.path,
                size: attachment.size || 0,
                type: 'summary_message_attachment',
                uploadedBy: message.author || null,
                uploadedAt: attachment.uploadedAt || message.createdAt || new Date(),
                messageId: message._id,
                messageAuthor: message.author
              });
              existingDocPaths.push(attachment.path);
              addedFilesCount++;
            }
          }
        }
      }
    }

    // Sync meeting attachments
    console.log(`📁 Syncing meeting attachments: ${meeting.attachments?.length || 0}`);
    if (meeting.attachments && Array.isArray(meeting.attachments)) {
      for (const attachment of meeting.attachments) {
        if (attachment && attachment.path && !existingDocPaths.includes(attachment.path)) {
          archive.documents.push({
            name: attachment.name || 'Unknown meeting file',
            originalPath: attachment.path,
            archivePath: attachment.path,
            size: attachment.size || 0,
            type: 'meeting_attachment',
            uploadedBy: attachment.uploadedBy,
            uploadedAt: attachment.uploadedAt || new Date()
          });
          existingDocPaths.push(attachment.path);
          addedFilesCount++;
        }
      }
    }

    // Sync minutes attachments
    console.log(`📁 Syncing minutes attachments from ${minutes.length} minutes`);
    for (const minutesDoc of minutes) {
      if (minutesDoc.attachments && Array.isArray(minutesDoc.attachments)) {
        for (const attachment of minutesDoc.attachments) {
          if (attachment && attachment.path && !existingDocPaths.includes(attachment.path)) {
            archive.documents.push({
              name: attachment.name || 'Unknown minutes file',
              originalPath: attachment.path,
              archivePath: attachment.path,
              size: attachment.size || 0,
              type: 'minutes_attachment',
              uploadedBy: attachment.uploadedBy,
              uploadedAt: attachment.uploadedAt || new Date()
            });
            existingDocPaths.push(attachment.path);
            addedFilesCount++;
          }
        }
      }
    }

  // Sync protocol attachments from Protocols collection
  try {
    const protocolsWithFiles = await Protocol.find({ meeting: archive.meeting }, 'attachments createdAt')
      .populate('attachments.uploadedBy', '_id');
    console.log(`📁 Syncing protocol attachments: ${protocolsWithFiles.length}`);
    for (const protocolDoc of protocolsWithFiles) {
      if (protocolDoc.attachments && Array.isArray(protocolDoc.attachments)) {
        for (const att of protocolDoc.attachments) {
          if (att && att.path && !existingDocPaths.includes(att.path)) {
            archive.documents.push({
              name: att.name || 'Unknown protocol file',
              originalPath: att.path,
              archivePath: att.path,
              size: att.size || 0,
              type: 'protocol_attachment',
              uploadedBy: att.uploadedBy,
              uploadedAt: att.uploadedAt || protocolDoc.createdAt || new Date()
            });
            existingDocPaths.push(att.path);
            addedFilesCount++;
          }
        }
      }
    }
  } catch (protocolFilesErr) {
    console.error('❌ Error syncing protocol attachments:', protocolFilesErr);
  }

    // Cập nhật thống kê
    console.log(`📊 Updating statistics. Total documents: ${archive.documents.length}`);
    const totalSize = archive.documents.reduce((sum, doc) => sum + (doc.size || 0), 0);
    archive.statistics = {
      totalDocuments: archive.documents.length,
      totalSize: totalSize,
      viewCount: archive.statistics?.viewCount || 0,
      downloadCount: archive.statistics?.downloadCount || 0
    };

    console.log(`💾 Saving archive...`);
    await archive.save();
    
    console.log(`✅ Full sync completed - Minutes: ${minutes.length}, Protocols: ${protocols.length}, Added files: ${addedFilesCount}`);
    
    res.json({
      message: `Đồng bộ hoàn tất! Cập nhật ${minutes.length} biên bản, ${protocols.length} thống nhất và thêm ${addedFilesCount} tài liệu mới`,
      archive,
      syncResults: {
        minutesCount: minutes.length,
        protocolsCount: protocols.length,
        addedFilesCount: addedFilesCount,
        totalDocuments: archive.documents.length
      }
    });

  } catch (e) {
    console.error('❌ Full sync error:', e);
    console.error('❌ Error stack:', e.stack);
    res.status(500).json({
      message: 'Lỗi đồng bộ dữ liệu',
      error: process.env.NODE_ENV === 'development' ? e.message : 'Internal server error',
      stack: process.env.NODE_ENV === 'development' ? e.stack : undefined
    });
  }
});

// @route   PUT /api/archives/:id/update-protocols-minutes
// @desc    Cập nhật lại tất cả biên bản và tài liệu cho archive
// @access  Private
router.put('/:id/update-protocols-minutes', authenticateToken, async (req,res)=>{
  console.log(`🔄 [UPDATE-PROTOCOLS-MINUTES] ===== STARTING =====`);
  console.log(`🔄 [UPDATE-PROTOCOLS-MINUTES] Archive ID: ${req.params.id}`);
  console.log(`🔄 [UPDATE-PROTOCOLS-MINUTES] User: ${req.user._id}, Role: ${req.user.role}`);
  
  try {
    console.log(`🔄 Starting update protocols-minutes for archive: ${req.params.id}`);
    
    const archive = await Archive.findById(req.params.id);
    if(!archive) {
      console.log(`❌ Archive not found: ${req.params.id}`);
      return res.status(404).json({message:'Archive không tồn tại'});
    }
    
    console.log(`✅ Archive found: ${archive.title}, Meeting ID: ${archive.meeting}`);

    // quyền: admin hoặc organizer của meeting
    const meeting = await Meeting.findById(archive.meeting);
    if (!meeting) {
      console.log(`❌ Meeting not found: ${archive.meeting}`);
      return res.status(404).json({message:'Cuộc họp không tồn tại'});
    }
    
    console.log(`✅ Meeting found: ${meeting.title}`);
    
    const isOrganizer = meeting.organizer.toString() === req.user._id.toString();
    if(req.user.role!=='admin' && !isOrganizer) return res.status(403).json({message:'Không có quyền'});

    // Lấy meeting với minutesHistory (biên bản được lưu trong meeting)
    console.log(`🔍 [UPDATE-PROTOCOLS-MINUTES] Fetching meeting with minutesHistory...`);
    const meetingWithMinutes = await Meeting.findById(archive.meeting)
      .populate('minutesHistory.createdBy', 'fullName email')
      .populate('minutesHistory.reviewer', 'fullName email');
    
    console.log(`📋 [UPDATE-PROTOCOLS-MINUTES] Meeting minutesHistory count: ${meetingWithMinutes?.minutesHistory?.length || 0}`);
    console.log(`📋 [UPDATE-PROTOCOLS-MINUTES] Meeting object:`, meetingWithMinutes ? 'Found' : 'Not found');
    console.log(`📋 [UPDATE-PROTOCOLS-MINUTES] Meeting ID used for query: ${archive.meeting}`);
    
    if (meetingWithMinutes?.minutesHistory?.length > 0) {
      console.log(`📋 [UPDATE-PROTOCOLS-MINUTES] MinutesHistory details:`);
      meetingWithMinutes.minutesHistory.forEach((m, index) => {
        const statusText = m.status === 'draft' ? 'Bản nháp' : 
                          m.status === 'pending' ? 'Chờ duyệt' :
                          m.status === 'approved' ? 'Đã duyệt' : 'Từ chối';
        const createdDate = new Date(m.createdAt).toLocaleDateString('vi-VN');
        const newTitle = `Biên bản ${index + 1} (${statusText}) - ${createdDate}`;
        console.log(`  ${index + 1}. ID: ${m._id}, Status: ${m.status}, CreatedBy: ${m.createdBy?.fullName || 'None'}, NewTitle: "${newTitle}"`);
      });
    } else {
      console.log(`📋 [UPDATE-PROTOCOLS-MINUTES] No minutesHistory found or empty array`);
    }
    
    // Lấy biên bản từ minutesHistory của meeting
    const allProtocols = meetingWithMinutes?.minutesHistory || [];
    
    // Lấy thống nhất từ Minutes collection (nếu có)
    const allMinutes = await Minutes.find({ meeting: archive.meeting })
      .populate('secretary', 'fullName email')
      .populate('approvedBy', 'fullName email');
    
    console.log(`📊 [UPDATE-PROTOCOLS-MINUTES] Final counts - Minutes: ${allMinutes.length}, Protocols: ${allProtocols.length}`);

    // Cập nhật snapshots
    console.log(`📝 [UPDATE-PROTOCOLS-MINUTES] Updating minutesSnapshots...`);
    archive.minutesSnapshots = allMinutes.map(minutes => ({
      _id: minutes._id,
      title: minutes.title,
      content: minutes.content,
      status: minutes.status,
      decisions: minutes.decisions || [],
      votes: minutes.votes || [],
      voteDeadline: minutes.voteDeadline,
      isVotingClosed: minutes.isVotingClosed || false,
      isApproved: Boolean(minutes.approvedBy && minutes.approvedAt),
      approvedBy: minutes.approvedBy,
      approvedAt: minutes.approvedAt,
      secretary: minutes.secretary,
      createdAt: minutes.createdAt
    }));

    // Cập nhật protocolSnapshots (biên bản từ minutesHistory)
    archive.protocolSnapshots = allProtocols.map((protocol, index) => {
      // Tạo tên biên bản có ý nghĩa với STT rõ ràng
      const statusText = protocol.status === 'draft' ? 'Bản nháp' : 
                        protocol.status === 'pending' ? 'Chờ duyệt' :
                        protocol.status === 'approved' ? 'Đã duyệt' : 'Từ chối';
      const createdDate = new Date(protocol.createdAt).toLocaleDateString('vi-VN');
      const stt = String(index + 1).padStart(2, '0'); // STT có 2 chữ số, ví dụ: 01, 02, 03
      const title = `Biên bản STT-${stt} (${statusText}) - ${createdDate}`;
      
      console.log(`📋 Protocol STT-${stt}: ${title}, Status: ${protocol.status}, Secretary: ${protocol.createdBy?.fullName}`);
      
      return {
        _id: protocol._id,
        title: title,
        content: protocol.content,
        status: protocol.status,
        secretary: protocol.createdBy, // Trong minutesHistory, createdBy là người tạo
        approvedBy: protocol.reviewer, // reviewer là người duyệt
        approvedAt: protocol.reviewedAt,
        rejectedBy: protocol.status === 'rejected' ? protocol.reviewer : null,
        rejectedAt: protocol.status === 'rejected' ? protocol.reviewedAt : null,
        rejectionReason: protocol.rejectionReason || null,
        createdAt: protocol.createdAt,
        submittedAt: protocol.submittedAt
      };
    });
    
    console.log(`📋 Updated snapshots - Minutes: ${allMinutes.length}, Protocols: ${allProtocols.length}`);
    
    // Sắp xếp protocols theo trạng thái và thời gian
    archive.protocolSnapshots.sort((a, b) => {
      const aApproved = a.status === 'approved';
      const bApproved = b.status === 'approved';
      if (aApproved !== bApproved) return bApproved - aApproved;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    // Khởi tạo documents array nếu chưa có
    if (!archive.documents) {
      archive.documents = [];
      console.log(`📁 Initialized empty documents array`);
    }

    // Cập nhật documents - sync lại tất cả files
    const existingDocPaths = archive.documents.map(doc => doc.originalPath) || [];
    let addedFilesCount = 0;
    
    console.log(`📁 Existing documents: ${archive.documents.length}`);

    try {
      // Sync summary files
      if (meeting.summaryFiles && Array.isArray(meeting.summaryFiles) && meeting.summaryFiles.length > 0) {
        console.log(`📁 Syncing ${meeting.summaryFiles.length} summary files`);
        for (const file of meeting.summaryFiles) {
          if (file && file.path && !existingDocPaths.includes(file.path)) {
            archive.documents.push({
              name: file.name || 'Unknown file',
              originalPath: file.path,
              archivePath: file.path,
              size: file.size || 0,
              type: 'summary_file',
              uploadedBy: file.uploadedBy,
              uploadedAt: file.uploadedAt || new Date()
            });
            existingDocPaths.push(file.path);
            addedFilesCount++;
          }
        }
      }

      // Sync summary message attachments
      if (meeting.summaryMessages && Array.isArray(meeting.summaryMessages) && meeting.summaryMessages.length > 0) {
        console.log(`📁 Syncing summary message attachments from ${meeting.summaryMessages.length} messages`);
        for (const message of meeting.summaryMessages) {
          if (message && message.attachments && Array.isArray(message.attachments) && message.attachments.length > 0) {
            for (const attachment of message.attachments) {
              if (attachment && attachment.path && !existingDocPaths.includes(attachment.path)) {
                archive.documents.push({
                  name: attachment.name || 'Unknown attachment',
                  originalPath: attachment.path,
                  archivePath: attachment.path,
                  size: attachment.size || 0,
                  type: 'summary_message_attachment',
                  uploadedBy: message.author || null,
                  uploadedAt: attachment.uploadedAt || message.createdAt || new Date(),
                  messageId: message._id,
                  messageAuthor: message.author
                });
                existingDocPaths.push(attachment.path);
                addedFilesCount++;
              }
            }
          }
        }
      }

      // Sync meeting attachments
      if (meeting.attachments && Array.isArray(meeting.attachments) && meeting.attachments.length > 0) {
        console.log(`📁 Syncing ${meeting.attachments.length} meeting attachments`);
        for (const attachment of meeting.attachments) {
          if (attachment && attachment.path && !existingDocPaths.includes(attachment.path)) {
            archive.documents.push({
              name: attachment.name || 'Unknown meeting file',
              originalPath: attachment.path,
              archivePath: attachment.path,
              size: attachment.size || 0,
              type: 'meeting_attachment',
              uploadedBy: attachment.uploadedBy,
              uploadedAt: attachment.uploadedAt || new Date()
            });
            addedFilesCount++;
          }
        }
      }
    } catch (syncError) {
      console.error('❌ Error syncing files:', syncError);
      // Continue execution even if file sync fails
    }

    console.log(`💾 [UPDATE-PROTOCOLS-MINUTES] Saving archive with updated data...`);
    await archive.save();
    
    console.log(`✅ [UPDATE-PROTOCOLS-MINUTES] Archive saved successfully!`);
    console.log(`📁 Archive updated - Added ${addedFilesCount} new files`);
    console.log(`📋 Final protocolSnapshots titles:`, archive.protocolSnapshots.map(p => p.title));
    
    res.json({
      message: `Đã cập nhật lưu trữ${addedFilesCount > 0 ? ` và thêm ${addedFilesCount} file mới` : ''}`, 
      archive,
      addedFilesCount
    });
  } catch(e){
    console.error('❌ Update protocols-minutes error:', e);
    console.error('❌ Stack trace:', e.stack);
    res.status(500).json({
      message: 'Server error', 
      error: process.env.NODE_ENV === 'development' ? e.message : 'Internal server error'
    });
  }
});

module.exports = router;
