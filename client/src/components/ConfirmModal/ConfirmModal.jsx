import React from 'react';

import './ConfirmModal.css';

const ConfirmModal = ({ 
  show, 
  onHide, 
  onConfirm, 
  title = "Xác nhận", 
  message, 
  confirmText = "Xác nhận", 
  cancelText = "Hủy bỏ",
  variant = "danger",
  icon = "⚠️"
}) => {
  return (
    <Modal 
      show={show} 
      onHide={onHide} 
      centered 
      backdrop="static"
      className="confirm-modal"
      size="sm"
    >
      <Modal.Body className="text-center p-4">
        <div className="confirm-icon mb-3">
          <span className="icon-emoji">{icon}</span>
        </div>
        
        <h5 className="confirm-title mb-3">{title}</h5>
        
        <p className="confirm-message text-muted mb-4">
          {message}
        </p>
        
        <div className="confirm-actions d-grid gap-2">
          <Button 
            variant={variant}
            onClick={onConfirm}
            className="confirm-btn"
          >
            {confirmText}
          </Button>
          
          <Button 
            variant="outline-secondary"
            onClick={onHide}
            className="cancel-btn"
          >
            {cancelText}
          </Button>
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default ConfirmModal; 