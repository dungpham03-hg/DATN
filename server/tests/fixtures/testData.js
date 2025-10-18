const mongoose = require('mongoose');

// Test user data
const testUsers = {
  admin: {
    name: 'Admin User',
    email: 'admin@example.com',
    password: 'admin123',
    role: 'admin',
    department: 'IT',
    isActive: true
  },
  manager: {
    name: 'Manager User',
    email: 'manager@example.com',
    password: 'manager123',
    role: 'manager',
    department: 'HR',
    isActive: true
  },
  secretary: {
    name: 'Secretary User',
    email: 'secretary@example.com',
    password: 'secretary123',
    role: 'secretary',
    department: 'Admin',
    isActive: true
  },
  assistant: {
    name: 'Assistant User',
    email: 'assistant@example.com',
    password: 'assistant123',
    role: 'assistant',
    department: 'Admin',
    isActive: true
  },
  technician: {
    name: 'Technician User',
    email: 'technician@example.com',
    password: 'technician123',
    role: 'technician',
    department: 'IT',
    isActive: true
  }
};

// Test meeting data
const testMeetings = {
  scheduled: {
    title: 'Weekly Team Meeting',
    description: 'Weekly sync meeting for the team',
    startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    endTime: new Date(Date.now() + 25 * 60 * 60 * 1000), // Tomorrow + 1 hour
    location: 'Conference Room A',
    meetingType: 'offline',
    status: 'scheduled',
    priority: 'medium'
  },
  ongoing: {
    title: 'Project Review Meeting',
    description: 'Monthly project review',
    startTime: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
    endTime: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
    location: 'Conference Room B',
    meetingType: 'hybrid',
    status: 'ongoing',
    priority: 'high'
  },
  completed: {
    title: 'Completed Meeting',
    description: 'This meeting has been completed',
    startTime: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    endTime: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
    location: 'Conference Room C',
    meetingType: 'online',
    status: 'completed',
    priority: 'low'
  }
};

// Test meeting room data
const testMeetingRooms = {
  roomA: {
    name: 'Conference Room A',
    capacity: 10,
    location: {
      floor: '1',
      building: 'Main Building',
      address: '123 Main St'
    },
    facilities: ['projector', 'whiteboard', 'video_conference'],
    description: 'Main conference room with all facilities',
    isActive: true
  },
  roomB: {
    name: 'Conference Room B',
    capacity: 6,
    location: {
      floor: '2',
      building: 'Main Building',
      address: '123 Main St'
    },
    facilities: ['tv', 'whiteboard'],
    description: 'Small meeting room for team discussions',
    isActive: true
  }
};

// Test protocol data
const testProtocols = {
  draft: {
    title: 'Meeting Protocol Draft',
    content: 'This is a draft protocol content',
    status: 'draft'
  },
  approved: {
    title: 'Approved Meeting Protocol',
    content: 'This is an approved protocol content',
    status: 'approved'
  }
};

// Test notification data
const testNotifications = {
  meetingReminder: {
    type: 'meeting_reminder',
    title: 'Meeting Reminder',
    message: 'You have a meeting in 30 minutes',
    priority: 'medium',
    isRead: false
  },
  meetingCancelled: {
    type: 'meeting_cancelled',
    title: 'Meeting Cancelled',
    message: 'Your meeting has been cancelled',
    priority: 'high',
    isRead: false
  }
};

// Helper function để tạo ObjectId
const createObjectId = () => new mongoose.Types.ObjectId();

module.exports = {
  testUsers,
  testMeetings,
  testMeetingRooms,
  testProtocols,
  testNotifications,
  createObjectId
};
