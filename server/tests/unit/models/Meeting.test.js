const mongoose = require('mongoose');
const Meeting = require('../../../models/Meeting');
const User = require('../../../models/User');
const { testUsers, testMeetings, createObjectId } = require('../../fixtures/testData');

describe('Meeting Model', () => {
  let organizer;

  beforeEach(async () => {
    organizer = await User.create(testUsers.admin);
  });

  describe('Validation', () => {
    it('should create a valid meeting', async () => {
      const meetingData = {
        ...testMeetings.scheduled,
        organizer: organizer._id,
        attendees: [organizer._id]
      };
      
      const meeting = new Meeting(meetingData);
      const savedMeeting = await meeting.save();
      
      expect(savedMeeting._id).toBeDefined();
      expect(savedMeeting.title).toBe(meetingData.title);
      expect(savedMeeting.organizer.toString()).toBe(organizer._id.toString());
      expect(savedMeeting.status).toBe('scheduled');
    });

    it('should require title field', async () => {
      const meetingData = { ...testMeetings.scheduled };
      delete meetingData.title;
      
      const meeting = new Meeting(meetingData);
      
      await expect(meeting.save()).rejects.toThrow('Tiêu đề cuộc họp là bắt buộc');
    });

    it('should require startTime field', async () => {
      const meetingData = { ...testMeetings.scheduled };
      delete meetingData.startTime;
      
      const meeting = new Meeting(meetingData);
      
      await expect(meeting.save()).rejects.toThrow('Thời gian bắt đầu là bắt buộc');
    });

    it('should require endTime field', async () => {
      const meetingData = { ...testMeetings.scheduled };
      delete meetingData.endTime;
      
      const meeting = new Meeting(meetingData);
      
      await expect(meeting.save()).rejects.toThrow('Thời gian kết thúc là bắt buộc');
    });

    it('should validate title length', async () => {
      const meetingData = {
        ...testMeetings.scheduled,
        title: 'A'.repeat(201), // Too long
        organizer: organizer._id
      };
      
      const meeting = new Meeting(meetingData);
      
      await expect(meeting.save()).rejects.toThrow('Tiêu đề không được vượt quá 200 ký tự');
    });

    it('should validate description length', async () => {
      const meetingData = {
        ...testMeetings.scheduled,
        description: 'A'.repeat(1001), // Too long
        organizer: organizer._id
      };
      
      const meeting = new Meeting(meetingData);
      
      await expect(meeting.save()).rejects.toThrow('Mô tả không được vượt quá 1000 ký tự');
    });

    it('should validate meeting status enum', async () => {
      const meetingData = {
        ...testMeetings.scheduled,
        status: 'invalid-status',
        organizer: organizer._id
      };
      
      const meeting = new Meeting(meetingData);
      
      await expect(meeting.save()).rejects.toThrow();
    });

    it('should validate meeting type enum', async () => {
      const meetingData = {
        ...testMeetings.scheduled,
        meetingType: 'invalid-type',
        organizer: organizer._id
      };
      
      const meeting = new Meeting(meetingData);
      
      await expect(meeting.save()).rejects.toThrow();
    });

    it('should validate priority enum', async () => {
      const meetingData = {
        ...testMeetings.scheduled,
        priority: 'invalid-priority',
        organizer: organizer._id
      };
      
      const meeting = new Meeting(meetingData);
      
      await expect(meeting.save()).rejects.toThrow();
    });

    it('should validate meeting link format', async () => {
      const meetingData = {
        ...testMeetings.scheduled,
        meetingLink: 'invalid-url',
        organizer: organizer._id
      };
      
      const meeting = new Meeting(meetingData);
      
      await expect(meeting.save()).rejects.toThrow('Link cuộc họp phải là URL hợp lệ');
    });

    it('should accept valid meeting link', async () => {
      const meetingData = {
        ...testMeetings.scheduled,
        meetingLink: 'https://meet.google.com/abc-defg-hij',
        organizer: organizer._id
      };
      
      const meeting = new Meeting(meetingData);
      const savedMeeting = await meeting.save();
      
      expect(savedMeeting.meetingLink).toBe(meetingData.meetingLink);
    });
  });

  describe('Methods', () => {
    let meeting;

    beforeEach(async () => {
      const meetingData = {
        ...testMeetings.scheduled,
        organizer: organizer._id,
        attendees: [organizer._id]
      };
      meeting = await Meeting.create(meetingData);
    });

    it('should check if user is organizer', () => {
      expect(meeting.isOrganizer(organizer._id)).toBe(true);
      expect(meeting.isOrganizer(createObjectId())).toBe(false);
    });

    it('should check if user is attendee', () => {
      expect(meeting.isAttendee(organizer._id)).toBe(true);
      expect(meeting.isAttendee(createObjectId())).toBe(false);
    });

    it('should add attendee', async () => {
      const newUser = await User.create(testUsers.manager);
      
      await meeting.addAttendee(newUser._id);
      
      expect(meeting.attendees).toHaveLength(2);
      expect(meeting.attendees.map(id => id.toString())).toContain(newUser._id.toString());
    });

    it('should not add duplicate attendee', async () => {
      await meeting.addAttendee(organizer._id);
      
      expect(meeting.attendees).toHaveLength(1);
    });

    it('should remove attendee', async () => {
      const newUser = await User.create(testUsers.manager);
      await meeting.addAttendee(newUser._id);
      
      await meeting.removeAttendee(newUser._id);
      
      expect(meeting.attendees).toHaveLength(1);
      expect(meeting.attendees.map(id => id.toString())).not.toContain(newUser._id.toString());
    });

    it('should check if meeting can be edited', () => {
      // Scheduled meeting can be edited
      expect(meeting.canBeEdited()).toBe(true);
      
      // Ongoing meeting cannot be edited
      meeting.status = 'ongoing';
      expect(meeting.canBeEdited()).toBe(false);
      
      // Completed meeting cannot be edited
      meeting.status = 'completed';
      expect(meeting.canBeEdited()).toBe(false);
    });

    it('should check if meeting can be cancelled', () => {
      // Scheduled meeting can be cancelled
      expect(meeting.canBeCancelled()).toBe(true);
      
      // Ongoing meeting cannot be cancelled
      meeting.status = 'ongoing';
      expect(meeting.canBeCancelled()).toBe(false);
      
      // Completed meeting cannot be cancelled
      meeting.status = 'completed';
      expect(meeting.canBeCancelled()).toBe(false);
    });

    it('should get meeting duration in minutes', () => {
      const duration = meeting.getDurationInMinutes();
      expect(duration).toBe(60); // 1 hour difference in test data
    });

    it('should check if meeting is today', () => {
      // Set meeting to today
      meeting.startTime = new Date();
      expect(meeting.isToday()).toBe(true);
      
      // Set meeting to tomorrow
      meeting.startTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
      expect(meeting.isToday()).toBe(false);
    });

    it('should check if meeting is upcoming', () => {
      // Future meeting is upcoming
      meeting.startTime = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
      expect(meeting.isUpcoming()).toBe(true);
      
      // Past meeting is not upcoming
      meeting.startTime = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
      expect(meeting.isUpcoming()).toBe(false);
    });
  });

  describe('Statics', () => {
    beforeEach(async () => {
      // Create test meetings
      await Meeting.create({
        ...testMeetings.scheduled,
        organizer: organizer._id,
        attendees: [organizer._id]
      });
      
      await Meeting.create({
        ...testMeetings.ongoing,
        organizer: organizer._id,
        attendees: [organizer._id]
      });
      
      await Meeting.create({
        ...testMeetings.completed,
        organizer: organizer._id,
        attendees: [organizer._id]
      });
    });

    it('should find meetings by status', async () => {
      const scheduledMeetings = await Meeting.findByStatus('scheduled');
      const ongoingMeetings = await Meeting.findByStatus('ongoing');
      const completedMeetings = await Meeting.findByStatus('completed');
      
      expect(scheduledMeetings).toHaveLength(1);
      expect(ongoingMeetings).toHaveLength(1);
      expect(completedMeetings).toHaveLength(1);
    });

    it('should find meetings by organizer', async () => {
      const meetings = await Meeting.findByOrganizer(organizer._id);
      
      expect(meetings).toHaveLength(3);
      expect(meetings.every(m => m.organizer.toString() === organizer._id.toString())).toBe(true);
    });

    it('should find meetings by attendee', async () => {
      const meetings = await Meeting.findByAttendee(organizer._id);
      
      expect(meetings).toHaveLength(3);
      expect(meetings.every(m => m.attendees.some(id => id.toString() === organizer._id.toString()))).toBe(true);
    });

    it('should find upcoming meetings', async () => {
      const upcomingMeetings = await Meeting.findUpcoming();
      
      expect(upcomingMeetings.length).toBeGreaterThanOrEqual(1);
      expect(upcomingMeetings.every(m => m.startTime > new Date())).toBe(true);
    });

    it('should find meetings by date range', async () => {
      const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday
      const endDate = new Date(Date.now() + 48 * 60 * 60 * 1000); // Day after tomorrow
      
      const meetings = await Meeting.findByDateRange(startDate, endDate);
      
      expect(meetings.length).toBeGreaterThanOrEqual(1);
    });

    it('should get meeting statistics', async () => {
      const stats = await Meeting.getStatistics();
      
      expect(stats.total).toBe(3);
      expect(stats.byStatus.scheduled).toBe(1);
      expect(stats.byStatus.ongoing).toBe(1);
      expect(stats.byStatus.completed).toBe(1);
    });
  });

  describe('Middleware', () => {
    it('should validate end time is after start time', async () => {
      const meetingData = {
        ...testMeetings.scheduled,
        startTime: new Date('2024-01-15T12:00:00Z'),
        endTime: new Date('2024-01-15T10:00:00Z'), // Before start time
        organizer: organizer._id
      };
      
      const meeting = new Meeting(meetingData);
      
      await expect(meeting.save()).rejects.toThrow('Thời gian kết thúc phải sau thời gian bắt đầu');
    });

    it('should update updatedAt on save', async () => {
      const meetingData = {
        ...testMeetings.scheduled,
        organizer: organizer._id
      };
      
      const meeting = await Meeting.create(meetingData);
      const originalUpdatedAt = meeting.updatedAt;
      
      // Wait a bit and update
      await new Promise(resolve => setTimeout(resolve, 10));
      meeting.title = 'Updated Title';
      await meeting.save();
      
      expect(meeting.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });
});
