/**
 * Security Middleware cho Production
 */

const envConfig = require('../config/environment');

/**
 * Security Headers Middleware
 */
const securityHeaders = (req, res, next) => {
  if (envConfig.isProduction) {
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    
    // Prevent MIME-sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // XSS Protection
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Referrer Policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Content Security Policy (moderate - có thể tăng cường thêm)
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
    );
  }
  
  next();
};

/**
 * Request Size Limiter
 */
const requestSizeLimiter = (req, res, next) => {
  const maxSize = envConfig.upload.maxSize;
  
  if (req.headers['content-length'] && parseInt(req.headers['content-length']) > maxSize * 2) {
    return res.status(413).json({
      message: 'Request too large'
    });
  }
  
  next();
};

/**
 * IP Whitelist (nếu cần)
 */
const ipWhitelist = (req, res, next) => {
  // Chỉ enable trong production và nếu có whitelist
  if (envConfig.isProduction && process.env.IP_WHITELIST) {
    const allowedIPs = process.env.IP_WHITELIST.split(',').map(ip => ip.trim());
    const clientIP = req.ip || req.connection.remoteAddress;
    
    if (!allowedIPs.includes(clientIP)) {
      return res.status(403).json({
        message: 'Access denied'
      });
    }
  }
  
  next();
};

/**
 * Sanitize Input (prevent NoSQL injection)
 */
const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    if (obj && typeof obj === 'object') {
      Object.keys(obj).forEach(key => {
        if (key.startsWith('$') || key.includes('.')) {
          delete obj[key];
        } else if (typeof obj[key] === 'object') {
          sanitize(obj[key]);
        }
      });
    }
  };
  
  if (req.body) sanitize(req.body);
  if (req.query) sanitize(req.query);
  if (req.params) sanitize(req.params);
  
  next();
};

/**
 * Log Security Events
 */
const logSecurityEvents = (event, details) => {
  if (envConfig.isProduction) {
    console.warn(`🔐 [SECURITY] ${event}:`, details);
    // TODO: Send to logging service (Sentry, LogRocket, etc.)
  }
};

module.exports = {
  securityHeaders,
  requestSizeLimiter,
  ipWhitelist,
  sanitizeInput,
  logSecurityEvents
};

