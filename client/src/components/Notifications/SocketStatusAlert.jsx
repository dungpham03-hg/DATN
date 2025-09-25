import React from 'react';
import {
  Alert,
  AlertTitle,
  Button,
  Stack,
  Box,
  Typography
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  WifiOff as WifiOffIcon,
  Wifi as WifiIcon
} from '@mui/icons-material';
import { useSocket } from '../../contexts/SocketContext';
import { useNotification } from '../../contexts/NotificationContext';

const SocketStatusAlert = () => {
  const { isDisabled, connectionError, resetSocket, disableSocket } = useSocket();
  const { isConnected } = useNotification();

  // Chỉ hiển thị khi có vấn đề với Socket.IO
  if (isConnected && !isDisabled) {
    return null;
  }

  const handleRetry = () => {
    resetSocket();
  };

  const handleDisable = () => {
    disableSocket();
  };

  return (
    <Box sx={{ p: 2 }}>
      <Alert 
        severity={isDisabled ? "warning" : "error"}
        icon={isDisabled ? <WifiOffIcon /> : <WifiIcon />}
        action={
          <Stack direction="row" spacing={1}>
            {!isDisabled && (
              <Button
                color="inherit"
                size="small"
                onClick={handleRetry}
                startIcon={<RefreshIcon />}
              >
                Thử lại
              </Button>
            )}
            <Button
              color="inherit"
              size="small"
              onClick={handleDisable}
            >
              {isDisabled ? 'Đã tắt' : 'Tắt'}
            </Button>
          </Stack>
        }
      >
        <AlertTitle>
          {isDisabled ? 'Socket.IO đã tắt' : 'Lỗi kết nối Socket.IO'}
        </AlertTitle>
        <Typography variant="body2">
          {isDisabled 
            ? 'Real-time notifications đã bị tắt. Hệ thống sẽ sử dụng polling để cập nhật thông báo.'
            : `Không thể kết nối Socket.IO: ${connectionError || 'Lỗi không xác định'}. Hệ thống đang sử dụng polling để cập nhật thông báo.`
          }
        </Typography>
      </Alert>
    </Box>
  );
};

export default SocketStatusAlert;
