import { useState, useCallback } from 'react';
import { API_CONFIG, ERROR_MESSAGES } from '../constants';
import { error } from '../utils/logger';

/**
 * Custom hook for API calls with loading, error, and retry logic
 * @param {Function} apiFunction - The API function to call
 * @returns {Object} - { data, loading, error, execute, retry }
 */
export const useApiCall = (apiFunction) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const execute = useCallback(async (...args) => {
    setLoading(true);
    setApiError(null);

    try {
      const result = await apiFunction(...args);
      setData(result);
      setRetryCount(0);
      return result;
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || ERROR_MESSAGES.GENERIC_ERROR;
      setApiError(errorMessage);
      error('API call failed', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiFunction]);

  const retry = useCallback(async (...args) => {
    if (retryCount < API_CONFIG.RETRY_ATTEMPTS) {
      setRetryCount(prev => prev + 1);
      return execute(...args);
    }
    throw new Error('Maximum retry attempts reached');
  }, [execute, retryCount]);

  const reset = useCallback(() => {
    setData(null);
    setApiError(null);
    setRetryCount(0);
  }, []);

  return {
    data,
    loading,
    error: apiError,
    execute,
    retry,
    reset,
    retryCount
  };
};

/**
 * Hook for handling API calls with automatic error handling
 * @param {Function} apiFunction - The API function to call
 * @returns {Function} - Enhanced API function
 */
export const useApiHandler = (apiFunction) => {
  return useCallback(async (...args) => {
    try {
      return await apiFunction(...args);
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || ERROR_MESSAGES.GENERIC_ERROR;
      error('API call failed', err);
      throw new Error(errorMessage);
    }
  }, [apiFunction]);
};

export default useApiCall;