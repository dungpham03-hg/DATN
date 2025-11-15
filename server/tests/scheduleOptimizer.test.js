const {
  generateTimeSlots,
  calculateSlotScore,
  findOptimalTimeSlots
} = require('../utils/scheduleOptimizer');

describe('Schedule Optimizer', () => {
  describe('generateTimeSlots', () => {
    it('should generate time slots within working hours', () => {
      const startDate = new Date('2024-01-15T00:00:00');
      const endDate = new Date('2024-01-15T23:59:59');
      const duration = 60; // minutes

      const slots = generateTimeSlots(startDate, endDate, duration);

      expect(slots.length).toBeGreaterThan(0);
      
      // Check all slots are within working hours (8h-18h)
      slots.forEach(slot => {
        const hour = slot.startTime.getHours();
        expect(hour).toBeGreaterThanOrEqual(8);
        expect(hour).toBeLessThan(18);
      });
    });

    it('should skip weekends', () => {
      const startDate = new Date('2024-01-13T00:00:00'); // Saturday
      const endDate = new Date('2024-01-14T23:59:59'); // Sunday
      const duration = 60;

      const slots = generateTimeSlots(startDate, endDate, duration);

      // Should have no slots on weekends
      expect(slots.length).toBe(0);
    });

    it('should generate correct duration slots', () => {
      const startDate = new Date('2024-01-15T00:00:00');
      const endDate = new Date('2024-01-15T23:59:59');
      const duration = 60;

      const slots = generateTimeSlots(startDate, endDate, duration);

      slots.forEach(slot => {
        const durationMs = slot.endTime - slot.startTime;
        const durationMin = durationMs / 60000;
        expect(durationMin).toBe(duration);
      });
    });
  });

  describe('calculateSlotScore', () => {
    it('should give higher score to ideal hours (9-11h, 14-16h)', () => {
      const idealSlot = {
        startTime: new Date('2024-01-15T10:00:00'),
        endTime: new Date('2024-01-15T11:00:00'),
        availableCount: 5
      };

      const nonIdealSlot = {
        startTime: new Date('2024-01-15T17:00:00'),
        endTime: new Date('2024-01-15T18:00:00'),
        availableCount: 5
      };

      const idealScore = calculateSlotScore(idealSlot, { totalAttendees: 5 });
      const nonIdealScore = calculateSlotScore(nonIdealSlot, { totalAttendees: 5 });

      expect(idealScore).toBeGreaterThan(nonIdealScore);
    });

    it('should give higher score to mid-week days', () => {
      const tuesday = {
        startTime: new Date('2024-01-16T10:00:00'), // Tuesday
        endTime: new Date('2024-01-16T11:00:00'),
        availableCount: 5
      };

      const friday = {
        startTime: new Date('2024-01-19T10:00:00'), // Friday
        endTime: new Date('2024-01-19T11:00:00'),
        availableCount: 5
      };

      const tuesdayScore = calculateSlotScore(tuesday, { totalAttendees: 5 });
      const fridayScore = calculateSlotScore(friday, { totalAttendees: 5 });

      expect(tuesdayScore).toBeGreaterThan(fridayScore);
    });

    it('should give bonus for exact hours (not :30)', () => {
      const exactHour = {
        startTime: new Date('2024-01-15T10:00:00'),
        endTime: new Date('2024-01-15T11:00:00'),
        availableCount: 5
      };

      const halfHour = {
        startTime: new Date('2024-01-15T10:30:00'),
        endTime: new Date('2024-01-15T11:30:00'),
        availableCount: 5
      };

      const exactScore = calculateSlotScore(exactHour, { totalAttendees: 5 });
      const halfScore = calculateSlotScore(halfHour, { totalAttendees: 5 });

      expect(exactScore).toBeGreaterThanOrEqual(halfScore);
    });

    it('should penalize lunch hours', () => {
      const lunchSlot = {
        startTime: new Date('2024-01-15T12:00:00'),
        endTime: new Date('2024-01-15T13:00:00'),
        availableCount: 5
      };

      const morningSlot = {
        startTime: new Date('2024-01-15T10:00:00'),
        endTime: new Date('2024-01-15T11:00:00'),
        availableCount: 5
      };

      const lunchScore = calculateSlotScore(lunchSlot, { totalAttendees: 5 });
      const morningScore = calculateSlotScore(morningSlot, { totalAttendees: 5 });

      expect(morningScore).toBeGreaterThan(lunchScore);
    });

    it('should give bonus for buffer time', () => {
      const withBuffer = {
        startTime: new Date('2024-01-15T10:00:00'),
        endTime: new Date('2024-01-15T11:00:00'),
        availableCount: 5
      };

      const withoutBuffer = {
        startTime: new Date('2024-01-15T10:00:00'),
        endTime: new Date('2024-01-15T11:00:00'),
        availableCount: 5
      };

      const withBufferScore = calculateSlotScore(withBuffer, {
        totalAttendees: 5,
        hasBufferBefore: true,
        hasBufferAfter: true
      });

      const withoutBufferScore = calculateSlotScore(withoutBuffer, {
        totalAttendees: 5,
        hasBufferBefore: false,
        hasBufferAfter: false
      });

      expect(withBufferScore).toBeGreaterThan(withoutBufferScore);
    });
  });

  describe('findOptimalTimeSlots - Validation', () => {
    it('should throw error if attendees list is empty', async () => {
      await expect(
        findOptimalTimeSlots([], 60)
      ).rejects.toThrow('Attendees list is required');
    });

    it('should throw error if duration is too short', async () => {
      await expect(
        findOptimalTimeSlots(['user1'], 10)
      ).rejects.toThrow('Duration must be between 15 and 480 minutes');
    });

    it('should throw error if duration is too long', async () => {
      await expect(
        findOptimalTimeSlots(['user1'], 500)
      ).rejects.toThrow('Duration must be between 15 and 480 minutes');
    });
  });

  // Note: Integration tests with MongoDB would require setup
  // These are unit tests for the algorithm functions
});

