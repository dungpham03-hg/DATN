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
  
  body('department')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Phòng ban không được vượt quá 50 ký tự'),
  
  body('position')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Chức vụ không được vượt quá 50 ký tự'),
  
  body('phone')
    .optional()
    .isMobilePhone('vi-VN')
    .withMessage('Số điện thoại không hợp lệ')
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
// @desc    Đăng ký người dùng mới
// @access  Public
router.post('/register', registerValidation, handleValidationErrors, async (req, res) => {
  try {
    const { fullName, email, password, department, position, phone, role } = req.body;

    // Kiểm tra email đã tồn tại
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        message: 'Email đã được sử dụng'
      });
    }

    // Tạo user mới
    const userData = {
      fullName,
      email,
      password,
      department,
      position,
      phone,
      role: role || 'employee' // Cho phép user chọn role
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
        fullName: 'Nguyễn Văn Assistant',
        email: 'assistant@example.com',
        role: 'assistant',
        department: 'Administration',
        position: 'Administrative Assistant',
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
      'assistant@example.com': {
        password: 'Assistant123',
        user: {
          _id: '507f1f77bcf86cd799439013',
          fullName: 'Nguyễn Văn Assistant',
          email: 'assistant@example.com',
          role: 'assistant',
          department: 'Administration',
          position: 'Administrative Assistant',
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
        fullName: 'Nguyễn Văn Assistant',
        email: 'assistant@example.com',
        role: 'assistant',
        department: 'Administration',
        position: 'Administrative Assistant',
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
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    prompt: 'select_account'
  })
);

router.get('/google/callback',
  passport.authenticate('google', { 
    session: false, 
    failureRedirect: `${CLIENT_URL}/login?error=google_auth_failed`,
    failureMessage: true
  }),
  (req, res) => {
    try {
      console.log('👤 User from Google:', req.user);
      const token = generateToken(req.user._id);
      console.log('🎫 Generated token:', token);
      
      // Chuyển user object thành public JSON và encode để truyền lên frontend
      const publicUser = req.user.toPublicJSON ? req.user.toPublicJSON() : req.user;
      const userData = encodeURIComponent(JSON.stringify(publicUser));
      const redirectUrl = `${CLIENT_URL}/oauth/callback?token=${token}&user=${userData}`;
      
      console.log('🔄 Redirecting to:', redirectUrl);
      res.redirect(redirectUrl);
    } catch (error) {
      console.error('❌ Error in Google callback:', error);
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

// Microsoft OAuth Routes
router.get('/microsoft',
  passport.authenticate('microsoft', { scope: ['user.read', 'openid', 'profile', 'email'] })
);

router.get('/microsoft/callback',
  passport.authenticate('microsoft', { session: false }),
  (req, res) => {
    try {
      const token = generateToken(req.user._id);
      const refreshToken = generateRefreshToken(req.user._id);
      
      // Update last login
      req.user.lastLogin = new Date();
      req.user.save();
      
      res.redirect(`${CLIENT_URL}/oauth/callback?token=${token}&refreshToken=${refreshToken}&user=${encodeURIComponent(JSON.stringify(req.user.toPublicJSON()))}`);
    } catch (error) {
      console.error('Microsoft callback error:', error);
      res.redirect(`${CLIENT_URL}/login?error=microsoft_auth_failed`);
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
// @desc    Login with domain email (for OAuth integration)
// @access  Public
router.post('/login-with-domain', async (req, res) => {
  try {
    console.log('🔍 Domain login request body:', req.body);
    const { email, fullName, avatar } = req.body;
    
    if (!email) {
      return res.status(400).json({
        message: 'Email là bắt buộc'
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
    
    if (!user) {
      // Create new user with domain role
      user = new User({
        email: email.toLowerCase(),
        fullName: fullName || email.split('@')[0],
        role: validation.role,
        emailDomain: validation.domain,
        autoAssignedRole: validation.role,
        isFromDomainAuth: true,
        domainPermissions: validation.permissions,
        department: validation.department,
        position: validation.position,
        emailVerified: true,
        password: Math.random().toString(36).slice(-8), // Random password
        avatar: avatar || ''
      });
      
      await user.save();
    } else {
      // Update existing user with domain info if needed
      if (!user.isFromDomainAuth) {
        user.emailDomain = validation.domain;
        user.autoAssignedRole = validation.role;
        user.isFromDomainAuth = true;
        user.domainPermissions = validation.permissions;
        user.department = validation.department;
        user.position = validation.position;
        user.emailVerified = true;
        
        await user.save();
      }
      
      // Update role if changed
      if (user.autoAssignedRole !== validation.role) {
        user.autoAssignedRole = validation.role;
        user.role = validation.role;
        await user.save();
      }
    }
    
    // Generate tokens
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    
    // Update last login
    user.lastLogin = new Date();
    await user.save();
    
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
      // Tạo mới user với vai trò mặc định
      try {
        user = await User.create({
          email: payload.email,
          fullName: payload.name,
          avatar: payload.picture,
          googleId: payload.sub,
          emailVerified: true,
          password: Math.random().toString(36).slice(-8),
          role: 'employee'
        });
      } catch (createErr) {
        console.error('Error creating user:', createErr);
      }
    }

    // Nếu Mongo lỗi, tạo user demo đơn giản
    if (!user) {
      user = {
        _id: payload.sub,
        email: payload.email,
        fullName: payload.name,
        role: 'employee'
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

module.exports = router; 