const request = require('supertest');
const app = require('../../index');
const User = require('../../models/User');
const Meeting = require('../../models/Meeting');
const { testUsers, testMeetings } = require('../fixtures/testData');

describe('Meetings API Integration Tests', () => {
  let adminUser, adminToken;
  let managerUser, managerToken;
  let technicianUser, technicianToken;

  beforeEach(async () => {
    // Create test users
    adminUser = await User.create(testUsers.admin);
    adminToken = adminUser.generateAuthToken();

    managerUser = await User.create(testUsers.manager);
    managerToken = managerUser.generateAuthToken();

    technicianUser = await User.create(testUsers.technician);
    technicianToken = technicianUser.generateAuthToken();
  });

  describe('GET /api/meetings', () => {
    beforeEach(async () => {
      // Create test meetings
      await Meeting.create({
        ...testMeetings.scheduled,
        organizer: adminUser._id,
        attendees: [adminUser._id]
      });

      await Meeting.create({
        ...testMeetings.ongoing,
        organizer: managerUser._id,
        attendees: [managerUser._id, adminUser._id]
      });
    });

    it('should get all meetings for admin', async () => {
      const response = await request(app)
        .get('/api/meetings')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.meetings).toHaveLength(2);
      expect(response.body.data.totalMeetings).toBe(2);
    });

    it('should get meetings with pagination', async () => {
      const response = await request(app)
        .get('/api/meetings?page=1&limit=1')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.meetings).toHaveLength(1);
      expect(response.body.data.currentPage).toBe(1);
      expect(response.body.data.totalPages).toBe(2);
    });

    it('should filter meetings by status', async () => {
      const response = await request(app)
        .get('/api/meetings?status=scheduled')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.meetings).toHaveLength(1);
      expect(response.body.data.meetings[0].status).toBe('scheduled');
    });

    it('should filter meetings by organizer', async () => {
      const response = await request(app)
        .get(`/api/meetings?organizer=${adminUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.meetings).toHaveLength(1);
      expect(response.body.data.meetings[0].organizer._id).toBe(adminUser._id.toString());
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/meetings')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/meetings/:id', () => {
    let meeting;

    beforeEach(async () => {
      meeting = await Meeting.create({
        ...testMeetings.scheduled,
        organizer: adminUser._id,
        attendees: [adminUser._id]
      });
    });

    it('should get meeting by id', async () => {
      const response = await request(app)
        .get(`/api/meetings/${meeting._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(meeting._id.toString());
      expect(response.body.data.title).toBe(meeting.title);
    });

    it('should return 404 for non-existent meeting', async () => {
      const nonExistentId = '507f1f77bcf86cd799439011';
      
      const response = await request(app)
        .get(`/api/meetings/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('không tìm thấy');
    });

    it('should return 400 for invalid meeting id', async () => {
      const response = await request(app)
        .get('/api/meetings/invalid-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/meetings', () => {
    const validMeetingData = {
      title: 'New Test Meeting',
      description: 'Test meeting description',
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      endTime: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
      location: 'Conference Room A',
      meetingType: 'offline',
      priority: 'medium'
    };

    it('should create meeting successfully', async () => {
      const response = await request(app)
        .post('/api/meetings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validMeetingData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(validMeetingData.title);
      expect(response.body.data.organizer._id).toBe(adminUser._id.toString());

      // Verify meeting was created in database
      const meeting = await Meeting.findById(response.body.data._id);
      expect(meeting).toBeTruthy();
    });

    it('should return 400 for missing required fields', async () => {
      const invalidData = { ...validMeetingData };
      delete invalidData.title;

      const response = await request(app)
        .post('/api/meetings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid date range', async () => {
      const invalidData = {
        ...validMeetingData,
        startTime: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
        endTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // End before start
      };

      const response = await request(app)
        .post('/api/meetings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 403 for technician role', async () => {
      const response = await request(app)
        .post('/api/meetings')
        .set('Authorization', `Bearer ${technicianToken}`)
        .send(validMeetingData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('quyền');
    });

    it('should add attendees to meeting', async () => {
      const meetingWithAttendees = {
        ...validMeetingData,
        attendees: [managerUser._id.toString()]
      };

      const response = await request(app)
        .post('/api/meetings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(meetingWithAttendees)
        .expect(201);

      expect(response.body.data.attendees).toHaveLength(2); // Organizer + added attendee
    });
  });

  describe('PUT /api/meetings/:id', () => {
    let meeting;

    beforeEach(async () => {
      meeting = await Meeting.create({
        ...testMeetings.scheduled,
        organizer: adminUser._id,
        attendees: [adminUser._id]
      });
    });

    it('should update meeting successfully', async () => {
      const updateData = {
        title: 'Updated Meeting Title',
        description: 'Updated description'
      };

      const response = await request(app)
        .put(`/api/meetings/${meeting._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(updateData.title);
      expect(response.body.data.description).toBe(updateData.description);
    });

    it('should return 403 for non-organizer', async () => {
      const updateData = { title: 'Updated Title' };

      const response = await request(app)
        .put(`/api/meetings/${meeting._id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send(updateData)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for completed meeting', async () => {
      meeting.status = 'completed';
      await meeting.save();

      const updateData = { title: 'Updated Title' };

      const response = await request(app)
        .put(`/api/meetings/${meeting._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('không thể chỉnh sửa');
    });
  });

  describe('DELETE /api/meetings/:id', () => {
    let meeting;

    beforeEach(async () => {
      meeting = await Meeting.create({
        ...testMeetings.scheduled,
        organizer: adminUser._id,
        attendees: [adminUser._id]
      });
    });

    it('should delete meeting successfully', async () => {
      const response = await request(app)
        .delete(`/api/meetings/${meeting._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify meeting was deleted
      const deletedMeeting = await Meeting.findById(meeting._id);
      expect(deletedMeeting).toBeNull();
    });

    it('should return 403 for non-organizer', async () => {
      const response = await request(app)
        .delete(`/api/meetings/${meeting._id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for ongoing meeting', async () => {
      meeting.status = 'ongoing';
      await meeting.save();

      const response = await request(app)
        .delete(`/api/meetings/${meeting._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/meetings/:id/join', () => {
    let meeting;

    beforeEach(async () => {
      meeting = await Meeting.create({
        ...testMeetings.ongoing,
        organizer: adminUser._id,
        attendees: [adminUser._id]
      });
    });

    it('should join meeting successfully', async () => {
      const response = await request(app)
        .post(`/api/meetings/${meeting._id}/join`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify user was added to attendees
      const updatedMeeting = await Meeting.findById(meeting._id);
      expect(updatedMeeting.attendees.map(id => id.toString())).toContain(managerUser._id.toString());
    });

    it('should return 400 for non-ongoing meeting', async () => {
      meeting.status = 'scheduled';
      await meeting.save();

      const response = await request(app)
        .post(`/api/meetings/${meeting._id}/join`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/meetings/:id/leave', () => {
    let meeting;

    beforeEach(async () => {
      meeting = await Meeting.create({
        ...testMeetings.ongoing,
        organizer: adminUser._id,
        attendees: [adminUser._id, managerUser._id]
      });
    });

    it('should leave meeting successfully', async () => {
      const response = await request(app)
        .post(`/api/meetings/${meeting._id}/leave`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify user was removed from attendees
      const updatedMeeting = await Meeting.findById(meeting._id);
      expect(updatedMeeting.attendees.map(id => id.toString())).not.toContain(managerUser._id.toString());
    });

    it('should return 400 for organizer trying to leave', async () => {
      const response = await request(app)
        .post(`/api/meetings/${meeting._id}/leave`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('người tổ chức');
    });
  });
});
