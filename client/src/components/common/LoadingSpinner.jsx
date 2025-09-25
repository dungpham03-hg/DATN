import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

/**
 * Reusable loading spinner component
 * @param {Object} props - Component props
 * @param {string} props.message - Loading message
 * @param {string} props.size - Spinner size
 * @param {boolean} props.fullScreen - Full screen loading
 * @returns {JSX.Element} - Loading spinner component
 */
const LoadingSpinner = ({ 
  message = 'Đang tải...', 
  size = 40, 
  fullScreen = false 
}) => {
  const containerStyles = fullScreen ? {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    backdropFilter: 'blur(4px)',
    zIndex: 9999
  } : {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    p: 3
  };

  return (
    <Box sx={containerStyles}>
      <CircularProgress size={size} />
      {message && (
        <Typography 
          variant="body2" 
          color="text.secondary" 
          sx={{ mt: 2 }}
        >
          {message}
        </Typography>
      )}
    </Box>
  );
};

export default LoadingSpinner;
