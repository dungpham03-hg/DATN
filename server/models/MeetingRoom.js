const mongoose = require('mongoose');

const meetingRoomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Tên phòng họp là bắt buộc'],
    unique: true,
    trim: true,
    maxlength: [100, 'Tên phòng không được vượt quá 100 ký tự']
  },
  capacity: {
    type: Number,
    required: [true, 'Sức chứa là bắt buộc'],
    min: [1, 'Sức chứa phải ít nhất 1 người'],
    max: [500, 'Sức chứa không được vượt quá 500 người']
  },
  location: {
    floor: {
      type: String,
      required: true,
      trim: true
    },
    building: {
      type: String,
      default: 'Tòa nhà chính',
      trim: true
    },
    address: {
      type: String,
      trim: true
    }
  },
  facilities: [{
    type: String,
    enum: ['projector', 'whiteboard', 'tv', 'video_conference', 'sound_system', 'air_conditioning', 'wifi'],
  }],
  description: {
    type: String,
    maxlength: [500, 'Mô tả không được vượt quá 500 ký tự']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Index để tìm kiếm nhanh (name đã có unique index ở schema definition)
meetingRoomSchema.index({ 'location.floor': 1 });
meetingRoomSchema.index({ isActive: 1 });

// Virtual để lấy tên đầy đủ của phòng
meetingRoomSchema.virtual('fullName').get(function() {
  return `${this.name} - ${this.location.floor} - ${this.location.building}`;
});

// Method để kiểm tra phòng có sẵn trong khoảng thời gian không
meetingRoomSchema.methods.isAvailable = async function(startTime, endTime, excludeMeetingId = null) {
  const Meeting = mongoose.model('Meeting');
  
  const query = {
    'location': this.name,
    status: { $in: ['scheduled', 'ongoing'] },
    $or: [
      { startTime: { $gte: startTime, $lt: endTime } },
      { endTime: { $gt: startTime, $lte: endTime } },
      { startTime: { $lte: startTime }, endTime: { $gte: endTime } }
    ]
  };
  
  if (excludeMeetingId) {
    query._id = { $ne: excludeMeetingId };
  }
  
  const conflictingMeetings = await Meeting.find(query);
  return conflictingMeetings.length === 0;
};

// Static method để lấy danh sách phòng available với thông tin chi tiết
meetingRoomSchema.statics.findAvailableRooms = async function(startTime, endTime, capacity = 0) {
  const rooms = await this.find({ 
    isActive: true,
    capacity: { $gte: capacity }
  });
  
  const Meeting = mongoose.model('Meeting');
  const availableRooms = [];
  
  for (const room of rooms) {
    const isAvailable = await room.isAvailable(startTime, endTime);
    if (isAvailable) {
      // Thêm thông tin về trạng thái hiện tại
      const roomData = room.toObject();
      roomData.availabilityStatus = 'available';
      roomData.availabilityMessage = 'Khả dụng';
      
      availableRooms.push(roomData);
    }
  }
  
  return availableRooms;
};

// Static method để lấy tất cả phòng với trạng thái chi tiết
meetingRoomSchema.statics.findAllRoomsWithStatus = async function(startTime, endTime, capacity = 0) {
  const rooms = await this.find({ 
    isActive: true,
    capacity: { $gte: capacity }
  });
  
  const Meeting = mongoose.model('Meeting');
  const roomsWithStatus = [];
  
  for (const room of rooms) {
    const isAvailable = await room.isAvailable(startTime, endTime);
    const roomData = room.toObject();
    
    if (isAvailable) {
      roomData.availabilityStatus = 'available';
      roomData.availabilityMessage = 'Khả dụng';
    } else {
      roomData.availabilityStatus = 'busy';
      roomData.availabilityMessage = 'Bận';
    }
    
    roomsWithStatus.push(roomData);
  }
  
  return roomsWithStatus;
};

// Phương thức chuyển đổi facilities enum sang text tiếng Việt
meetingRoomSchema.methods.getFacilitiesText = function() {
  const facilityMap = {
    'projector': 'Máy chiếu',
    'whiteboard': 'Bảng trắng',
    'tv': 'TV',
    'video_conference': 'Hội nghị truyền hình',
    'sound_system': 'Hệ thống âm thanh',
    'air_conditioning': 'Điều hòa',
    'wifi': 'WiFi'
  };
  
  return this.facilities.map(f => facilityMap[f] || f);
};

module.exports = mongoose.model('MeetingRoom', meetingRoomSchema); 