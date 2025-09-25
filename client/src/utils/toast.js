import { enqueueSnackbar, closeSnackbar } from 'notistack';

// Toast utility functions để thay thế react-toastify
export const toast = {
  success: (message, options = {}) => {
    enqueueSnackbar(message, {
      variant: 'success',
      autoHideDuration: 4000,
      preventDuplicate: true,
      ...options
    });
  },

  error: (message, options = {}) => {
    enqueueSnackbar(message, {
      variant: 'error',
      autoHideDuration: 6000,
      preventDuplicate: true,
      ...options
    });
  },

  warning: (message, options = {}) => {
    enqueueSnackbar(message, {
      variant: 'warning',
      autoHideDuration: 5000,
      preventDuplicate: true,
      ...options
    });
  },

  info: (message, options = {}) => {
    enqueueSnackbar(message, {
      variant: 'info',
      autoHideDuration: 4000,
      preventDuplicate: true,
      ...options
    });
  },

  default: (message, options = {}) => {
    enqueueSnackbar(message, {
      variant: 'default',
      autoHideDuration: 4000,
      preventDuplicate: true,
      ...options
    });
  },

  // Method để dismiss tất cả snackbars
  dismiss: (key) => {
    if (key) {
      closeSnackbar(key);
    } else {
      // Close all snackbars nếu không có key cụ thể
      closeSnackbar();
    }
  }
};

// Compatibility aliases để dễ dàng migrate từ react-toastify
export const showSuccessToast = toast.success;
export const showErrorToast = toast.error;
export const showWarningToast = toast.warning;
export const showInfoToast = toast.info;

export default toast;
