const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

// MongoDB Memory Server instance
let mongoServer;

// Test database setup
beforeAll(async () => {
  // Tạo MongoDB Memory Server
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  // Kết nối với test database
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
});

afterAll(async () => {
  // Đóng kết nối và dừng server
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  // Xóa tất cả collections trước mỗi test
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

// Helper functions cho testing
global.createTestUser = (overrides = {}) => ({
  name: 'Test User',
  email: 'test@example.com',
  password: 'password123',
  role: 'admin',
  department: 'IT',
  isActive: true,
  ...overrides
});

global.createTestMeeting = (organizer, overrides = {}) => ({
  title: 'Test Meeting',
  description: 'Test meeting description',
  startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
  endTime: new Date(Date.now() + 25 * 60 * 60 * 1000), // Tomorrow + 1 hour
  location: 'Conference Room A',
  organizer: organizer._id,
  attendees: [organizer._id],
  status: 'scheduled',
  ...overrides
});

global.generateTestToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );
};

// Mock console để giảm noise trong tests
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: originalConsole.error, // Giữ error để debug
};

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.MONGODB_URI = 'mongodb://localhost:27017/test';

// Mock external services
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' })
  }))
}));

jest.mock('socket.io', () => ({
  Server: jest.fn(() => ({
    on: jest.fn(),
    emit: jest.fn(),
    to: jest.fn(() => ({
      emit: jest.fn()
    }))
  }))
}));
