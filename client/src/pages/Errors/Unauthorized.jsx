import React from 'react';
import {
  Container,
  Typography,
  Button
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

const Unauthorized = () => {
  return (
    <Container maxWidth="sm" sx={{ mt: 10, textAlign: 'center' }}>
      <Typography variant="h3" color="error" gutterBottom>
        403
      </Typography>
      <Typography variant="h5" gutterBottom>
        Bạn không có quyền truy cập trang này
      </Typography>
      <Typography variant="body1" sx={{ mb: 3 }}>
        Vui lòng liên hệ quản trị viên nếu bạn nghĩ đây là sự nhầm lẫn.
      </Typography>
      <Button component={RouterLink} to="/" variant="contained" color="primary">
        Quay về trang chủ
      </Button>
    </Container>
  );
};

export default Unauthorized; 