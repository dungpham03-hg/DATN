const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware xác thực JWT
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    console.log('🔍 Auth Debug:', {
      hasAuthHeader: !!authHeader,
      hasToken: !!token,
      tokenLength: token ? token.length : 0,
      endpoint: req.path
    });

    if (!token) {
      console.log('❌ No token provided');
      return res.status(401).json({ 
        message: 'Access token không tồn tại' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ Token decoded successfully:', { userId: decoded.userId });
    
    try {
      // Tìm user và kiểm tra xem còn active không
      const user = await User.findById(decoded.userId).select('-password');
      console.log('🔍 User found:', user ? 'Yes' : 'No');
      
      if (user && user.isActive) {
        req.user = user;
        console.log('✅ User authenticated:', user.email, user.role);
      } else {
        // Fallback cho demo mode - chỉ set userId
        req.user = decoded.userId;
        console.log('⚠️ Using demo mode, userId:', decoded.userId);
      }
    } catch (dbError) {
      // MongoDB không kết nối được - dùng demo mode
      console.log('⚠️ MongoDB not connected, using demo mode:', dbError.message);
      req.user = decoded.userId;
    }
    next();
  } catch (error) {
    console.error('❌ Auth middleware error:', {
      name: error.name,
      message: error.message,
      endpoint: req.path
    });
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        message: 'Token không hợp lệ' 
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        message: 'Token đã hết hạn' 
      });
    }
    
    return res.status(500).json({ 
      message: 'Lỗi server khi xác thực' 
    });
  }
};

// Middleware kiểm tra quyền admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      message: 'Chỉ admin mới có quyền truy cập' 
    });
  }
  next();
};

// Middleware kiểm tra quyền manager hoặc admin hoặc assistant
const requireManagerOrAdmin = (req, res, next) => {
  if (!['admin', 'manager'].includes(req.user.role)) {
    return res.status(403).json({ 
      message: 'Chỉ manager hoặc admin mới có quyền truy cập' 
    });
  }
  next();
};

// Middleware: technician hoặc admin/assistant
const requireTechnicianOrAdmin = (req, res, next) => {
  if (!['admin', 'technician'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Chỉ kỹ thuật hoặc admin mới có quyền truy cập' });
  }
  next();
};

// Middleware kiểm tra quyền truy cập resource dựa trên owner
const checkResourceOwnership = (resourceField = 'organizer') => {
  return (req, res, next) => {
    // Nếu là admin thì có quyền truy cập tất cả
    if (['admin'].includes(req.user.role)) {
      return next();
    }

    // Kiểm tra ownership sẽ được thực hiện trong controller
    // Middleware này chỉ đánh dấu cần kiểm tra
    req.checkOwnership = resourceField;
    next();
  };
};

// Middleware kiểm tra quyền truy cập department
const checkDepartmentAccess = (req, res, next) => {
  const { department } = req.query;
  
  // Admin và Assistant có quyền xem tất cả departments
  if (['admin', 'assistant'].includes(req.user.role)) {
    return next();
  }
  
  // Manager có thể xem department của mình và không có department filter
  if (req.user.role === 'manager') {
    if (!department || department === req.user.department) {
      return next();
    }
    return res.status(403).json({ 
      message: 'Không có quyền truy cập department này' 
    });
  }
  
  // Employee chỉ có thể xem department của mình
  if (department && department !== req.user.department) {
    return res.status(403).json({ 
      message: 'Không có quyền truy cập department này' 
    });
  }
  
  // Nếu không có department filter, employee chỉ xem được của department mình
  if (!department) {
    req.query.department = req.user.department;
  }
  
  next();
};

// Utility function để tạo JWT token
const generateToken = (user) => {
  const userId = typeof user === 'string' ? user : user._id;
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
};

// Utility function để tạo refresh token
const generateRefreshToken = (user) => {
  const userId = typeof user === 'string' ? user : user._id;
  return jwt.sign(
    { userId, type: 'refresh' },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

module.exports = {
  authenticateToken,
  requireAdmin,
  requireManagerOrAdmin,
  requireTechnicianOrAdmin,
  checkResourceOwnership,
  checkDepartmentAccess,
  generateToken,
  generateRefreshToken
}; 