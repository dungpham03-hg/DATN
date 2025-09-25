const express = require('express');
const router = express.Router();
const MeetingRoom = require('../models/MeetingRoom');
const { authenticateToken } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// Validation rules
const roomValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Tên phòng họp là bắt buộc')
    .isLength({ max: 100 })
    .withMessage('Tên phòng không được vượt quá 100 ký tự'),
  
  body('capacity')
    .isInt({ min: 1, max: 500 })
    .withMessage('Sức chứa phải từ 1 đến 500 người'),
  
  body('location.floor')
    .trim()
    .notEmpty()
    .withMessage('Tầng là bắt buộc'),
  
  body('location.building')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Tên tòa nhà không được vượt quá 100 ký tự'),
  
  body('facilities')
    .optional()
    .isArray()
    .withMessage('Tiện nghi phải là mảng'),
  
  body('facilities.*')
    .optional()
    .isIn(['projector', 'whiteboard', 'tv', 'video_conference', 'sound_system', 'air_conditioning', 'wifi'])
    .withMessage('Tiện nghi không hợp lệ')
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

// @route   GET /api/meeting-rooms
// @desc    Lấy danh sách phòng họp
// @access  Private
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { 
      isActive,
      floor,
      minCapacity,
      startTime,
      endTime 
    } = req.query;

    // Nếu có startTime và endTime, tìm phòng với trạng thái
    if (startTime && endTime) {
      const { showAll = 'false' } = req.query;
      
      let rooms;
      if (showAll === 'true') {
        // Hiển thị tất cả phòng với trạng thái
        rooms = await MeetingRoom.findAllRoomsWithStatus(
          new Date(startTime),
          new Date(endTime),
          parseInt(minCapacity) || 0
        );
      } else {
        // Chỉ hiển thị phòng khả dụng
        rooms = await MeetingRoom.findAvailableRooms(
          new Date(startTime),
          new Date(endTime),
          parseInt(minCapacity) || 0
        );
      }
      
      return res.json({
        message: showAll === 'true' ? 'Lấy danh sách phòng họp thành công' : 'Lấy danh sách phòng họp khả dụng thành công',
        rooms
      });
    }

    // Query thông thường
    const query = {};
    if (typeof isActive === 'string') {
      query.isActive = isActive === 'true';
    }
    if (floor) query['location.floor'] = floor;
    if (minCapacity) query.capacity = { $gte: parseInt(minCapacity) };

    const rooms = await MeetingRoom.find(query)
      .populate('createdBy', 'fullName')
      .sort('name');

    res.json({
      message: 'Lấy danh sách phòng họp thành công',
      rooms
    });

  } catch (error) {
    console.error('Get meeting rooms error:', error);
    res.status(500).json({
      message: 'Lỗi server khi lấy danh sách phòng họp',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   GET /api/meeting-rooms/:id
// @desc    Lấy thông tin chi tiết phòng họp
// @access  Private
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const room = await MeetingRoom.findById(req.params.id)
      .populate('createdBy', 'fullName email');

    if (!room) {
      return res.status(404).json({
        message: 'Phòng họp không tồn tại'
      });
    }

    res.json({
      message: 'Lấy thông tin phòng họp thành công',
      room
    });

  } catch (error) {
    console.error('Get meeting room error:', error);
    res.status(500).json({
      message: 'Lỗi server khi lấy thông tin phòng họp',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   POST /api/meeting-rooms
// @desc    Tạo phòng họp mới
// @access  Private (Admin, Manager)
router.post('/', authenticateToken, roomValidation, handleValidationErrors, async (req, res) => {
  try {
    // Chỉ admin và manager mới được tạo phòng
    if (!['admin', 'manager'].includes(req.user.role)) {
      return res.status(403).json({
        message: 'Bạn không có quyền tạo phòng họp'
      });
    }

    const roomData = {
      ...req.body,
      createdBy: req.user._id
    };

    const room = new MeetingRoom(roomData);
    await room.save();

    await room.populate('createdBy', 'fullName email');

    res.status(201).json({
      message: 'Tạo phòng họp thành công',
      room
    });

  } catch (error) {
    console.error('Create meeting room error:', error);
    
    // Xử lý lỗi duplicate name
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'Tên phòng họp đã tồn tại'
      });
    }

    res.status(500).json({
      message: 'Lỗi server khi tạo phòng họp',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   PUT /api/meeting-rooms/:id
// @desc    Cập nhật phòng họp
// @access  Private (Admin, Manager)
router.put('/:id', authenticateToken, roomValidation, handleValidationErrors, async (req, res) => {
  try {
    // Chỉ admin và manager mới được sửa phòng
    if (!['admin', 'manager'].includes(req.user.role)) {
      return res.status(403).json({
        message: 'Bạn không có quyền chỉnh sửa phòng họp'
      });
    }

    const room = await MeetingRoom.findById(req.params.id);
    
    if (!room) {
      return res.status(404).json({
        message: 'Phòng họp không tồn tại'
      });
    }

    // Cập nhật thông tin
    Object.assign(room, req.body);
    await room.save();

    await room.populate('createdBy', 'fullName email');

    res.json({
      message: 'Cập nhật phòng họp thành công',
      room
    });

  } catch (error) {
    console.error('Update meeting room error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'Tên phòng họp đã tồn tại'
      });
    }

    res.status(500).json({
      message: 'Lỗi server khi cập nhật phòng họp',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   DELETE /api/meeting-rooms/:id
// @desc    Xóa/Vô hiệu hóa phòng họp
// @access  Private (Admin)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    // Chỉ admin mới được xóa phòng
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        message: 'Chỉ admin mới có quyền xóa phòng họp'
      });
    }

    const room = await MeetingRoom.findById(req.params.id);
    
    if (!room) {
      return res.status(404).json({
        message: 'Phòng họp không tồn tại'
      });
    }

    // Soft delete - chỉ đánh dấu inactive
    room.isActive = false;
    await room.save();

    res.json({
      message: 'Vô hiệu hóa phòng họp thành công'
    });

  } catch (error) {
    console.error('Delete meeting room error:', error);
    res.status(500).json({
      message: 'Lỗi server khi xóa phòng họp',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   GET /api/meeting-rooms/:id/availability
// @desc    Kiểm tra phòng có sẵn không
// @access  Private
router.get('/:id/availability', authenticateToken, async (req, res) => {
  try {
    const { startTime, endTime } = req.query;

    if (!startTime || !endTime) {
      return res.status(400).json({
        message: 'Vui lòng cung cấp thời gian bắt đầu và kết thúc'
      });
    }

    const room = await MeetingRoom.findById(req.params.id);
    
    if (!room) {
      return res.status(404).json({
        message: 'Phòng họp không tồn tại'
      });
    }

    const isAvailable = await room.isAvailable(
      new Date(startTime),
      new Date(endTime)
    );

    res.json({
      message: 'Kiểm tra thành công',
      isAvailable,
      room: {
        _id: room._id,
        name: room.name,
        capacity: room.capacity
      }
    });

  } catch (error) {
    console.error('Check availability error:', error);
    res.status(500).json({
      message: 'Lỗi server khi kiểm tra phòng',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

module.exports = router; 