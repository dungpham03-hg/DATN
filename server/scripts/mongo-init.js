// MongoDB initialization script
db = db.getSiblingDB('meeting_management');

// Create collections
db.createCollection('users');
db.createCollection('meetings');
db.createCollection('minutes');
db.createCollection('notifications');
db.createCollection('archives');
db.createCollection('protocols');
db.createCollection('meetingrooms');

// Create indexes for better performance
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "employeeId": 1 }, { unique: true, sparse: true });
db.meetings.createIndex({ "startTime": 1 });
db.meetings.createIndex({ "status": 1 });
db.meetings.createIndex({ "organizer": 1 });
db.minutes.createIndex({ "meeting": 1 }, { unique: true, sparse: true });
db.notifications.createIndex({ "user": 1, "createdAt": -1 });
db.notifications.createIndex({ "isRead": 1 });
db.archives.createIndex({ "meeting": 1 }, { unique: true, sparse: true });
db.archives.createIndex({ "createdAt": -1 });

// Create admin user
db.users.insertOne({
  "fullName": "Administrator",
  "email": "admin@company.com",
  "password": "$2a$10$rQZ8kF5Y8xK9mN3pL2vJ1uV4sR7tY6wE9cA2bD5fG8hI1jK4lM6nO9pQ2rS5tU",
  "role": "admin",
  "department": "IT",
  "position": "System Administrator",
  "isActive": true,
  "createdAt": new Date(),
  "updatedAt": new Date()
});

print('Database initialized successfully!');
