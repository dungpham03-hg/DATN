const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { authenticateToken } = require('../middleware/auth');

// @route   GET /api/notifications
// @desc    Lấy danh sách thông báo của user
// @access  Private
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    
    const query = { recipient: req.user._id };
    if (unreadOnly === 'true') {
      query.read = false;
    }
    
    const notifications = await Notification.find(query)
      .populate('sender', 'fullName email avatar position')
      .populate('data.meetingId', 'title startTime location')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ 
      recipient: req.user._id, 
      read: false 
    });
    
    res.json({
      notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      unreadCount
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ 
      message: 'Lỗi server khi lấy thông báo',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   PUT /api/notifications/:id/read
// @desc    Đánh dấu thông báo đã đọc
// @access  Private
router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      recipient: req.user._id
    });
    
    if (!notification) {
      return res.status(404).json({ message: 'Không tìm thấy thông báo' });
    }
    
    await notification.markAsRead();
    
    res.json({ 
      message: 'Đã đánh dấu thông báo đã đọc',
      notification 
    });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ 
      message: 'Lỗi server khi cập nhật thông báo',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   PUT /api/notifications/read-all
// @desc    Đánh dấu tất cả thông báo đã đọc
// @access  Private
router.put('/read-all', authenticateToken, async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, read: false },
      { read: true, readAt: new Date() }
    );
    
    res.json({ message: 'Đã đánh dấu tất cả thông báo đã đọc' });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({ 
      message: 'Lỗi server khi cập nhật thông báo',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   DELETE /api/notifications/:id
// @desc    Xóa thông báo
// @access  Private
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await Notification.deleteOne({
      _id: req.params.id,
      recipient: req.user._id
    });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Không tìm thấy thông báo' });
    }
    
    res.json({ message: 'Đã xóa thông báo' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ 
      message: 'Lỗi server khi xóa thông báo',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

module.exports = router; 