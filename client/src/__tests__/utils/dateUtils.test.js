import {
  formatDate,
  formatTime,
  formatDateTime,
  isToday,
  isTomorrow,
  isThisWeek,
  getRelativeTime,
  addDays,
  subtractDays,
  isBetween,
  formatDuration
} from '../../utils/dateUtils';

describe('dateUtils', () => {
  const testDate = new Date('2024-01-15T10:30:00Z');
  const today = new Date();

  describe('formatDate', () => {
    it('formats date correctly with default format', () => {
      const result = formatDate(testDate);
      expect(result).toBe('15/01/2024');
    });

    it('formats date with custom format', () => {
      const result = formatDate(testDate, 'dd-MM-yyyy');
      expect(result).toBe('15-01-2024');
    });

    it('handles invalid date', () => {
      const result = formatDate(null);
      expect(result).toBe('');
    });

    it('handles string date input', () => {
      const result = formatDate('2024-01-15');
      expect(result).toBe('15/01/2024');
    });
  });

  describe('formatTime', () => {
    it('formats time correctly with default format', () => {
      const result = formatTime(testDate);
      expect(result).toBe('10:30');
    });

    it('formats time with seconds', () => {
      const result = formatTime(testDate, 'HH:mm:ss');
      expect(result).toBe('10:30:00');
    });

    it('formats time in 12-hour format', () => {
      const result = formatTime(testDate, 'h:mm a');
      expect(result).toBe('10:30 AM');
    });

    it('handles invalid time', () => {
      const result = formatTime(null);
      expect(result).toBe('');
    });
  });

  describe('formatDateTime', () => {
    it('formats datetime correctly', () => {
      const result = formatDateTime(testDate);
      expect(result).toBe('15/01/2024 10:30');
    });

    it('formats datetime with custom format', () => {
      const result = formatDateTime(testDate, 'dd/MM/yyyy HH:mm:ss');
      expect(result).toBe('15/01/2024 10:30:00');
    });
  });

  describe('isToday', () => {
    it('returns true for today\'s date', () => {
      const result = isToday(today);
      expect(result).toBe(true);
    });

    it('returns false for yesterday', () => {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const result = isToday(yesterday);
      expect(result).toBe(false);
    });

    it('returns false for tomorrow', () => {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const result = isToday(tomorrow);
      expect(result).toBe(false);
    });
  });

  describe('isTomorrow', () => {
    it('returns true for tomorrow\'s date', () => {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const result = isTomorrow(tomorrow);
      expect(result).toBe(true);
    });

    it('returns false for today', () => {
      const result = isTomorrow(today);
      expect(result).toBe(false);
    });

    it('returns false for day after tomorrow', () => {
      const dayAfter = new Date(today);
      dayAfter.setDate(dayAfter.getDate() + 2);
      const result = isTomorrow(dayAfter);
      expect(result).toBe(false);
    });
  });

  describe('isThisWeek', () => {
    it('returns true for dates in current week', () => {
      const result = isThisWeek(today);
      expect(result).toBe(true);
    });

    it('returns false for dates in next week', () => {
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 8);
      const result = isThisWeek(nextWeek);
      expect(result).toBe(false);
    });
  });

  describe('getRelativeTime', () => {
    it('returns "Hôm nay" for today', () => {
      const result = getRelativeTime(today);
      expect(result).toBe('Hôm nay');
    });

    it('returns "Ngày mai" for tomorrow', () => {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const result = getRelativeTime(tomorrow);
      expect(result).toBe('Ngày mai');
    });

    it('returns "Hôm qua" for yesterday', () => {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const result = getRelativeTime(yesterday);
      expect(result).toBe('Hôm qua');
    });

    it('returns formatted date for other dates', () => {
      const otherDate = new Date('2024-01-15');
      const result = getRelativeTime(otherDate);
      expect(result).toBe('15/01/2024');
    });
  });

  describe('addDays', () => {
    it('adds days correctly', () => {
      const result = addDays(testDate, 5);
      expect(result.getDate()).toBe(20);
    });

    it('handles month overflow', () => {
      const endOfMonth = new Date('2024-01-31');
      const result = addDays(endOfMonth, 1);
      expect(result.getMonth()).toBe(1); // February
      expect(result.getDate()).toBe(1);
    });
  });

  describe('subtractDays', () => {
    it('subtracts days correctly', () => {
      const result = subtractDays(testDate, 5);
      expect(result.getDate()).toBe(10);
    });

    it('handles month underflow', () => {
      const startOfMonth = new Date('2024-02-01');
      const result = subtractDays(startOfMonth, 1);
      expect(result.getMonth()).toBe(0); // January
      expect(result.getDate()).toBe(31);
    });
  });

  describe('isBetween', () => {
    const startDate = new Date('2024-01-10');
    const endDate = new Date('2024-01-20');

    it('returns true for date between start and end', () => {
      const result = isBetween(testDate, startDate, endDate);
      expect(result).toBe(true);
    });

    it('returns false for date before start', () => {
      const beforeStart = new Date('2024-01-05');
      const result = isBetween(beforeStart, startDate, endDate);
      expect(result).toBe(false);
    });

    it('returns false for date after end', () => {
      const afterEnd = new Date('2024-01-25');
      const result = isBetween(afterEnd, startDate, endDate);
      expect(result).toBe(false);
    });

    it('returns true for start date when inclusive', () => {
      const result = isBetween(startDate, startDate, endDate, true);
      expect(result).toBe(true);
    });

    it('returns true for end date when inclusive', () => {
      const result = isBetween(endDate, startDate, endDate, true);
      expect(result).toBe(true);
    });
  });

  describe('formatDuration', () => {
    it('formats duration in minutes correctly', () => {
      const start = new Date('2024-01-15T10:00:00Z');
      const end = new Date('2024-01-15T10:30:00Z');
      const result = formatDuration(start, end);
      expect(result).toBe('30 phút');
    });

    it('formats duration in hours correctly', () => {
      const start = new Date('2024-01-15T10:00:00Z');
      const end = new Date('2024-01-15T12:00:00Z');
      const result = formatDuration(start, end);
      expect(result).toBe('2 giờ');
    });

    it('formats duration in hours and minutes correctly', () => {
      const start = new Date('2024-01-15T10:00:00Z');
      const end = new Date('2024-01-15T11:30:00Z');
      const result = formatDuration(start, end);
      expect(result).toBe('1 giờ 30 phút');
    });

    it('handles same start and end time', () => {
      const result = formatDuration(testDate, testDate);
      expect(result).toBe('0 phút');
    });
  });
});
