const mongoose = require('mongoose');

// Schema lưu trữ Biên bản (Protocol) – tách riêng khỏi collection Minutes (consensus / thống nhất)
const protocolSchema = new mongoose.Schema({
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
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
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
  status: {
    type: String,
    enum: ['draft', 'pending', 'approved', 'rejected'],
    default: 'draft'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  },
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  rejectedAt: {
    type: Date
  },
  rejectionReason: {
    type: String,
    trim: true,
    maxlength: [1000, 'Lý do từ chối không được vượt quá 1000 ký tự']
  },
  version: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index tối ưu truy vấn
protocolSchema.index({ meeting: 1 });
protocolSchema.index({ secretary: 1 });
protocolSchema.index({ status: 1 });

module.exports = mongoose.model('Protocol', protocolSchema, 'protocols'); 