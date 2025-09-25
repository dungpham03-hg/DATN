/**
 * Logger utility for development and production
 * Provides consistent logging with environment-based control
 */

const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Debug logger - only logs in development
 * @param {string} message - Log message
 * @param {...any} args - Additional arguments
 */
export const debug = (message, ...args) => {
  if (isDevelopment) {
    console.log(`[DEBUG] ${message}`, ...args);
  }
};

/**
 * Info logger - logs in all environments
 * @param {string} message - Log message
 * @param {...any} args - Additional arguments
 */
export const info = (message, ...args) => {
  console.log(`[INFO] ${message}`, ...args);
};

/**
 * Warning logger - logs in all environments
 * @param {string} message - Log message
 * @param {...any} args - Additional arguments
 */
export const warn = (message, ...args) => {
  console.warn(`[WARN] ${message}`, ...args);
};

/**
 * Error logger - logs in all environments
 * @param {string} message - Log message
 * @param {Error} error - Error object
 */
export const error = (message, error = null) => {
  console.error(`[ERROR] ${message}`, error);
};

/**
 * Meeting status logger - specialized for meeting debugging
 * @param {string} context - Context of the log
 * @param {Object} data - Data to log
 */
export const logMeetingStatus = (context, data) => {
  if (isDevelopment) {
    console.log(`[MEETING] ${context}:`, data);
  }
};

/**
 * API logger - specialized for API calls
 * @param {string} method - HTTP method
 * @param {string} endpoint - API endpoint
 * @param {Object} data - Request/response data
 */
export const logApi = (method, endpoint, data = null) => {
  if (isDevelopment) {
    console.log(`[API] ${method} ${endpoint}`, data);
  }
};

export default {
  debug,
  info,
  warn,
  error,
  logMeetingStatus,
  logApi
};
