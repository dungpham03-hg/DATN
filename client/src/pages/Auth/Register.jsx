import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Grid,
  CircularProgress,
  useTheme,
  alpha,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Box as Form
} from '@mui/material';
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Lock as LockIcon,
  Business as BusinessIcon,
  Work as WorkIcon,
  Phone as PhoneIcon,
  AdminPanelSettings as AdminIcon,
  Visibility,
  VisibilityOff,
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
  AccountCircle as AccountIcon} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

const Register = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    department: '',
    position: '',
    phone: '',
    role: 'user'
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

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
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateStep = (step) => {
    const newErrors = {};
    
    switch(step) {
      case 0: // Personal Information
        if (!formData.fullName.trim()) {
          newErrors.fullName = 'Họ tên là bắt buộc';
        } else if (formData.fullName.trim().length < 2 || formData.fullName.trim().length > 100) {
          newErrors.fullName = 'Họ tên phải từ 2-100 ký tự';
        }
        
        if (!formData.email.trim()) {
          newErrors.email = 'Email là bắt buộc';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
          newErrors.email = 'Email không hợp lệ';
        }
        break;
        
      case 1: // Security
        if (!formData.password) {
          newErrors.password = 'Mật khẩu là bắt buộc';
        } else if (formData.password.length < 6) {
          newErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
        } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
          newErrors.password = 'Mật khẩu phải chứa ít nhất 1 chữ thường, 1 chữ hoa và 1 số';
        }
        
        if (!formData.confirmPassword) {
          newErrors.confirmPassword = 'Xác nhận mật khẩu là bắt buộc';
        } else if (formData.password !== formData.confirmPassword) {
          newErrors.confirmPassword = 'Mật khẩu xác nhận không khớp';
        }
        break;
        
      case 2: // Work Information
        if (formData.department && formData.department.length > 50) {
          newErrors.department = 'Phòng ban không được vượt quá 50 ký tự';
        }
        
        if (formData.position && formData.position.length > 50) {
          newErrors.position = 'Chức vụ không được vượt quá 50 ký tự';
        }
        
        if (formData.phone && !/^(0|\+84)[3-9]\d{8,9}$/.test(formData.phone)) {
          newErrors.phone = 'Số điện thoại không hợp lệ';
        }
        break;
    }
    
    return newErrors;
  };

  const handleNext = () => {
    const stepErrors = validateStep(activeStep);
    if (Object.keys(stepErrors).length === 0) {
      setActiveStep(prev => prev + 1);
    } else {
      setErrors(stepErrors);
    }
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate all steps
    let allErrors = {};
    for (let i = 0; i <= 2; i++) {
      allErrors = { ...allErrors, ...validateStep(i) };
    }
    
    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      // Go to first step with error
      if (allErrors.fullName || allErrors.email) setActiveStep(0);
      else if (allErrors.password || allErrors.confirmPassword) setActiveStep(1);
      else setActiveStep(2);
      return;
    }

    try {
      setLoading(true);
      setErrors({});
      setSuccessMessage('');

      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'},
        body: JSON.stringify({
          fullName: formData.fullName.trim(),
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
          department: formData.department.trim(),
          position: formData.position.trim(),
          phone: formData.phone.trim(),
          role: formData.role
        })});

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage('Đăng ký thành công! Đang chuyển hướng...');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        if (data.errors && Array.isArray(data.errors)) {
          const errorMap = {};
          data.errors.forEach(error => {
            errorMap[error.path] = error.msg;
          });
          setErrors(errorMap);
        } else {
          setErrors({ general: data.message || 'Đăng ký thất bại. Vui lòng thử lại.' });
        }
      }
    } catch (error) {
      setErrors({ general: 'Lỗi kết nối. Vui lòng kiểm tra và thử lại.' });
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    {
      label: 'Thông tin cá nhân',
      icon: <PersonIcon />,
      content: (
        <Stack spacing={3}>
          <TextField
            fullWidth
            label="Họ và tên"
            name="fullName"
            value={formData.fullName}
            onChange={handleChange}
            error={!!errors.fullName}
            helperText={errors.fullName}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <PersonIcon color="action" />
                </InputAdornment>
              )}}
            autoFocus
          />
          <TextField
            fullWidth
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            error={!!errors.email}
            helperText={errors.email}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <EmailIcon color="action" />
                </InputAdornment>
              )}}
          />
        </Stack>
      )
    },
    {
      label: 'Bảo mật',
      icon: <LockIcon />,
      content: (
        <Stack spacing={3}>
          <TextField
            fullWidth
            label="Mật khẩu"
            name="password"
            type={showPassword ? 'text' : 'password'}
            value={formData.password}
            onChange={handleChange}
            error={!!errors.password}
            helperText={errors.password}
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
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              )}}
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
              startAdornment: (
                <InputAdornment position="start">
                  <LockIcon color="action" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    edge="end"
                  >
                    {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              )}}
          />
        </Stack>
      )
    },
    {
      label: 'Thông tin công việc',
      icon: <WorkIcon />,
      content: (
        <Stack spacing={3}>
          <TextField
            fullWidth
            label="Phòng ban"
            name="department"
            value={formData.department}
            onChange={handleChange}
            error={!!errors.department}
            helperText={errors.department}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <BusinessIcon color="action" />
                </InputAdornment>
              )}}
          />
          <TextField
            fullWidth
            label="Chức vụ"
            name="position"
            value={formData.position}
            onChange={handleChange}
            error={!!errors.position}
            helperText={errors.position}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <WorkIcon color="action" />
                </InputAdornment>
              )}}
          />
          <TextField
            fullWidth
            label="Số điện thoại"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            error={!!errors.phone}
            helperText={errors.phone}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <PhoneIcon color="action" />
                </InputAdornment>
              )}}
          />
          <FormControl fullWidth>
            <InputLabel>Vai trò</InputLabel>
            <Select
              name="role"
              value={formData.role}
              onChange={handleChange}
              label="Vai trò"
              startAdornment={
                <InputAdornment position="start">
                  <AdminIcon color="action" />
                </InputAdornment>
              }
            >
              <MenuItem value="employee">Người dùng</MenuItem>
              <MenuItem value="secretary">Thư ký</MenuItem>
              <MenuItem value="manager">Quản lý</MenuItem>
              <MenuItem value="technician">Kỹ thuật</MenuItem>
              <MenuItem value="admin">Quản trị viên</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      )
    }
  ];

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        p: 2}}
    >
      <Container maxWidth="md">
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
            backgroundColor: alpha(theme.palette.background.paper, 0.95),
            maxWidth: 600,
            mx: 'auto'}}
        >
          <Box sx={{ mb: 3, textAlign: 'center' }}>
            <AccountIcon sx={{ fontSize: 48, color: theme.palette.primary.main, mb: 1 }} />
            <Typography variant="h5" fontWeight={600} gutterBottom>
              Đăng ký tài khoản
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Tạo tài khoản mới để bắt đầu sử dụng hệ thống
            </Typography>
          </Box>

          {errors.general && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {errors.general}
            </Alert>
          )}

          {successMessage && (
            <Alert 
              severity="success" 
              icon={<CheckCircleIcon />}
              sx={{ mb: 3 }}
            >
              {successMessage}
            </Alert>
          )}

          <Stepper activeStep={activeStep} orientation="vertical">
            {steps.map((step, index) => (
              <Step key={step.label}>
                <StepLabel
                  StepIconComponent={() => (
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: activeStep >= index ? theme.palette.primary.main : theme.palette.grey[300],
                        color: 'white'}}
                    >
                      {step.icon}
                    </Box>
                  )}
                >
                  <Typography variant="subtitle1" fontWeight={500}>
                    {step.label}
                  </Typography>
                </StepLabel>
                <StepContent>
                  <Box sx={{ py: 2 }}>
                    {step.content}
                  </Box>
                  <Box sx={{ mt: 2 }}>
                    <Button
                      variant="contained"
                      onClick={index === steps.length - 1 ? handleSubmit : handleNext}
                      disabled={loading}
                      sx={{ mr: 1 }}
                    >
                      {loading ? (
                        <CircularProgress size={24} color="inherit" />
                      ) : (
                        index === steps.length - 1 ? 'Đăng ký' : 'Tiếp tục'
                      )}
                    </Button>
                    {index > 0 && (
                      <Button
                        onClick={handleBack}
                        disabled={loading}
                      >
                        Quay lại
                      </Button>
                    )}
                  </Box>
                </StepContent>
              </Step>
            ))}
          </Stepper>

          <Divider sx={{ my: 3 }} />

          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Đã có tài khoản?{' '}
              <Link 
                to="/login"
                style={{ 
                  color: theme.palette.primary.main,
                  textDecoration: 'none',
                  fontWeight: 500
                }}
              >
                Đăng nhập ngay
              </Link>
            </Typography>
          </Box>

          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate('/login')}
              color="inherit"
            >
              Quay lại trang đăng nhập
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default Register;
