import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import {
  CircularProgress as Spinner,
  Box
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';


const RoleRoute = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  // Hiển thị spinner khi đang tải
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Spinner size={40} />
      </Box>
    );
  }

  // Chưa đăng nhập => chuyển hướng tới /login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Kiểm tra quyền truy cập
  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Đủ quyền => render con
  return children;
};

export default RoleRoute; 