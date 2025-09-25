import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  TextField,
  Avatar,
  Divider,
  Stack,
  Chip,
  Alert,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Person as PersonIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  PhotoCamera as PhotoCameraIcon,
  Email as EmailIcon,
  Business as BusinessIcon,
  Work as WorkIcon,
  Phone as PhoneIcon,
  AdminPanelSettings as AdminIcon,
  Security as SecurityIcon,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from '../../utils/toast';
import axios from 'axios';

const Profile = () => {
  const theme = useTheme();
  const { user, token, updateUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [formData, setFormData] = useState({
    fullName: user?.fullName || '',
    email: user?.email || '',
    department: user?.department || '',
    position: user?.position || '',
    phone: user?.phone || '',
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.fullName || '',
        email: user.email || '',
        department: user.department || '',
        position: user.position || '',
        phone: user.phone || '',
      });
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveProfile = async () => {
    try {
      setLoading(true);
      const response = await axios.put(`${API_BASE_URL}/auth/profile`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        updateUser(response.data.user);
        setEditing(false);
        toast.success('Cập nhật thông tin thành công!');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi cập nhật thông tin');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp');
      return;
    }

    try {
      setLoading(true);
      await axios.put(`${API_BASE_URL}/auth/change-password`, {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setShowPasswordDialog(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Đổi mật khẩu thành công!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi đổi mật khẩu');
    } finally {
      setLoading(false);
    }
  };

  const getUserRole = () => {
    const roles = {
      admin: { label: 'Quản trị viên', color: 'error' },
      manager: { label: 'Quản lý', color: 'warning' },
      secretary: { label: 'Thư ký', color: 'info' },
      // assistant removed
      technician: { label: 'Kỹ thuật', color: 'secondary' },
      user: { label: 'Người dùng', color: 'default' }
    };
    return roles[user?.role] || roles.user;
  };

  const getUserAvatar = () => {
    if (user?.avatar && user.avatar.startsWith('/uploads')) {
      return `${API_BASE_URL.replace('/api', '')}${user.avatar}`;
    }
    return user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.fullName || user?.email || 'U')}&background=1976d2&color=fff&bold=true`;
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 3 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" fontWeight={600} gutterBottom>
            Hồ sơ cá nhân
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Quản lý thông tin tài khoản và cài đặt bảo mật
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {/* Profile Card */}
          <Grid item xs={12} md={4}>
            <Card sx={{ textAlign: 'center' }}>
              <CardContent sx={{ py: 4 }}>
                <Box sx={{ position: 'relative', display: 'inline-block', mb: 2 }}>
                  <Avatar
                    src={getUserAvatar()}
                    alt={user?.fullName}
                    sx={{ 
                      width: 120, 
                      height: 120, 
                      mx: 'auto',
                      border: `4px solid ${theme.palette.background.paper}`,
                      boxShadow: 3,
                    }}
                  />
                  <IconButton
                    sx={{
                      position: 'absolute',
                      bottom: 0,
                      right: 0,
                      bgcolor: 'primary.main',
                      color: 'white',
                      '&:hover': { bgcolor: 'primary.dark' },
                      width: 40,
                      height: 40,
                    }}
                  >
                    <PhotoCameraIcon />
                  </IconButton>
                </Box>

                <Typography variant="h5" fontWeight={600} gutterBottom>
                  {user?.fullName || 'Người dùng'}
                </Typography>
                
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {user?.email}
                </Typography>

                <Chip 
                  label={getUserRole().label} 
                  color={getUserRole().color} 
                  sx={{ mt: 1, fontWeight: 500 }}
                />

                <Divider sx={{ my: 3 }} />

                <Stack spacing={2}>
                  <Button
                    variant={editing ? "outlined" : "contained"}
                    startIcon={editing ? <CancelIcon /> : <EditIcon />}
                    onClick={() => setEditing(!editing)}
                    fullWidth
                  >
                    {editing ? 'Hủy chỉnh sửa' : 'Chỉnh sửa thông tin'}
                  </Button>

                  <Button
                    variant="outlined"
                    startIcon={<SecurityIcon />}
                    onClick={() => setShowPasswordDialog(true)}
                    fullWidth
                  >
                    Đổi mật khẩu
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Information Card */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Thông tin cá nhân
                </Typography>
                
                <Stack spacing={3} sx={{ mt: 2 }}>
                  <TextField
                    fullWidth
                    label="Họ và tên"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    disabled={!editing}
                    InputProps={{
                      startAdornment: <PersonIcon color="action" sx={{ mr: 1 }} />,
                    }}
                  />

                  <TextField
                    fullWidth
                    label="Email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    disabled={!editing}
                    InputProps={{
                      startAdornment: <EmailIcon color="action" sx={{ mr: 1 }} />,
                    }}
                  />

                  <TextField
                    fullWidth
                    label="Phòng ban"
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    disabled={!editing}
                    InputProps={{
                      startAdornment: <BusinessIcon color="action" sx={{ mr: 1 }} />,
                    }}
                  />

                  <TextField
                    fullWidth
                    label="Chức vụ"
                    name="position"
                    value={formData.position}
                    onChange={handleInputChange}
                    disabled={!editing}
                    InputProps={{
                      startAdornment: <WorkIcon color="action" sx={{ mr: 1 }} />,
                    }}
                  />

                  <TextField
                    fullWidth
                    label="Số điện thoại"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    disabled={!editing}
                    InputProps={{
                      startAdornment: <PhoneIcon color="action" sx={{ mr: 1 }} />,
                    }}
                  />

                  {editing && (
                    <Box sx={{ pt: 2 }}>
                      <Button
                        variant="contained"
                        startIcon={loading ? <CircularProgress size={16} /> : <SaveIcon />}
                        onClick={handleSaveProfile}
                        disabled={loading}
                        sx={{ mr: 2 }}
                      >
                        {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={() => setEditing(false)}
                        disabled={loading}
                      >
                        Hủy
                      </Button>
                    </Box>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Change Password Dialog */}
      <Dialog open={showPasswordDialog} onClose={() => setShowPasswordDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Đổi mật khẩu</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Mật khẩu hiện tại"
              name="currentPassword"
              type={showPassword ? 'text' : 'password'}
              value={passwordData.currentPassword}
              onChange={handlePasswordChange}
              InputProps={{
                endAdornment: (
                  <IconButton onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                ),
              }}
            />

            <TextField
              fullWidth
              label="Mật khẩu mới"
              name="newPassword"
              type={showNewPassword ? 'text' : 'password'}
              value={passwordData.newPassword}
              onChange={handlePasswordChange}
              InputProps={{
                endAdornment: (
                  <IconButton onClick={() => setShowNewPassword(!showNewPassword)}>
                    {showNewPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                ),
              }}
            />

            <TextField
              fullWidth
              label="Xác nhận mật khẩu mới"
              name="confirmPassword"
              type="password"
              value={passwordData.confirmPassword}
              onChange={handlePasswordChange}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPasswordDialog(false)} disabled={loading}>
            Hủy
          </Button>
          <Button
            onClick={handleChangePassword}
            variant="contained"
            disabled={loading || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
            startIcon={loading ? <CircularProgress size={16} /> : <SaveIcon />}
          >
            {loading ? 'Đang cập nhật...' : 'Đổi mật khẩu'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Profile;
