const mongoose = require('mongoose');

/**
 * FollowUp Model
 * Quản lý theo dõi công việc và action items sau cuộc họp
 */
const followUpSchema = new mongoose.Schema({
  meeting: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Meeting',
    required: [true, 'Meeting ID là bắt buộc']
  },
  title: {
    type: String,
    required: [true, 'Tiêu đề công việc là bắt buộc'],
    trim: true,
    maxlength: [200, 'Tiêu đề không được vượt quá 200 ký tự']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [2000, 'Mô tả không được vượt quá 2000 ký tự']
  },
  assignee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Người thực hiện là bắt buộc']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  dueDate: {
    type: Date,
    required: [true, 'Hạn hoàn thành là bắt buộc']
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['not_started', 'in_progress', 'blocked', 'completed', 'cancelled'],
    default: 'not_started'
  },
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  
  // Dependencies
  dependencies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FollowUp'
  }],
  
  // Subtasks
  subtasks: [{
    title: {
      type: String,
      required: true,
      maxlength: 200
    },
    completed: {
      type: Boolean,
      default: false
    },
    assignee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    dueDate: Date,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Comments
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    text: {
      type: String,
      required: true,
      maxlength: 2000
    },
    attachments: [{
      name: String,
      path: String,
      size: Number
    }],
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Time Tracking
  timeTracking: {
    estimatedHours: {
      type: Number,
      min: 0,
      default: 0
    },
    actualHours: {
      type: Number,
      min: 0,
      default: 0
    },
    startedAt: Date,
    completedAt: Date
  },
  
  // Reminders
  reminders: [{
    type: {
      type: String,
      enum: ['email', 'notification', 'both'],
      default: 'both'
    },
    sendAt: {
      type: Date,
      required: true
    },
    sent: {
      type: Boolean,
      default: false
    },
    sentAt: Date
  }],
  
  // Escalation
  escalation: {
    enabled: {
      type: Boolean,
      default: false
    },
    escalateTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    escalateAfterDays: {
      type: Number,
      min: 1,
      default: 3
    },
    escalated: {
      type: Boolean,
      default: false
    },
    escalatedAt: Date
  },
  
  // Attachments
  attachments: [{
    name: {
      type: String,
      required: true
    },
    path: {
      type: String,
      required: true
    },
    size: Number,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Tags
  tags: [{
    type: String,
    trim: true,
    maxlength: 50
  }],
  
  // Metadata
  completedAt: Date,
  cancelledAt: Date,
  cancelReason: String
  
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
followUpSchema.index({ meeting: 1 });
followUpSchema.index({ assignee: 1 });
followUpSchema.index({ status: 1 });
followUpSchema.index({ dueDate: 1 });
followUpSchema.index({ priority: 1 });
followUpSchema.index({ createdBy: 1 });

// Virtual: isOverdue
followUpSchema.virtual('isOverdue').get(function() {
  if (this.status === 'completed' || this.status === 'cancelled') {
    return false;
  }
  return new Date() > this.dueDate;
});

// Virtual: daysUntilDue
followUpSchema.virtual('daysUntilDue').get(function() {
  if (this.status === 'completed' || this.status === 'cancelled') {
    return null;
  }
  const now = new Date();
  const due = new Date(this.dueDate);
  const diffTime = due - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Virtual: completedSubtasks
followUpSchema.virtual('completedSubtasks').get(function() {
  if (!this.subtasks || this.subtasks.length === 0) return 0;
  return this.subtasks.filter(st => st.completed).length;
});

// Virtual: subtaskProgress
followUpSchema.virtual('subtaskProgress').get(function() {
  if (!this.subtasks || this.subtasks.length === 0) return 100;
  return Math.round((this.completedSubtasks / this.subtasks.length) * 100);
});

// Middleware: Update progress khi subtasks thay đổi
followUpSchema.pre('save', function(next) {
  if (this.isModified('subtasks') && this.subtasks.length > 0) {
    const completed = this.subtasks.filter(st => st.completed).length;
    this.progress = Math.round((completed / this.subtasks.length) * 100);
    
    // Auto update status based on progress
    if (this.progress === 100 && this.status !== 'completed') {
      this.status = 'completed';
      this.completedAt = new Date();
    } else if (this.progress > 0 && this.status === 'not_started') {
      this.status = 'in_progress';
      if (!this.timeTracking.startedAt) {
        this.timeTracking.startedAt = new Date();
      }
    }
  }
  next();
});

// Method: Add comment
followUpSchema.methods.addComment = function(userId, text, attachments = []) {
  this.comments.push({
    user: userId,
    text,
    attachments,
    createdAt: new Date()
  });
  return this.save();
};

// Method: Update progress
followUpSchema.methods.updateProgress = function(progress) {
  this.progress = Math.max(0, Math.min(100, progress));
  
  if (this.progress === 100 && this.status !== 'completed') {
    this.status = 'completed';
    this.completedAt = new Date();
    this.timeTracking.completedAt = new Date();
  } else if (this.progress > 0 && this.status === 'not_started') {
    this.status = 'in_progress';
    if (!this.timeTracking.startedAt) {
      this.timeTracking.startedAt = new Date();
    }
  }
  
  return this.save();
};

// Method: Mark as completed
followUpSchema.methods.complete = function() {
  this.status = 'completed';
  this.progress = 100;
  this.completedAt = new Date();
  this.timeTracking.completedAt = new Date();
  return this.save();
};

// Method: Check if needs reminder
followUpSchema.methods.needsReminder = function() {
  if (this.status === 'completed' || this.status === 'cancelled') {
    return false;
  }
  
  const now = new Date();
  const pendingReminders = this.reminders.filter(r => !r.sent && r.sendAt <= now);
  return pendingReminders.length > 0;
};

// Method: Check if needs escalation
followUpSchema.methods.needsEscalation = function() {
  if (!this.escalation.enabled || this.escalation.escalated) {
    return false;
  }
  
  if (this.status === 'completed' || this.status === 'cancelled') {
    return false;
  }
  
  const now = new Date();
  const due = new Date(this.dueDate);
  const daysOverdue = Math.floor((now - due) / (1000 * 60 * 60 * 24));
  
  return daysOverdue >= this.escalation.escalateAfterDays;
};

// Method: Escalate
followUpSchema.methods.escalate = async function() {
  if (this.escalation.enabled && !this.escalation.escalated) {
    this.escalation.escalated = true;
    this.escalation.escalatedAt = new Date();
    await this.save();
    return true;
  }
  return false;
};

// Static: Find overdue tasks
followUpSchema.statics.findOverdue = function() {
  return this.find({
    status: { $nin: ['completed', 'cancelled'] },
    dueDate: { $lt: new Date() }
  }).populate('assignee createdBy meeting');
};

// Static: Find due soon (next 3 days)
followUpSchema.statics.findDueSoon = function(days = 3) {
  const now = new Date();
  const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  
  return this.find({
    status: { $nin: ['completed', 'cancelled'] },
    dueDate: { $gte: now, $lte: future }
  }).populate('assignee createdBy meeting');
};

// Static: Find by assignee
followUpSchema.statics.findByAssignee = function(userId) {
  return this.find({ assignee: userId })
    .populate('createdBy meeting')
    .sort({ dueDate: 1 });
};

module.exports = mongoose.model('FollowUp', followUpSchema);

