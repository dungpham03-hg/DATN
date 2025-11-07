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
  IconButton,
  Stack
} from '@mui/material';
import { Visibility, VisibilityOff, CheckCircle } from '@mui/icons-material';
import { School, Person, Security } from '@mui/icons-material';
import { useNavigate, Link } from 'react-router-dom';
import { useNotification } from '../../contexts/NotificationContext';

const DomainRegister = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    department: '',
    position: '',
    phone: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState('');
  const [domainInfo, setDomainInfo] = useState(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const { success: showSuccess, error: showError } = useNotification();

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
    setFormData(prev => ({ ...prev, email: value }));
    setError('');
    setDomainInfo(null);

    // Validate domain when user stops typing
    if (value && value.includes('@')) {
      setValidating(true);
      try {
        const API_URL = process.env.NODE_ENV === 'production' 
          ? `${process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api'}/auth/validate-domain`
          : '/api/auth/validate-domain';
        
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: value }),
        });

        const data = await response.json();
        
        if (response.ok && data.isValid) {
          setDomainInfo(data);
          setError('');
          // Auto-fill department and position from domain config
          if (data.department) {
            setFormData(prev => ({ ...prev, department: data.department }));
          }
          if (data.position) {
            setFormData(prev => ({ ...prev, position: data.position }));
          }
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.fullName.trim()) {
      setError('Họ tên là bắt buộc');
      return;
    }
    
    if (!formData.email || !domainInfo) {
      setError('Vui lòng nhập email hợp lệ và chờ domain được validate');
      return;
    }
    
    if (!formData.password || formData.password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const API_URL = process.env.NODE_ENV === 'production' 
        ? `${process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api'}/auth/register-domain`
        : '/api/auth/register-domain';
      
      const requestData = {
        fullName: formData.fullName.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        department: formData.department.trim() || domainInfo.department,
        position: formData.position.trim() || domainInfo.position,
        phone: formData.phone.trim()
      };
      
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        showSuccess('Đăng ký thành công! Tài khoản đang chờ phê duyệt.');
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        setError(data.message || 'Lỗi đăng ký');
      }
    } catch (err) {
      console.error('Register error:', err);
      setError('Lỗi kết nối server. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const domainRole = getDomainRole(formData.email);

  if (success) {
    return (
      <Card sx={{ maxWidth: 500, mx: 'auto', mt: 4 }}>
        <CardContent>
          <Box textAlign="center" py={4}>
            <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Đăng ký thành công!
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Tài khoản của bạn đang chờ phê duyệt từ admin.
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Bạn sẽ nhận được thông báo khi tài khoản được phê duyệt.
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Đang chuyển hướng đến trang đăng nhập...
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ maxWidth: 500, mx: 'auto', mt: 4 }}>
      <CardContent>
        <Box textAlign="center" mb={3}>
          <School sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
          <Typography variant="h5" component="h1" gutterBottom>
            Đăng ký với Email công ty
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Đăng ký tài khoản với email công ty và chờ phê duyệt từ admin
          </Typography>
        </Box>

        <form onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <TextField
              fullWidth
              label="Họ và tên"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              required
              margin="normal"
              disabled={loading}
            />

            <TextField
              fullWidth
              label="Email công ty"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleEmailChange}
              placeholder="example@ep.techcorp.vn"
              required
              margin="normal"
              disabled={loading}
              helperText="Nhập email có đuôi @ep.techcorp.vn, @ma.techcorp.vn, v.v."
            />

            {validating && (
              <Box display="flex" alignItems="center" gap={1}>
                <CircularProgress size={16} />
                <Typography variant="caption" color="text.secondary">
                  Đang kiểm tra domain...
                </Typography>
              </Box>
            )}

            {domainInfo && (
              <Alert 
                severity="success" 
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

            <TextField
              fullWidth
              label="Mật khẩu"
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              margin="normal"
              disabled={loading || !domainInfo}
              helperText="Tối thiểu 6 ký tự"
              InputProps={{
                endAdornment: formData.password && (
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                    size="small"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                )
              }}
            />

            <TextField
              fullWidth
              label="Xác nhận mật khẩu"
              type={showConfirmPassword ? 'text' : 'password'}
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              margin="normal"
              disabled={loading || !domainInfo}
              InputProps={{
                endAdornment: formData.confirmPassword && (
                  <IconButton
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    edge="end"
                    size="small"
                  >
                    {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                )
              }}
            />

            <TextField
              fullWidth
              label="Phòng ban"
              name="department"
              value={formData.department}
              onChange={handleChange}
              margin="normal"
              disabled={loading || !domainInfo}
              helperText={domainInfo?.department ? `Mặc định: ${domainInfo.department}` : ''}
            />

            <TextField
              fullWidth
              label="Chức vụ"
              name="position"
              value={formData.position}
              onChange={handleChange}
              margin="normal"
              disabled={loading || !domainInfo}
              helperText={domainInfo?.position ? `Mặc định: ${domainInfo.position}` : ''}
            />

            <TextField
              fullWidth
              label="Số điện thoại"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              margin="normal"
              disabled={loading || !domainInfo}
            />

            {domainRole && domainInfo?.permissions && (
              <Box mt={1}>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="subtitle2" gutterBottom>
                  Quyền hạn:
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={1}>
                  {domainInfo.permissions.map((permission, index) => (
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
              <Alert severity="error">
                {error}
              </Alert>
            )}

            <Alert severity="info">
              <Typography variant="body2">
                <strong>Lưu ý:</strong> Tài khoản của bạn sẽ ở trạng thái chờ phê duyệt. 
                Admin sẽ xem xét và phê duyệt tài khoản của bạn trong thời gian sớm nhất.
              </Typography>
            </Alert>

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading || !formData.email || !domainInfo || !formData.fullName || !formData.password}
              sx={{ mt: 2 }}
              startIcon={loading ? <CircularProgress size={20} /> : <School />}
            >
              {loading ? 'Đang đăng ký...' : 'Đăng ký'}
            </Button>
          </Stack>
        </form>

        <Divider sx={{ my: 3 }} />

        <Box textAlign="center">
          <Typography variant="body2" color="text.secondary">
            Đã có tài khoản?{' '}
            <Link 
              to="/login"
              style={{ 
                color: 'inherit',
                textDecoration: 'underline',
                fontWeight: 500
              }}
            >
              Đăng nhập ngay
            </Link>
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default DomainRegister;

