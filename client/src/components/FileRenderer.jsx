import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, CircularProgress, Alert } from '@mui/material';

const FileRenderer = ({ fileUrl, fileName, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fileContent, setFileContent] = useState(null);
  
  const fileExtension = fileName?.split('.').pop()?.toLowerCase() || '';
  
  useEffect(() => {
    if (!fileUrl) return;
    
    setLoading(true);
    setError(null);
    
    // Xử lý theo loại file
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(fileExtension)) {
      // Image files - load trực tiếp
      setFileContent({ type: 'image', url: fileUrl });
      setLoading(false);
    } else if (fileExtension === 'pdf') {
      // PDF files - dùng iframe
      setFileContent({ type: 'pdf', url: fileUrl });
      setLoading(false);
    } else if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(fileExtension)) {
      // Office files - dùng Google Docs Viewer
      setFileContent({ type: 'office', url: fileUrl });
      setLoading(false);
    } else if (['txt', 'md', 'json', 'xml', 'html', 'css', 'js'].includes(fileExtension)) {
      // Text files - fetch content
      fetch(fileUrl)
        .then(response => {
          if (!response.ok) throw new Error('Không thể tải file');
          return response.text();
        })
        .then(text => {
          setFileContent({ type: 'text', content: text });
          setLoading(false);
        })
        .catch(err => {
          setError(err.message);
          setLoading(false);
        });
    } else {
      // Other files - không hỗ trợ render
      setFileContent({ type: 'unsupported' });
      setLoading(false);
    }
  }, [fileUrl, fileExtension]);

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '400px',
        gap: 2
      }}>
        <CircularProgress />
        <Typography variant="body2" color="text.secondary">
          Đang tải {fileName}...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>Lỗi tải file</Typography>
        <Typography variant="body2" sx={{ mb: 2 }}>{error}</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button 
            size="small" 
            variant="contained" 
            onClick={() => window.open(fileUrl, '_blank')}
          >
            Mở trong tab mới
          </Button>
          <Button 
            size="small" 
            variant="outlined" 
            component="a" 
            href={fileUrl} 
            download
          >
            Tải xuống
          </Button>
        </Box>
      </Alert>
    );
  }

  // Render file content
  const renderContent = () => {
    switch (fileContent?.type) {
      case 'image':
        return (
          <Box sx={{ 
            width: '100%', 
            height: '100%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            p: 2
          }}>
            <img 
              src={fileContent.url}
              alt={fileName}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
              }}
              onError={(e) => {
                setError('Không thể tải hình ảnh');
              }}
            />
          </Box>
        );

      case 'pdf':
        return (
          <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
            <iframe
              src={`${fileContent.url}#view=FitH&toolbar=1&navpanes=1&scrollbar=1&page=1&zoom=page-fit`}
              style={{ 
                width: '100%', 
                height: '100%', 
                border: 'none',
                borderRadius: '8px'
              }}
              title={fileName}
              onError={() => setError('Không thể hiển thị PDF')}
            />
            
            {/* Button mở tab mới */}
            <Button
              size="small"
              variant="contained"
              sx={{
                position: 'absolute',
                top: 16,
                right: 16,
                zIndex: 10,
                opacity: 0.9
              }}
              onClick={() => window.open(fileUrl, '_blank')}
            >
              Mở tab mới
            </Button>
          </Box>
        );

      case 'office':
        return (
          <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
            <iframe
              src={`https://docs.google.com/viewer?url=${encodeURIComponent(fileContent.url)}&embedded=true`}
              style={{ 
                width: '100%', 
                height: '100%', 
                border: 'none',
                borderRadius: '8px'
              }}
              title={fileName}
              onLoad={(e) => {
                // Ẩn loading overlay sau 3 giây
                setTimeout(() => {
                  const loadingEl = e.target.parentElement.querySelector('.office-loading');
                  if (loadingEl) loadingEl.style.display = 'none';
                }, 3000);
              }}
              onError={() => setError('Không thể hiển thị file Office')}
            />
            
            {/* Loading overlay */}
            <Box 
              className="office-loading"
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                bgcolor: 'rgba(255,255,255,0.95)',
                p: 3,
                borderRadius: 2,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                zIndex: 5,
                boxShadow: 3
              }}
            >
              <CircularProgress size={24} />
              <Typography variant="body2" fontWeight={500}>
                Đang tải {fileExtension.toUpperCase()}...
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Vui lòng đợi trong giây lát
              </Typography>
            </Box>
            
            {/* Buttons */}
            <Box sx={{
              position: 'absolute',
              top: 16,
              right: 16,
              display: 'flex',
              gap: 1,
              zIndex: 10
            }}>
              <Button
                size="small"
                variant="contained"
                sx={{ opacity: 0.9 }}
                onClick={() => window.open(fileUrl, '_blank')}
              >
                Mở tab mới
              </Button>
              <Button
                size="small"
                variant="outlined"
                sx={{ opacity: 0.9, bgcolor: 'white' }}
                onClick={() => {
                  const officeUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(fileContent.url)}`;
                  window.open(officeUrl, '_blank');
                }}
              >
                Office Online
              </Button>
            </Box>
          </Box>
        );

      case 'text':
        return (
          <Box sx={{ 
            width: '100%', 
            height: '100%', 
            p: 2, 
            overflow: 'auto',
            bgcolor: '#f5f5f5',
            fontFamily: 'monospace'
          }}>
            <pre style={{ 
              margin: 0,
              fontSize: '14px',
              lineHeight: '1.5',
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word'
            }}>
              {fileContent.content}
            </pre>
          </Box>
        );

      case 'unsupported':
        return (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center',
            height: '400px',
            gap: 2,
            textAlign: 'center'
          }}>
            <Box sx={{
              width: 80,
              height: 80,
              borderRadius: 2,
              bgcolor: 'grey.200',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 2
            }}>
              <Typography variant="h6" color="text.secondary" fontWeight="bold">
                {fileExtension.toUpperCase()}
              </Typography>
            </Box>
            
            <Typography variant="h6" sx={{ mb: 1 }}>
              {fileName}
            </Typography>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: '400px' }}>
              File {fileExtension.toUpperCase()} không thể xem trước trực tiếp. 
              Bạn có thể tải xuống để mở bằng ứng dụng phù hợp.
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button 
                variant="contained" 
                startIcon={<span>📱</span>}
                onClick={() => window.open(fileUrl, '_blank')}
              >
                Mở trong tab mới
              </Button>
              <Button 
                variant="outlined" 
                startIcon={<span>💾</span>}
                component="a" 
                href={fileUrl} 
                download
              >
                Tải xuống
              </Button>
            </Box>
          </Box>
        );

      default:
        return (
          <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
            Không thể hiển thị file này
          </Typography>
        );
    }
  };

  return (
    <Box sx={{ 
      width: '100%', 
      height: '500px', 
      border: 1, 
      borderColor: 'divider',
      borderRadius: 2,
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* Header */}
      <Box sx={{ 
        p: 2, 
        borderBottom: 1, 
        borderColor: 'divider', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        bgcolor: 'grey.50'
      }}>
        <Typography variant="subtitle1" fontWeight={600}>
          📄 {fileName}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button 
            size="small" 
            variant="outlined"
            component="a" 
            href={fileUrl} 
            download
          >
            💾 Tải xuống
          </Button>
          {onClose && (
            <Button 
              size="small" 
              variant="outlined"
              onClick={onClose}
            >
              ❌ Đóng
            </Button>
          )}
        </Box>
      </Box>
      
      {/* Content */}
      <Box sx={{ height: 'calc(100% - 73px)' }}>
        {renderContent()}
      </Box>
    </Box>
  );
};

export default FileRenderer;
