import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Cập nhật state để render fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Ghi lại thông tin lỗi vào một dịch vụ báo cáo lỗi
    console.error("Uncaught error:", error, errorInfo);
    this.setState({
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      // Bạn có thể render bất kỳ UI tùy chỉnh nào
      return (
        <Box 
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            bgcolor: 'background.default',
            p: 3
          }}
        >
          <Paper elevation={3} sx={{ p: 4, borderRadius: 3, textAlign: 'center', maxWidth: 600 }}>
            <Typography variant="h4" color="error" fontWeight={700} sx={{ mb: 2 }}>
              Đã xảy ra lỗi!
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Xin lỗi, đã có vấn đề xảy ra trong ứng dụng. Vui lòng thử lại sau.
            </Typography>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={() => window.location.reload()}
              sx={{ borderRadius: 2, textTransform: 'none' }}
            >
              Tải lại trang
            </Button>
            {this.state.error && (
              <Box sx={{ mt: 3, textAlign: 'left', bgcolor: 'grey.100', p: 2, borderRadius: 2, overflowX: 'auto' }}>
                <Typography variant="h6" color="text.primary">Thông tin lỗi:</Typography>
                <Typography variant="body2" color="error" sx={{ wordBreak: 'break-word' }}>
                  {this.state.error.toString()}
                </Typography>
                <Typography variant="h6" color="text.primary" sx={{ mt: 2 }}>Stack Trace:</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {this.state.errorInfo?.componentStack}
                </Typography>
              </Box>
            )}
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
