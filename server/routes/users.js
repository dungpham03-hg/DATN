const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Validation middleware
const userValidation = [
  body('fullName').notEmpty().withMessage('Họ tên là bắt buộc').trim(),
  body('email').isEmail().withMessage('Email không hợp lệ').normalizeEmail(),
  body('password').optional().isLength({ min: 6 }).withMessage('Mật khẩu phải có ít nhất 6 ký tự'),
  body('role').optional().isIn(['admin', 'manager', 'secretary', 'assistant', 'technician', 'employee']).withMessage('Vai trò không hợp lệ'),
  body('department').optional().trim(),
  body('position').optional().trim(),
  body('phone').optional().matches(/^[0-9+\-\s\(\)]+$/).withMessage('Số điện thoại không hợp lệ'),
  body('isActive').optional().isBoolean().withMessage('Trạng thái hoạt động phải là true/false')
];

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

// @route   GET /api/users
// @desc    Lấy danh sách người dùng
// @access  Private (Admin only)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('🔍 GET /api/users - Request from:', req.user.email);
    
    const {
      page = 1,
      limit = 20,
      search = '',
      role = '',
      department = '',
      isActive = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    console.log('📋 Query params:', { page, limit, search, role, department, isActive, sortBy, sortOrder });

    // Build query
    const query = {};
    
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } },
        { position: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (role) {
      query.role = role;
    }
    
    if (department) {
      query.department = department;
    }
    
    if (isActive !== '') {
      query.isActive = isActive === 'true';
    }

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Get total count
    const total = await User.countDocuments(query);

    // Get users with all necessary fields
    const users = await User.find(query)
      .select('-password') // Exclude password but include all other fields
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    console.log('👥 Found users:', users.length);
    if (users.length > 0) {
      console.log('👤 Sample user data:', users[0]);
    }

    // Get unique departments for filter
    const departments = await User.distinct('department', { department: { $ne: null, $ne: '' } });
    
    console.log('🏢 Available departments:', departments);

    const response = {
      users,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        count: users.length,
        totalUsers: total
      },
      filters: {
        roles: ['admin', 'manager', 'secretary', 'assistant', 'technician', 'employee'],
        departments: departments.sort(),
        statusOptions: [
          { value: 'true', label: 'Hoạt động' },
          { value: 'false', label: 'Vô hiệu hóa' }
        ]
      }
    };

    console.log('📤 Sending response with', users.length, 'users and', departments.length, 'departments');
    
    res.json(response);

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      message: 'Lỗi server khi lấy danh sách người dùng',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   GET /api/users/stats
// @desc    Lấy thống kê người dùng
// @access  Private (Admin only)
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('📊 GET /api/users/stats - Request from:', req.user?.email || req.user);
    console.log('📊 Stats route hit successfully!');

    // Get total users
    console.log('📊 Getting total users...');
    const totalUsers = await User.countDocuments();
    console.log('📊 Total users:', totalUsers);
    
    // Get active users
    console.log('📊 Getting active users...');
    const activeUsers = await User.countDocuments({ isActive: true });
    console.log('📊 Active users:', activeUsers);
    
    // Get users by role
    console.log('📊 Getting users by role...');
    let usersByRole = [];
    try {
      usersByRole = await User.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);
      console.log('📊 Users by role:', usersByRole);
    } catch (roleError) {
      console.error('📊 Error getting users by role:', roleError);
      usersByRole = [];
    }
    
    // Get users by department
    console.log('📊 Getting users by department...');
    let usersByDepartment = [];
    try {
      usersByDepartment = await User.aggregate([
        { $match: { department: { $ne: null, $ne: '' } } },
        { $group: { _id: '$department', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);
      console.log('📊 Users by department:', usersByDepartment);
    } catch (deptError) {
      console.error('📊 Error getting users by department:', deptError);
      usersByDepartment = [];
    }
    
    // Get recent users (last 30 days) - only if createdAt exists
    console.log('📊 Getting recent users...');
    let recentUsers = 0;
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      recentUsers = await User.countDocuments({
        createdAt: { $gte: thirtyDaysAgo }
      });
      console.log('📊 Recent users:', recentUsers);
    } catch (recentError) {
      console.error('📊 Error getting recent users:', recentError);
      recentUsers = 0;
    }

    const stats = {
      total: totalUsers,
      active: activeUsers,
      inactive: totalUsers - activeUsers,
      recent: recentUsers,
      byRole: usersByRole,
      byDepartment: usersByDepartment
    };

    console.log('📈 User stats:', stats);
    
    res.json({
      message: 'Lấy thống kê người dùng thành công',
      stats
    });

  } catch (error) {
    console.error('📊 Get user stats error:', error);
    console.error('📊 Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({
      message: 'Lỗi server khi lấy thống kê người dùng',
      error: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        name: error.name,
        stack: error.stack
      } : {}
    });
  }
});

// @route   GET /api/users/:id
// @desc    Lấy thông tin chi tiết người dùng
// @access  Private (Admin only)
router.get('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('🔍 GET /api/users/:id - ID:', req.params.id);
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      console.log('❌ Invalid ObjectId:', req.params.id);
      return res.status(400).json({
        message: 'ID người dùng không hợp lệ'
      });
    }

    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        message: 'Không tìm thấy người dùng'
      });
    }

    res.json({ user });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      message: 'Lỗi server khi lấy thông tin người dùng',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   POST /api/users
// @desc    Tạo người dùng mới
// @access  Private (Admin only)
router.post('/', authenticateToken, requireAdmin, userValidation, handleValidationErrors, async (req, res) => {
  try {
    const { fullName, email, password, role, department, position, phone, isActive = true } = req.body;
    
    console.log('📝 Creating user with data:', { fullName, email, role, department, position, phone, isActive });

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        message: 'Email đã được sử dụng'
      });
    }

    // Validate role is provided
    if (!role) {
      return res.status(400).json({
        message: 'Vai trò là bắt buộc'
      });
    }

    // Create user
    const userData = {
      fullName,
      email,
      password: password || '123456', // Default password
      role, // Use the provided role
      department,
      position,
      phone,
      isActive
    };
    
    console.log('🔧 User data to save:', userData);

    const user = new User(userData);
    await user.save();

    // Return user without password
    const userResponse = user.toPublicJSON();

    res.status(201).json({
      message: 'Tạo người dùng thành công',
      user: userResponse
    });

  } catch (error) {
    console.error('Create user error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'Email đã được sử dụng'
      });
    }
    
    res.status(500).json({
      message: 'Lỗi server khi tạo người dùng',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   PUT /api/users/:id
// @desc    Cập nhật thông tin người dùng
// @access  Private (Admin only)
router.put('/:id', authenticateToken, requireAdmin, userValidation, handleValidationErrors, async (req, res) => {
  try {
    console.log('✏️ PUT /api/users/:id - ID:', req.params.id);
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      console.log('❌ Invalid ObjectId in PUT:', req.params.id);
      return res.status(400).json({
        message: 'ID người dùng không hợp lệ'
      });
    }

    const { fullName, email, password, role, department, position, phone, isActive } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        message: 'Không tìm thấy người dùng'
      });
    }

    // Check if email is being changed and already exists
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email, _id: { $ne: req.params.id } });
      if (existingUser) {
        return res.status(400).json({
          message: 'Email đã được sử dụng bởi người dùng khác'
        });
      }
    }

    // Update user data
    const updateData = {};
    if (fullName !== undefined) updateData.fullName = fullName;
    if (email !== undefined) updateData.email = email;
    if (password !== undefined) updateData.password = password;
    if (role !== undefined) updateData.role = role;
    if (department !== undefined) updateData.department = department;
    if (position !== undefined) updateData.position = position;
    if (phone !== undefined) updateData.phone = phone;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      message: 'Cập nhật người dùng thành công',
      user: updatedUser
    });

  } catch (error) {
    console.error('Update user error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'Email đã được sử dụng bởi người dùng khác'
      });
    }
    
    res.status(500).json({
      message: 'Lỗi server khi cập nhật người dùng',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   DELETE /api/users/:id
// @desc    Xóa người dùng (soft delete)
// @access  Private (Admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        message: 'ID người dùng không hợp lệ'
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        message: 'Không tìm thấy người dùng'
      });
    }

    // Prevent deleting self
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        message: 'Không thể xóa chính mình'
      });
    }

    // Soft delete - set isActive to false
    await User.findByIdAndUpdate(req.params.id, { isActive: false });

    res.json({
      message: 'Vô hiệu hóa người dùng thành công'
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      message: 'Lỗi server khi xóa người dùng',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   PUT /api/users/:id/activate
// @desc    Kích hoạt người dùng
// @access  Private (Admin only)
router.put('/:id/activate', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        message: 'ID người dùng không hợp lệ'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: true },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        message: 'Không tìm thấy người dùng'
      });
    }

    res.json({
      message: 'Kích hoạt người dùng thành công',
      user
    });

  } catch (error) {
    console.error('Activate user error:', error);
    res.status(500).json({
      message: 'Lỗi server khi kích hoạt người dùng',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   PUT /api/users/:id/deactivate
// @desc    Vô hiệu hóa người dùng
// @access  Private (Admin only)
router.put('/:id/deactivate', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        message: 'ID người dùng không hợp lệ'
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        message: 'Không tìm thấy người dùng'
      });
    }

    // Prevent deactivating self
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        message: 'Không thể vô hiệu hóa chính mình'
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    ).select('-password');

    res.json({
      message: 'Vô hiệu hóa người dùng thành công',
      user: updatedUser
    });

  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({
      message: 'Lỗi server khi vô hiệu hóa người dùng',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   PUT /api/users/:id/reset-password
// @desc    Reset mật khẩu người dùng
// @access  Private (Admin only)
router.put('/:id/reset-password', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        message: 'ID người dùng không hợp lệ'
      });
    }

    const { newPassword = '123456' } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        message: 'Không tìm thấy người dùng'
      });
    }

    user.password = newPassword;
    await user.save();

    res.json({
      message: 'Reset mật khẩu thành công'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      message: 'Lỗi server khi reset mật khẩu',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

module.exports = router;
