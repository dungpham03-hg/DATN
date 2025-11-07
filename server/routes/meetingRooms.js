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
// @access  Private (Admin, Manager, Technician)
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Chỉ admin, manager và technician mới được tra cứu phòng họp
    if (!['admin', 'manager', 'technician'].includes(req.user.role)) {
      return res.status(403).json({
        message: 'Bạn không có quyền tra cứu phòng họp'
      });
    }

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

// @route   GET /api/meeting-rooms/:id/availability
// @desc    Kiểm tra phòng có sẵn không
// @access  Private (Admin, Manager, Technician)
router.get('/:id/availability', authenticateToken, async (req, res) => {
  try {
    // Chỉ admin, manager và technician mới được kiểm tra khả dụng phòng
    if (!['admin', 'manager', 'technician'].includes(req.user.role)) {
      return res.status(403).json({
        message: 'Bạn không có quyền kiểm tra khả dụng phòng họp'
      });
    }

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

// @route   GET /api/meeting-rooms/:id/history
// @desc    Xem lịch sử sử dụng phòng
// @access  Private (Admin, Manager, Technician)
router.get('/:id/history', authenticateToken, async (req, res) => {
  try {
    // Chỉ admin, manager và technician mới được xem lịch sử phòng
    if (!['admin', 'manager', 'technician'].includes(req.user.role)) {
      return res.status(403).json({
        message: 'Bạn không có quyền xem lịch sử sử dụng phòng'
      });
    }

    const room = await MeetingRoom.findById(req.params.id);
    
    if (!room) {
      return res.status(404).json({
        message: 'Phòng họp không tồn tại'
      });
    }

    const { startDate, endDate, status } = req.query;
    const Meeting = require('../models/Meeting');
    
    // Xây dựng query
    const query = {
      room: room._id // Tìm theo ObjectId của phòng
    };

    // Lọc theo khoảng thời gian
    if (startDate || endDate) {
      query.startTime = {};
      if (startDate) query.startTime.$gte = new Date(startDate);
      if (endDate) query.startTime.$lte = new Date(endDate);
    }

    // Lọc theo trạng thái
    if (status) {
      query.status = status;
    }

    // Lấy danh sách cuộc họp
    const meetings = await Meeting.find(query)
      .select('title startTime endTime status room')
      .populate('room', 'name')
      .sort({ startTime: -1 })
      .limit(100);

    // Format dữ liệu trả về: tên cuộc họp, tên phòng, thời gian sử dụng
    const history = meetings.map(meeting => ({
      meetingTitle: meeting.title,
      roomName: meeting.room?.name || room.name,
      startTime: meeting.startTime,
      endTime: meeting.endTime,
      status: meeting.status,
      duration: meeting.endTime && meeting.startTime 
        ? Math.round((new Date(meeting.endTime) - new Date(meeting.startTime)) / (1000 * 60)) // phút
        : null
    }));

    res.json({
      message: 'Lấy lịch sử sử dụng phòng thành công',
      room: {
        _id: room._id,
        name: room.name
      },
      history,
      total: history.length
    });

  } catch (error) {
    console.error('Get room history error:', error);
    res.status(500).json({
      message: 'Lỗi server khi lấy lịch sử sử dụng phòng',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   GET /api/meeting-rooms/usage-history
// @desc    Tra cứu lịch sử sử dụng phòng theo khoảng thời gian
// @access  Private (Admin, Manager, Technician)
// Lưu ý: Route này phải được đặt TRƯỚC route /:id để tránh match sai
router.get('/usage-history', authenticateToken, async (req, res) => {
  try {
    // Chỉ admin, manager và technician mới được tra cứu lịch sử sử dụng phòng
    if (!['admin', 'manager', 'technician'].includes(req.user.role)) {
      return res.status(403).json({
        message: 'Bạn không có quyền tra cứu lịch sử sử dụng phòng'
      });
    }

    const { startTime, endTime } = req.query;

    if (!startTime || !endTime) {
      return res.status(400).json({
        message: 'Vui lòng cung cấp thời gian bắt đầu và kết thúc'
      });
    }

    const Meeting = require('../models/Meeting');
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    // Tìm tất cả cuộc họp có sử dụng phòng trong khoảng thời gian
    // Cuộc họp được coi là trong khoảng thời gian nếu:
    // - startTime của cuộc họp nằm trong khoảng [startTime, endTime]
    // - endTime của cuộc họp nằm trong khoảng [startTime, endTime]
    // - Cuộc họp bắt đầu trước và kết thúc sau khoảng thời gian
    const query = {
      room: { $exists: true, $ne: null }, // Chỉ lấy cuộc họp có phòng
      $or: [
        // Cuộc họp bắt đầu trong khoảng thời gian
        { startTime: { $gte: startDate, $lte: endDate } },
        // Cuộc họp kết thúc trong khoảng thời gian
        { endTime: { $gte: startDate, $lte: endDate } },
        // Cuộc họp bao trùm toàn bộ khoảng thời gian
        { startTime: { $lte: startDate }, endTime: { $gte: endDate } }
      ]
    };

    // Lấy danh sách cuộc họp
    const meetings = await Meeting.find(query)
      .select('title startTime endTime status room organizer')
      .populate('room', 'name location capacity')
      .populate('organizer', 'fullName email')
      .sort({ startTime: 1 })
      .limit(500);

    // Format dữ liệu trả về: tên cuộc họp, tên phòng, thời gian sử dụng
    const usageHistory = meetings.map(meeting => ({
      meetingId: meeting._id,
      meetingTitle: meeting.title,
      roomId: meeting.room?._id,
      roomName: meeting.room?.name || 'Không xác định',
      roomLocation: meeting.room?.location ? 
        `${meeting.room.location.building || ''} ${meeting.room.location.floor || ''}`.trim() : 
        '—',
      startTime: meeting.startTime,
      endTime: meeting.endTime,
      status: meeting.status,
      duration: meeting.endTime && meeting.startTime 
        ? Math.round((new Date(meeting.endTime) - new Date(meeting.startTime)) / (1000 * 60)) // phút
        : null,
      organizer: meeting.organizer ? {
        name: meeting.organizer.fullName,
        email: meeting.organizer.email
      } : null
    }));

    res.json({
      message: 'Tra cứu lịch sử sử dụng phòng thành công',
      period: {
        startTime: startDate,
        endTime: endDate
      },
      usageHistory,
      total: usageHistory.length
    });

  } catch (error) {
    console.error('Get usage history error:', error);
    res.status(500).json({
      message: 'Lỗi server khi tra cứu lịch sử sử dụng phòng',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   GET /api/meeting-rooms/:id
// @desc    Lấy thông tin chi tiết phòng họp
// @access  Private (Admin, Manager, Technician)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    // Chỉ admin, manager và technician mới được xem chi tiết phòng
    if (!['admin', 'manager', 'technician'].includes(req.user.role)) {
      return res.status(403).json({
        message: 'Bạn không có quyền xem thông tin phòng họp'
      });
    }

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
// @access  Private (Admin, Manager, Technician)
router.post('/', authenticateToken, roomValidation, handleValidationErrors, async (req, res) => {
  try {
    // Chỉ admin, manager và technician mới được tạo phòng
    if (!['admin', 'manager', 'technician'].includes(req.user.role)) {
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
// @access  Private (Admin, Manager, Technician)
router.put('/:id', authenticateToken, roomValidation, handleValidationErrors, async (req, res) => {
  try {
    // Chỉ admin, manager và technician mới được sửa phòng
    if (!['admin', 'manager', 'technician'].includes(req.user.role)) {
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

// @route   PUT /api/meeting-rooms/:id/deactivate
// @desc    Vô hiệu hóa phòng họp (đưa về trạng thái không khả dụng)
// @access  Private (Admin, Technician)
router.put('/:id/deactivate', authenticateToken, async (req, res) => {
  try {
    // Chỉ admin và technician mới được vô hiệu hóa phòng
    if (!['admin', 'technician'].includes(req.user.role)) {
      return res.status(403).json({
        message: 'Chỉ admin và technician mới có quyền vô hiệu hóa phòng họp'
      });
    }

    const room = await MeetingRoom.findById(req.params.id);
    
    if (!room) {
      return res.status(404).json({
        message: 'Phòng họp không tồn tại'
      });
    }

    // Kiểm tra xem phòng có đang được sử dụng trong các cuộc họp sắp tới không
    const Meeting = require('../models/Meeting');
    const now = new Date();
    const upcomingMeetings = await Meeting.find({
      room: room._id,
      status: { $in: ['scheduled', 'ongoing'] },
      startTime: { $gte: now }
    }).select('title startTime endTime status').limit(10);

    // Nếu có cuộc họp sắp tới, vẫn cho phép vô hiệu hóa nhưng cảnh báo
    // (Phòng sẽ không xuất hiện trong danh sách phòng khả dụng nữa)
    room.isActive = false;
    await room.save();

    res.json({
      message: 'Vô hiệu hóa phòng họp thành công',
      warning: upcomingMeetings.length > 0 
        ? `Phòng đang có ${upcomingMeetings.length} cuộc họp sắp tới. Phòng sẽ không khả dụng cho các yêu cầu đặt phòng mới.` 
        : null,
      upcomingMeetings: upcomingMeetings.length > 0 ? upcomingMeetings : []
    });

  } catch (error) {
    console.error('Deactivate meeting room error:', error);
    res.status(500).json({
      message: 'Lỗi server khi vô hiệu hóa phòng họp',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   PUT /api/meeting-rooms/:id/activate
// @desc    Kích hoạt lại phòng họp (đưa về trạng thái khả dụng)
// @access  Private (Admin, Technician)
router.put('/:id/activate', authenticateToken, async (req, res) => {
  try {
    // Chỉ admin và technician mới được kích hoạt lại phòng
    if (!['admin', 'technician'].includes(req.user.role)) {
      return res.status(403).json({
        message: 'Chỉ admin và technician mới có quyền kích hoạt lại phòng họp'
      });
    }

    const room = await MeetingRoom.findById(req.params.id);
    
    if (!room) {
      return res.status(404).json({
        message: 'Phòng họp không tồn tại'
      });
    }

    // Kích hoạt lại phòng
    room.isActive = true;
    await room.save();

    await room.populate('createdBy', 'fullName email');

    res.json({
      message: 'Kích hoạt lại phòng họp thành công',
      room
    });

  } catch (error) {
    console.error('Activate meeting room error:', error);
    res.status(500).json({
      message: 'Lỗi server khi kích hoạt lại phòng họp',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   DELETE /api/meeting-rooms/:id
// @desc    Xóa phòng họp khỏi hệ thống
// @access  Private (Admin, Technician)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    // Chỉ admin và technician mới được xóa phòng
    if (!['admin', 'technician'].includes(req.user.role)) {
      return res.status(403).json({
        message: 'Chỉ admin và technician mới có quyền xóa phòng họp'
      });
    }

    const room = await MeetingRoom.findById(req.params.id);
    
    if (!room) {
      return res.status(404).json({
        message: 'Phòng họp không tồn tại'
      });
    }

    // Kiểm tra xem phòng có đang được sử dụng trong các cuộc họp không
    const Meeting = require('../models/Meeting');
    const now = new Date();
    
    // Kiểm tra cuộc họp sắp tới hoặc đang diễn ra
    // Bao gồm: cuộc họp có status scheduled/ongoing và endTime chưa đến (sắp tới hoặc đang diễn ra)
    const activeMeetings = await Meeting.find({
      room: room._id,
      status: { $in: ['scheduled', 'ongoing'] },
      endTime: { $gte: now } // Cuộc họp chưa kết thúc
    }).select('title startTime endTime status').limit(10);

    // Kiểm tra cuộc họp đã hoàn thành (để cảnh báo về lịch sử)
    const completedMeetings = await Meeting.find({
      room: room._id,
      status: 'completed'
    }).countDocuments();

    // Nếu có cuộc họp sắp tới hoặc đang diễn ra, không cho phép xóa
    if (activeMeetings.length > 0) {
      return res.status(400).json({
        message: 'Không thể xóa phòng họp đang có cuộc họp sắp tới hoặc đang diễn ra',
        activeMeetings: activeMeetings.map(m => ({
          title: m.title,
          startTime: m.startTime,
          status: m.status
        })),
        warning: `Phòng đang có ${activeMeetings.length} cuộc họp. Vui lòng hủy hoặc hoãn các cuộc họp này trước khi xóa phòng.`
      });
    }

    // Nếu có lịch sử cuộc họp, cảnh báo nhưng vẫn cho phép xóa (có thể dùng query param force=true để bỏ qua)
    const force = req.query.force === 'true';
    
    if (!force && completedMeetings > 0) {
      return res.status(400).json({
        message: 'Phòng họp có lịch sử sử dụng',
        completedMeetingsCount: completedMeetings,
        warning: `Phòng đã có ${completedMeetings} cuộc họp đã hoàn thành. Xóa phòng sẽ mất dữ liệu lịch sử. Nếu chắc chắn muốn xóa, vui lòng thêm query parameter ?force=true`
      });
    }

    // Xóa phòng khỏi database
    await MeetingRoom.findByIdAndDelete(req.params.id);

    res.json({
      message: 'Xóa phòng họp thành công',
      deletedRoom: {
        _id: room._id,
        name: room.name
      }
    });

  } catch (error) {
    console.error('Delete meeting room error:', error);
    res.status(500).json({
      message: 'Lỗi server khi xóa phòng họp',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

module.exports = router; 