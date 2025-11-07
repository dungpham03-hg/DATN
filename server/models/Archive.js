const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const archiveSchema = new mongoose.Schema({
  // Thông tin cơ bản về cuộc họp được lưu trữ
  meeting: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Meeting',
    required: [true, 'ID cuộc họp là bắt buộc']
  },
  
  // Tiêu đề lưu trữ (có thể khác với tiêu đề cuộc họp)
  title: {
    type: String,
    required: [true, 'Tiêu đề lưu trữ là bắt buộc'],
    trim: true,
    maxlength: [300, 'Tiêu đề không được vượt quá 300 ký tự']
  },
  
  // Mô tả về nội dung lưu trữ
  description: {
    type: String,
    trim: true,
    maxlength: [2000, 'Mô tả không được vượt quá 2000 ký tự']
  },
  
  // Loại lưu trữ
  archiveType: {
    type: String,
    enum: ['complete', 'documents_only', 'minutes_only', 'summary_only', 'custom'],
    default: 'complete'
  },
  
  // Trạng thái lưu trữ
  status: {
    type: String,
    enum: ['active', 'archived', 'deleted'],
    default: 'active'
  },
  
  // Thông tin cuộc họp gốc (snapshot)
  meetingSnapshot: {
    title: String,
    description: String,
    startTime: Date,
    endTime: Date,
    actualEndTime: Date,
    location: String,
    meetingType: String,
    status: String,
    priority: String,
    department: String,
    organizer: {
      _id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      fullName: String,
      email: String,
      department: String,
      position: String
    },
    secretary: {
      _id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      fullName: String,
      email: String,
      department: String,
      position: String
    },
    attendees: [{
      user: {
        _id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        fullName: String,
        email: String,
        department: String,
        position: String
      },
      status: String,
      responseDate: Date
    }],
    attendeeCount: Number,
    duration: Number
  },
  
  // Tài liệu được lưu trữ
  documents: [{
    name: {
      type: String,
      required: true
    },
    originalPath: {
      type: String,
      required: true
    },
    archivePath: {
      type: String,
      required: true
    },
    size: Number,
    type: {
      type: String,
      enum: ['meeting_attachment', 'minutes_attachment', 'protocol_attachment', 'summary_file', 'summary_message_attachment', 'additional']
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    uploadedAt: Date,
    archivedAt: {
      type: Date,
      default: Date.now
    },
    // Fields cho summary message attachments
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message'
    },
    messageAuthor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  
  // Biên bản cuộc họp (snapshot)
  minutesSnapshots: [{
    _id: { type: mongoose.Schema.Types.ObjectId, ref: 'Minutes' },
    title: String,
    content: String,
    status: String,
    decisions: [{
      title: String,
      description: String,
      type: String,
      responsible: {
        _id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        fullName: String,
        email: String
      },
      deadline: Date,
      status: String,
      priority: String
    }],
    votes: [{
      user: {
        _id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        fullName: String,
        email: String
      },
      voteType: String,
      comment: String,
      votedAt: Date
    }],
    voteDeadline: Date,
    isVotingClosed: Boolean,
    isApproved: Boolean,
    approvedBy: {
      _id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      fullName: String,
      email: String
    },
    approvedAt: Date,
    secretary: {
      _id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      fullName: String,
      email: String
    }
  }],
  
  // Tóm tắt cuộc họp
  summary: {
    text: {
      type: String,
      maxlength: [10000, 'Tóm tắt không được vượt quá 10000 ký tự']
    },
    keyPoints: [{
      type: String,
      maxlength: [500, 'Điểm chính không được vượt quá 500 ký tự']
    }],
    actionItems: [{
      title: String,
      responsible: String,
      deadline: Date,
      status: String
    }],
    nextSteps: {
      type: String,
      maxlength: [2000, 'Bước tiếp theo không được vượt quá 2000 ký tự']
    }
  },
  
  // Thông báo liên quan
  notifications: [{
    _id: { type: mongoose.Schema.Types.ObjectId, ref: 'Notification' },
    type: String,
    title: String,
    message: String,
    createdAt: Date,
    sender: {
      _id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      fullName: String,
      email: String
    }
  }],
  
  // Ghi chú bổ sung
  notes: [{
    text: {
      type: String,
      required: true,
      maxlength: [2000, 'Ghi chú không được vượt quá 2000 ký tự']
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    isImportant: {
      type: Boolean,
      default: false
    }
  }],
  
  // Tags để phân loại
  tags: [{
    type: String,
    trim: true,
    maxlength: [50, 'Tag không được vượt quá 50 ký tự']
  }],
  
  // Thống kê
  statistics: {
    totalDocuments: {
      type: Number,
      default: 0
    },
    totalSize: {
      type: Number,
      default: 0
    },
    viewCount: {
      type: Number,
      default: 0
    },
    downloadCount: {
      type: Number,
      default: 0
    },
    lastViewedAt: Date,
    lastDownloadedAt: Date
  },
  
  // Quyền truy cập
  access: {
    isPublic: {
      type: Boolean,
      default: false
    },
    allowedDepartments: [String],
    allowedUsers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    restrictedUsers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  },
  
  // Người tạo lưu trữ
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Người tạo lưu trữ là bắt buộc']
  },
  
  // Ngày lưu trữ và cập nhật cuối
  archivedAt: {
    type: Date,
    default: Date.now
  },
  
  // Retention policy (thời gian lưu trữ)
  retentionPolicy: {
    retainUntil: Date,
    autoDelete: {
      type: Boolean,
      default: false
    },
    deleteAfterYears: {
      type: Number,
      default: 7
    }
  },
  
  minutesSnapshot: {
    type: Object,
    default: null
  },
  
  // Danh sách thống nhất (minutes) cho nhiều phiên bản
  minutesSnapshots: {
    type: [mongoose.Schema.Types.Mixed],
    default: []
  },
  
  protocolSnapshots: {
    type: [mongoose.Schema.Types.Mixed],
    default: []
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes để tối ưu hóa truy vấn
archiveSchema.index({ meeting: 1 });
archiveSchema.index({ createdBy: 1 });
archiveSchema.index({ archiveType: 1 });
archiveSchema.index({ status: 1 });
archiveSchema.index({ archivedAt: -1 });
archiveSchema.index({ tags: 1 });
archiveSchema.index({ 'meetingSnapshot.department': 1 });
archiveSchema.index({ 'meetingSnapshot.startTime': 1 });
archiveSchema.index({ title: 'text', description: 'text' });

// Virtual cho tổng kích thước file (MB)
archiveSchema.virtual('totalSizeMB').get(function() {
  return Math.round((this.statistics.totalSize / (1024 * 1024)) * 100) / 100;
});

// Virtual cho thời gian lưu trữ (ngày)
archiveSchema.virtual('daysArchived').get(function() {
  const now = new Date();
  return Math.floor((now - this.archivedAt) / (1000 * 60 * 60 * 24));
});

// Virtual để kiểm tra có hết hạn không
archiveSchema.virtual('isExpired').get(function() {
  if (!this.retentionPolicy.retainUntil) return false;
  return new Date() > this.retentionPolicy.retainUntil;
});

// Middleware để cập nhật thống kê khi có thay đổi documents
archiveSchema.pre('save', function(next) {
  if (this.isModified('documents')) {
    this.statistics.totalDocuments = this.documents.length;
    this.statistics.totalSize = this.documents.reduce((total, doc) => total + (doc.size || 0), 0);
  }
  
  // Tự động set retention date nếu chưa có
  if (this.isNew && !this.retentionPolicy.retainUntil && this.retentionPolicy.deleteAfterYears) {
    const retainUntil = new Date();
    retainUntil.setFullYear(retainUntil.getFullYear() + this.retentionPolicy.deleteAfterYears);
    this.retentionPolicy.retainUntil = retainUntil;
  }
  
  next();
});

// Static method để tìm archives theo user
archiveSchema.statics.findByUser = function(userId, role, department) {
  let query = { status: 'active' };
  
  if (role === 'admin' || role === 'secretary') {
    // Admin và Secretary thấy tất cả
  } else if (role === 'manager') {
    // Manager và Secretary thấy:
    query.$or = [
      { createdBy: userId },
      { 'access.isPublic': true },
      { 'access.allowedUsers': userId },
      { 'access.allowedDepartments': department },
      { 'meetingSnapshot.organizer._id': userId },
      { 'meetingSnapshot.secretary._id': userId },
      { 'meetingSnapshot.attendees.user._id': userId }
    ];
  } else {
    // Employee chỉ thấy:
    query.$or = [
      { createdBy: userId },
      { 'access.isPublic': true },
      { 'access.allowedUsers': userId },
      { 'meetingSnapshot.organizer._id': userId },
      { 'meetingSnapshot.attendees.user._id': userId }
    ];
  }
  
  // Loại bỏ những user bị restricted
  query['access.restrictedUsers'] = { $ne: userId };
  
  return this.find(query).sort({ archivedAt: -1 });
};

// Method để tăng view count
archiveSchema.methods.incrementViewCount = function() {
  this.statistics.viewCount += 1;
  this.statistics.lastViewedAt = new Date();
  return this.save();
};

// Method để tăng download count
archiveSchema.methods.incrementDownloadCount = function() {
  this.statistics.downloadCount += 1;
  this.statistics.lastDownloadedAt = new Date();
  return this.save();
};

// Method để kiểm tra quyền truy cập
archiveSchema.methods.canAccess = function(userId, userRole, userDepartment) {
  // Admin và Secretary có thể truy cập tất cả
  if (userRole === 'admin' || userRole === 'secretary') return true;
  
  // Người tạo có thể truy cập
  if (this.createdBy.toString() === userId.toString()) return true;
  
  // Kiểm tra restricted users
  if (this.access.restrictedUsers.includes(userId)) return false;
  
  // Public archives
  if (this.access.isPublic) return true;
  
  // Explicitly allowed users
  if (this.access.allowedUsers.includes(userId)) return true;
  
  // Department access
  if (this.access.allowedDepartments.includes(userDepartment)) return true;
  
  // Meeting participants
  if (this.meetingSnapshot.organizer._id.toString() === userId.toString()) return true;
  if (this.meetingSnapshot.secretary && this.meetingSnapshot.secretary._id.toString() === userId.toString()) return true;
  if (this.meetingSnapshot.attendees.some(att => att.user._id.toString() === userId.toString())) return true;
  
  return false;
};

// Add pagination plugin
archiveSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Archive', archiveSchema);
