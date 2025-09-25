/**
 * Application constants
 * Centralized location for all constants used throughout the app
 */

// API Configuration
export const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api',
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3
};

// User Roles
export const USER_ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  SECRETARY: 'secretary',
  ASSISTANT: 'assistant',
  EMPLOYEE: 'employee',
  TECHNICIAN: 'technician'
};

// Meeting Status
export const MEETING_STATUS = {
  UPCOMING: 'upcoming',
  ONGOING: 'ongoing',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

// Meeting Types
export const MEETING_TYPES = {
  OFFLINE: 'offline',
  ONLINE: 'online',
  HYBRID: 'hybrid'
};

// Meeting Response Status
export const RESPONSE_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
  MAYBE: 'maybe'
};

// Protocol Status
export const PROTOCOL_STATUS = {
  DRAFT: 'draft',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected'
};

// Notification Types
export const NOTIFICATION_TYPES = {
  MEETING_INVITATION: 'meeting_invitation',
  MEETING_REMINDER: 'meeting_reminder',
  MEETING_UPDATE: 'meeting_update',
  MEETING_CANCELLED: 'meeting_cancelled',
  PROTOCOL_APPROVED: 'protocol_approved',
  PROTOCOL_REJECTED: 'protocol_rejected',
  TASK_ASSIGNED: 'task_assigned',
  TASK_COMPLETED: 'task_completed'
};

// File Upload
export const FILE_UPLOAD = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/gif'
  ]
};

// UI Constants
export const UI_CONSTANTS = {
  DRAWER_WIDTH: 280,
  MINI_DRAWER_WIDTH: 64,
  ANIMATION_DURATION: 300,
  DEBOUNCE_DELAY: 300,
  TOAST_DURATION: 4000
};

// Date Formats
export const DATE_FORMATS = {
  DISPLAY: 'DD/MM/YYYY',
  DISPLAY_WITH_TIME: 'DD/MM/YYYY HH:mm',
  API: 'YYYY-MM-DD',
  API_WITH_TIME: 'YYYY-MM-DDTHH:mm:ss.SSSZ',
  TIME_ONLY: 'HH:mm'
};

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [10, 25, 50, 100]
};

// Storage Keys
export const STORAGE_KEYS = {
  TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_PREFERENCES: 'user_preferences',
  THEME: 'theme_preference',
  QUICK_ACTIONS: 'quick_actions_pref'
};

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Lỗi kết nối mạng. Vui lòng kiểm tra kết nối internet.',
  UNAUTHORIZED: 'Bạn không có quyền truy cập. Vui lòng đăng nhập lại.',
  FORBIDDEN: 'Bạn không có quyền thực hiện hành động này.',
  NOT_FOUND: 'Không tìm thấy dữ liệu.',
  VALIDATION_ERROR: 'Dữ liệu không hợp lệ.',
  SERVER_ERROR: 'Lỗi máy chủ. Vui lòng thử lại sau.',
  FILE_TOO_LARGE: 'File quá lớn. Kích thước tối đa là 10MB.',
  INVALID_FILE_TYPE: 'Loại file không được hỗ trợ.',
  GENERIC_ERROR: 'Đã xảy ra lỗi. Vui lòng thử lại.'
};

// Success Messages
export const SUCCESS_MESSAGES = {
  MEETING_CREATED: 'Tạo cuộc họp thành công.',
  MEETING_UPDATED: 'Cập nhật cuộc họp thành công.',
  MEETING_DELETED: 'Xóa cuộc họp thành công.',
  PROTOCOL_SAVED: 'Lưu biên bản thành công.',
  PROTOCOL_APPROVED: 'Phê duyệt biên bản thành công.',
  USER_CREATED: 'Tạo người dùng thành công.',
  USER_UPDATED: 'Cập nhật người dùng thành công.',
  FILE_UPLOADED: 'Tải file thành công.',
  SETTINGS_SAVED: 'Lưu cài đặt thành công.'
};

// Regex Patterns
export const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^[\+]?[1-9][\d]{0,15}$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  USERNAME: /^[a-zA-Z0-9_]{3,20}$/
};

// Theme Colors
export const THEME_COLORS = {
  PRIMARY: '#3b82f6',
  SECONDARY: '#64748b',
  SUCCESS: '#059669',
  WARNING: '#d97706',
  ERROR: '#dc2626',
  INFO: '#0891b2'
};

// Breakpoints
export const BREAKPOINTS = {
  XS: 0,
  SM: 600,
  MD: 960,
  LG: 1280,
  XL: 1920
};

// Meeting Permissions
export const MEETING_PERMISSIONS = {
  CREATE: [USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.SECRETARY, USER_ROLES.ASSISTANT],
  EDIT: [USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.SECRETARY, USER_ROLES.ASSISTANT],
  DELETE: [USER_ROLES.ADMIN, USER_ROLES.MANAGER],
  APPROVE_ROOM: [USER_ROLES.ADMIN, USER_ROLES.ASSISTANT, USER_ROLES.TECHNICIAN],
  APPROVE_PROTOCOL: [USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.ASSISTANT],
  MANAGE_USERS: [USER_ROLES.ADMIN],
  VIEW_REPORTS: [USER_ROLES.ADMIN, USER_ROLES.MANAGER]
};

export default {
  API_CONFIG,
  USER_ROLES,
  MEETING_STATUS,
  MEETING_TYPES,
  RESPONSE_STATUS,
  PROTOCOL_STATUS,
  NOTIFICATION_TYPES,
  FILE_UPLOAD,
  UI_CONSTANTS,
  DATE_FORMATS,
  PAGINATION,
  STORAGE_KEYS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  REGEX_PATTERNS,
  THEME_COLORS,
  BREAKPOINTS,
  MEETING_PERMISSIONS
};
