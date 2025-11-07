const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { 
  generateToken, 
  generateRefreshToken, 
  authenticateToken 
} = require('../middleware/auth');
const passport = require('passport');
const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { DomainUtils } = require('../config/domainConfig');
const crypto = require('crypto');
const emailService = require('../services/emailService');

const router = express.Router();

// Thêm hằng CLIENT_URL (cho phép fallback về localhost:3000 khi biến môi trường không thiết lập)
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

// Health check
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Cấu hình multer cho upload avatar
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../uploads/avatars');
    // Tạo thư mục nếu chưa tồn tại
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Tạo tên file unique: userId-timestamp.extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, req.user._id + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: function (req, file, cb) {
    // Chỉ cho phép file ảnh
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận file ảnh!'), false);
    }
  }
});

// Validation rules
const registerValidation = [
  body('fullName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Họ tên phải từ 2-100 ký tự'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email không hợp lệ'),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Mật khẩu phải có ít nhất 6 ký tự')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Mật khẩu phải chứa ít nhất 1 chữ thường, 1 chữ hoa và 1 số'),
  
  // Không cần validation cho department, position, phone, role
  // Vì đăng ký guest chỉ cần fullName, email, password
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email không hợp lệ'),
  
  body('password')
    .notEmpty()
    .withMessage('Mật khẩu là bắt buộc')
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

// @route   POST /api/auth/register
// @desc    Đăng ký người dùng mới (CHỈ DÀNH CHO GUEST - không cho domain email)
// @access  Public
router.post('/register', registerValidation, handleValidationErrors, async (req, res) => {
  try {
    const { fullName, email, password } = req.body;
    
    // Đảm bảo chỉ nhận fullName, email, password - không nhận role, department, position, phone

    // Kiểm tra email KHÔNG phải domain email (guest only)
    const domainValidation = DomainUtils.validateEmailDomain(email);
    if (domainValidation.isValid) {
      return res.status(400).json({
        message: 'Email công ty không được đăng ký ở đây. Vui lòng dùng chức năng "Đăng ký Email công ty" để đăng ký với email công ty.'
      });
    }

    // Kiểm tra email đã tồn tại
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        message: 'Email đã được sử dụng'
      });
    }

    // Tạo user mới - CHỈ DÀNH CHO KHÁCH (GUEST)
    // Force role = 'guest' - không cho phép override
    const userData = {
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      password,
      role: 'guest' // Luôn là 'guest' cho đăng ký thường, không thể thay đổi
    };



    const user = new User(userData);
    await user.save();

    // Tạo tokens
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Cập nhật lastLogin
    user.lastLogin = new Date();
    await user.save();

    res.status(201).json({
      message: 'Đăng ký thành công',
      user: user.toPublicJSON(),
      token,
      refreshToken
    });

  } catch (error) {
    console.error('Register error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'Email đã được sử dụng'
      });
    }
    
    res.status(500).json({
      message: 'Lỗi server khi đăng ký',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   POST /api/auth/register-domain
// @desc    Đăng ký người dùng với email công ty (pending approval)
// @access  Public
router.post('/register-domain', registerValidation, handleValidationErrors, async (req, res) => {
  try {
    const { fullName, email, password, department, position, phone } = req.body;

    if (!email) {
      return res.status(400).json({
        message: 'Email là bắt buộc'
      });
    }

    // Validate domain - phải là domain hợp lệ
    const validation = DomainUtils.validateEmailDomain(email);
    
    if (!validation.isValid) {
      return res.status(400).json({
        message: validation.error || 'Domain email không hợp lệ'
      });
    }

    // Kiểm tra email đã tồn tại
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        message: 'Email đã được sử dụng'
      });
    }

    // Tạo user mới với trạng thái pending
    const userData = {
      fullName: fullName || email.split('@')[0],
      email: email.toLowerCase(),
      password,
      role: validation.role,
      emailDomain: validation.domain,
      autoAssignedRole: validation.role,
      isFromDomainAuth: true,
      domainPermissions: validation.permissions,
      department: department || validation.department,
      position: position || validation.position,
      phone,
      approvalStatus: 'pending', // Chờ admin phê duyệt
      isActive: true, // Active nhưng chưa được approve
      emailVerified: false
    };

    const user = new User(userData);
    await user.save();

    // TODO: Gửi thông báo cho admin/manager về user mới
    // Có thể dùng notification system hoặc email

    res.status(201).json({
      message: 'Đăng ký thành công! Tài khoản đang chờ phê duyệt từ admin.',
      user: user.toPublicJSON(),
      approvalStatus: 'pending',
      note: 'Bạn sẽ nhận được thông báo khi tài khoản được phê duyệt.'
    });

  } catch (error) {
    console.error('Register domain error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'Email đã được sử dụng'
      });
    }
    
    res.status(500).json({
      message: 'Lỗi server khi đăng ký',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   POST /api/auth/login
// @desc    Đăng nhập
// @access  Public
router.post('/login', loginValidation, handleValidationErrors, async (req, res) => {
  try {
    console.log('🔍 Login request body:', req.body);
    const { email, password } = req.body;

    // Tìm user và include password để so sánh
    const user = await User.findByEmail(email).select('+password');
    if (!user) {
      return res.status(401).json({
        message: 'Email hoặc mật khẩu không đúng'
      });
    }

    // Kiểm tra account active
    if (!user.isActive) {
      return res.status(401).json({
        message: 'Tài khoản đã bị vô hiệu hóa'
      });
    }

    // Kiểm tra password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        message: 'Email hoặc mật khẩu không đúng'
      });
    }

    // Tạo tokens
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Cập nhật lastLogin
    user.lastLogin = new Date();
    await user.save();

    res.json({
      message: 'Đăng nhập thành công',
      user: user.toPublicJSON(),
      token,
      refreshToken
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      message: 'Lỗi server khi đăng nhập',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   POST /api/auth/refresh
// @desc    Refresh access token
// @access  Public
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        message: 'Refresh token không tồn tại'
      });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    
    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        message: 'Token không hợp lệ'
      });
    }

    // Kiểm tra user còn tồn tại và active
    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({
        message: 'User không tồn tại hoặc đã bị vô hiệu hóa'
      });
    }

    // Tạo access token mới
    const newToken = generateToken(user._id);

    res.json({
      message: 'Refresh token thành công',
      token: newToken
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        message: 'Refresh token không hợp lệ hoặc đã hết hạn'
      });
    }

    console.error('Refresh token error:', error);
    res.status(500).json({
      message: 'Lỗi server khi refresh token'
    });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout current user (stateless JWT) - client should clear tokens
// @access  Private (token optional for audit)
router.post('/logout', (req, res) => {
  try {
    const authHeader = req.headers['authorization'] || '';
    const hasToken = Boolean(authHeader && authHeader.startsWith('Bearer '));

    // With stateless JWT, logout is handled on client by clearing tokens.
    // Here we simply acknowledge the request so tests/clients can await it.
    return res.json({
      message: 'Đăng xuất thành công',
      acknowledged: true,
      hadAuthHeader: hasToken
    });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ message: 'Lỗi server khi đăng xuất' });
  }
});

// ===================== Forgot / Reset Password =====================

// @route   POST /api/auth/forgot-password
// @desc    Generate password reset token and (pretend) send email
// @access  Public
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email là bắt buộc' });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+resetPasswordToken +resetPasswordExpires');

    // Trả 200 dù không tìm thấy để tránh lộ dữ liệu
    if (!user) {
      return res.json({ message: 'Nếu email hợp lệ, link đặt lại mật khẩu đã được gửi' });
    }

    // Tạo token và lưu hash + expiry
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    user.resetPasswordToken = tokenHash;
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // 15 phút
    await user.save();

    const resetUrl = `${CLIENT_URL}/reset-password?token=${rawToken}`;

    // Gửi email thật nếu đã cấu hình SMTP, fallback log khi chưa bật
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Đặt lại mật khẩu</h2>
        <p>Xin chào ${user.fullName || user.email},</p>
        <p>Bạn (hoặc ai đó) đã yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
        <p>Nhấn vào nút bên dưới để đặt lại mật khẩu (hiệu lực trong 15 phút):</p>
        <p>
          <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#1976d2;color:#fff;text-decoration:none;border-radius:6px;">Đặt lại mật khẩu</a>
        </p>
        <p>Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
      </div>
    `;

    await emailService.sendEmail({
      to: user.email,
      subject: 'Đặt lại mật khẩu',
      html,
      text: `Đặt lại mật khẩu: ${resetUrl}`
    });

    // Luôn trả 200 để tránh lộ dữ liệu
    return res.json({ message: 'Nếu email hợp lệ, link đặt lại mật khẩu đã được gửi' });
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ message: 'Lỗi server khi xử lý quên mật khẩu' });
  }
});

// @route   POST /api/auth/reset-password
// @desc    Reset password using the reset token
// @access  Public
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password, confirmPassword } = req.body;
    if (!token || !password || !confirmPassword) {
      return res.status(400).json({ message: 'Thiếu dữ liệu' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Mật khẩu phải có ít nhất 6 ký tự' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Mật khẩu xác nhận không khớp' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: tokenHash,
      resetPasswordExpires: { $gt: Date.now() }
    }).select('+password +resetPasswordToken +resetPasswordExpires');

    if (!user) {
      return res.status(400).json({ message: 'Token không hợp lệ hoặc đã hết hạn' });
    }

    user.password = password; // pre-save hook sẽ hash
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return res.json({ message: 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.' });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ message: 'Lỗi server khi đặt lại mật khẩu' });
  }
});

// @route   GET /api/auth/test-token
// @desc    Test token validation
// @access  Public
router.get('/test-token', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  res.json({
    message: 'Token test endpoint',
    hasAuthHeader: !!authHeader,
    hasToken: !!token,
    tokenLength: token ? token.length : 0,
    timestamp: new Date().toISOString()
  });
});

// @route   GET /api/auth/me
// @desc    Lấy thông tin user hiện tại
// @access  Private
router.get('/me', authenticateToken, async (req, res) => {
  try {
    // Nếu có phương thức toPublicJSON (user thật từ MongoDB)
    if (typeof req.user.toPublicJSON === 'function') {
      return res.json({ user: req.user.toPublicJSON() });
    }

    // Nếu req.user đã là object chứa thông tin demo
    if (req.user && req.user.email) {
      return res.json({ user: req.user });
    }

    // Trường hợp chỉ có userId (chuỗi) → thử map demo hoặc truy DB
    const userId = req.user._id || req.user;

    // Map demo users
    const demoUsers = {
      '507f1f77bcf86cd799439011': {
        _id: '507f1f77bcf86cd799439011',
        fullName: 'Quản trị viên',
        email: 'admin@example.com',
        role: 'admin',
        department: 'IT',
        position: 'System Administrator',
        phone: '0901234567',
        isActive: true,
        emailVerified: true
      },
      '507f1f77bcf86cd799439012': {
        _id: '507f1f77bcf86cd799439012',
        fullName: 'Nguyễn Văn Manager',
        email: 'manager@example.com',
        role: 'manager',
        department: 'Sales',
        position: 'Sales Manager',
        phone: '0902345678',
        isActive: true,
        emailVerified: true
      },
      '507f1f77bcf86cd799439013': {
        _id: '507f1f77bcf86cd799439013',
        fullName: 'Nguyễn Văn Secretary',
        email: 'secretary@example.com',
        role: 'secretary',
        department: 'Administration',
        position: 'Secretary',
        phone: '0903456789',
        isActive: true,
        emailVerified: true
      },
      '507f1f77bcf86cd799439014': {
        _id: '507f1f77bcf86cd799439014',
        fullName: 'Trần Thị User',
        email: 'user@example.com',
        role: 'employee',
        department: 'Marketing',
        position: 'Marketing Specialist',
        phone: '0904567890',
        isActive: true,
        emailVerified: true
      }
    };

    if (demoUsers[userId]) {
      return res.json({ user: demoUsers[userId] });
    }

    // Cuối cùng, cố gắng truy vấn DB nếu kết nối MongoDB đang hoạt động
    const dbUser = await User.findById(userId);
    if (dbUser) {
      return res.json({ user: dbUser.toPublicJSON() });
    }

    return res.status(404).json({ message: 'User không tồn tại' });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      message: 'Lỗi server khi lấy thông tin người dùng'
    });
  }
});

// @route   PUT /api/auth/notification-settings
// @desc    Cập nhật cài đặt thông báo
// @access  Private
router.put('/notification-settings', authenticateToken, async (req, res) => {
  try {
    const { notificationSettings } = req.body;
    
    if (!notificationSettings) {
      return res.status(400).json({ message: 'Thông tin cài đặt thông báo không hợp lệ' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { notificationSettings },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Cập nhật cài đặt thông báo thành công',
      user: updatedUser
    });

  } catch (error) {
    console.error('Update notification settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi cập nhật cài đặt thông báo',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   PUT /api/auth/profile
// @desc    Cập nhật profile người dùng
// @access  Private
router.put('/profile', authenticateToken, [
  body('fullName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Họ tên phải từ 2-100 ký tự'),
  
  body('phone')
    .optional()
    .isMobilePhone('vi-VN')
    .withMessage('Số điện thoại không hợp lệ'),
  
  body('department')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Phòng ban không được vượt quá 50 ký tự'),
  
  body('position')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Chức vụ không được vượt quá 50 ký tự')
], handleValidationErrors, async (req, res) => {
  try {
    const { fullName, phone, department, position, notificationSettings } = req.body;
    
    const updateData = {};
    if (fullName) updateData.fullName = fullName;
    if (phone) updateData.phone = phone;
    if (department) updateData.department = department;
    if (position) updateData.position = position;
    if (notificationSettings) updateData.notificationSettings = notificationSettings;

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    );

    res.json({
      message: 'Cập nhật profile thành công',
      user: updatedUser.toPublicJSON()
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      message: 'Lỗi server khi cập nhật profile',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   POST /api/auth/change-password
// @desc    Đổi mật khẩu
// @access  Private
router.post('/change-password', authenticateToken, [
  body('currentPassword')
    .notEmpty()
    .withMessage('Mật khẩu hiện tại là bắt buộc'),
  
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('Mật khẩu mới phải có ít nhất 6 ký tự')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Mật khẩu mới phải chứa ít nhất 1 chữ thường, 1 chữ hoa và 1 số')
], handleValidationErrors, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Lấy user với password
    const user = await User.findById(req.user._id).select('+password');

    // Kiểm tra mật khẩu hiện tại
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        message: 'Mật khẩu hiện tại không đúng'
      });
    }

    // Cập nhật mật khẩu mới
    user.password = newPassword;
    await user.save();

    res.json({
      message: 'Đổi mật khẩu thành công'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      message: 'Lỗi server khi đổi mật khẩu',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   POST /api/auth/test-login
// @desc    Test login without MongoDB (for demo)
// @access  Public
router.post('/test-login', loginValidation, handleValidationErrors, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Demo accounts - không cần MongoDB
    const demoAccounts = {
      'admin@example.com': {
        password: 'Admin123',
        user: {
          _id: '507f1f77bcf86cd799439011',
          fullName: 'Quản trị viên',
          email: 'admin@example.com',
          role: 'admin',
          department: 'IT',
          position: 'System Administrator',
          phone: '0901234567',
          isActive: true,
          emailVerified: true
        }
      },
      'manager@example.com': {
        password: 'Manager123',
        user: {
          _id: '507f1f77bcf86cd799439012',
          fullName: 'Nguyễn Văn Manager',
          email: 'manager@example.com',
          role: 'manager',
          department: 'Sales',
          position: 'Sales Manager',
          phone: '0902345678',
          isActive: true,
          emailVerified: true
        }
      },
      'secretary@example.com': {
        password: 'Assistant123',
        user: {
          _id: '507f1f77bcf86cd799439013',
          fullName: 'Nguyễn Văn Secretary',
          email: 'secretary@example.com',
          role: 'secretary',
          department: 'Administration',
          position: 'Secretary',
          phone: '0903456789',
          isActive: true,
          emailVerified: true
        }
      },
      'user@example.com': {
        password: 'User123',
        user: {
          _id: '507f1f77bcf86cd799439014',
          fullName: 'Trần Thị User',
          email: 'user@example.com',
          role: 'employee',
          department: 'Marketing',
          position: 'Marketing Specialist',
          phone: '0904567890',
          isActive: true,
          emailVerified: true
        }
      }
    };

    // Kiểm tra demo account
    const demoAccount = demoAccounts[email];
    if (!demoAccount || demoAccount.password !== password) {
      return res.status(401).json({
        message: 'Email hoặc mật khẩu không đúng'
      });
    }

    // Tạo tokens
    const token = generateToken(demoAccount.user._id);
    const refreshToken = generateRefreshToken(demoAccount.user._id);

    res.json({
      message: 'Đăng nhập thành công (Demo mode)',
      user: demoAccount.user,
      token,
      refreshToken
    });

  } catch (error) {
    console.error('Test login error:', error);
    res.status(500).json({
      message: 'Lỗi server khi đăng nhập (demo)',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   GET /api/auth/test-me
// @desc    Get demo user info
// @access  Private
router.get('/test-me', authenticateToken, async (req, res) => {
  try {
    // Demo user data based on token
    const demoUsers = {
      '507f1f77bcf86cd799439011': {
        _id: '507f1f77bcf86cd799439011',
        fullName: 'Quản trị viên',
        email: 'admin@example.com',
        role: 'admin',
        department: 'IT',
        position: 'System Administrator',
        phone: '0901234567',
        isActive: true,
        emailVerified: true
      },
      '507f1f77bcf86cd799439012': {
        _id: '507f1f77bcf86cd799439012',
        fullName: 'Nguyễn Văn Manager',
        email: 'manager@example.com',
        role: 'manager',
        department: 'Sales',
        position: 'Sales Manager',
        phone: '0902345678',
        isActive: true,
        emailVerified: true
      },
      '507f1f77bcf86cd799439013': {
        _id: '507f1f77bcf86cd799439013',
        fullName: 'Nguyễn Văn Secretary',
        email: 'secretary@example.com',
        role: 'secretary',
        department: 'Administration',
        position: 'Secretary',
        phone: '0903456789',
        isActive: true,
        emailVerified: true
      },
      '507f1f77bcf86cd799439014': {
        _id: '507f1f77bcf86cd799439014',
        fullName: 'Trần Thị User',
        email: 'user@example.com',
        role: 'employee',
        department: 'Marketing',
        position: 'Marketing Specialist',
        phone: '0904567890',
        isActive: true,
        emailVerified: true
      }
    };

    const userId = req.user._id || req.user;
    const demoUser = demoUsers[userId] || demoUsers['507f1f77bcf86cd799439011'];

    res.json({
      user: demoUser
    });
  } catch (error) {
    console.error('Test get me error:', error);
    res.status(500).json({
      message: 'Lỗi server khi lấy thông tin người dùng (demo)'
    });
  }
});

// @route   POST /api/auth/test-register
// @desc    Test register without MongoDB (for demo)
// @access  Public
router.post('/test-register', registerValidation, handleValidationErrors, async (req, res) => {
  try {
    const { fullName, email, password, department, position, phone, role } = req.body;

    // Kiểm tra email đã tồn tại trong demo accounts
    const existingDemoEmails = [
      'admin@example.com',
      'manager@example.com', 
      'assistant@example.com',
      'user@example.com'
    ];

    if (existingDemoEmails.includes(email)) {
      return res.status(400).json({
        message: 'Email đã được sử dụng trong hệ thống demo'
      });
    }

    // Fake tạo user thành công (demo mode)
    const demoUser = {
      _id: '507f1f77bcf86cd799439014', // Fake ObjectId
      fullName,
      email,
      role: role || 'employee',
      department: department || 'General',
      position: position || 'Employee',
      phone: phone || '',
      isActive: true,
      emailVerified: true,
      createdAt: new Date(),
      lastLogin: new Date()
    };

    // Tạo tokens
    const token = generateToken(demoUser._id);
    const refreshToken = generateRefreshToken(demoUser._id);

    res.status(201).json({
      message: 'Đăng ký thành công (Demo mode)',
      user: demoUser,
      token,
      refreshToken
    });

  } catch (error) {
    console.error('Test register error:', error);
    res.status(500).json({
      message: 'Lỗi server khi đăng ký (demo)',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// Google OAuth Routes
router.get('/google',
  (req, res, next) => {
    console.log('🔍 Initiating Google OAuth...');
    console.log('📍 Request URL:', req.protocol + '://' + req.get('host') + req.originalUrl);
    next();
  },
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    prompt: 'select_account'
  })
);

router.get('/google/callback',
  (req, res, next) => {
    console.log('🔄 Google OAuth Callback - START');
    console.log('🔄 Query params:', JSON.stringify(req.query));
    console.log('🔄 Full URL:', req.protocol + '://' + req.get('host') + req.originalUrl);
    
    if (req.query.error) {
      console.error('❌ OAuth Error from Google:', req.query.error);
      console.error('❌ Error description:', req.query.error_description);
      return res.redirect(`${CLIENT_URL}/login?error=${encodeURIComponent(req.query.error_description || req.query.error)}`);
    }
    
    if (!req.query.code) {
      console.warn('⚠️  No authorization code in callback');
    } else {
      console.log('✅ Authorization code received');
    }
    
    next();
  },
  passport.authenticate('google', { 
    session: false, 
    failureRedirect: `${CLIENT_URL}/login?error=google_auth_failed`,
    failureMessage: true
  }),
  (req, res) => {
    try {
      console.log('👤 Google Callback Handler - START');
      console.log('👤 User object:', {
        hasUser: !!req.user,
        userId: req.user?._id,
        email: req.user?.email,
        fullName: req.user?.fullName
      });
      
      // Kiểm tra req.user có tồn tại không
      if (!req.user) {
        console.error('❌ No user found in req.user');
        return res.redirect(`${CLIENT_URL}/login?error=no_user_found`);
      }
      
      // Kiểm tra req.user._id có tồn tại không
      if (!req.user._id) {
        console.error('❌ No user._id found:', req.user);
        return res.redirect(`${CLIENT_URL}/login?error=invalid_user_data`);
      }
      
      const token = generateToken(req.user._id);
      console.log('🎫 Generated token:', token.substring(0, 20) + '...');
      
      // Chuyển user object thành public JSON và encode để truyền lên frontend
      const publicUser = req.user.toPublicJSON ? req.user.toPublicJSON() : req.user;
      const userData = encodeURIComponent(JSON.stringify(publicUser));
      const redirectUrl = `${CLIENT_URL}/oauth/callback?token=${token}&user=${userData}`;
      
      console.log('🔄 Redirecting to:', redirectUrl);
      console.log('✅ Google OAuth Callback - SUCCESS');
      res.redirect(redirectUrl);
    } catch (error) {
      console.error('❌ Error in Google callback handler:', error);
      console.error('❌ Stack:', error.stack);
      res.redirect(`${CLIENT_URL}/login?error=token_generation_failed`);
    }
  }
);

// Github OAuth Routes
router.get('/github',
  passport.authenticate('github', { 
    scope: ['user:email', 'read:user'],
    allow_signup: true
  })
);

router.get('/github/callback',
  passport.authenticate('github', { 
    session: false, 
    failureRedirect: `${CLIENT_URL}/login?error=github_auth_failed`,
    failureMessage: true
  }),
  (req, res) => {
    try {
      console.log('👤 User from GitHub:', req.user);
      const token = generateToken(req.user._id);
      console.log('🎫 Generated token:', token);
      
      // Chuyển user object thành public JSON và encode để truyền lên frontend
      const publicUser = req.user.toPublicJSON ? req.user.toPublicJSON() : req.user;
      const userData = encodeURIComponent(JSON.stringify(publicUser));
      const redirectUrl = `${CLIENT_URL}/oauth/callback?token=${token}&user=${userData}`;
      
      console.log('🔄 Redirecting to:', redirectUrl);
      res.redirect(redirectUrl);
    } catch (error) {
      console.error('❌ Error in GitHub callback:', error);
      res.redirect(`${CLIENT_URL}/login?error=token_generation_failed`);
    }
  }
);

// Domain-based Authentication Routes
// @route   POST /api/auth/validate-domain
// @desc    Validate email domain and return role info
// @access  Public
router.post('/validate-domain', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        message: 'Email là bắt buộc'
      });
    }
    
    const validation = DomainUtils.validateEmailDomain(email);
    
    if (!validation.isValid) {
      return res.status(400).json({
        message: validation.error,
        isValid: false
      });
    }
    
    res.json({
      message: 'Domain hợp lệ',
      isValid: true,
      domain: validation.domain,
      role: validation.role,
      department: validation.department,
      position: validation.position,
      permissions: validation.permissions,
      description: validation.description
    });
    
  } catch (error) {
    console.error('Domain validation error:', error);
    res.status(500).json({
      message: 'Lỗi server khi validate domain',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   POST /api/auth/login-with-domain
// @desc    Login with domain email (REQUIRES PASSWORD for security)
// @access  Public
router.post('/login-with-domain', async (req, res) => {
  try {
    console.log('🔍 Domain login request body:', req.body);
    const { email, password, fullName, avatar } = req.body;
    
    if (!email) {
      return res.status(400).json({
        message: 'Email là bắt buộc'
      });
    }
    
    // ⚠️ SECURITY: Require password
    if (!password) {
      return res.status(400).json({
        message: 'Mật khẩu là bắt buộc cho đăng nhập email công ty'
      });
    }
    
    // Validate domain
    const validation = DomainUtils.validateEmailDomain(email);
    
    if (!validation.isValid) {
      return res.status(400).json({
        message: validation.error
      });
    }
    
    // Find existing user
    let user = await User.findOne({ email: email.toLowerCase() });
    
    // ⚠️ SECURITY: User must be created by admin first
    if (!user) {
      return res.status(401).json({
        message: 'Tài khoản chưa được tạo. Vui lòng liên hệ admin để được cấp tài khoản.'
      });
    }
    
    // Validate password - User model has password select: false, need to fetch with password
    try {
      const userWithPassword = await User.findById(user._id).select('+password').lean();
      
      if (!userWithPassword || !userWithPassword.password) {
        console.error('⚠️ User exists but has no password field');
        return res.status(401).json({
          message: 'Tài khoản chưa có mật khẩu. Vui lòng liên hệ admin để được cấp tài khoản.'
        });
      }
      
      const isMatch = await bcrypt.compare(password, userWithPassword.password);
      
      if (!isMatch) {
        return res.status(401).json({
          message: 'Mật khẩu không đúng'
        });
      }
    } catch (compareError) {
      console.error('Password comparison error:', compareError);
      return res.status(401).json({
        message: 'Lỗi xác thực mật khẩu. Vui lòng thử lại.'
      });
    }
    
    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({
        message: 'Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ admin.'
      });
    }

    // Check approval status for domain users
    if (user.isFromDomainAuth && user.approvalStatus !== 'approved') {
      if (user.approvalStatus === 'pending') {
        return res.status(403).json({
          message: 'Tài khoản đang chờ phê duyệt. Vui lòng đợi admin phê duyệt.',
          approvalStatus: 'pending'
        });
      } else if (user.approvalStatus === 'rejected') {
        return res.status(403).json({
          message: 'Tài khoản đã bị từ chối. Vui lòng liên hệ admin.',
          approvalStatus: 'rejected',
          rejectionReason: user.rejectionReason
        });
      }
    }
    
    // Update last login
    user.lastLogin = new Date();
    await user.save();
    
    // Generate tokens
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    
    res.json({
      message: 'Đăng nhập thành công',
      user: user.toPublicJSON(),
      token,
      refreshToken,
      autoLogin: true,
      domainInfo: {
        domain: validation.domain,
        role: validation.role,
        department: validation.department,
        permissions: validation.permissions
      }
    });
    
  } catch (error) {
    console.error('Domain login error:', error);
    res.status(500).json({
      message: 'Lỗi server khi đăng nhập',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// ===================== Google One Tap / React OAuth =====================
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

// @route   POST /api/auth/google-token
// @desc    Verify Google ID token (One Tap / react-oauth) và trả JWT nội bộ
// @access  Public
router.post('/google-token', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ message: 'Thiếu credential' });
    }

    if (!googleClient) {
      return res.status(500).json({ message: 'Server chưa cấu hình GOOGLE_CLIENT_ID' });
    }

    // Verify ID token với Google
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();

    // payload: { sub, email, name, picture, email_verified, ... }
    if (!payload.email_verified) {
      return res.status(400).json({ message: 'Email chưa được xác thực' });
    }

    let user;
    try {
      user = await User.findOne({ email: payload.email });
    } catch (dbErr) {
      console.log('MongoDB not connected, fallback demo mode');
    }

    if (!user) {
      // Validate domain để xác định role
      const domainValidation = DomainUtils.validateEmailDomain(payload.email);
      let userRole = 'guest'; // Mặc định là guest cho OAuth
      
      if (domainValidation.isValid) {
        // Domain được hỗ trợ (domain công ty), sử dụng role từ cấu hình
        userRole = domainValidation.role;
      } else {
        // Domain không được hỗ trợ (Gmail, Yahoo, etc.), đây là guest
        console.log('⚠️  Domain không trong danh sách allowed (guest), sử dụng role: guest');
      }
      
      // Tạo mới user
      try {
        user = await User.create({
          email: payload.email,
          fullName: payload.name,
          avatar: payload.picture,
          googleId: payload.sub,
          emailVerified: true,
          password: Math.random().toString(36).slice(-8),
          role: userRole,
          emailDomain: domainValidation.isValid ? domainValidation.domain : 'oauth',
          autoAssignedRole: userRole,
          isFromDomainAuth: domainValidation.isValid,
          domainPermissions: domainValidation.isValid ? domainValidation.permissions : [],
          department: domainValidation.isValid ? domainValidation.department : null,
          position: domainValidation.isValid ? domainValidation.position : null
        });
      } catch (createErr) {
        console.error('Error creating user:', createErr);
      }
    }

    // Nếu Mongo lỗi, tạo user demo đơn giản
    if (!user) {
      // Check domain cho demo user
      const domainValidation = DomainUtils.validateEmailDomain(payload.email);
      const userRole = domainValidation.isValid ? domainValidation.role : 'guest';
      
      user = {
        _id: payload.sub,
        email: payload.email,
        fullName: payload.name,
        role: userRole
      };
    }

    const token = generateToken(user._id);
    res.json({ token, user });
  } catch (error) {
    console.error('Google token verify error:', error);
    res.status(500).json({ message: 'Xác thực Google thất bại' });
  }
});

// @route   GET /api/auth/profile
// @desc    Lấy thông tin profile của user hiện tại
// @access  Private
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'Người dùng không tồn tại' });
    }
    res.json({ user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Lỗi server khi lấy thông tin người dùng' });
  }
});

// @route   GET /api/auth/users
// @desc    Lấy danh sách người dùng trong hệ thống (để mời vào meeting)
// @access  Private
router.get('/users', authenticateToken, async (req, res) => {
  try {
    const { search, department } = req.query;
    
    // Build query
    let query = {};
    
    // Tìm kiếm theo tên hoặc email
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Lọc theo phòng ban
    if (department) {
      query.department = department;
    }
    
    // Lấy danh sách users (không lấy password)
    const users = await User.find(query)
      .select('fullName email department avatar role position')
      .sort('fullName');
    
    res.json({ 
      message: 'Lấy danh sách người dùng thành công',
      users 
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ 
      message: 'Lỗi server khi lấy danh sách người dùng',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   POST /api/auth/upload-avatar
// @desc    Upload ảnh đại diện
// @access  Private
router.post('/upload-avatar', authenticateToken, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Không có file được upload' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'Người dùng không tồn tại' });
    }

    // Xóa ảnh cũ nếu có
    if (user.avatar && user.avatar.includes('/uploads/avatars/')) {
      const oldAvatarPath = path.join(__dirname, '../', user.avatar);
      if (fs.existsSync(oldAvatarPath)) {
        fs.unlinkSync(oldAvatarPath);
      }
    }

    // Cập nhật đường dẫn ảnh mới
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    user.avatar = avatarUrl;
    await user.save();

    res.json({
      success: true,
      message: 'Upload ảnh đại diện thành công',
      avatarUrl: avatarUrl
    });

  } catch (error) {
    console.error('Upload avatar error:', error);
    
    // Xóa file đã upload nếu có lỗi
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      message: 'Lỗi server khi upload ảnh đại diện',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   DELETE /api/auth/remove-avatar
// @desc    Xóa ảnh đại diện
// @access  Private
router.delete('/remove-avatar', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'Người dùng không tồn tại' });
    }

    // Xóa file ảnh nếu có
    if (user.avatar && user.avatar.includes('/uploads/avatars/')) {
      const avatarPath = path.join(__dirname, '../', user.avatar);
      if (fs.existsSync(avatarPath)) {
        fs.unlinkSync(avatarPath);
      }
    }

    // Cập nhật database
    user.avatar = null;
    await user.save();

    res.json({
      success: true,
      message: 'Xóa ảnh đại diện thành công'
    });

  } catch (error) {
    console.error('Remove avatar error:', error);
    res.status(500).json({ 
      message: 'Lỗi server khi xóa ảnh đại diện',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// Error handler for OAuth routes
router.use((err, req, res, next) => {
  if (err && req.path.includes('/callback')) {
    console.error('❌ OAuth Error Handler:', err.message);
    console.error('❌ Error Stack:', err.stack);
    
    // Handle specific OAuth errors
    let errorMessage = 'Authentication failed';
    
    if (err.message.includes('TokenError')) {
      errorMessage = 'Invalid OAuth credentials or callback URL mismatch';
    } else if (err.message.includes('Unauthorized')) {
      errorMessage = 'Google OAuth credentials are invalid or expired';
    } else {
      errorMessage = err.message;
    }
    
    return res.redirect(`${CLIENT_URL}/login?error=${encodeURIComponent(errorMessage)}`);
  }
  next(err);
});

module.exports = router; 