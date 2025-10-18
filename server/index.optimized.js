const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const passport = require('passport');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const cron = require('node-cron');

// Load optimized database connection
const { connectDB, checkDBHealth } = require('./config/database');

// Load performance middleware
const {
  compressionMiddleware,
  securityMiddleware,
  rateLimiters,
  speedLimiter,
  requestTimeout,
  memoryMonitor,
  responseTime,
  cacheControl
} = require('./middleware/performance');

// Load environment variables
dotenv.config();

// Fallback to root .env if needed
if (!process.env.MONGODB_URI) {
  const rootEnvPath = path.resolve(__dirname, '../.env');
  dotenv.config({ path: rootEnvPath });
}

// Import passport config
require('./config/passport');

// Create Express app
const app = express();

// Trust proxy for VPS deployment behind reverse proxy
app.set('trust proxy', 1);

// Performance and security middleware (order matters)
app.use(responseTime);
app.use(compressionMiddleware);
app.use(securityMiddleware);
app.use(memoryMonitor);
app.use(requestTimeout(30000)); // 30 second timeout

// CORS configuration optimized for production
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      process.env.FRONTEND_URL,
      process.env.DOMAIN_URL,
      // Add your VPS domain here
      'https://your-domain.com',
      'https://www.your-domain.com'
    ].filter(Boolean);
    
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (allowedOrigin.includes('*')) {
        const regex = new RegExp(allowedOrigin.replace(/\*/g, '.*'));
        return regex.test(origin);
      }
      return allowedOrigin === origin;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Response-Time'],
  maxAge: 86400 // 24 hours preflight cache
};

app.use(cors(corsOptions));

// Body parsing middleware with limits
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    // Store raw body for webhook verification if needed
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb' 
}));

// Passport middleware
app.use(passport.initialize());

// Rate limiting middleware
app.use('/api/auth/login', rateLimiters.auth);
app.use('/api/auth/register', rateLimiters.auth);
app.use('/api/auth/forgot-password', rateLimiters.passwordReset);
app.use('/api/upload', rateLimiters.upload);
app.use('/api', speedLimiter);
app.use('/api', rateLimiters.general);

// Cache control for API routes
app.use('/api', cacheControl.noCache);

// Static file serving with caching
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '1d', // 1 day cache for uploaded files
  etag: true,
  lastModified: true
}));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/meetings', require('./routes/meetings'));
app.use('/api/meeting-rooms', require('./routes/meetingRooms'));
app.use('/api/minutes', require('./routes/minutes'));
app.use('/api/protocols', require('./routes/protocols'));
app.use('/api/archives', require('./routes/archives'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/departments', require('./routes/departments'));

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const dbHealth = await checkDBHealth();
    const memUsage = process.memoryUsage();
    
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: dbHealth,
      memory: {
        used: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB',
        total: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB'
      },
      version: process.env.npm_package_version || '1.0.0'
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(isDevelopment && { stack: err.stack })
  });
});

// Create HTTP server
const server = http.createServer(app);

// Socket.IO configuration optimized for VPS
const io = new Server(server, {
  cors: corsOptions,
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e6, // 1MB
  transports: ['websocket', 'polling'],
  allowEIO3: true
});

// Socket.IO connection handling with optimization
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  
  // Join user to their personal room for notifications
  socket.on('join-user-room', (userId) => {
    if (userId) {
      socket.join(`user-${userId}`);
      console.log(`User ${userId} joined personal room`);
    }
  });
  
  // Join meeting room
  socket.on('join-meeting', (meetingId) => {
    if (meetingId) {
      socket.join(`meeting-${meetingId}`);
      socket.to(`meeting-${meetingId}`).emit('user-joined', socket.id);
      console.log(`User joined meeting: ${meetingId}`);
    }
  });
  
  // Leave meeting room
  socket.on('leave-meeting', (meetingId) => {
    if (meetingId) {
      socket.leave(`meeting-${meetingId}`);
      socket.to(`meeting-${meetingId}`).emit('user-left', socket.id);
      console.log(`User left meeting: ${meetingId}`);
    }
  });
  
  // Handle disconnection
  socket.on('disconnect', (reason) => {
    console.log(`User disconnected: ${socket.id}, reason: ${reason}`);
  });
  
  // Handle connection errors
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

// Make io available globally for other modules
global.io = io;

// Cron jobs for maintenance
if (process.env.NODE_ENV === 'production') {
  // Cleanup old notifications daily at 2 AM
  cron.schedule('0 2 * * *', async () => {
    try {
      console.log('Running daily cleanup...');
      const { cleanupOldNotifications } = require('./utils/notificationHelper');
      await cleanupOldNotifications();
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
    } catch (error) {
      console.error('Cleanup job failed:', error);
    }
  });
  
  // Memory monitoring every hour
  cron.schedule('0 * * * *', () => {
    const used = process.memoryUsage();
    console.log('Memory usage:', {
      rss: Math.round(used.rss / 1024 / 1024) + ' MB',
      heapTotal: Math.round(used.heapTotal / 1024 / 1024) + ' MB',
      heapUsed: Math.round(used.heapUsed / 1024 / 1024) + ' MB',
      external: Math.round(used.external / 1024 / 1024) + ' MB'
    });
  });
}

// Graceful shutdown handling
const gracefulShutdown = (signal) => {
  console.log(`Received ${signal}, shutting down gracefully...`);
  
  server.close(() => {
    console.log('HTTP server closed');
    
    // Close database connection
    const mongoose = require('mongoose');
    mongoose.connection.close(() => {
      console.log('Database connection closed');
      process.exit(0);
    });
  });
  
  // Force close after 30 seconds
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

// Start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Connect to database
    await connectDB();
    
    // Start HTTP server
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
      console.log(`Memory limit: ${process.env.NODE_OPTIONS || 'default'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
