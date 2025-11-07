import React, { useState } from 'react';
import {
  TextField,
  Button,
  Alert,
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Divider,
  CircularProgress,
  IconButton
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { School, Person, Security } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../../contexts/NotificationContext';
import ForgotPasswordDialog from './ForgotPasswordDialog';

const DomainLogin = ({ onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState('');
  const [domainInfo, setDomainInfo] = useState(null);
  const navigate = useNavigate();
  const { success, error: showError } = useNotification();
  const [openForgot, setOpenForgot] = useState(false);

  // Domain role mapping for display
  const getDomainRole = (email) => {
    const domain = email.split('@')[1];
    
    // Doanh nghiệp giả lập
    if (domain === 'ep.techcorp.vn') return {
      role: 'Nhân viên',
      color: 'primary',
      icon: <Person />
    };
    if (domain === 'ma.techcorp.vn') return {
      role: 'Trưởng phòng',
      color: 'secondary',
      icon: <Security />
    };
    if (domain === 'st.techcorp.vn') return {
      role: 'Thư ký',
      color: 'info',
      icon: <Person />
    };
    if (domain === 'te.techcorp.vn') return {
      role: 'Kỹ thuật viên',
      color: 'success',
      icon: <Security />
    };
    if (domain === 'ad.techcorp.vn') return {
      role: 'Quản trị viên',
      color: 'error',
      icon: <Security />
    };
    
    return null;
  };

  const handleEmailChange = async (e) => {
    const value = e.target.value;
    setEmail(value);
    setError('');
    setDomainInfo(null);

    // Validate domain when user stops typing
    if (value && value.includes('@')) {
      setValidating(true);
      try {
        // Use proxy path in development, absolute URL in production
        const API_URL = process.env.NODE_ENV === 'production' 
          ? `${process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api'}/auth/validate-domain`
          : '/api/auth/validate-domain';
        
        console.log('🔍 Validating domain with URL:', API_URL, 'for email:', value);
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: value }),
        });

        const data = await response.json();
        console.log('🔍 Domain validation response:', data);
        
        if (response.ok && data.isValid) {
          setDomainInfo(data);
          setError(''); // Clear any previous errors
        } else {
          setError(data.message || 'Domain không hợp lệ');
          setDomainInfo(null);
        }
      } catch (err) {
        console.error('Domain validation error:', err);
        setError('Không thể kiểm tra domain. Vui lòng kiểm tra kết nối server.');
      } finally {
        setValidating(false);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('🔍 Submit check - email:', email, 'domainInfo:', domainInfo);
    if (!email || !domainInfo) {
      setError('Vui lòng nhập email hợp lệ và chờ domain được validate');
      return;
    }
    
    // ⚠️ Require password
    if (!password || password.length < 6) {
      setError('Mật khẩu là bắt buộc và phải có ít nhất 6 ký tự');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Use proxy path in development, absolute URL in production
      const API_URL = process.env.NODE_ENV === 'production' 
        ? `${process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api'}/auth/login-with-domain`
        : '/api/auth/login-with-domain';
      
      const requestData = { 
        email,
        password,
        fullName: domainInfo.fullName || email.split('@')[0]
      };
      
      console.log('🚀 Logging in with URL:', API_URL, 'for email:', email);
      console.log('📤 Request data:', requestData);
      
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      console.log('📥 Response status:', response.status);
      const data = await response.json();
      console.log('📥 Response data:', data);

      if (response.ok) {
        // Store auth data
        localStorage.setItem('token', data.token);
        localStorage.setItem('refreshToken', data.refreshToken);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        success('Đăng nhập thành công!');
        
        if (onSuccess) {
          onSuccess(data);
        } else {
          navigate('/dashboard');
        }
      } else {
        setError(data.message || 'Lỗi đăng nhập');
      }
    } catch (err) {
      console.error('Login error:', err);
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        setError('Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.');
      } else {
        setError('Lỗi kết nối server: ' + (err.message || 'Unknown error'));
      }
    } finally {
      setLoading(false);
    }
  };

  const domainRole = getDomainRole(email);

  return (
    <Card sx={{ maxWidth: 500, mx: 'auto', mt: 4 }}>
      <CardContent>
        <Box textAlign="center" mb={3}>
          <School sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
          <Typography variant="h5" component="h1" gutterBottom>
            Đăng nhập với Email công ty
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Sử dụng email công ty để đăng nhập và tự động phân quyền
          </Typography>
        </Box>

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Email công ty"
            type="email"
            value={email}
            onChange={handleEmailChange}
            placeholder="example@ep.techcorp.vn"
            required
            margin="normal"
            disabled={loading}
            helperText="Nhập email có đuôi @ep.techcorp.vn (nhân viên), @ma.techcorp.vn (manager), @ad.techcorp.vn (admin), v.v."
          />

          <TextField
            fullWidth
            label="Mật khẩu"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Nhập mật khẩu"
            required
            margin="normal"
            disabled={loading || !domainInfo}
            helperText="Mật khẩu cho tài khoản lần đầu đăng nhập (tối thiểu 6 ký tự)"
            InputProps={{
              endAdornment: password && (
                <IconButton
                  onClick={() => setShowPassword(!showPassword)}
                  edge="end"
                  aria-label="toggle password visibility"
                  size="small"
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              )
            }}
          />

          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box />
            <Button size="small" onClick={() => setOpenForgot(true)}>
              Quên mật khẩu?
            </Button>
          </Box>

          {validating && (
            <Box display="flex" alignItems="center" gap={1} mt={1}>
              <CircularProgress size={16} />
              <Typography variant="caption" color="text.secondary">
                Đang kiểm tra domain...
              </Typography>
            </Box>
          )}

          {domainInfo && (
            <Alert 
              severity="success" 
              sx={{ mt: 2 }}
              icon={domainRole?.icon}
            >
              <Typography variant="subtitle2">
                Domain hợp lệ - Vai trò: {domainInfo.role}
              </Typography>
              <Typography variant="caption" display="block">
                {domainInfo.description}
              </Typography>
            </Alert>
          )}

          {domainRole && domainRole.role && (
            <Box mt={2}>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="subtitle2" gutterBottom>
                Quyền hạn:
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={1}>
                {domainInfo?.permissions?.map((permission, index) => (
                  <Chip
                    key={index}
                    label={permission.replace(/_/g, ' ')}
                    size="small"
                    color={domainRole.color}
                    variant="outlined"
                  />
                ))}
              </Box>
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}

          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={loading || !email || !domainInfo}
            sx={{ mt: 3, mb: 2 }}
            startIcon={loading ? <CircularProgress size={20} /> : <School />}
          >
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập với Email công ty'}
          </Button>
        </form>

        <ForgotPasswordDialog open={openForgot} onClose={() => setOpenForgot(false)} defaultEmail={email} />

        <Divider sx={{ my: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Hoặc
          </Typography>
        </Divider>

        <Box textAlign="center">
          <Typography variant="body2" color="text.secondary">
            Bạn cũng có thể đăng nhập bằng:
          </Typography>
          <Box mt={1}>
            <Button
              variant="outlined"
              color="primary"
              onClick={() => window.location.href = '/api/auth/microsoft'}
              sx={{ mr: 1 }}
            >
              Microsoft
            </Button>
            <Button
              variant="outlined"
              color="primary"
              onClick={() => window.location.href = '/api/auth/google'}
            >
              Google
            </Button>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default DomainLogin;
