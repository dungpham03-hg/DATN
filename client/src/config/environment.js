/**
 * Client Environment Configuration
 * Tự động nhận biết môi trường và sử dụng config phù hợp
 */

const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

const config = {
  // Environment
  env: process.env.NODE_ENV || 'development',
  isProduction,
  isDevelopment,
  
  // API Configuration
  api: {
    baseURL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api',
    socketURL: process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000',
    timeout: 30000, // 30 seconds
  },
  
  // OAuth
  oauth: {
    google: {
      clientId: process.env.REACT_APP_GOOGLE_CLIENT_ID || ''
    }
  },
  
  // Features
  features: {
    socketIO: true,
    notifications: true,
    fileUpload: true,
    maxFileSize: 50 * 1024 * 1024, // 50MB
  },
  
  // UI Settings
  ui: {
    itemsPerPage: 10,
    maxSnackbars: 3,
    snackbarDuration: 3000,
  },
  
  // Debug
  debug: {
    enabled: isDevelopment,
    logAPIRequests: isDevelopment,
    logSocketEvents: isDevelopment,
  }
};

// Log configuration in development
if (isDevelopment) {
  console.log('📝 Client Configuration:', {
    environment: config.env,
    apiBaseURL: config.api.baseURL,
    socketURL: config.api.socketURL
  });
}

export default config;

