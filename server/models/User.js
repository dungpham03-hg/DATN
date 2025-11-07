const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Họ tên là bắt buộc'],
    trim: true,
    maxlength: [100, 'Họ tên không được vượt quá 100 ký tự']
  },
  email: {
    type: String,
    required: [true, 'Email là bắt buộc'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email không hợp lệ'],
    index: true
  },
  password: {
    type: String,
    required: [true, 'Mật khẩu là bắt buộc'],
    minlength: [6, 'Mật khẩu phải có ít nhất 6 ký tự'],
    select: false // Không trả về password khi query
  },
  googleId: {
    type: String,
    sparse: true
  },
  githubId: {
    type: String,
    sparse: true
  },
  microsoftId: {
    type: String,
    sparse: true
  },
  // Domain-based authentication fields
  emailDomain: {
    type: String,
    // Validation removed to allow any domain (including OAuth providers)
  },
  autoAssignedRole: {
    type: String,
    enum: ['admin', 'manager', 'secretary', 'technician', 'employee', 'guest']
  },
  isFromDomainAuth: {
    type: Boolean,
    default: false
  },
  domainPermissions: [{
    type: String
  }],
  role: {
    type: String,
    enum: ['admin', 'manager', 'secretary', 'technician', 'employee', 'guest'],
    default: 'guest'
  },
  originalRole: {
    type: String,
    enum: ['admin', 'manager', 'secretary', 'technician', 'employee', 'guest']
  },
  temporaryRoleExpiresAt: {
    type: Date
  },
  department: {
    type: String,
    trim: true,
    maxlength: [50, 'Phòng ban không được vượt quá 50 ký tự']
  },
  position: {
    type: String,
    trim: true,
    maxlength: [50, 'Chức vụ không được vượt quá 50 ký tự']
  },
  phone: {
    type: String,
    trim: true,
    match: [/^[0-9+\-\s\(\)]+$/, 'Số điện thoại không hợp lệ']
  },
  avatar: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'approved' // Guest users được approve tự động, domain users cần pending
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  approvedAt: {
    type: Date,
    default: null
  },
  rejectionReason: {
    type: String,
    default: null
  },
  lastLogin: {
    type: Date
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  notificationSettings: {
    email: {
      type: Boolean,
      default: true
    },
    push: {
      type: Boolean,
      default: true
    },
    meetingReminders: {
      type: Boolean,
      default: true
    },
    statusUpdates: {
      type: Boolean,
      default: false
    },
    weeklyReports: {
      type: Boolean,
      default: true
    }
  },
  // Password reset fields
  resetPasswordToken: {
    type: String,
    select: false
  },
  resetPasswordExpires: {
    type: Date,
    select: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index để tối ưu hóa truy vấn
userSchema.index({ role: 1 });
userSchema.index({ department: 1 });

// Virtual cho initials (chữ cái đầu của tên)
userSchema.virtual('initials').get(function() {
  return this.fullName.split(' ').map(name => name[0]).join('').toUpperCase();
});

// Middleware để hash password trước khi save
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method để so sánh password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method để tạo public profile (không có thông tin nhạy cảm)
userSchema.methods.toPublicJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

// Static method để tìm user bằng email
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Static method để lấy danh sách user theo role
userSchema.statics.findByRole = function(role) {
  return this.find({ role, isActive: true });
};

// Enable timestamps (createdAt, updatedAt)
userSchema.set('timestamps', true);

module.exports = mongoose.model('User', userSchema); 