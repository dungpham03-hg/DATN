import { rest } from 'msw';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

// Mock data
const mockUser = {
  _id: '507f1f77bcf86cd799439011',
  name: 'Test User',
  email: 'test@example.com',
  role: 'admin',
  department: 'IT',
  isActive: true
};

const mockMeetings = [
  {
    _id: '507f1f77bcf86cd799439012',
    title: 'Weekly Team Meeting',
    description: 'Weekly sync meeting',
    startTime: '2024-01-15T10:00:00Z',
    endTime: '2024-01-15T11:00:00Z',
    location: 'Conference Room A',
    status: 'scheduled',
    organizer: mockUser,
    attendees: [mockUser]
  },
  {
    _id: '507f1f77bcf86cd799439013',
    title: 'Project Review',
    description: 'Monthly project review',
    startTime: '2024-01-20T14:00:00Z',
    endTime: '2024-01-20T15:30:00Z',
    location: 'Conference Room B',
    status: 'scheduled',
    organizer: mockUser,
    attendees: [mockUser]
  }
];

export const handlers = [
  // Auth endpoints
  rest.post(`${API_BASE_URL}/auth/login`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: {
          user: mockUser,
          token: 'mock-jwt-token'
        }
      })
    );
  }),

  rest.post(`${API_BASE_URL}/auth/logout`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        message: 'Đăng xuất thành công'
      })
    );
  }),

  rest.get(`${API_BASE_URL}/auth/me`, (req, res, ctx) => {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res(
        ctx.status(401),
        ctx.json({
          success: false,
          message: 'Token không hợp lệ'
        })
      );
    }

    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: mockUser
      })
    );
  }),

  // Meetings endpoints
  rest.get(`${API_BASE_URL}/meetings`, (req, res, ctx) => {
    const page = req.url.searchParams.get('page') || 1;
    const limit = req.url.searchParams.get('limit') || 10;
    
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: {
          meetings: mockMeetings,
          totalPages: 1,
          currentPage: parseInt(page),
          totalMeetings: mockMeetings.length
        }
      })
    );
  }),

  rest.get(`${API_BASE_URL}/meetings/:id`, (req, res, ctx) => {
    const { id } = req.params;
    const meeting = mockMeetings.find(m => m._id === id);
    
    if (!meeting) {
      return res(
        ctx.status(404),
        ctx.json({
          success: false,
          message: 'Không tìm thấy cuộc họp'
        })
      );
    }

    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: meeting
      })
    );
  }),

  rest.post(`${API_BASE_URL}/meetings`, (req, res, ctx) => {
    return res(
      ctx.status(201),
      ctx.json({
        success: true,
        data: {
          ...mockMeetings[0],
          _id: 'new-meeting-id',
          title: 'New Meeting'
        }
      })
    );
  }),

  rest.put(`${API_BASE_URL}/meetings/:id`, (req, res, ctx) => {
    const { id } = req.params;
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: {
          ...mockMeetings[0],
          _id: id,
          title: 'Updated Meeting'
        }
      })
    );
  }),

  rest.delete(`${API_BASE_URL}/meetings/:id`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        message: 'Xóa cuộc họp thành công'
      })
    );
  }),

  // Users endpoints
  rest.get(`${API_BASE_URL}/users`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: {
          users: [mockUser],
          totalPages: 1,
          currentPage: 1,
          totalUsers: 1
        }
      })
    );
  }),

  // Error handler for unhandled requests
  rest.get('*', (req, res, ctx) => {
    console.error(`Please add request handler for ${req.url.toString()}`);
    return res(
      ctx.status(500),
      ctx.json({ error: 'You must add request handler.' })
    );
  }),
];
