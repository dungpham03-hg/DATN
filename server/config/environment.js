/**
 * Environment Configuration
 * Tự động detect và cấu hình cho Development hoặc Production
 */

const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

const config = {
  // Environment
  env: process.env.NODE_ENV || 'development',
  isProduction,
  isDevelopment,
  
  // Server
  port: process.env.PORT || 5000,
  host: isProduction ? '0.0.0.0' : 'localhost',
  
  // Database
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/meeting_management',
    isAtlas: (process.env.MONGODB_URI || '').startsWith('mongodb+srv://'),
  },
  
  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback_secret_only_for_dev',
    expiresIn: '7d'
  },
  
  // Frontend URLs
  frontend: {
    url: process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:3000',
    domain: process.env.DOMAIN_URL || 'http://localhost:3000'
  },
  
  // CORS
  cors: {
    allowedOrigins: [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5000',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      process.env.FRONTEND_URL,
      process.env.DOMAIN_URL,
      process.env.CLIENT_URL
    ].filter(Boolean),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  },
  
  // File Upload
  upload: {
    maxSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760, // 10MB
    path: process.env.UPLOAD_PATH || 'uploads/',
    allowedTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ]
  },
  
  // Email
  email: {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
    enabled: !!(process.env.EMAIL_USER && process.env.EMAIL_PASS)
  },
  
  // OAuth (disabled Microsoft OAuth)
  oauth: {
    // Microsoft OAuth has been removed
  },
  
  // Features
  features: {
    domainLogin: process.env.ENABLE_DOMAIN_LOGIN === 'true',
    domainValidation: process.env.REQUIRE_DOMAIN_VALIDATION === 'true'
  },
  
  // Logging
  logging: {
    level: isDevelopment ? 'debug' : 'info',
    enableConsole: true,
    enableFile: isProduction
  }
};

// Validate critical configs in production
if (isProduction) {
  const criticalConfigs = [
    { name: 'MONGODB_URI', value: config.mongodb.uri },
    { name: 'JWT_SECRET', value: config.jwt.secret },
    { name: 'FRONTEND_URL', value: config.frontend.url }
  ];
  
  const missing = criticalConfigs.filter(c => !c.value || c.value.includes('fallback'));
  
  if (missing.length > 0) {
    console.error('❌ Missing critical configuration in production:');
    missing.forEach(c => console.error(`   - ${c.name}`));
    console.error('⚠️  Server will start but may not work correctly!');
  }
}

module.exports = config;

