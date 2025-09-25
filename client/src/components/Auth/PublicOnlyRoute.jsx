import React from 'react';
import { Navigate } from 'react-router-dom';
import {
  CircularProgress as Spinner,
  Box
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';


const PublicOnlyRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Spinner size={40} />
      </Box>
    );
  }

  if (isAuthenticated) {
    // Nếu đã đăng nhập, chuyển về trang chủ
    return <Navigate to="/" replace />;
  }

  return children;
};

export default PublicOnlyRoute; 