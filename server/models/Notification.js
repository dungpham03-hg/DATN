const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  type: {
    type: String,
    enum: ['meeting_invite', 'meeting_update', 'meeting_reminder', 'meeting_cancelled', 'meeting_postponed', 'general', 'minutes_pending', 'invite_response', 'protocol_pending'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  data: {
    meetingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Meeting'
    },
    // Có thể thêm các data khác tùy theo type
  },
  read: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Index để query nhanh hơn
notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });

// Method để đánh dấu đã đọc
notificationSchema.methods.markAsRead = function() {
  this.read = true;
  this.readAt = new Date();
  return this.save();
};

// Static method để tạo thông báo mời họp
notificationSchema.statics.createMeetingInvite = async function(meetingId, recipientIds, senderId) {
  const notifications = recipientIds.map(recipientId => ({
    recipient: recipientId,
    sender: senderId,
    type: 'meeting_invite',
    title: 'Lời mời tham gia cuộc họp',
    message: 'Bạn được mời tham gia một cuộc họp mới',
    data: { meetingId }
  }));
  
  return this.insertMany(notifications);
};

module.exports = mongoose.model('Notification', notificationSchema); 