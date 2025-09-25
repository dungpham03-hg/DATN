import { useState, useCallback } from 'react';

const useConfirm = () => {
  const [confirmState, setConfirmState] = useState({
    show: false,
    title: '',
    message: '',
    confirmText: 'Xác nhận',
    cancelText: 'Hủy bỏ',
    variant: 'danger',
    icon: '⚠️',
    onConfirm: null});

  const showConfirm = useCallback((options) => {
    return new Promise((resolve) => {
      setConfirmState({
        show: true,
        title: options.title || 'Xác nhận',
        message: options.message || '',
        confirmText: options.confirmText || 'Xác nhận',
        cancelText: options.cancelText || 'Hủy bỏ',
        variant: options.variant || 'danger',
        icon: options.icon || '⚠️',
        onConfirm: () => {
          hideConfirm();
          resolve(true);
        }});
    });
  }, []);

  const hideConfirm = useCallback(() => {
    setConfirmState(prev => ({ ...prev, show: false }));
  }, []);

  const handleConfirm = useCallback(() => {
    if (confirmState.onConfirm) {
      confirmState.onConfirm();
    }
  }, [confirmState.onConfirm]);

  const handleCancel = useCallback(() => {
    hideConfirm();
  }, [hideConfirm]);

  return {
    confirmState,
    showConfirm,
    hideConfirm,
    handleConfirm,
    handleCancel};
};

export default useConfirm; 