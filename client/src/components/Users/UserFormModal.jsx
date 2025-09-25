import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Alert,
  Box,
  Typography,
  IconButton,
  Stack,
  alpha,
  useTheme
} from '@mui/material';
import {
  Close as CloseIcon,
  Save as SaveIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import axios from 'axios';
import { getRoleDescription } from '../../utils/permissions';

const UserFormModal = ({ 
  open, 
  onClose, 
  user = null, 
  onSuccess,
  departments = []
}) => {
  const theme = useTheme();
  const isEdit = Boolean(user);
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'employee',
    department: '',
    position: '',
    phone: '',
    isActive: true
  });
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');

  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';
  const token = localStorage.getItem('token');

  // Lấy thông tin role từ permissions system
  const getRoleOptions = () => {
    return ['admin', 'manager', 'secretary', 'assistant', 'technician', 'employee'].map(role => {
      const roleInfo = getRoleDescription(role);
      return {
        value: role,
        label: roleInfo.title,
        description: roleInfo.description,
        permissions: roleInfo.permissions,
        color: roleInfo.color,
        icon: roleInfo.icon
      };
    });
  };

  const roleOptions = getRoleOptions();

  // Function để lấy màu sắc an toàn
  const getRoleColor = (colorName) => {
    const colorMap = {
      error: theme.palette.error.main,
      warning: theme.palette.warning.main,
      info: theme.palette.info.main,
      success: theme.palette.success.main,
      primary: theme.palette.primary.main,
      secondary: theme.palette.secondary.main,
      default: theme.palette.text.primary
    };
    return colorMap[colorName] || theme.palette.text.primary;
  };

  useEffect(() => {
    if (open) {
      console.log('📝 Opening UserFormModal:', { isEdit, user: user ? { id: user._id, email: user.email } : null });
      if (isEdit && user) {
        console.log('📝 Loading user data for edit:', user);
        setFormData({
          fullName: user.fullName || '',
          email: user.email || '',
          password: '', // Don't prefill password
          role: user.role || 'employee',
          department: user.department || '',
          position: user.position || '',
          phone: user.phone || '',
          isActive: user.isActive !== undefined ? user.isActive : true
        });
        console.log('📝 Form data set:', {
          fullName: user.fullName || '',
          email: user.email || '',
          role: user.role || 'employee',
          department: user.department || '',
          position: user.position || '',
          phone: user.phone || '',
          isActive: user.isActive !== undefined ? user.isActive : true
        });
      } else {
        // Reset form for new user
        setFormData({
          fullName: '',
          email: '',
          password: '123456', // Default password for new users
          role: '', // Don't set default role, let user choose
          department: '',
          position: '',
          phone: '',
          isActive: true
        });
      }
      setErrors({});
      setSuccessMessage('');
    }
  }, [open, user, isEdit]);

  const handleChange = (field, value) => {
    console.log(`🔄 Changing ${field} to:`, value);
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      console.log('📝 New form data:', newData);
      return newData;
    });
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Họ tên là bắt buộc';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email là bắt buộc';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email không hợp lệ';
    }

    if (!isEdit && !formData.password.trim()) {
      newErrors.password = 'Mật khẩu là bắt buộc';
    } else if (formData.password && formData.password.length < 6) {
      newErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
    }

    if (!formData.role) {
      newErrors.role = 'Vai trò là bắt buộc';
    }

    if (formData.phone && !/^[0-9+\-\s\(\)]+$/.test(formData.phone)) {
      newErrors.phone = 'Số điện thoại không hợp lệ';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setErrors({});

      const submitData = { ...formData };
      
      console.log('📤 Submitting user data:', submitData);
      
      // Remove password field if it's empty (for edit mode)
      if (isEdit && !submitData.password) {
        delete submitData.password;
      }

      let response;
      if (isEdit) {
        console.log('✏️ Updating user:', user._id, submitData);
        response = await axios.put(
          `${API_BASE_URL}/users/${user._id}`,
          submitData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        console.log('➕ Creating new user:', submitData);
        response = await axios.post(
          `${API_BASE_URL}/users`,
          submitData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      setSuccessMessage(response.data.message);
      
      // Call success callback after a short delay
      setTimeout(() => {
        console.log('🎉 User saved successfully, calling onSuccess callback');
        onSuccess?.();
        onClose();
      }, 1500);

    } catch (error) {
      console.error('Error saving user:', error);
      
      if (error.response?.data?.errors) {
        // Handle validation errors from server
        const serverErrors = {};
        error.response.data.errors.forEach(err => {
          serverErrors[err.path] = err.msg;
        });
        setErrors(serverErrors);
      } else if (error.response?.data?.message) {
        // Handle single error message - check if it's email conflict
        if (error.response.data.message.includes('Email đã được sử dụng')) {
          setErrors({ email: 'Email đã được sử dụng' });
        } else {
          setErrors({ submit: error.response.data.message });
        }
      } else {
        setErrors({ submit: 'Có lỗi xảy ra khi lưu người dùng' });
      }
    } finally {
      setLoading(false);
    }
  };


  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 }
      }}
    >
      <DialogTitle>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={1}>
            <PersonIcon color="primary" />
            <Typography variant="h6">
              {isEdit ? 'Chỉnh sửa người dùng' : 'Thêm người dùng mới'}
            </Typography>
          </Stack>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {successMessage && (
            <Alert severity="success" sx={{ mb: 3 }}>
              {successMessage}
            </Alert>
          )}

          {errors.submit && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {errors.submit}
            </Alert>
          )}

          <Grid container spacing={3}>
            {/* Basic Information */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
                Thông tin cơ bản
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Họ và tên"
                value={formData.fullName}
                onChange={(e) => handleChange('fullName', e.target.value)}
                error={Boolean(errors.fullName)}
                helperText={errors.fullName}
                required
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                error={Boolean(errors.email)}
                helperText={errors.email}
                required
                disabled={isEdit} // Don't allow email change in edit mode
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Mật khẩu"
                type="password"
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
                error={Boolean(errors.password)}
                helperText={errors.password || (isEdit ? 'Để trống nếu không muốn thay đổi' : 'Mật khẩu mặc định: 123456')}
                required={!isEdit}
                placeholder={isEdit ? 'Để trống nếu không thay đổi' : 'Nhập mật khẩu'}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Số điện thoại"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                error={Boolean(errors.phone)}
                helperText={errors.phone}
                placeholder="Ví dụ: 0123456789"
              />
            </Grid>

            {/* Role and Department */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', mt: 2 }}>
                Vai trò và phòng ban
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth error={Boolean(errors.role)} required>
                <InputLabel>Vai trò</InputLabel>
                <Select
                  value={formData.role}
                  onChange={(e) => handleChange('role', e.target.value)}
                  label="Vai trò"
                >
                  {roleOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      <Stack direction="row" alignItems="flex-start" spacing={2} sx={{ width: '100%', py: 1 }}>
                        <Box sx={{ fontSize: '1.5rem', mt: 0.5 }}>{option.icon || '👤'}</Box>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" fontWeight={600} sx={{ color: getRoleColor(option.color || 'default') }}>
                            {option.label || option.value}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                            {option.description || 'Không có mô tả'}
                          </Typography>
                          <Box>
                            <Typography variant="caption" color="text.secondary" fontWeight={500}>
                              Quyền hạn:
                            </Typography>
                            <Box sx={{ mt: 0.5 }}>
                              {(option.permissions || []).slice(0, 3).map((permission, index) => (
                                <Typography key={index} variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                  • {permission}
                                </Typography>
                              ))}
                              {(option.permissions || []).length > 3 && (
                                <Typography variant="caption" color="text.secondary">
                                  • ... và {(option.permissions || []).length - 3} quyền khác
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        </Box>
                      </Stack>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {errors.role && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 2 }}>
                  {errors.role}
                </Typography>
              )}
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Phòng ban</InputLabel>
                <Select
                  value={formData.department}
                  onChange={(e) => handleChange('department', e.target.value)}
                  label="Phòng ban"
                >
                  <MenuItem value="">
                    <em>Chưa phân công</em>
                  </MenuItem>
                  {departments.map((dept) => (
                    <MenuItem key={dept} value={dept}>
                      {dept}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Chức vụ"
                value={formData.position}
                onChange={(e) => handleChange('position', e.target.value)}
                placeholder="Ví dụ: Trưởng phòng, Nhân viên, Chuyên viên..."
              />
            </Grid>

            {/* Status */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', mt: 2 }}>
                Trạng thái
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isActive}
                    onChange={(e) => handleChange('isActive', e.target.checked)}
                    color="primary"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2">
                      Tài khoản hoạt động
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formData.isActive 
                        ? 'Người dùng có thể đăng nhập và sử dụng hệ thống' 
                        : 'Tài khoản bị vô hiệu hóa, không thể đăng nhập'
                      }
                    </Typography>
                  </Box>
                }
              />
            </Grid>

            {/* Role Description */}
            {formData.role && (
              <Grid item xs={12}>
                {(() => {
                  const selectedRole = roleOptions.find(r => r.value === formData.role);
                  if (!selectedRole) return null;
                  
                  return (
                      <Box 
                        sx={{ 
                          p: 3, 
                          bgcolor: alpha(getRoleColor(selectedRole.color), 0.05),
                          borderRadius: 2,
                          border: `1px solid ${alpha(getRoleColor(selectedRole.color), 0.2)}`
                        }}
                      >
                        <Stack direction="row" alignItems="center" spacing={2} mb={2}>
                          <Box sx={{ fontSize: '2rem' }}>{selectedRole.icon}</Box>
                          <Box>
                            <Typography variant="h6" sx={{ color: getRoleColor(selectedRole.color) }} fontWeight={600}>
                              {selectedRole.label}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {selectedRole.description}
                            </Typography>
                          </Box>
                        </Stack>
                        
                        <Typography variant="subtitle2" sx={{ color: getRoleColor(selectedRole.color) }} gutterBottom>
                          Danh sách quyền hạn:
                        </Typography>
                        
                        <Grid container spacing={1}>
                          {selectedRole.permissions.map((permission, index) => (
                            <Grid item xs={12} sm={6} key={index}>
                              <Box sx={{ display: 'flex', alignItems: 'center', py: 0.5 }}>
                                <Box 
                                  sx={{ 
                                    width: 4, 
                                    height: 4, 
                                    borderRadius: '50%', 
                                    bgcolor: getRoleColor(selectedRole.color),
                                    mr: 1 
                                  }} 
                                />
                                <Typography variant="body2" color="text.secondary">
                                  {permission}
                                </Typography>
                              </Box>
                            </Grid>
                          ))}
                        </Grid>
                      </Box>
                  );
                })()}
              </Grid>
            )}
          </Grid>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 2 }}>
        <Button onClick={onClose} disabled={loading}>
          Hủy
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          startIcon={<SaveIcon />}
          disabled={loading}
          sx={{ minWidth: 120 }}
        >
          {loading ? 'Đang lưu...' : (isEdit ? 'Cập nhật' : 'Tạo người dùng')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UserFormModal;

