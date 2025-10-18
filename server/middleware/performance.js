const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');

// Compression middleware for response optimization
const compressionMiddleware = compression({
  level: 6, // Compression level (1-9, 6 is good balance)
  threshold: 1024, // Only compress responses larger than 1KB
  filter: (req, res) => {
    // Don't compress if client doesn't support it
    if (req.headers['x-no-compression']) {
      return false;
    }
    // Use compression for all other requests
    return compression.filter(req, res);
  }
});

// Security middleware optimized for VPS
const securityMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Disable for API compatibility
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

// Rate limiting for API protection
const createRateLimit = (windowMs, max, message) => rateLimit({
  windowMs,
  max,
  message: { error: message },
  standardHeaders: true,
  legacyHeaders: false,
  // Use memory store for single server, consider Redis for multi-server
  store: new rateLimit.MemoryStore(),
});

// Different rate limits for different endpoints
const rateLimiters = {
  // General API rate limit
  general: createRateLimit(
    15 * 60 * 1000, // 15 minutes
    100, // limit each IP to 100 requests per windowMs
    'Too many requests from this IP, please try again later'
  ),

  // Strict rate limit for auth endpoints
  auth: createRateLimit(
    15 * 60 * 1000, // 15 minutes
    5, // limit each IP to 5 requests per windowMs
    'Too many authentication attempts, please try again later'
  ),

  // File upload rate limit
  upload: createRateLimit(
    60 * 60 * 1000, // 1 hour
    10, // limit each IP to 10 uploads per hour
    'Too many file uploads, please try again later'
  ),

  // Password reset rate limit
  passwordReset: createRateLimit(
    60 * 60 * 1000, // 1 hour
    3, // limit each IP to 3 password reset requests per hour
    'Too many password reset attempts, please try again later'
  )
};

// Speed limiter for additional protection
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // allow 50 requests per windowMs without delay
  delayMs: 500, // add 500ms delay per request after delayAfter
  maxDelayMs: 20000, // maximum delay of 20 seconds
});

// Request timeout middleware
const requestTimeout = (timeout = 30000) => (req, res, next) => {
  req.setTimeout(timeout, () => {
    const err = new Error('Request timeout');
    err.status = 408;
    next(err);
  });
  next();
};

// Memory usage monitoring middleware
const memoryMonitor = (req, res, next) => {
  const used = process.memoryUsage();
  const threshold = 400 * 1024 * 1024; // 400MB threshold

  if (used.heapUsed > threshold) {
    console.warn(`High memory usage detected: ${Math.round(used.heapUsed / 1024 / 1024)} MB`);
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  }

  next();
};

// Response time header
const responseTime = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    res.set('X-Response-Time', `${duration}ms`);
    
    // Log slow requests
    if (duration > 1000) {
      console.warn(`Slow request: ${req.method} ${req.path} - ${duration}ms`);
    }
  });
  
  next();
};

// Cache control middleware
const cacheControl = {
  // No cache for API responses
  noCache: (req, res, next) => {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
  },

  // Short cache for static data
  shortCache: (req, res, next) => {
    res.set('Cache-Control', 'public, max-age=300'); // 5 minutes
    next();
  },

  // Long cache for immutable data
  longCache: (req, res, next) => {
    res.set('Cache-Control', 'public, max-age=31536000, immutable'); // 1 year
    next();
  }
};

module.exports = {
  compressionMiddleware,
  securityMiddleware,
  rateLimiters,
  speedLimiter,
  requestTimeout,
  memoryMonitor,
  responseTime,
  cacheControl
};
