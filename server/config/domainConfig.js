/**
 * Domain Configuration for Authentication and Role Assignment
 * Cấu hình domain email và phân quyền role tự động
 */

// Domain to Role Mapping
export const DOMAIN_ROLE_MAPPING = {
  // === DOANH NGHIỆP GIẢ LẬP ===
  
  // Nhân viên thông thường
  'ep.techcorp.vn': {
    role: 'employee',
    department: 'Nhân viên',
    position: 'Nhân viên',
    permissions: [
      'view_meetings',
      'join_meetings',
      'view_minutes',
      'view_protocols'
    ],
    description: 'Nhân viên - Quyền truy cập cơ bản'
  },
  
  // Trưởng phòng/Manager
  'ma.techcorp.vn': {
    role: 'manager',
    department: 'Quản lý',
    position: 'Trưởng phòng',
    permissions: [
      'create_meetings',
      'manage_meetings',
      'view_meetings',
      'join_meetings',
      'create_minutes',
      'approve_minutes',
      'create_protocols',
      'view_reports',
      'manage_attendees'
    ],
    description: 'Trưởng phòng - Quyền quản lý cuộc họp'
  },
  
  // Thư ký
  'st.techcorp.vn': {
    role: 'secretary',
    department: 'Thư ký',
    position: 'Thư ký',
    permissions: [
      'create_meetings',
      'manage_meetings',
      'view_meetings',
      'join_meetings',
      'create_minutes',
      'approve_minutes',
      'create_protocols',
      'view_reports',
      'manage_attendees'
    ],
    description: 'Thư ký - Quyền tạo và quản lý biên bản'
  },
  
  // Kỹ thuật viên
  'te.techcorp.vn': {
    role: 'technician',
    department: 'Kỹ thuật',
    position: 'Kỹ thuật viên',
    permissions: [
      'view_meetings',
      'join_meetings',
      'view_minutes',
      'view_protocols',
      'manage_meeting_rooms'
    ],
    description: 'Kỹ thuật viên - Quyền quản lý phòng họp'
  },
  
  // Admin
  'ad.techcorp.vn': {
    role: 'admin',
    department: 'Quản trị',
    position: 'Quản trị viên',
    permissions: [
      'create_meetings',
      'manage_meetings',
      'view_meetings',
      'join_meetings',
      'create_minutes',
      'approve_minutes',
      'create_protocols',
      'view_reports',
      'manage_attendees',
      'manage_users',
      'manage_meeting_rooms',
      'view_all_reports'
    ],
    description: 'Quản trị viên - Quyền toàn hệ thống'
  }
};

// Domain Validation Configuration
export const DOMAIN_VALIDATION = {
  // Các domain được phép
  allowedDomains: [
    // Doanh nghiệp giả lập
    'ep.techcorp.vn',
    'ma.techcorp.vn',
    'st.techcorp.vn',
    'te.techcorp.vn',
    'ad.techcorp.vn'
  ],
  
  // Bắt buộc phải thuộc domain được phép
  requireDomainValidation: true,
  
  // Tự động tạo user nếu chưa tồn tại
  autoCreateUsers: true,
  
  // Tự động verify email từ domain được phép
  autoVerifyDomainEmails: true
};

// Microsoft OAuth Configuration for Domains
export const MICROSOFT_OAUTH_CONFIG = {
  // Tenant ID cho tổ chức (nếu có)
  tenantId: process.env.MICROSOFT_TENANT_ID || 'common',
  
  // Scopes cần thiết
  scopes: [
    'openid',
    'profile',
    'email',
    'User.Read'
  ],
  
  // Redirect URI
  redirectUri: process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:5000/api/auth/microsoft/callback',
  
  // Client ID và Secret
  clientId: process.env.MICROSOFT_CLIENT_ID,
  clientSecret: process.env.MICROSOFT_CLIENT_SECRET
};

// Utility functions
export const DomainUtils = {
  /**
   * Extract domain from email
   * @param {string} email 
   * @returns {string} domain
   */
  extractDomain(email) {
    if (!email || typeof email !== 'string') return null;
    const parts = email.split('@');
    return parts.length === 2 ? parts[1].toLowerCase() : null;
  },

  /**
   * Check if email domain is allowed
   * @param {string} email 
   * @returns {boolean}
   */
  isAllowedDomain(email) {
    const domain = this.extractDomain(email);
    return domain && DOMAIN_VALIDATION.allowedDomains.includes(domain);
  },

  /**
   * Get role configuration for email domain
   * @param {string} email 
   * @returns {object|null}
   */
  getDomainConfig(email) {
    const domain = this.extractDomain(email);
    return domain ? DOMAIN_ROLE_MAPPING[domain] || null : null;
  },

  /**
   * Validate and get user role from email
   * @param {string} email 
   * @returns {object} { isValid, role, department, position, permissions }
   */
  validateEmailDomain(email) {
    const domain = this.extractDomain(email);
    
    if (!domain) {
      return {
        isValid: false,
        error: 'Email không hợp lệ'
      };
    }

    if (!DOMAIN_VALIDATION.allowedDomains.includes(domain)) {
      return {
        isValid: false,
        error: `Domain ${domain} không được phép. Chỉ chấp nhận: ${DOMAIN_VALIDATION.allowedDomains.join(', ')}`
      };
    }

    const config = DOMAIN_ROLE_MAPPING[domain];
    if (!config) {
      return {
        isValid: false,
        error: `Không tìm thấy cấu hình cho domain ${domain}`
      };
    }

    return {
      isValid: true,
      domain,
      role: config.role,
      department: config.department,
      position: config.position,
      permissions: config.permissions,
      description: config.description
    };
  }
};

export default {
  DOMAIN_ROLE_MAPPING,
  DOMAIN_VALIDATION,
  MICROSOFT_OAUTH_CONFIG,
  DomainUtils
};
