import { useState, useCallback } from 'react';
import axios from 'axios';

/**
 * Custom hook for Smart Time Slot Finder
 * Provides functionality to find optimal meeting times
 */
const useSmartScheduler = () => {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [error, setError] = useState(null);
  const [metadata, setMetadata] = useState(null);

  /**
   * Find optimal time slots
   */
  const findOptimalSlots = useCallback(async (params) => {
    const {
      attendees,
      duration,
      startDate,
      endDate,
      capacity = 0,
      roomRequired = false,
      topN = 5
    } = params;

    // Validation
    if (!attendees || attendees.length === 0) {
      setError('Vui lòng chọn người tham dự');
      return { success: false, error: 'Vui lòng chọn người tham dự' };
    }

    if (!duration || duration < 15) {
      setError('Thời lượng tối thiểu là 15 phút');
      return { success: false, error: 'Thời lượng tối thiểu là 15 phút' };
    }

    setLoading(true);
    setError(null);
    setSuggestions([]);

    try {
      console.log('🎯 Requesting optimal time slots:', params);

      const response = await axios.post('/api/meetings/suggest-times', {
        attendees,
        duration,
        startDate: startDate || new Date().toISOString(),
        endDate: endDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        capacity,
        roomRequired,
        topN
      });

      console.log('✅ Received suggestions:', response.data);

      setSuggestions(response.data.suggestions || []);
      setMetadata(response.data.metadata);

      return {
        success: true,
        suggestions: response.data.suggestions || [],
        metadata: response.data.metadata,
        message: response.data.message
      };

    } catch (err) {
      console.error('❌ Error finding optimal slots:', err);
      
      const errorMessage = err.response?.data?.message || 
                          err.message || 
                          'Lỗi khi tìm khung giờ tối ưu';
      
      setError(errorMessage);
      setSuggestions([]);

      return {
        success: false,
        error: errorMessage
      };

    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Find alternative time slots for existing meeting
   */
  const findAlternativeSlots = useCallback(async (meetingId, options = {}) => {
    const { topN = 5, roomRequired = false } = options;

    if (!meetingId) {
      setError('Meeting ID is required');
      return { success: false, error: 'Meeting ID is required' };
    }

    setLoading(true);
    setError(null);
    setSuggestions([]);

    try {
      console.log('🔄 Requesting alternative time slots for:', meetingId);

      const response = await axios.post(
        `/api/meetings/${meetingId}/suggest-alternatives`,
        { topN, roomRequired }
      );

      console.log('✅ Received alternatives:', response.data);

      setSuggestions(response.data.suggestions || []);

      return {
        success: true,
        suggestions: response.data.suggestions || [],
        original: response.data.original,
        message: response.data.message
      };

    } catch (err) {
      console.error('❌ Error finding alternatives:', err);
      
      const errorMessage = err.response?.data?.message || 
                          err.message || 
                          'Lỗi khi tìm thời gian thay thế';
      
      setError(errorMessage);
      setSuggestions([]);

      return {
        success: false,
        error: errorMessage
      };

    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Check availability of attendees at specific time
   */
  const checkAvailability = useCallback(async (attendees, startTime, endTime) => {
    if (!attendees || attendees.length === 0) {
      return { success: false, error: 'Attendees required' };
    }

    if (!startTime || !endTime) {
      return { success: false, error: 'Start and end time required' };
    }

    try {
      const response = await axios.post('/api/meetings/check-availability', {
        attendees,
        startTime,
        endTime
      });

      return {
        success: true,
        allAvailable: response.data.allAvailable,
        availableCount: response.data.availableCount,
        totalCount: response.data.totalCount,
        availability: response.data.availability
      };

    } catch (err) {
      console.error('Error checking availability:', err);
      return {
        success: false,
        error: err.response?.data?.message || 'Error checking availability'
      };
    }
  }, []);

  /**
   * Clear suggestions and errors
   */
  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
    setError(null);
    setMetadata(null);
  }, []);

  /**
   * Format suggestion for display
   */
  const formatSuggestion = useCallback((suggestion) => {
    const startTime = new Date(suggestion.startTime);
    const endTime = new Date(suggestion.endTime);

    const dateStr = startTime.toLocaleDateString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const timeStr = `${startTime.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit'
    })} - ${endTime.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit'
    })}`;

    return {
      ...suggestion,
      dateStr,
      timeStr,
      formattedStartTime: startTime,
      formattedEndTime: endTime
    };
  }, []);

  return {
    loading,
    suggestions,
    error,
    metadata,
    findOptimalSlots,
    findAlternativeSlots,
    checkAvailability,
    clearSuggestions,
    formatSuggestion
  };
};

export default useSmartScheduler;

