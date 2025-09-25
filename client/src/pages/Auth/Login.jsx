import React, { useState, useEffect } from 'react';
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
  Divider,
  CircularProgress,
  useTheme,
  alpha
} from '@mui/material';
import {
  Email as EmailIcon,
  Lock as LockIcon,
  Visibility,
  VisibilityOff,
  Login as LoginIcon,
  GitHub as GitHubIcon
} from '@mui/icons-material';

import { useAuth } from '../../contexts/AuthContext';

const Login = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState(location.state?.error || '');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (error) {
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      setError('Vui lòng nhập đầy đủ email và mật khẩu');
      return;
    }

    try {
      setError('');
      setLoading(true);
      
      await login(formData.email.trim(), formData.password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.message || err.message || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = (provider) => {
    const apiUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';
    window.location.href = `${apiUrl}/auth/${provider}`;
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
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h3" fontWeight="bold" color="white" gutterBottom>
            Meeting Manager
          </Typography>
          <Typography variant="h6" color="white" sx={{ opacity: 0.9 }}>
            Hệ thống quản lý cuộc họp chuyên nghiệp
          </Typography>
        </Box>

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
            <LoginIcon sx={{ fontSize: 48, color: theme.palette.primary.main, mb: 1 }} />
            <Typography variant="h4" fontWeight={600} gutterBottom>
              Đăng nhập
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Chào mừng bạn trở lại! Vui lòng đăng nhập để tiếp tục.
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={3}>
              <TextField
                fullWidth
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                autoComplete="email"
                autoFocus
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon color="action" />
                    </InputAdornment>
                  )
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2
                  }
                }}
              />

              <TextField
                fullWidth
                label="Mật khẩu"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange}
                autoComplete="current-password"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2
                  }
                }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                sx={{
                  borderRadius: 2,
                  py: 1.5,
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  textTransform: 'none'
                }}
              >
                {loading ? (
                  <>
                    <CircularProgress size={24} color="inherit" sx={{ mr: 1 }} />
                    Đang đăng nhập...
                  </>
                ) : (
                  'Đăng nhập'
                )}
              </Button>
            </Stack>
          </Box>

          {/* OAuth Section */}
          <Stack spacing={2} sx={{ mt: 4 }}>
            <Divider>
              <Typography variant="body2" color="text.secondary">
                Hoặc đăng nhập với
              </Typography>
            </Divider>
            
            <Stack spacing={2}>
              {/* Google Login Button */}
              <Button
                fullWidth
                variant="outlined"
                size="large"
                startIcon={
                  <Box
                    component="img"
                    src="https://developers.google.com/identity/images/g-logo.png"
                    alt="Google"
                    sx={{ width: 20, height: 20 }}
                  />
                }
                onClick={() => handleOAuthLogin('google')}
                sx={{
                  borderRadius: 2,
                  py: 1.5,
                  textTransform: 'none',
                  borderColor: theme.palette.grey[300],
                  color: theme.palette.text.primary,
                  '&:hover': {
                    backgroundColor: '#4285f4',
                    borderColor: '#4285f4',
                    color: 'white'
                  }
                }}
              >
                Đăng nhập với Google
              </Button>

              {/* GitHub Login Button */}
              <Button
                fullWidth
                variant="outlined"
                size="large"
                startIcon={<GitHubIcon />}
                onClick={() => handleOAuthLogin('github')}
                sx={{
                  borderRadius: 2,
                  py: 1.5,
                  textTransform: 'none',
                  borderColor: theme.palette.grey[300],
                  color: theme.palette.text.primary,
                  '&:hover': {
                    backgroundColor: '#24292e',
                    borderColor: '#24292e',
                    color: 'white'
                  }
                }}
              >
                Đăng nhập với GitHub
              </Button>
            </Stack>
          </Stack>

          <Divider sx={{ my: 3 }} />

          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Chưa có tài khoản?{' '}
              <Link 
                to="/register"
                style={{ 
                  color: theme.palette.primary.main,
                  textDecoration: 'none',
                  fontWeight: 500
                }}
              >
                Đăng ký ngay
              </Link>
            </Typography>
          </Box>


        </Paper>
      </Container>
    </Box>
  );
};

export default Login;
