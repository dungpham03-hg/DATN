import React from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  Stack,
  IconButton,
  InputAdornment,
  CircularProgress,
  useTheme,
  alpha
} from '@mui/material';
import { Visibility, VisibilityOff, Lock as LockIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

const useQuery = () => new URLSearchParams(useLocation().search);

const ResetPassword = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const query = useQuery();
  const tokenFromQuery = query.get('token') || '';

  const [formData, setFormData] = React.useState({
    token: tokenFromQuery,
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = React.useState({});
  const [loading, setLoading] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [successMessage, setSuccessMessage] = React.useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.token) newErrors.token = 'Thiếu token';
    if (!formData.password) newErrors.password = 'Mật khẩu là bắt buộc';
    else if (formData.password.length < 6) newErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
    if (!formData.confirmPassword) newErrors.confirmPassword = 'Xác nhận mật khẩu là bắt buộc';
    else if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Mật khẩu xác nhận không khớp';
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const v = validate();
    if (Object.keys(v).length) {
      setErrors(v);
      return;
    }
    try {
      setLoading(true);
      setErrors({});
      setSuccessMessage('');
      const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: formData.token.trim(),
          password: formData.password,
          confirmPassword: formData.confirmPassword
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Đặt lại mật khẩu thất bại');
      setSuccessMessage(data.message || 'Đặt lại mật khẩu thành công');
      setTimeout(() => navigate('/login', { replace: true }), 1500);
    } catch (err) {
      setErrors({ general: err.message || 'Lỗi kết nối' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        p: 2
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={10}
          sx={{
            p: 4,
            borderRadius: 3,
            backdropFilter: 'blur(10px)',
            backgroundColor: alpha(theme.palette.background.paper, 0.95)
          }}
        >
          <Box sx={{ mb: 3, textAlign: 'center' }}>
            <LockIcon sx={{ fontSize: 48, color: theme.palette.primary.main, mb: 1 }} />
            <Typography variant="h4" fontWeight={600} gutterBottom>
              Đặt lại mật khẩu
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Nhập token và mật khẩu mới của bạn
            </Typography>
          </Box>

          {errors.general && (
            <Alert severity="error" sx={{ mb: 2 }}>{errors.general}</Alert>
          )}
          {successMessage && (
            <Alert severity="success" sx={{ mb: 2 }}>{successMessage}</Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={3}>
              <TextField
                fullWidth
                label="Token"
                name="token"
                value={formData.token}
                onChange={handleChange}
                error={!!errors.token}
                helperText={errors.token}
              />

              <TextField
                fullWidth
                label="Mật khẩu mới"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange}
                error={!!errors.password}
                helperText={errors.password}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />

              <TextField
                fullWidth
                label="Xác nhận mật khẩu"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={handleChange}
                error={!!errors.confirmPassword}
                helperText={errors.confirmPassword}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowConfirmPassword(!showConfirmPassword)} edge="end">
                        {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />

              <Stack direction="row" spacing={1} justifyContent="space-between">
                <Button color="inherit" startIcon={<ArrowBackIcon />} component={Link} to="/login">
                  Quay lại đăng nhập
                </Button>
                <Button type="submit" variant="contained" disabled={loading}>
                  {loading ? <CircularProgress size={20} /> : 'Đặt lại mật khẩu'}
                </Button>
              </Stack>
            </Stack>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default ResetPassword;


