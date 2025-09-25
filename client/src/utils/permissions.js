// Hệ thống phân quyền cho từng role
export const PERMISSIONS = {
  // Quản lý người dùng
  USER_MANAGEMENT: 'user_management',
  USER_CREATE: 'user_create',
  USER_EDIT: 'user_edit',
  USER_DELETE: 'user_delete',
  USER_ACTIVATE: 'user_activate',
  USER_DEACTIVATE: 'user_deactivate',
  USER_RESET_PASSWORD: 'user_reset_password',

  // Quản lý cuộc họp
  MEETING_VIEW_ALL: 'meeting_view_all',
  MEETING_CREATE: 'meeting_create',
  MEETING_EDIT: 'meeting_edit',
  MEETING_DELETE: 'meeting_delete',
  MEETING_INVITE: 'meeting_invite',
  MEETING_REMOVE_ATTENDEE: 'meeting_remove_attendee',

  // Quản lý biên bản
  MINUTES_CREATE: 'minutes_create',
  MINUTES_EDIT: 'minutes_edit',
  MINUTES_DELETE: 'minutes_delete',
  MINUTES_APPROVE: 'minutes_approve',
  MINUTES_VIEW_ALL: 'minutes_view_all',

  // Quản lý phòng họp
  ROOM_MANAGEMENT: 'room_management',
  ROOM_CREATE: 'room_create',
  ROOM_EDIT: 'room_edit',
  ROOM_DELETE: 'room_delete',

  // Quản lý lưu trữ
  ARCHIVE_MANAGEMENT: 'archive_management',
  ARCHIVE_CREATE: 'archive_create',
  ARCHIVE_EDIT: 'archive_edit',
  ARCHIVE_DELETE: 'archive_delete',
  ARCHIVE_VIEW_ALL: 'archive_view_all',

  // Báo cáo và thống kê
  REPORTS_VIEW: 'reports_view',
  STATS_VIEW: 'stats_view',

  // Cài đặt hệ thống
  SYSTEM_SETTINGS: 'system_settings',
  NOTIFICATION_MANAGEMENT: 'notification_management'
};

// Định nghĩa quyền hạn cho từng role
export const ROLE_PERMISSIONS = {
  admin: [
    // Admin có tất cả quyền
    ...Object.values(PERMISSIONS)
  ],

  manager: [
    // Manager có quyền ngang admin
    ...Object.values(PERMISSIONS)
  ],

  secretary: [
    // Quyền xem cuộc họp
    PERMISSIONS.MEETING_VIEW_ALL,
    
    // Quyền tạo và quản lý cuộc họp
    PERMISSIONS.MEETING_CREATE,
    PERMISSIONS.MEETING_EDIT,
    PERMISSIONS.MEETING_INVITE,
    PERMISSIONS.MEETING_REMOVE_ATTENDEE,
    
    // Quyền tạo và quản lý biên bản
    PERMISSIONS.MINUTES_CREATE,
    PERMISSIONS.MINUTES_EDIT,
    PERMISSIONS.MINUTES_DELETE,
    PERMISSIONS.MINUTES_APPROVE,
    PERMISSIONS.MINUTES_VIEW_ALL,
    
    // Quyền quản lý lưu trữ
    PERMISSIONS.ARCHIVE_CREATE,
    PERMISSIONS.ARCHIVE_EDIT,
    PERMISSIONS.ARCHIVE_VIEW_ALL,
    
    // Quyền xem báo cáo
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.STATS_VIEW
  ],

  assistant: [
    // Quyền xem cuộc họp
    PERMISSIONS.MEETING_VIEW_ALL,
    
    // Quyền tạo cuộc họp (hạn chế hơn secretary)
    PERMISSIONS.MEETING_CREATE,
    PERMISSIONS.MEETING_INVITE,
    
    // Quyền phê duyệt biên bản
    PERMISSIONS.MINUTES_APPROVE,
    PERMISSIONS.MINUTES_VIEW_ALL,
    
    // Quyền xem báo cáo
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.STATS_VIEW
  ],

  technician: [
    // Quyền xem cuộc họp
    PERMISSIONS.MEETING_VIEW_ALL,
    
    // Quyền tạo cuộc họp kỹ thuật
    PERMISSIONS.MEETING_CREATE,
    PERMISSIONS.MEETING_INVITE,
    
    // Quyền quản lý biên bản kỹ thuật
    PERMISSIONS.MINUTES_CREATE,
    PERMISSIONS.MINUTES_EDIT,
    PERMISSIONS.MINUTES_VIEW_ALL,
    
    // Quyền quản lý lưu trữ kỹ thuật
    PERMISSIONS.ARCHIVE_CREATE,
    PERMISSIONS.ARCHIVE_EDIT,
    PERMISSIONS.ARCHIVE_VIEW_ALL,
    
    // Quyền xem báo cáo
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.STATS_VIEW
  ],

  employee: [
    // Employee chỉ có quyền cơ bản
    PERMISSIONS.MINUTES_VIEW_ALL, // Chỉ xem biên bản được phân quyền
    PERMISSIONS.ARCHIVE_VIEW_ALL // Chỉ xem lưu trữ được phân quyền
  ]
};

// Hàm kiểm tra quyền
export const hasPermission = (userRole, permission) => {
  if (!userRole || !permission) return false;
  
  const rolePermissions = ROLE_PERMISSIONS[userRole] || [];
  return rolePermissions.includes(permission);
};

// Hàm kiểm tra nhiều quyền (OR logic)
export const hasAnyPermission = (userRole, permissions) => {
  if (!userRole || !permissions || !Array.isArray(permissions)) return false;
  
  return permissions.some(permission => hasPermission(userRole, permission));
};

// Hàm kiểm tra tất cả quyền (AND logic)
export const hasAllPermissions = (userRole, permissions) => {
  if (!userRole || !permissions || !Array.isArray(permissions)) return false;
  
  return permissions.every(permission => hasPermission(userRole, permission));
};

// Hàm lấy danh sách quyền của một role
export const getRolePermissions = (userRole) => {
  return ROLE_PERMISSIONS[userRole] || [];
};

// Hàm lấy mô tả quyền hạn của role
export const getRoleDescription = (userRole) => {
  const descriptions = {
    admin: {
      title: 'Quản trị viên',
      description: 'Toàn quyền quản lý hệ thống',
      permissions: [
        'Quản lý tất cả người dùng',
        'Tạo, sửa, xóa cuộc họp',
        'Phê duyệt biên bản',
        'Quản lý phòng họp',
        'Quản lý lưu trữ',
        'Xem báo cáo và thống kê',
        'Cài đặt hệ thống'
      ],
      color: 'error',
      icon: '👑'
    },
    manager: {
      title: 'Quản lý',
      description: 'Quyền hạn tương đương admin',
      permissions: [
        'Quản lý tất cả người dùng',
        'Tạo, sửa, xóa cuộc họp',
        'Phê duyệt biên bản',
        'Quản lý phòng họp',
        'Quản lý lưu trữ',
        'Xem báo cáo và thống kê'
      ],
      color: 'warning',
      icon: '👔'
    },
    secretary: {
      title: 'Thư ký',
      description: 'Tạo cuộc họp và quản lý biên bản',
      permissions: [
        'Tạo và quản lý cuộc họp',
        'Tạo và chỉnh sửa biên bản',
        'Phê duyệt biên bản',
        'Mời/xóa người tham gia',
        'Quản lý lưu trữ',
        'Xem báo cáo'
      ],
      color: 'info',
      icon: '📝'
    },
    assistant: {
      title: 'Trợ lý',
      description: 'Hỗ trợ quản lý cuộc họp',
      permissions: [
        'Tạo cuộc họp (hạn chế)',
        'Mời người tham gia',
        'Phê duyệt biên bản',
        'Xem báo cáo'
      ],
      color: 'success',
      icon: '🤝'
    },
    technician: {
      title: 'Kỹ thuật viên',
      description: 'Quản lý cuộc họp và tài liệu kỹ thuật',
      permissions: [
        'Tạo và quản lý cuộc họp kỹ thuật',
        'Tạo và chỉnh sửa biên bản kỹ thuật',
        'Quản lý lưu trữ tài liệu kỹ thuật',
        'Mời người tham gia cuộc họp',
        'Xem báo cáo và thống kê'
      ],
      color: 'info',
      icon: '🔧'
    },
    employee: {
      title: 'Nhân viên',
      description: 'Tham gia cuộc họp và xem thông tin',
      permissions: [
        'Xem cuộc họp được mời',
        'Xem biên bản được phân quyền',
        'Xem lưu trữ được phân quyền',
        'Cập nhật thông tin cá nhân'
      ],
      color: 'default',
      icon: '👤'
    }
  };

  return descriptions[userRole] || descriptions.employee;
};

// Component helper để kiểm tra quyền trong JSX
export const PermissionGuard = ({ userRole, permission, children, fallback = null }) => {
  if (hasPermission(userRole, permission)) {
    return children;
  }
  return fallback;
};

// Hook để sử dụng trong components
export const usePermissions = (userRole) => {
  return {
    hasPermission: (permission) => hasPermission(userRole, permission),
    hasAnyPermission: (permissions) => hasAnyPermission(userRole, permissions),
    hasAllPermissions: (permissions) => hasAllPermissions(userRole, permissions),
    getPermissions: () => getRolePermissions(userRole),
    getRoleInfo: () => getRoleDescription(userRole)
  };
};
