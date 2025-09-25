import React, { useState, useCallback, useRef } from 'react';

import { FaUpload, FaTrash, FaCamera, FaCrop, FaUndo, FaCheck } from 'react-icons/fa';
import './AvatarUpload.css';

const AvatarUpload = ({ 
  show, 
  onHide, 
  currentAvatar, 
  onUpload, 
  onRemove,
  loading = false,
  userName = ''
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const validateFile = (file) => {
    if (!file) return 'Vui lòng chọn file';
    
    if (!file.type.startsWith('image/')) {
      return 'Vui lòng chọn file ảnh hợp lệ (JPG, PNG, GIF)';
    }
    
    if (file.size > 5 * 1024 * 1024) {
      return 'Kích thước file không được vượt quá 5MB';
    }
    
    return null;
  };

  const processFile = (file) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setSelectedFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploadProgress(0);
      await onUpload(selectedFile, setUploadProgress);
      handleClose();
    } catch (error) {
      setError('Upload failed. Please try again.');
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      await onRemove();
      handleClose();
    } catch (error) {
      setError('Failed to remove avatar. Please try again.');
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setError('');
    setUploadProgress(0);
    setDragActive(false);
    onHide();
  };

  const getCurrentAvatarUrl = () => {
    if (!currentAvatar) return null;
    return currentAvatar.startsWith('/uploads') 
      ? `${process.env.REACT_APP_API_BASE_URL?.replace('/api', '') || 'http://localhost:5000'}${currentAvatar}`
      : currentAvatar;
  };

  return (
    <Modal 
      show={show} 
      onHide={handleClose} 
      centered 
      size="lg"
      className="avatar-upload-modal"
    >
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title className="avatar-modal-title">
          <FaCamera className="me-2" />
          Cập nhật ảnh đại diện
        </Modal.Title>
      </Modal.Header>
      
      <Modal.Body className="px-4 py-3">
        {error && (
          <Alert variant="danger" className="mb-3">
            {error}
          </Alert>
        )}

        <div className="row">
          {/* Current/Preview Avatar */}
          <div className="col-md-5">
            <div className="avatar-preview-section">
              <h6 className="mb-3">Preview</h6>
              <div className="avatar-preview-container">
                <div 
                  className="avatar-preview"
                  style={{
                    backgroundImage: previewUrl ? `url(${previewUrl})` : 
                                   getCurrentAvatarUrl() ? `url(${getCurrentAvatarUrl()})` : 'none'
                  }}
                >
                  {!previewUrl && !currentAvatar && (
                    <span className="avatar-initials">
                      {getInitials(userName)}
                    </span>
                  )}
                </div>
                <div className="avatar-preview-label">
                  {previewUrl ? 'Ảnh mới' : 'Ảnh hiện tại'}
                </div>
              </div>
            </div>
          </div>

          {/* Upload Area */}
          <div className="col-md-7">
            <div className="upload-section">
              <h6 className="mb-3">Chọn ảnh mới</h6>
              
              <div 
                className={`upload-dropzone ${dragActive ? 'drag-active' : ''} ${selectedFile ? 'has-file' : ''}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
                
                <div className="upload-content">
                  {!selectedFile ? (
                    <>
                      <div className="upload-icon">
                        <FaUpload />
                      </div>
                      <div className="upload-text">
                        <p className="upload-main-text">
                          Kéo thả ảnh vào đây hoặc <strong>click để chọn</strong>
                        </p>
                        <p className="upload-hint-text">
                          JPG, PNG, GIF - Tối đa 5MB
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="file-selected">
                        <FaCheck className="check-icon" />
                        <div className="file-info">
                          <p className="file-name">{selectedFile.name}</p>
                          <p className="file-size">
                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <Button 
                        variant="outline-secondary" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFile(null);
                          setPreviewUrl(null);
                        }}
                      >
                        Chọn ảnh khác
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="mt-3">
                  <div className="d-flex justify-content-between mb-1">
                    <small>Đang tải lên...</small>
                    <small>{uploadProgress}%</small>
                  </div>
                  <ProgressBar 
                    now={uploadProgress} 
                    className="upload-progress"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal.Body>

      <Modal.Footer className="border-0 pt-0">
        <div className="d-flex justify-content-between w-100">
          <div>
            {currentAvatar && (
              <Button 
                variant="outline-danger" 
                onClick={handleRemoveAvatar}
                disabled={loading}
                className="remove-avatar-btn"
              >
                <FaTrash className="me-2" />
                Xóa ảnh hiện tại
              </Button>
            )}
          </div>
          
          <div className="d-flex gap-2">
            <Button 
              variant="outline-secondary" 
              onClick={handleClose} 
              disabled={loading}
            >
              Hủy
            </Button>
            <Button 
              variant="primary" 
              onClick={handleUpload} 
              disabled={!selectedFile || loading}
              className="upload-btn"
            >
              <FaUpload className="me-2" />
              {loading ? 'Đang tải lên...' : 'Cập nhật ảnh'}
            </Button>
          </div>
        </div>
      </Modal.Footer>
    </Modal>
  );
};

export default AvatarUpload; 