const mongoose = require('mongoose');

const minutesSchema = new mongoose.Schema({
  meeting: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Meeting',
    required: [true, 'ID cuộc họp là bắt buộc']
  },
  title: {
    type: String,
    required: [true, 'Tiêu đề biên bản là bắt buộc'],
    trim: true,
    maxlength: [200, 'Tiêu đề không được vượt quá 200 ký tự']
  },
  content: {
    type: String,
    required: [true, 'Nội dung biên bản là bắt buộc'],
    trim: true,
    maxlength: [10000, 'Nội dung không được vượt quá 10000 ký tự']
  },
  decisions: [{
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [500, 'Tiêu đề quyết định không được vượt quá 500 ký tự']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Mô tả quyết định không được vượt quá 2000 ký tự']
    },
    type: {
      type: String,
      enum: ['decision', 'action_item', 'resolution'],
      default: 'decision'
    },
    responsible: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    deadline: {
      type: Date
    },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'cancelled'],
      default: 'pending'
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },
    linkedTask: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FollowUp'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  votes: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    voteType: {
      type: String,
      enum: ['agree', 'agree_with_comments', 'disagree'],
      required: true
    },
    comment: {
      type: String,
      trim: true,
      maxlength: [1000, 'Bình luận không được vượt quá 1000 ký tự']
    },
    votedAt: {
      type: Date,
      default: Date.now
    }
  }],
  voteDeadline: {
    type: Date,
    required: [true, 'Hạn chót bỏ phiếu là bắt buộc']
  },
  isVotingClosed: {
    type: Boolean,
    default: false
  },
  isApproved: {
    type: Boolean,
    default: false
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  },
  attachments: [{
    name: {
      type: String,
      required: true
    },
    path: {
      type: String,
      required: true
    },
    size: {
      type: Number
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  secretary: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Thư ký biên bản là bắt buộc']
  },
  reviewers: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    reviewedAt: {
      type: Date
    },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'approved', 'rejected'],
      default: 'pending'
    },
    comments: {
      type: String,
      trim: true,
      maxlength: [1000, 'Nhận xét không được vượt quá 1000 ký tự']
    }
  }],
  version: {
    type: Number,
    default: 1
  },
  status: {
    type: String,
    enum: ['draft', 'pending_review', 'pending_approval', 'approved', 'rejected'],
    default: 'draft'
  },
  metadata: {
    attendeeCount: {
      type: Number,
      default: 0
    },
    requiredVoteCount: {
      type: Number,
      default: 0
    },
    receivedVoteCount: {
      type: Number,
      default: 0
    },
    agreeCount: {
      type: Number,
      default: 0
    },
    agreeWithCommentsCount: {
      type: Number,
      default: 0
    },
    disagreeCount: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index để tối ưu hóa truy vấn
minutesSchema.index({ meeting: 1 });
minutesSchema.index({ secretary: 1 });
minutesSchema.index({ status: 1 });
minutesSchema.index({ voteDeadline: 1 });
minutesSchema.index({ 'votes.user': 1 });

// Virtual cho tỷ lệ đồng ý
minutesSchema.virtual('agreementRate').get(function() {
  if (this.metadata.receivedVoteCount === 0) return 0;
  return Math.round((this.metadata.agreeCount / this.metadata.receivedVoteCount) * 100);
});

// Virtual cho tỷ lệ tham gia bỏ phiếu
minutesSchema.virtual('participationRate').get(function() {
  if (this.metadata.requiredVoteCount === 0) return 0;
  return Math.round((this.metadata.receivedVoteCount / this.metadata.requiredVoteCount) * 100);
});

// Middleware để tự động cập nhật metadata khi có vote mới
minutesSchema.pre('save', function(next) {
  if (this.isModified('votes')) {
    this.metadata.receivedVoteCount = this.votes.length;
    this.metadata.agreeCount = this.votes.filter(vote => vote.voteType === 'agree').length;
    this.metadata.agreeWithCommentsCount = this.votes.filter(vote => vote.voteType === 'agree_with_comments').length;
    this.metadata.disagreeCount = this.votes.filter(vote => vote.voteType === 'disagree').length;
  }
  next();
});

// Method để kiểm tra xem user đã vote chưa
minutesSchema.methods.hasUserVoted = function(userId) {
  return this.votes.some(vote => vote.user.toString() === userId.toString());
};

// Method để lấy vote của user
minutesSchema.methods.getUserVote = function(userId) {
  return this.votes.find(vote => vote.user.toString() === userId.toString());
};

// Method để kiểm tra xem có thể vote không
minutesSchema.methods.canVote = function() {
  const now = new Date();
  return !this.isVotingClosed && now <= this.voteDeadline && this.status !== 'approved';
};

// Method để tự động đóng vote khi hết hạn
minutesSchema.methods.closeVotingIfExpired = function() {
  const now = new Date();
  if (!this.isVotingClosed && now > this.voteDeadline) {
    this.isVotingClosed = true;
    this.status = 'approved'; // Tự động approve khi hết hạn
    this.approvedAt = new Date();
    return true;
  }
  return false;
};

module.exports = mongoose.model('Minutes', minutesSchema); 