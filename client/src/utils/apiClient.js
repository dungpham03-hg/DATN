import { API_CONFIG, ERROR_MESSAGES } from '../constants';
import { logApi, error } from './logger';

/**
 * Optimized API client with error handling and retry logic
 */
class ApiClient {
  constructor() {
    this.baseURL = API_CONFIG.BASE_URL;
    this.timeout = API_CONFIG.TIMEOUT;
  }

  /**
   * Get authorization headers
   * @param {string} token - Auth token
   * @returns {Object} - Headers object
   */
  getHeaders(token) {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return headers;
  }

  /**
   * Make API request with error handling
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Request options
   * @returns {Promise} - API response
   */
  async request(endpoint, options = {}) {
    const {
      method = 'GET',
      data = null,
      token = null,
      timeout = this.timeout
    } = options;

    const url = `${this.baseURL}${endpoint}`;
    const headers = this.getHeaders(token);

    const config = {
      method,
      headers,
      timeout,
      ...(data && { body: JSON.stringify(data) })
    };

    try {
      logApi(method, endpoint, data);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        ...config,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      error(`API request failed: ${method} ${endpoint}`, err);
      throw err;
    }
  }

  /**
   * GET request
   * @param {string} endpoint - API endpoint
   * @param {string} token - Auth token
   * @returns {Promise} - API response
   */
  async get(endpoint, token = null) {
    return this.request(endpoint, { method: 'GET', token });
  }

  /**
   * POST request
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request data
   * @param {string} token - Auth token
   * @returns {Promise} - API response
   */
  async post(endpoint, data, token = null) {
    return this.request(endpoint, { method: 'POST', data, token });
  }

  /**
   * PUT request
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request data
   * @param {string} token - Auth token
   * @returns {Promise} - API response
   */
  async put(endpoint, data, token = null) {
    return this.request(endpoint, { method: 'PUT', data, token });
  }

  /**
   * PATCH request
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request data
   * @param {string} token - Auth token
   * @returns {Promise} - API response
   */
  async patch(endpoint, data, token = null) {
    return this.request(endpoint, { method: 'PATCH', data, token });
  }

  /**
   * DELETE request
   * @param {string} endpoint - API endpoint
   * @param {string} token - Auth token
   * @returns {Promise} - API response
   */
  async delete(endpoint, token = null) {
    return this.request(endpoint, { method: 'DELETE', token });
  }

  /**
   * Upload file
   * @param {string} endpoint - API endpoint
   * @param {FormData} formData - Form data with file
   * @param {string} token - Auth token
   * @param {Function} onProgress - Progress callback
   * @returns {Promise} - API response
   */
  async upload(endpoint, formData, token = null, onProgress = null) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {};

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    try {
      const xhr = new XMLHttpRequest();

      return new Promise((resolve, reject) => {
        xhr.upload.addEventListener('progress', (event) => {
          if (onProgress && event.lengthComputable) {
            const progress = (event.loaded / event.total) * 100;
            onProgress(progress);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response);
            } catch (err) {
              resolve(xhr.responseText);
            }
          } else {
            reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Upload failed'));
        });

        xhr.addEventListener('abort', () => {
          reject(new Error('Upload cancelled'));
        });

        xhr.open('POST', url);
        
        // Set headers
        Object.keys(headers).forEach(key => {
          xhr.setRequestHeader(key, headers[key]);
        });

        xhr.send(formData);
      });
    } catch (err) {
      error(`File upload failed: ${endpoint}`, err);
      throw err;
    }
  }
}

// Create singleton instance
const apiClient = new ApiClient();

export default apiClient;
