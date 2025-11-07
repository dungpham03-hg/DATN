const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const Protocol = require('../models/Protocol');
const Meeting = require('../models/Meeting');
const Notification = require('../models/Notification');
const Archive = require('../models/Archive');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Helper functions
const getContentType = (filename) => {
  const ext = path.extname(filename).toLowerCase();
  const contentTypes = {
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.txt': 'text/plain',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif'
  };
  return contentTypes[ext] || 'application/octet-stream';
};

const allowedRoles = ['admin', 'manager', 'secretary', 'technician'];
const allowedMimeTypes = [
  'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain', 'image/jpeg', 'image/png', 'image/gif'
];

const router = express.Router();

// Multer configuration for protocol file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/protocols');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'protocol-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024, files: 10 }, // 50MB limit, max 10 files
  fileFilter: (req, file, cb) => {
    allowedMimeTypes.includes(file.mimetype) 
      ? cb(null, true) 
      : cb(new Error('Loại file không được hỗ trợ'), false);
  }
});

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: 'Dữ liệu không hợp lệ', errors: errors.array() });
  }
  next();
};

// Helper functions
const hasProtocolPermission = (reqUser, protocol) => {
  if (!protocol) return false;
  return reqUser.role === 'admin' || 
    (['manager', 'secretary'].includes(reqUser.role) && 
     protocol.secretary?.toString() === reqUser._id.toString());
};

const canViewProtocol = (reqUser, protocol) => {
  return allowedRoles.includes(reqUser.role) || 
         protocol.secretary?.toString() === reqUser._id.toString();
};

const populateProtocol = [
  { path: 'secretary', select: 'fullName email avatar' },
  { path: 'approvedBy', select: 'fullName email avatar' },
  { path: 'rejectedBy', select: 'fullName email avatar' },
  { path: 'meeting', select: 'title organizer startTime endTime location', 
    populate: { path: 'organizer', select: 'fullName email' } },
  { path: 'attachments.uploadedBy', select: 'fullName email avatar' }
];

const streamFile = (res, filePath, attachment, isDownload = false) => {
  const contentType = getContentType(attachment.name);
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', 
    `${isDownload ? 'attachment' : 'inline'}; filename="${attachment.name}"`);
  
  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);
};

// GET /api/protocols?meeting=ID - list
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { meeting, status, organizer } = req.query;

    
    const query = {};
    
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
    if (organizer) query['meeting.organizer'] = organizer;
    const protocols = await Protocol.find(query)
      .populate(populateProtocol)
      .sort({ createdAt: -1 });
    let result = protocols;
    if (organizer) {
      result = protocols.filter(p => p.meeting?.organizer?._id?.toString() === organizer);
    }
    res.json({ protocols: result });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
});

// GET /api/protocols/:id - detail
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const protocol = await Protocol.findById(req.params.id).populate(populateProtocol);
    if (!protocol) return res.status(404).json({ message: 'Biên bản không tồn tại' });
    if (!canViewProtocol(req.user, protocol)) {
      return res.status(403).json({ message: 'Bạn không có quyền xem biên bản' });
    }
    res.json(protocol);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
});

// POST /api/protocols - create
router.post('/', authenticateToken, upload.array('attachments', 10), async (req, res) => {
  try {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Bạn không có quyền tạo biên bản' });
    }
    
    const { meeting, title, content, decisions } = req.body;
    
    // Validation
    if (!meeting) return res.status(400).json({ message: 'ID cuộc họp là bắt buộc' });
    if (!title || title.trim().length < 3 || title.trim().length > 200) {
      return res.status(400).json({ message: 'Tiêu đề phải từ 3-200 ký tự' });
    }
    if (!content || content.trim().length < 10 || content.trim().length > 10000) {
      return res.status(400).json({ message: 'Nội dung phải từ 10-10000 ký tự' });
    }
    
    // Process file attachments
    const attachments = (req.files || []).map(file => ({
      name: file.originalname,
      path: `/uploads/protocols/${file.filename}`,
      size: file.size,
      uploadedBy: req.user._id,
      uploadedAt: new Date()
    }));
    
    // Parse decisions from FormData
    let parsedDecisions = [];
    if (decisions) {
      try { parsedDecisions = JSON.parse(decisions); } 
      catch (e) { parsedDecisions = []; }
    }
    
    const protocol = await Protocol.create({
      meeting,
      title: title.trim(),
      content: content.trim(),
      decisions: parsedDecisions,
      attachments,
      secretary: req.user._id,
      status: 'pending'
    });
    await protocol.populate([
      { path: 'secretary', select: 'fullName email avatar' },
      { path: 'attachments.uploadedBy', select: 'fullName email avatar' }
    ]);

    // Gửi notification cho organizer
    try {
      const meet = await Meeting.findById(meeting);
      if (meet && meet.organizer) {
        const noti = await Notification.create({
          recipient: meet.organizer,
          sender: req.user._id,
          type: 'protocol_pending',
          title: 'Biên bản cần phê duyệt',
          message: `${req.user.fullName} đã gửi biên bản cho cuộc họp "${meet.title}" chờ bạn phê duyệt`,
          data: { meetingId: meet._id }
        });

        // socket
        const io = req.app.get('io');
        if (io) {
          await noti.populate('sender', 'fullName email avatar position');
          io.to(`user_${meet.organizer.toString()}`).emit('newNotification', noti);
        }
      }
    } catch(e) {
      console.error('send protocol pending notification error', e.message);
    }

    // cập nhật snapshot vào archive
    await Archive.updateOne({ meeting }, { $push: { protocolSnapshots: protocol } });

    // đẩy file đính kèm của biên bản vào archive.documents
    try {
      if (attachments && attachments.length > 0) {
        const docs = attachments.map(att => ({
          name: att.name,
          originalPath: att.path,
          archivePath: att.path,
          size: att.size,
          type: 'protocol_attachment',
          uploadedBy: att.uploadedBy,
          uploadedAt: att.uploadedAt
        }));
        await Archive.updateOne({ meeting }, { $push: { documents: { $each: docs } } });
      }
    } catch(e) {
      console.error('push protocol attachments to archive error', e.message);
    }

    res.status(201).json({ message: 'Tạo biên bản thành công', protocol });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
});

// PUT /api/protocols/:id - update
router.put('/:id', authenticateToken, [
  body('title').optional().trim().isLength({ min: 3, max: 200 }),
  body('content').optional().trim().isLength({ min: 10, max: 10000 }),
  body('rejectionReason').optional().trim().isLength({ max: 1000 })
], handleValidationErrors, async (req, res) => {
  try {
    const protocol = await Protocol.findById(req.params.id);
    if (!protocol) return res.status(404).json({ message: 'Biên bản không tồn tại' });
    if (!hasProtocolPermission(req.user, protocol)) {
      return res.status(403).json({ message: 'Bạn không có quyền chỉnh sửa biên bản' });
    }
    
    const updateFields = ['title', 'content', 'decisions', 'status', 'rejectionReason'];
    updateFields.forEach(field => {
      if (req.body[field] !== undefined) protocol[field] = req.body[field];
    });

    // Handle status changes
    if (req.body.status === 'approved') {
      protocol.approvedBy = req.user._id;
      protocol.approvedAt = new Date();
      protocol.rejectedBy = protocol.rejectedAt = protocol.rejectionReason = undefined;
    } else if (req.body.status === 'rejected') {
      protocol.rejectedBy = req.user._id;
      protocol.rejectedAt = new Date();
      protocol.approvedBy = protocol.approvedAt = undefined;
    }

    await protocol.save();
    // cập nhật snapshot: replace in array
    await Archive.updateOne({ meeting: protocol.meeting, 'protocolSnapshots._id': protocol._id }, { 'protocolSnapshots.$': protocol });
    res.json({ message: 'Cập nhật biên bản thành công', protocol });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
});

// DELETE /api/protocols/:id - remove
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const protocol = await Protocol.findById(req.params.id);
    if (!protocol) return res.status(404).json({ message: 'Biên bản không tồn tại' });
    if (!hasProtocolPermission(req.user, protocol)) {
      return res.status(403).json({ message: 'Bạn không có quyền xoá biên bản' });
    }
    // Xóa document chính
    await protocol.deleteOne();
    // Gỡ snapshot khỏi archive và xoá các tài liệu loại protocol_attachment tương ứng
    try {
      await Archive.updateOne(
        { meeting: protocol.meeting },
        {
          $pull: {
            protocolSnapshots: { _id: protocol._id },
            documents: { type: 'protocol_attachment', originalPath: { $in: (protocol.attachments || []).map(a => a.path) } }
          }
        }
      );
    } catch (e) {
      console.error('remove protocol snapshot/documents error', e.message);
    }
    res.json({ message: 'Xoá biên bản thành công' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
});

// GET /api/protocols/:id/attachments/:attachmentId/view - view attachment
router.get('/:id/attachments/:attachmentId/view', authenticateToken, async (req, res) => {
  try {
    const protocol = await Protocol.findById(req.params.id);
    if (!protocol) {
      return res.status(404).json({ message: 'Biên bản không tồn tại' });
    }

    const attachment = protocol.attachments.find(att => att._id.toString() === req.params.attachmentId);
    if (!attachment) {
      return res.status(404).json({ message: 'File đính kèm không tồn tại' });
    }

    const filePath = path.join(__dirname, '..', attachment.path);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File không tồn tại trên server' });
    }

    streamFile(res, filePath, attachment, false);
  } catch (error) {
    console.error('View attachment error:', error);
    res.status(500).json({ message: 'Lỗi server khi xem file' });
  }
});

// GET /api/protocols/:id/attachments/:attachmentId/download - download attachment
router.get('/:id/attachments/:attachmentId/download', authenticateToken, async (req, res) => {
  try {
    const protocol = await Protocol.findById(req.params.id);
    if (!protocol) {
      return res.status(404).json({ message: 'Biên bản không tồn tại' });
    }

    const attachment = protocol.attachments.find(att => att._id.toString() === req.params.attachmentId);
    if (!attachment) {
      return res.status(404).json({ message: 'File đính kèm không tồn tại' });
    }

    const filePath = path.join(__dirname, '..', attachment.path);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File không tồn tại trên server' });
    }

    streamFile(res, filePath, attachment, true);
  } catch (error) {
    console.error('Download attachment error:', error);
    res.status(500).json({ message: 'Lỗi server khi tải file' });
  }
});

module.exports = router; 