import axios from 'axios';
import { toast } from './toast';


// Tạo một instance của globalLoading để có thể sử dụng ở ngoài React component
let globalLoadingInstance = null;

// Hàm để set instance của global loading
export const setGlobalLoadingInstance = (instance) => {
  globalLoadingInstance = instance;
};

// Higher-order function để wrap API calls với global loading
export const withGlobalLoading = (apiFunction, options = {}) => {
  const {
    loadingText = 'Đang xử lý...',
    loadingType = 'default',
    showErrorToast = true,
    autoRetry = false,
    retryCount = 1,
    retryDelay = 2000
  } = options;

  return async (...args) => {
    if (!globalLoadingInstance) {
      console.warn('Global loading instance chưa được khởi tạo');
      return await apiFunction(...args);
    }

    let attempts = 0;
    const maxAttempts = autoRetry ? retryCount + 1 : 1;

    while (attempts < maxAttempts) {
      try {
        globalLoadingInstance.showLoading(loadingText, loadingType);
        const result = await apiFunction(...args);
        
        // Thành công
        globalLoadingInstance.hideLoading();
        return result;
        
      } catch (error) {
        attempts++;
        const isLastAttempt = attempts >= maxAttempts;
        const isServerError = error.response?.status >= 500 || !error.response;
        const isNetworkError = !error.response;

        console.error(`API Call Attempt ${attempts}:`, error);

        if (isServerError || isNetworkError) {
          // Lỗi server hoặc network
          if (isLastAttempt) {
            globalLoadingInstance.showErrorLoading(
              'Lỗi kết nối. Vui lòng thử lại sau...'
            );
            
            if (showErrorToast) {
              toast.error('Không thể kết nối đến server. Vui lòng thử lại sau.');
            }
            
            // Tự động ẩn sau 3 giây
            setTimeout(() => {
              globalLoadingInstance.hideLoading();
            }, 3000);
          } else {
            // Còn lần thử, hiển thị loading retry
            globalLoadingInstance.showErrorLoading(
              `Đang thử lại... (${attempts}/${maxAttempts - 1})`
            );
            
            // Đợi trước khi thử lại
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            continue; // Thử lại
          }
        } else {
          // Lỗi client (4xx)
          globalLoadingInstance.hideLoading();
          
          if (showErrorToast) {
            const errorMessage = error.response?.data?.message || 'Có lỗi xảy ra';
            toast.error(errorMessage);
          }
        }

        // Ném lỗi cho component xử lý
        throw error;
      }
    }
  };
};

// Hàm tiện ích để tạo API call với loading
export const createApiCall = (apiFunction, options = {}) => {
  return withGlobalLoading(apiFunction, options);
};

// Hàm để xử lý form submission với loading
export const handleFormSubmission = async (
  submitFunction, 
  options = {
    loadingText: 'Đang lưu...',
    successMessage: 'Lưu thành công!',
    showSuccessToast: true
  }
) => {
  const { loadingText, successMessage, showSuccessToast } = options;
  
  const wrappedFunction = withGlobalLoading(submitFunction, {
    loadingText,
    showErrorToast: true
  });

  try {
    const result = await wrappedFunction();
    
    if (showSuccessToast) {
      toast.success(successMessage);
    }
    
    return result;
  } catch (error) {
    // Lỗi đã được xử lý trong withGlobalLoading
    throw error;
  }
};

// Preset cho các loại API calls thường dùng
export const apiPresets = {
  // Cho việc tải dữ liệu
  loading: (apiFunction) => withGlobalLoading(apiFunction, {
    loadingText: 'Đang tải dữ liệu...',
    autoRetry: true,
    retryCount: 2
  }),

  // Cho việc lưu dữ liệu
  saving: (apiFunction) => withGlobalLoading(apiFunction, {
    loadingText: 'Đang lưu...',
    loadingType: 'default'
  }),

  // Cho việc xóa dữ liệu
  deleting: (apiFunction) => withGlobalLoading(apiFunction, {
    loadingText: 'Đang xóa...',
    loadingType: 'warning'
  }),

  // Cho việc upload file
  uploading: (apiFunction) => withGlobalLoading(apiFunction, {
    loadingText: 'Đang tải lên...',
    autoRetry: false
  }),

  // Cho việc kết nối đến service khác
  connecting: (apiFunction) => withGlobalLoading(apiFunction, {
    loadingText: 'Đang kết nối...',
    autoRetry: true,
    retryCount: 3,
    retryDelay: 1500
  })
};

// Export default với các hàm chính
export default {
  withGlobalLoading,
  createApiCall,
  handleFormSubmission,
  apiPresets,
  setGlobalLoadingInstance
}; 