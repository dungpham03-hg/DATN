import { DATE_FORMATS } from '../constants';

/**
 * Format date to Vietnamese locale
 * @param {string|Date} date - Date to format
 * @param {string} format - Format type
 * @returns {string} - Formatted date string
 */
export const formatDate = (date, format = DATE_FORMATS.DISPLAY) => {
  if (!date) return '';
  
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return '';

  const options = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  };

  return dateObj.toLocaleDateString('vi-VN', options);
};

/**
 * Format date with time
 * @param {string|Date} date - Date to format
 * @returns {string} - Formatted date and time string
 */
export const formatDateTime = (date) => {
  if (!date) return '';
  
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return '';

  return dateObj.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Format time only
 * @param {string|Date} date - Date to format
 * @returns {string} - Formatted time string
 */
export const formatTime = (date) => {
  if (!date) return '';
  
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return '';

  return dateObj.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Get relative time (e.g., "2 hours ago", "in 3 days")
 * @param {string|Date} date - Date to compare
 * @returns {string} - Relative time string
 */
export const getRelativeTime = (date) => {
  if (!date) return '';
  
  const dateObj = new Date(date);
  const now = new Date();
  const diff = dateObj - now;
  const diffInMinutes = Math.floor(diff / (1000 * 60));
  const diffInHours = Math.floor(diff / (1000 * 60 * 60));
  const diffInDays = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (diffInMinutes < 60) {
    if (diffInMinutes <= 0) return 'Vừa xong';
    return `${diffInMinutes} phút trước`;
  } else if (diffInHours < 24) {
    return `${diffInHours} giờ trước`;
  } else if (diffInDays < 7) {
    return `${diffInDays} ngày trước`;
  } else {
    return formatDate(date);
  }
};

/**
 * Get meeting status based on start and end time
 * @param {string|Date} startTime - Meeting start time
 * @param {string|Date} endTime - Meeting end time
 * @returns {string} - Meeting status
 */
export const getMeetingStatus = (startTime, endTime) => {
  if (!startTime || !endTime) return 'upcoming';
  
  const now = new Date();
  const start = new Date(startTime);
  const end = new Date(endTime);

  if (now < start) {
    return 'upcoming';
  } else if (now >= start && now <= end) {
    return 'ongoing';
  } else {
    return 'completed';
  }
};

/**
 * Check if date is today
 * @param {string|Date} date - Date to check
 * @returns {boolean} - True if date is today
 */
export const isToday = (date) => {
  if (!date) return false;
  
  const dateObj = new Date(date);
  const today = new Date();
  
  return dateObj.toDateString() === today.toDateString();
};

/**
 * Check if date is tomorrow
 * @param {string|Date} date - Date to check
 * @returns {boolean} - True if date is tomorrow
 */
export const isTomorrow = (date) => {
  if (!date) return false;
  
  const dateObj = new Date(date);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  return dateObj.toDateString() === tomorrow.toDateString();
};

/**
 * Check if date is in the past
 * @param {string|Date} date - Date to check
 * @returns {boolean} - True if date is in the past
 */
export const isPast = (date) => {
  if (!date) return false;
  
  const dateObj = new Date(date);
  const now = new Date();
  
  return dateObj < now;
};

/**
 * Check if date is in the future
 * @param {string|Date} date - Date to check
 * @returns {boolean} - True if date is in the future
 */
export const isFuture = (date) => {
  if (!date) return false;
  
  const dateObj = new Date(date);
  const now = new Date();
  
  return dateObj > now;
};

/**
 * Get start of day
 * @param {string|Date} date - Date
 * @returns {Date} - Start of day
 */
export const getStartOfDay = (date) => {
  const dateObj = new Date(date);
  dateObj.setHours(0, 0, 0, 0);
  return dateObj;
};

/**
 * Get end of day
 * @param {string|Date} date - Date
 * @returns {Date} - End of day
 */
export const getEndOfDay = (date) => {
  const dateObj = new Date(date);
  dateObj.setHours(23, 59, 59, 999);
  return dateObj;
};

/**
 * Add days to date
 * @param {string|Date} date - Base date
 * @param {number} days - Number of days to add
 * @returns {Date} - New date
 */
export const addDays = (date, days) => {
  const dateObj = new Date(date);
  dateObj.setDate(dateObj.getDate() + days);
  return dateObj;
};

/**
 * Get date range for a period
 * @param {string} period - Period type ('today', 'week', 'month', 'year')
 * @returns {Object} - { start, end }
 */
export const getDateRange = (period) => {
  const now = new Date();
  let start, end;

  switch (period) {
    case 'today':
      start = getStartOfDay(now);
      end = getEndOfDay(now);
      break;
    case 'week':
      start = getStartOfDay(now);
      end = getEndOfDay(addDays(now, 7));
      break;
    case 'month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      break;
    case 'year':
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      break;
    default:
      start = getStartOfDay(now);
      end = getEndOfDay(now);
  }

  return { start, end };
};

export default {
  formatDate,
  formatDateTime,
  formatTime,
  getRelativeTime,
  getMeetingStatus,
  isToday,
  isTomorrow,
  isPast,
  isFuture,
  getStartOfDay,
  getEndOfDay,
  addDays,
  getDateRange
};