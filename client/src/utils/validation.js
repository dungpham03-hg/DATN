import { REGEX_PATTERNS, ERROR_MESSAGES } from '../constants';

/**
 * Validation utility functions
 */

/**
 * Validate email address
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid
 */
export const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  return REGEX_PATTERNS.EMAIL.test(email.trim());
};

/**
 * Validate phone number
 * @param {string} phone - Phone number to validate
 * @returns {boolean} - True if valid
 */
export const isValidPhone = (phone) => {
  if (!phone || typeof phone !== 'string') return false;
  return REGEX_PATTERNS.PHONE.test(phone.trim());
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {boolean} - True if valid
 */
export const isValidPassword = (password) => {
  if (!password || typeof password !== 'string') return false;
  return REGEX_PATTERNS.PASSWORD.test(password);
};

/**
 * Validate username
 * @param {string} username - Username to validate
 * @returns {boolean} - True if valid
 */
export const isValidUsername = (username) => {
  if (!username || typeof username !== 'string') return false;
  return REGEX_PATTERNS.USERNAME.test(username.trim());
};

/**
 * Validate required field
 * @param {any} value - Value to validate
 * @returns {boolean} - True if valid
 */
export const isRequired = (value) => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
};

/**
 * Validate minimum length
 * @param {string} value - Value to validate
 * @param {number} minLength - Minimum length
 * @returns {boolean} - True if valid
 */
export const hasMinLength = (value, minLength) => {
  if (!value || typeof value !== 'string') return false;
  return value.trim().length >= minLength;
};

/**
 * Validate maximum length
 * @param {string} value - Value to validate
 * @param {number} maxLength - Maximum length
 * @returns {boolean} - True if valid
 */
export const hasMaxLength = (value, maxLength) => {
  if (!value || typeof value !== 'string') return false;
  return value.trim().length <= maxLength;
};

/**
 * Validate meeting title
 * @param {string} title - Meeting title
 * @returns {Object} - { isValid: boolean, message: string }
 */
export const validateMeetingTitle = (title) => {
  if (!isRequired(title)) {
    return { isValid: false, message: 'Tiêu đề cuộc họp không được để trống' };
  }
  
  if (!hasMinLength(title, 3)) {
    return { isValid: false, message: 'Tiêu đề cuộc họp phải có ít nhất 3 ký tự' };
  }
  
  if (!hasMaxLength(title, 200)) {
    return { isValid: false, message: 'Tiêu đề cuộc họp không được quá 200 ký tự' };
  }
  
  return { isValid: true, message: '' };
};

/**
 * Validate meeting description
 * @param {string} description - Meeting description
 * @returns {Object} - { isValid: boolean, message: string }
 */
export const validateMeetingDescription = (description) => {
  if (!description) {
    return { isValid: true, message: '' }; // Description is optional
  }
  
  if (!hasMaxLength(description, 1000)) {
    return { isValid: false, message: 'Mô tả cuộc họp không được quá 1000 ký tự' };
  }
  
  return { isValid: true, message: '' };
};

/**
 * Validate meeting location
 * @param {string} location - Meeting location
 * @returns {Object} - { isValid: boolean, message: string }
 */
export const validateMeetingLocation = (location) => {
  if (!location) {
    return { isValid: true, message: '' }; // Location is optional
  }
  
  if (!hasMinLength(location, 2)) {
    return { isValid: false, message: 'Địa điểm phải có ít nhất 2 ký tự' };
  }
  
  if (!hasMaxLength(location, 200)) {
    return { isValid: false, message: 'Địa điểm không được quá 200 ký tự' };
  }
  
  return { isValid: true, message: '' };
};

/**
 * Validate meeting date and time
 * @param {string} startTime - Meeting start time
 * @param {string} endTime - Meeting end time
 * @returns {Object} - { isValid: boolean, message: string }
 */
export const validateMeetingDateTime = (startTime, endTime) => {
  if (!startTime || !endTime) {
    return { isValid: false, message: 'Thời gian bắt đầu và kết thúc là bắt buộc' };
  }
  
  const start = new Date(startTime);
  const end = new Date(endTime);
  const now = new Date();
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { isValid: false, message: 'Thời gian không hợp lệ' };
  }
  
  if (start >= end) {
    return { isValid: false, message: 'Thời gian kết thúc phải sau thời gian bắt đầu' };
  }
  
  if (start < now) {
    return { isValid: false, message: 'Thời gian bắt đầu không thể trong quá khứ' };
  }
  
  const duration = end - start;
  const maxDuration = 8 * 60 * 60 * 1000; // 8 hours in milliseconds
  
  if (duration > maxDuration) {
    return { isValid: false, message: 'Cuộc họp không thể kéo dài quá 8 giờ' };
  }
  
  return { isValid: true, message: '' };
};

/**
 * Validate user form
 * @param {Object} userData - User data to validate
 * @returns {Object} - { isValid: boolean, errors: Object }
 */
export const validateUserForm = (userData) => {
  const errors = {};
  
  // Validate full name
  if (!isRequired(userData.fullName)) {
    errors.fullName = 'Họ tên không được để trống';
  } else if (!hasMinLength(userData.fullName, 2)) {
    errors.fullName = 'Họ tên phải có ít nhất 2 ký tự';
  }
  
  // Validate email
  if (!isRequired(userData.email)) {
    errors.email = 'Email không được để trống';
  } else if (!isValidEmail(userData.email)) {
    errors.email = 'Email không hợp lệ';
  }
  
  // Validate phone (optional)
  if (userData.phone && !isValidPhone(userData.phone)) {
    errors.phone = 'Số điện thoại không hợp lệ';
  }
  
  // Validate department (optional)
  if (userData.department && !hasMaxLength(userData.department, 100)) {
    errors.department = 'Tên phòng ban không được quá 100 ký tự';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validate meeting form
 * @param {Object} meetingData - Meeting data to validate
 * @returns {Object} - { isValid: boolean, errors: Object }
 */
export const validateMeetingForm = (meetingData) => {
  const errors = {};
  
  // Validate title
  const titleValidation = validateMeetingTitle(meetingData.title);
  if (!titleValidation.isValid) {
    errors.title = titleValidation.message;
  }
  
  // Validate description
  const descriptionValidation = validateMeetingDescription(meetingData.description);
  if (!descriptionValidation.isValid) {
    errors.description = descriptionValidation.message;
  }
  
  // Validate location
  const locationValidation = validateMeetingLocation(meetingData.location);
  if (!locationValidation.isValid) {
    errors.location = locationValidation.message;
  }
  
  // Validate date and time
  const dateTimeValidation = validateMeetingDateTime(meetingData.startTime, meetingData.endTime);
  if (!dateTimeValidation.isValid) {
    errors.startTime = dateTimeValidation.message;
    errors.endTime = dateTimeValidation.message;
  }
  
  // Validate participants
  if (!meetingData.participants || meetingData.participants.length === 0) {
    errors.participants = 'Cuộc họp phải có ít nhất 1 người tham gia';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Sanitize string input
 * @param {string} input - Input to sanitize
 * @returns {string} - Sanitized input
 */
export const sanitizeString = (input) => {
  if (!input || typeof input !== 'string') return '';
  return input.trim().replace(/[<>]/g, '');
};

/**
 * Sanitize HTML content
 * @param {string} html - HTML content to sanitize
 * @returns {string} - Sanitized HTML
 */
export const sanitizeHtml = (html) => {
  if (!html || typeof html !== 'string') return '';
  
  // Basic HTML sanitization - remove script tags and dangerous attributes
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/javascript:/gi, '');
};

export default {
  isValidEmail,
  isValidPhone,
  isValidPassword,
  isValidUsername,
  isRequired,
  hasMinLength,
  hasMaxLength,
  validateMeetingTitle,
  validateMeetingDescription,
  validateMeetingLocation,
  validateMeetingDateTime,
  validateUserForm,
  validateMeetingForm,
  sanitizeString,
  sanitizeHtml
};
