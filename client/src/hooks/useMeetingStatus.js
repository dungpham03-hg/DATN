import { useMemo } from 'react';
import { MEETING_STATUS } from '../constants';
import { logMeetingStatus } from '../utils/logger';

/**
 * Custom hook for meeting status calculations
 * @param {string} startTime - Meeting start time
 * @param {string} endTime - Meeting end time
 * @returns {Object} - Meeting status information
 */
export const useMeetingStatus = (startTime, endTime) => {
  return useMemo(() => {
    if (!startTime || !endTime) {
      return {
        status: MEETING_STATUS.UPCOMING,
        isUpcoming: true,
        isOngoing: false,
        isCompleted: false,
        timeUntilStart: null,
        timeUntilEnd: null
      };
    }

    const now = new Date();
    const start = new Date(startTime);
    const end = new Date(endTime);

    const timeUntilStart = start - now;
    const timeUntilEnd = end - now;

    let status;
    let isUpcoming = false;
    let isOngoing = false;
    let isCompleted = false;

    if (now < start) {
      status = MEETING_STATUS.UPCOMING;
      isUpcoming = true;
    } else if (now >= start && now <= end) {
      status = MEETING_STATUS.ONGOING;
      isOngoing = true;
    } else {
      status = MEETING_STATUS.COMPLETED;
      isCompleted = true;
    }

    const result = {
      status,
      isUpcoming,
      isOngoing,
      isCompleted,
      timeUntilStart: timeUntilStart > 0 ? timeUntilStart : null,
      timeUntilEnd: timeUntilEnd > 0 ? timeUntilEnd : null,
      startTime: start,
      endTime: end,
      duration: end - start
    };

    // Log meeting status in development
    logMeetingStatus('Status calculated', {
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      now: now.toISOString(),
      status,
      timeUntilStart: timeUntilStart,
      timeUntilEnd: timeUntilEnd
    });

    return result;
  }, [startTime, endTime]);
};

/**
 * Hook for filtering meetings by status
 * @param {Array} meetings - Array of meetings
 * @param {string} filterStatus - Status to filter by
 * @returns {Array} - Filtered meetings
 */
export const useMeetingFilter = (meetings, filterStatus) => {
  return useMemo(() => {
    if (!meetings || !Array.isArray(meetings)) {
      return [];
    }

    if (!filterStatus || filterStatus === 'all') {
      return meetings;
    }

    return meetings.filter(meeting => {
      const { status } = useMeetingStatus(meeting.startTime, meeting.endTime);
      return status === filterStatus;
    });
  }, [meetings, filterStatus]);
};

/**
 * Hook for searching meetings
 * @param {Array} meetings - Array of meetings
 * @param {string} searchTerm - Search term
 * @returns {Array} - Filtered meetings
 */
export const useMeetingSearch = (meetings, searchTerm) => {
  return useMemo(() => {
    if (!meetings || !Array.isArray(meetings)) {
      return [];
    }

    if (!searchTerm || searchTerm.trim() === '') {
      return meetings;
    }

    const term = searchTerm.toLowerCase().trim();
    
    return meetings.filter(meeting => 
      meeting.title?.toLowerCase().includes(term) ||
      meeting.description?.toLowerCase().includes(term) ||
      meeting.location?.toLowerCase().includes(term) ||
      meeting.organizer?.fullName?.toLowerCase().includes(term)
    );
  }, [meetings, searchTerm]);
};

/**
 * Hook for sorting meetings
 * @param {Array} meetings - Array of meetings
 * @param {string} sortBy - Sort field ('startTime', 'title', 'status')
 * @param {string} sortOrder - Sort order ('asc', 'desc')
 * @returns {Array} - Sorted meetings
 */
export const useMeetingSort = (meetings, sortBy = 'startTime', sortOrder = 'desc') => {
  return useMemo(() => {
    if (!meetings || !Array.isArray(meetings)) {
      return [];
    }

    const sorted = [...meetings].sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case 'startTime':
          aValue = new Date(a.startTime);
          bValue = new Date(b.startTime);
          break;
        case 'title':
          aValue = a.title?.toLowerCase() || '';
          bValue = b.title?.toLowerCase() || '';
          break;
        case 'status':
          const aStatus = useMeetingStatus(a.startTime, a.endTime).status;
          const bStatus = useMeetingStatus(b.startTime, b.endTime).status;
          aValue = aStatus;
          bValue = bStatus;
          break;
        default:
          aValue = a[sortBy] || '';
          bValue = b[sortBy] || '';
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return sorted;
  }, [meetings, sortBy, sortOrder]);
};

export default useMeetingStatus;
