import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  Button,
  TextField,
  Switch,
  FormControlLabel,
  Divider,
  Stack,
  Avatar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  useTheme as useMUITheme,
  alpha,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  Security as SecurityIcon,
  Language as LanguageIcon,
  Palette as PaletteIcon,
  Email as EmailIcon,
  VolumeUp as VolumeUpIcon,
  Save as SaveIcon,
  PhotoCamera as PhotoCameraIcon,
  Edit as EditIcon,
  Cancel as CancelIcon,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from '../../utils/toast';
import axios from 'axios';

const Settings = () => {
  const theme = useMUITheme();
  const { user, token, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  const [profileData, setProfileData] = useState({
    fullName: user?.fullName || '',
    phone: user?.phone || '',
    department: user?.department || '',
    position: user?.position || '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [notificationSettings, setNotificationSettings] = useState({
    email: user?.notificationSettings?.email ?? true,
    push: user?.notificationSettings?.push ?? true,
    meetingReminders: user?.notificationSettings?.meetingReminders ?? true,
    statusUpdates: user?.notificationSettings?.statusUpdates ?? false,
    weeklyReports: user?.notificationSettings?.weeklyReports ?? true,
  });

  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

  useEffect(() => {
    if (user) {
      setProfileData({
        fullName: user.fullName || '',
        phone: user.phone || '',
        department: user.department || '',
        position: user.position || '',
      });
      
      setNotificationSettings({
        email: user.notificationSettings?.email ?? true,
        push: user.notificationSettings?.push ?? true,
        meetingReminders: user.notificationSettings?.meetingReminders ?? true,
        statusUpdates: user.notificationSettings?.statusUpdates ?? false,
        weeklyReports: user.notificationSettings?.weeklyReports ?? true,
      });
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleNotificationChange = (setting) => {
    setNotificationSettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadAvatar = async () => {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('avatar', avatarFile);

      const response = await axios.put(`${API_BASE_URL}/auth/avatar`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        updateUser(response.data.user);
        setAvatarFile(null);
        setAvatarPreview(null);
        toast.success('Cập nhật ảnh đại diện thành công!');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi cập nhật ảnh đại diện');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setLoading(true);
      const response = await axios.put(`${API_BASE_URL}/auth/profile`, profileData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        updateUser(response.data.user);
        toast.success('Cập nhật thông tin thành công!');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi cập nhật thông tin');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotifications = async () => {
    try {
      setLoading(true);
      const response = await axios.put(`${API_BASE_URL}/auth/notification-settings`, 
        { notificationSettings }, 
        { headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        updateUser({ ...user, notificationSettings });
        toast.success('Cập nhật cài đặt thông báo thành công!');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi cập nhật cài đặt');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Mật khẩu mới phải có ít nhất 6 ký tự');
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

  const getUserAvatar = () => {
    if (avatarPreview) return avatarPreview;
    if (user?.avatar && user.avatar.startsWith('/uploads')) {
      return `${API_BASE_URL.replace('/api', '')}${user.avatar}`;
    }
    return user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.fullName || user?.email || 'U')}&background=1976d2&color=fff&bold=true`;
  };

  const tabs = [
    { id: 'general', label: 'Thông tin chung', icon: SettingsIcon },
    { id: 'notifications', label: 'Thông báo', icon: NotificationsIcon },
    { id: 'security', label: 'Bảo mật', icon: SecurityIcon },
  ];

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" fontWeight={600} gutterBottom>
            Cài đặt
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Quản lý cài đặt tài khoản và tùy chọn cá nhân
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {/* Sidebar tabs */}
          <Grid item xs={12} md={3}>
            <Paper sx={{ p: 2 }}>
              <List>
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <ListItem
                      key={tab.id}
                      button
                      selected={activeTab === tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      sx={{
                        borderRadius: 2,
                        mb: 1,
                        bgcolor: activeTab === tab.id ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
                        '&:hover': {
                          bgcolor: activeTab === tab.id 
                            ? alpha(theme.palette.primary.main, 0.12) 
                            : alpha(theme.palette.action.hover, 0.04)
                        }
                      }}
                    >
                      <Icon sx={{ mr: 2, color: activeTab === tab.id ? theme.palette.primary.main : 'inherit' }} />
                      <ListItemText primary={tab.label} />
                    </ListItem>
                  );
                })}
              </List>
            </Paper>
          </Grid>

          {/* Content */}
          <Grid item xs={12} md={9}>
            {activeTab === 'general' && (
              <Card>
                <CardHeader title="Thông tin cá nhân" />
                <CardContent>
                  <Stack spacing={3}>
                    {/* Avatar */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Avatar src={getUserAvatar()} sx={{ width: 100, height: 100 }} />
                      <Box>
                        <input
                          accept="image/*"
                          style={{ display: 'none' }}
                          id="avatar-upload"
                          type="file"
                          onChange={handleAvatarChange}
                        />
                        <label htmlFor="avatar-upload">
                          <Button
                            variant="outlined"
                            component="span"
                            startIcon={<PhotoCameraIcon />}
                            disabled={!avatarFile}
                            onClick={avatarFile ? uploadAvatar : undefined}
                          >
                            {avatarFile ? 'Lưu ảnh' : 'Chọn ảnh'}
                          </Button>
                        </label>
                      </Box>
                    </Box>

                    <Divider />

                    <TextField
                      fullWidth
                      label="Họ và tên"
                      name="fullName"
                      value={profileData.fullName}
                      onChange={handleInputChange}
                    />

                    <TextField
                      fullWidth
                      label="Email"
                      value={user?.email || ''}
                      disabled
                      helperText="Email không thể thay đổi"
                    />

                    <TextField
                      fullWidth
                      label="Số điện thoại"
                      name="phone"
                      value={profileData.phone}
                      onChange={handleInputChange}
                    />

                    <TextField
                      fullWidth
                      label="Phòng ban"
                      name="department"
                      value={profileData.department}
                      onChange={handleInputChange}
                    />

                    <TextField
                      fullWidth
                      label="Chức vụ"
                      name="position"
                      value={profileData.position}
                      onChange={handleInputChange}
                    />

                    <Button
                      variant="contained"
                      startIcon={<SaveIcon />}
                      onClick={handleSaveProfile}
                      disabled={loading}
                      sx={{ width: 'fit-content' }}
                    >
                      Lưu thay đổi
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            )}

            {activeTab === 'notifications' && (
              <Card>
                <CardHeader title="Cài đặt thông báo" />
                <CardContent>
                  <Stack spacing={2}>
                    <Alert severity="info" sx={{ mb: 2 }}>
                      Tùy chỉnh cách bạn nhận thông báo từ hệ thống
                    </Alert>

                    <FormControlLabel
                      control={
                        <Switch
                          checked={notificationSettings.email}
                          onChange={() => handleNotificationChange('email')}
                        />
                      }
                      label={
                        <Box>
                          <Typography fontWeight={500}>Email thông báo</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Nhận thông báo qua email
                          </Typography>
                        </Box>
                      }
                    />

                    <Divider />

                    <FormControlLabel
                      control={
                        <Switch
                          checked={notificationSettings.push}
                          onChange={() => handleNotificationChange('push')}
                        />
                      }
                      label={
                        <Box>
                          <Typography fontWeight={500}>Thông báo đẩy</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Nhận thông báo đẩy trong trình duyệt
                          </Typography>
                        </Box>
                      }
                    />

                    <Divider />

                    <FormControlLabel
                      control={
                        <Switch
                          checked={notificationSettings.meetingReminders}
                          onChange={() => handleNotificationChange('meetingReminders')}
                        />
                      }
                      label={
                        <Box>
                          <Typography fontWeight={500}>Nhắc nhở cuộc họp</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Nhận nhắc nhở trước cuộc họp
                          </Typography>
                        </Box>
                      }
                    />

                    <Divider />

                    <FormControlLabel
                      control={
                        <Switch
                          checked={notificationSettings.statusUpdates}
                          onChange={() => handleNotificationChange('statusUpdates')}
                        />
                      }
                      label={
                        <Box>
                          <Typography fontWeight={500}>Cập nhật trạng thái</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Nhận thông báo về thay đổi trạng thái cuộc họp
                          </Typography>
                        </Box>
                      }
                    />

                    <Divider />

                    <FormControlLabel
                      control={
                        <Switch
                          checked={notificationSettings.weeklyReports}
                          onChange={() => handleNotificationChange('weeklyReports')}
                        />
                      }
                      label={
                        <Box>
                          <Typography fontWeight={500}>Báo cáo hàng tuần</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Nhận báo cáo tóm tắt hàng tuần
                          </Typography>
                        </Box>
                      }
                    />

                    <Box sx={{ pt: 2 }}>
                      <Button
                        variant="contained"
                        startIcon={<SaveIcon />}
                        onClick={handleSaveNotifications}
                        disabled={loading}
                      >
                        Lưu cài đặt
                      </Button>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            )}

            {activeTab === 'security' && (
              <Card>
                <CardHeader title="Bảo mật" />
                <CardContent>
                  <Stack spacing={3}>
                    <Alert severity="info">
                      Quản lý mật khẩu và cài đặt bảo mật tài khoản
                    </Alert>

                    <Box>
                      <Typography variant="h6" gutterBottom>
                        Đổi mật khẩu
                      </Typography>
                      <Typography variant="body2" color="text.secondary" paragraph>
                        Sử dụng mật khẩu mạnh để bảo vệ tài khoản của bạn
                      </Typography>
                      <Button
                        variant="outlined"
                        startIcon={<SecurityIcon />}
                        onClick={() => setShowPasswordDialog(true)}
                      >
                        Đổi mật khẩu
                      </Button>
                    </Box>

                    <Divider />

                    <Box>
                      <Typography variant="h6" gutterBottom>
                        Thông tin đăng nhập
                      </Typography>
                      <Stack spacing={2}>
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Email đăng nhập
                          </Typography>
                          <Typography variant="body1" fontWeight={500}>
                            {user?.email}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Vai trò
                          </Typography>
                          <Typography variant="body1" fontWeight={500}>
                            {user?.role || 'employee'}
                          </Typography>
                        </Box>
                      </Stack>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            )}
          </Grid>
        </Grid>
      </Box>

      {/* Password Change Dialog */}
      <Dialog open={showPasswordDialog} onClose={() => setShowPasswordDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Đổi mật khẩu</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Mật khẩu hiện tại"
              type={showCurrentPassword ? 'text' : 'password'}
              name="currentPassword"
              value={passwordData.currentPassword}
              onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
              InputProps={{
                endAdornment: (
                  <IconButton
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    edge="end"
                  >
                    {showCurrentPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                )
              }}
            />

            <TextField
              fullWidth
              label="Mật khẩu mới"
              type={showNewPassword ? 'text' : 'password'}
              name="newPassword"
              value={passwordData.newPassword}
              onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
              InputProps={{
                endAdornment: (
                  <IconButton
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    edge="end"
                  >
                    {showNewPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                )
              }}
              helperText="Mật khẩu phải có ít nhất 6 ký tự"
            />

            <TextField
              fullWidth
              label="Xác nhận mật khẩu mới"
              type={showNewPassword ? 'text' : 'password'}
              name="confirmPassword"
              value={passwordData.confirmPassword}
              onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPasswordDialog(false)}>Hủy</Button>
          <Button
            variant="contained"
            onClick={handlePasswordChange}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
          >
            Đổi mật khẩu
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Settings;

