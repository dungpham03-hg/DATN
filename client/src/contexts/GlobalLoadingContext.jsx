import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { setGlobalLoadingInstance } from '../utils/apiHandler';

// Tạo context với default value
const GlobalLoadingContext = createContext(null);

// Custom hook để sử dụng context
export const useGlobalLoading = () => {
  const context = useContext(GlobalLoadingContext);
  if (!context) {
    throw new Error('useGlobalLoading phải được sử dụng trong GlobalLoadingProvider');
  }
  return context;
};

// Provider component
export const GlobalLoadingProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Đang xử lý...');
  const [loadingType, setLoadingType] = useState('default'); // default, error, warning

  // Hiển thị loading
  const showLoading = useCallback((text = 'Đang xử lý...', type = 'default') => {
    // Ensure text is always a string
    const safeText = typeof text === 'string' ? text : 'Đang xử lý...';
    setLoadingText(safeText);
    setLoadingType(type);
    setIsLoading(true);
  }, []);

  // Ẩn loading
  const hideLoading = useCallback(() => {
    setIsLoading(false);
  }, []);

  // Hiển thị loading cho lỗi server
  const showErrorLoading = useCallback((text = 'Đang kết nối lại...') => {
    showLoading(text, 'error');
  }, [showLoading]);

  // Hiển thị loading cho cảnh báo
  const showWarningLoading = useCallback((text = 'Đang xử lý yêu cầu...') => {
    showLoading(text, 'warning');
  }, [showLoading]);

  // Thực hiện action với loading
  const withLoading = useCallback(async (
    asyncFunction, 
    loadingText = 'Đang xử lý...', 
    type = 'default'
  ) => {
    let hasError = false;
    let isServerError = false;
    
    try {
      showLoading(loadingText, type);
      const result = await asyncFunction();
      return result;
    } catch (error) {
      hasError = true;
      
      // Nếu là lỗi server (5xx) hoặc network error
      if (error.response?.status >= 500 || !error.response) {
        isServerError = true;
        showErrorLoading('Lỗi kết nối. Đang thử lại...');
        
        // Thử lại sau 3 giây
        setTimeout(() => {
          hideLoading();
        }, 3000);
      } else {
        hideLoading();
      }
      throw error;
    } finally {
      // Chỉ hide loading nếu không có lỗi hoặc không phải lỗi server
      if (!hasError || !isServerError) {
        setTimeout(() => {
          hideLoading();
        }, 500); // Delay nhỏ để UX mượt mà hơn
      }
    }
  }, [showLoading, showErrorLoading, hideLoading]);

  // Set instance để sử dụng trong apiHandler
  useEffect(() => {
    const instance = {
      showLoading,
      hideLoading,
      showErrorLoading,
      showWarningLoading
    };
    
    setGlobalLoadingInstance(instance);
    
    // Cleanup khi unmount
    return () => {
      setGlobalLoadingInstance(null);
    };
  }, [showLoading, hideLoading, showErrorLoading, showWarningLoading]);

  const value = {
    isLoading,
    loadingText,
    loadingType,
    showLoading,
    hideLoading,
    showErrorLoading,
    showWarningLoading,
    withLoading
  };

  return (
    <GlobalLoadingContext.Provider value={value}>
      {children}
    </GlobalLoadingContext.Provider>
  );
}; 