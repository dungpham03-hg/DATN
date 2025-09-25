import React from 'react';
import { Backdrop, CircularProgress, Box, Typography } from '@mui/material';

const MaterialBackdropLoading = ({ open, message = "Đang tải..." }) => {
  return (
    <Backdrop
      sx={{ 
        color: '#fff', 
        zIndex: (theme) => theme.zIndex.drawer + 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)'
      }}
      open={open}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2
        }}
      >
        <CircularProgress color="inherit" />
        <Typography variant="body1" color="inherit">
          {message}
        </Typography>
      </Box>
    </Backdrop>
  );
};

export default MaterialBackdropLoading;
