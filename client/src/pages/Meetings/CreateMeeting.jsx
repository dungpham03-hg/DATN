import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Autocomplete,
  Switch,
  FormControlLabel,
  Alert,
  Card,
  CardContent,
  Avatar,
  Divider,
  IconButton,
  Tooltip,
  Stack,
  useTheme,
  alpha
} from '@mui/material';
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Event as EventIcon,
  LocationOn as LocationIcon,
  Link as LinkIcon,
  People as PeopleIcon,
  Person as PersonIcon,
  Group as GroupIcon,
  Schedule as ScheduleIcon,
  Priority as PriorityIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Room as RoomIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';
// Removed MUI X Date Pickers to avoid dependency issues
import { useAuth } from '../../contexts/AuthContext';
import { UserExplorerModal } from '../../components/UserExplorer';
import axios from 'axios';

const CreateMeeting = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user, token } = useAuth();

  // Helper function to format date for datetime-local input
  const formatDateTimeLocal = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Helper function to format room location
  const formatRoomLocation = (location) => {
    if (!location) return 'Chưa có địa chỉ';
    
    if (typeof location === 'string') {
      return location;
    }
    
    if (typeof location === 'object') {
      const parts = [];
      if (location.building) parts.push(location.building);
      if (location.floor) parts.push(`Tầng ${location.floor}`);
      if (location.address) parts.push(location.address);
      
      return parts.length > 0 ? parts.join(' - ') : 'Chưa có địa chỉ';
    }
    
    return 'Chưa có địa chỉ';
  };

  const now = new Date();
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startTime: formatDateTimeLocal(now),
    endTime: formatDateTimeLocal(oneHourLater),
    location: '',
    meetingLink: '',
    meetingType: 'offline',
    priority: 'medium',
    attendees: [],
    organizer: null,
    secretary: null,
    agenda: '',
    tags: [],
    isPrivate: false
  });

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [users, setUsers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [tagInput, setTagInput] = useState('');
  
  // Modal states
  const [showAttendeesModal, setShowAttendeesModal] = useState(false);
  const [showSecretaryModal, setShowSecretaryModal] = useState(false);
  const [showOrganizerModal, setShowOrganizerModal] = useState(false);

  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

  // Fetch users for attendees selection
  useEffect(() => {
    fetchUsers();
  }, []);

  // Fetch available rooms when time changes
  useEffect(() => {
    if (formData.startTime && formData.endTime && formData.meetingType !== 'online') {
      fetchAvailableRooms();
    }
  }, [formData.startTime, formData.endTime, formData.meetingType]);

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await axios.get(`${API_BASE_URL}/auth/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchAvailableRooms = async () => {
    try {
      setLoadingRooms(true);
      const startDate = new Date(formData.startTime);
      const endDate = new Date(formData.endTime);
      
      const response = await axios.get(`${API_BASE_URL}/meeting-rooms`, {
        params: {
          startTime: startDate.toISOString(),
          endTime: endDate.toISOString(),
          isActive: true
        },
        headers: { Authorization: `Bearer ${token}` }
      });
      setRooms(response.data.rooms || []);
    } catch (error) {
      console.error('Error fetching rooms:', error);
      setRooms([]);
    } finally {
      setLoadingRooms(false);
    }
  };

  const handleInputChange = (field) => (event) => {
    const value = event.target.value;
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Reset location when meeting type changes
      if (field === 'meetingType') {
        newData.location = '';
        newData.meetingLink = '';
      }
      
      return newData;
    });
  };

  const handleDateTimeChange = (field) => (event) => {
    const value = event.target.value;
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Auto-adjust end time if start time is changed and end time is before start time
      if (field === 'startTime' && value) {
        const startDate = new Date(value);
        const endDate = new Date(prev.endTime);
        
        if (endDate <= startDate) {
          const newEndTime = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour later
          newData.endTime = formatDateTimeLocal(newEndTime);
        }
      }
      
      return newData;
    });
  };

  const handleAttendeesChange = (selectedUsers) => {
    setFormData(prev => ({
      ...prev,
      attendees: selectedUsers
    }));
  };

  const handleOrganizerChange = (selectedUsers) => {
    setFormData(prev => ({
      ...prev,
      organizer: selectedUsers.length > 0 ? selectedUsers[0] : null
    }));
  };

  const handleSecretaryChange = (selectedUsers) => {
    setFormData(prev => ({
      ...prev,
      secretary: selectedUsers.length > 0 ? selectedUsers[0] : null
    }));
  };

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && 
        !formData.tags.includes(trimmedTag) && 
        trimmedTag.length <= 50 &&
        formData.tags.length < 10) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, trimmedTag]
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      setError('Vui lòng nhập tiêu đề cuộc họp');
      return false;
    }
    
    if (formData.title.length < 3 || formData.title.length > 200) {
      setError('Tiêu đề phải từ 3-200 ký tự');
      return false;
    }

    if (!formData.startTime || !formData.endTime) {
      setError('Vui lòng chọn thời gian bắt đầu và kết thúc');
      return false;
    }

    const startDate = new Date(formData.startTime);
    const endDate = new Date(formData.endTime);

    if (endDate <= startDate) {
      setError('Thời gian kết thúc phải sau thời gian bắt đầu');
      return false;
    }

    if (startDate <= new Date()) {
      setError('Thời gian bắt đầu phải trong tương lai');
      return false;
    }

    if (formData.description && formData.description.length > 1000) {
      setError('Mô tả không được vượt quá 1000 ký tự');
      return false;
    }

    // Validate room selection for offline meetings
    if (formData.meetingType !== 'online' && !formData.location) {
      setError('Vui lòng chọn phòng họp');
      return false;
    }

    if (formData.meetingLink && formData.meetingLink.trim()) {
      try {
        new URL(formData.meetingLink);
      } catch {
        setError('Link cuộc họp phải là URL hợp lệ');
        return false;
      }
    }

    if (formData.agenda && formData.agenda.length > 2000) {
      setError('Chương trình không được vượt quá 2000 ký tự');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const submitData = {
        ...formData,
        organizer: formData.organizer?._id || user._id, // Use selected organizer or current user as fallback
        attendees: formData.attendees.map(user => user._id),
        secretary: formData.secretary?._id || null,
        room: formData.meetingType === 'offline' ? formData.location : undefined, // formData.location contains room ID
        location: formData.meetingType === 'online' ? formData.meetingLink : undefined,
        startTime: new Date(formData.startTime).toISOString(),
        endTime: new Date(formData.endTime).toISOString(),
        isPrivate: formData.isPrivate || false, // Ensure isPrivate is sent
        department: user.department // Ensure department is sent
      };

      console.log('📋 Form data location (room ID):', formData.location);
      console.log('📋 Meeting type:', formData.meetingType);
      console.log('📋 Room field in submitData:', submitData.room);

      console.log('📋 Submitting meeting data:', submitData);
      console.log('📋 User:', user);
      console.log('📋 Start time:', new Date(formData.startTime));
      console.log('📋 End time:', new Date(formData.endTime));
      console.log('📋 Current time:', new Date());
      console.log('📋 Is start time in future?', new Date(formData.startTime) > new Date());
      console.log('📋 Time difference (ms):', new Date(formData.startTime) - new Date());
      console.log('📋 Time difference (minutes):', (new Date(formData.startTime) - new Date()) / (1000 * 60));
      
      const response = await axios.post(`${API_BASE_URL}/meetings`, submitData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📋 Meeting created successfully:', response.data);
      console.log('📋 Created meeting details:', response.data.meeting);
      console.log('📋 Created meeting room info:', {
        room: response.data.meeting.room,
        location: response.data.meeting.location,
        hasRoom: !!response.data.meeting.room,
        roomName: response.data.meeting.room?.name
      });

      navigate('/meetings', { 
        state: { 
          message: 'Tạo cuộc họp thành công!',
          newMeetingId: response.data.meeting._id
        }
      });

    } catch (error) {
      console.error('Error creating meeting:', error);
      setError(
        error.response?.data?.message || 
        'Có lỗi xảy ra khi tạo cuộc họp. Vui lòng thử lại.'
      );
    } finally {
      setLoading(false);
    }
  };

  const meetingTypes = [
    { value: 'offline', label: 'Trực tiếp', icon: <RoomIcon /> },
    { value: 'online', label: 'Trực tuyến', icon: <LinkIcon /> },
    { value: 'hybrid', label: 'Kết hợp', icon: <EventIcon /> }
  ];

  const priorities = [
    { value: 'low', label: 'Thấp', color: 'success' },
    { value: 'medium', label: 'Trung bình', color: 'info' },
    { value: 'high', label: 'Cao', color: 'warning' },
    { value: 'urgent', label: 'Khẩn cấp', color: 'error' }
  ];

  return (
    <>
      <Container maxWidth="lg">
        <Box sx={{ py: 3 }}>
          {/* Header */}
          <Paper 
            elevation={0}
            sx={{ 
              mb: 4, 
              p: 4,
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
              color: 'white',
              borderRadius: 3
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <EventIcon sx={{ fontSize: 40 }} />
              <Box>
                <Typography variant="h4" fontWeight={700} gutterBottom>
                  Tạo cuộc họp mới
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.9 }}>
                  Tạo và lên lịch cuộc họp với các thành viên trong tổ chức
                </Typography>
              </Box>
            </Box>
          </Paper>

          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              {/* Basic Information */}
              <Grid item xs={12} md={8}>
                <Card elevation={0} sx={{ border: `1px solid ${alpha(theme.palette.divider, 0.1)}`, borderRadius: 3 }}>
                  <CardContent sx={{ p: 4 }}>
                    <Typography variant="h6" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AssignmentIcon color="primary" />
                      Thông tin cơ bản
                    </Typography>

                    <Grid container spacing={3}>
                      <Grid item xs={12}>
                        <TextField
                          label="Tiêu đề cuộc họp"
                          fullWidth
                          required
                          value={formData.title}
                          onChange={handleInputChange('title')}
                          error={formData.title.length > 200}
                          helperText={`${formData.title.length}/200 ký tự`}
                          sx={{ mb: 2 }}
                        />
                      </Grid>

                      <Grid item xs={12}>
                        <TextField
                          label="Mô tả"
                          fullWidth
                          multiline
                          rows={3}
                          value={formData.description}
                          onChange={handleInputChange('description')}
                          error={formData.description.length > 1000}
                          helperText={`${formData.description.length}/1000 ký tự`}
                        />
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <TextField
                          label="Thời gian bắt đầu"
                          type="datetime-local"
                          fullWidth
                          required
                          value={formData.startTime}
                          onChange={handleDateTimeChange('startTime')}
                          InputLabelProps={{
                            shrink: true,
                          }}
                          inputProps={{
                            min: formatDateTimeLocal(new Date())
                          }}
                        />
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <TextField
                          label="Thời gian kết thúc"
                          type="datetime-local"
                          fullWidth
                          required
                          value={formData.endTime}
                          onChange={handleDateTimeChange('endTime')}
                          InputLabelProps={{
                            shrink: true,
                          }}
                          inputProps={{
                            min: formData.startTime
                          }}
                        />
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                          <InputLabel>Loại cuộc họp</InputLabel>
                          <Select
                            value={formData.meetingType}
                            onChange={handleInputChange('meetingType')}
                            label="Loại cuộc họp"
                          >
                            {meetingTypes.map(type => (
                              <MenuItem key={type.value} value={type.value}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  {type.icon}
                                  {type.label}
                                </Box>
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                          <InputLabel>Mức độ ưu tiên</InputLabel>
                          <Select
                            value={formData.priority}
                            onChange={handleInputChange('priority')}
                            label="Mức độ ưu tiên"
                          >
                            {priorities.map(priority => (
                              <MenuItem key={priority.value} value={priority.value}>
                                <Chip 
                                  label={priority.label} 
                                  color={priority.color} 
                                  size="small"
                                />
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>

                      {formData.meetingType !== 'online' && (
                        <Grid item xs={12}>
                          <FormControl fullWidth>
                            <InputLabel>Phòng họp</InputLabel>
                                                         <Select
                               value={formData.location}
                               onChange={handleInputChange('location')}
                               label="Phòng họp"
                               error={!formData.location && formData.meetingType !== 'online'}
                             >
                                                             {rooms.filter(room => room.availabilityStatus === 'available').length === 0 && !loadingRooms ? (
                                 <MenuItem disabled>
                                   <Typography variant="body2" color="text.secondary">
                                     Không có phòng họp nào khả dụng trong thời gian này
                                   </Typography>
                                 </MenuItem>
                               ) : (
                                                                 rooms.filter(room => room.availabilityStatus === 'available').map((room) => (
                                   <MenuItem key={room._id} value={room._id}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                                      <RoomIcon color="primary" />
                                      <Box sx={{ flex: 1 }}>
                                        <Typography variant="body2" fontWeight={500}>
                                          {room.name}
                                        </Typography>
                                                                                 <Typography variant="caption" color="text.secondary">
                                           {room.capacity} người • {formatRoomLocation(room.location)}
                                         </Typography>
                                      </Box>
                                                                             <Chip 
                                         label={room.availabilityMessage || "Khả dụng"} 
                                         color={room.availabilityStatus === 'available' ? 'success' : 'error'} 
                                         size="small"
                                       />
                                    </Box>
                                  </MenuItem>
                                ))
                              )}
                            </Select>
                            {loadingRooms && (
                              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                Đang tải danh sách phòng họp...
                              </Typography>
                            )}
                                                         {!loadingRooms && rooms.filter(room => room.availabilityStatus === 'available').length === 0 && (
                               <Typography variant="caption" color="warning.main" sx={{ mt: 1, display: 'block' }}>
                                 Không có phòng họp nào khả dụng trong thời gian đã chọn. Vui lòng chọn thời gian khác.
                               </Typography>
                             )}
                          </FormControl>
                        </Grid>
                      )}

                      {formData.meetingType !== 'offline' && (
                        <Grid item xs={12}>
                          <TextField
                            label="Link cuộc họp"
                            fullWidth
                            value={formData.meetingLink}
                            onChange={handleInputChange('meetingLink')}
                            placeholder="https://meet.google.com/xxx-xxxx-xxx"
                            InputProps={{
                              startAdornment: <LinkIcon sx={{ mr: 1, color: 'text.secondary' }} />
                            }}
                          />
                        </Grid>
                      )}

                      <Grid item xs={12}>
                        <TextField
                          label="Chương trình họp"
                          fullWidth
                          multiline
                          rows={4}
                          value={formData.agenda}
                          onChange={handleInputChange('agenda')}
                          error={formData.agenda.length > 2000}
                          helperText={`${formData.agenda.length}/2000 ký tự`}
                          placeholder="Nhập nội dung chương trình họp..."
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              {/* Participants & Settings */}
              <Grid item xs={12} md={4}>
                <Stack spacing={3}>
                  {/* Participants */}
                  <Card elevation={0} sx={{ border: `1px solid ${alpha(theme.palette.divider, 0.1)}`, borderRadius: 3 }}>
                    <CardContent sx={{ p: 3 }}>
                      <Typography variant="h6" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PeopleIcon color="primary" />
                        Người tham gia cuộc họp
                      </Typography>

                      {/* Organizer */}
                      <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <PersonIcon fontSize="small" />
                          Người chủ trì
                        </Typography>
                        <Button
                          variant="outlined"
                          fullWidth
                          onClick={() => setShowOrganizerModal(true)}
                          sx={{ 
                            justifyContent: 'flex-start', 
                            textAlign: 'left',
                            py: 1.5,
                            mb: 1
                          }}
                        >
                          {formData.organizer ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {formData.organizer.avatar ? 
                                <Avatar src={formData.organizer.avatar} sx={{ width: 24, height: 24 }} /> :
                                <Avatar sx={{ width: 24, height: 24, fontSize: 12 }}>
                                  {formData.organizer.fullName?.charAt(0)?.toUpperCase()}
                                </Avatar>
                              }
                              <Box>
                                <Typography variant="body2">{formData.organizer.fullName}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {formData.organizer.department} • {formData.organizer.position || formData.organizer.role}
                                </Typography>
                              </Box>
                            </Box>
                          ) : (
                            <Typography color="text.secondary">Chọn người chủ trì</Typography>
                          )}
                        </Button>
                        {!formData.organizer && (
                          <Typography variant="caption" color="text.secondary">
                            Mặc định: {user?.fullName} (người tạo cuộc họp)
                          </Typography>
                        )}
                      </Box>

                      {/* Attendees */}
                      <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <GroupIcon fontSize="small" />
                          Người tham gia ({formData.attendees.length})
                        </Typography>
                        <Button
                          variant="outlined"
                          fullWidth
                          onClick={() => setShowAttendeesModal(true)}
                          sx={{ 
                            justifyContent: 'flex-start', 
                            textAlign: 'left',
                            py: 1.5,
                            mb: 1
                          }}
                        >
                          {formData.attendees.length > 0 ? (
                            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ width: '100%' }}>
                              <Stack direction="row" spacing={-0.5}>
                                {formData.attendees.slice(0, 3).map((attendee, index) => (
                                  <Avatar
                                    key={attendee._id}
                                    src={attendee.avatar}
                                    sx={{ 
                                      width: 24, 
                                      height: 24, 
                                      fontSize: 12,
                                      border: '1px solid white'
                                    }}
                                  >
                                    {attendee.fullName?.charAt(0)?.toUpperCase()}
                                  </Avatar>
                                ))}
                                {formData.attendees.length > 3 && (
                                  <Avatar sx={{ width: 24, height: 24, fontSize: 10, bgcolor: 'grey.400' }}>
                                    +{formData.attendees.length - 3}
                                  </Avatar>
                                )}
                              </Stack>
                              <Typography variant="body2" sx={{ ml: 1 }}>
                                {formData.attendees.length === 1 
                                  ? formData.attendees[0].fullName
                                  : `${formData.attendees.length} người được chọn`
                                }
                              </Typography>
                            </Stack>
                          ) : (
                            <Typography color="text.secondary">Chọn người tham gia</Typography>
                          )}
                        </Button>
                        
                        {/* Selected attendees chips */}
                        {formData.attendees.length > 0 && (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                            {formData.attendees.slice(0, 4).map((attendee) => (
                              <Chip
                                key={attendee._id}
                                label={attendee.fullName}
                                size="small"
                                variant="outlined"
                                onDelete={() => {
                                  setFormData(prev => ({
                                    ...prev,
                                    attendees: prev.attendees.filter(a => a._id !== attendee._id)
                                  }));
                                }}
                                avatar={
                                  attendee.avatar ? 
                                    <Avatar src={attendee.avatar} /> :
                                    <Avatar>{attendee.fullName?.charAt(0)?.toUpperCase()}</Avatar>
                                }
                              />
                            ))}
                            {formData.attendees.length > 4 && (
                              <Chip 
                                label={`+${formData.attendees.length - 4} khác`} 
                                size="small" 
                                variant="outlined" 
                              />
                            )}
                          </Box>
                        )}
                      </Box>

                      {/* Secretary */}
                      <Box>
                        <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <AssignmentIcon fontSize="small" />
                          Thư ký (tùy chọn)
                        </Typography>
                        <Button
                          variant="outlined"
                          fullWidth
                          onClick={() => setShowSecretaryModal(true)}
                          sx={{ 
                            justifyContent: 'flex-start', 
                            textAlign: 'left',
                            py: 1.5
                          }}
                        >
                          {formData.secretary ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {formData.secretary.avatar ? 
                                <Avatar src={formData.secretary.avatar} sx={{ width: 24, height: 24 }} /> :
                                <Avatar sx={{ width: 24, height: 24, fontSize: 12 }}>
                                  {formData.secretary.fullName?.charAt(0)?.toUpperCase()}
                                </Avatar>
                              }
                              <Box>
                                <Typography variant="body2">{formData.secretary.fullName}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {formData.secretary.role} • {formData.secretary.department}
                                </Typography>
                              </Box>
                            </Box>
                          ) : (
                            <Typography color="text.secondary">Chọn thư ký</Typography>
                          )}
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>

                  {/* Tags */}
                  <Card elevation={0} sx={{ border: `1px solid ${alpha(theme.palette.divider, 0.1)}`, borderRadius: 3 }}>
                    <CardContent sx={{ p: 3 }}>
                      <Typography variant="h6" fontWeight={600} gutterBottom>
                        Tags
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Thêm tags để phân loại cuộc họp (tối đa 10 tags, mỗi tag tối đa 50 ký tự)
                      </Typography>

                      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                        <TextField
                          size="small"
                          placeholder="Nhập tag..."
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                          error={tagInput.length > 50}
                          helperText={tagInput.length > 50 ? 'Tag không được vượt quá 50 ký tự' : `${tagInput.length}/50`}
                          sx={{ flex: 1 }}
                        />
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={handleAddTag}
                          disabled={
                            !tagInput.trim() || 
                            tagInput.length > 50 || 
                            formData.tags.length >= 10 ||
                            formData.tags.includes(tagInput.trim())
                          }
                        >
                          <AddIcon />
                        </Button>
                      </Box>

                      {formData.tags.length >= 10 && (
                        <Typography variant="caption" color="error" sx={{ mb: 1, display: 'block' }}>
                          Đã đạt giới hạn tối đa 10 tags
                        </Typography>
                      )}

                      {formData.tags.length > 0 ? (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                          {formData.tags.map((tag, index) => (
                            <Chip
                              key={index}
                              label={tag}
                              onDelete={() => handleRemoveTag(tag)}
                              color="primary"
                              variant="outlined"
                              size="small"
                              sx={{
                                maxWidth: 150,
                                '& .MuiChip-label': {
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }
                              }}
                            />
                          ))}
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                          Chưa có tag nào. Thêm tags để phân loại cuộc họp.
                        </Typography>
                      )}
                      
                      {formData.tags.length > 0 && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                          {formData.tags.length}/10 tags
                        </Typography>
                      )}
                    </CardContent>
                  </Card>

                  {/* Settings */}
                  <Card elevation={0} sx={{ border: `1px solid ${alpha(theme.palette.divider, 0.1)}`, borderRadius: 3 }}>
                    <CardContent sx={{ p: 3 }}>
                      <Typography variant="h6" fontWeight={600} gutterBottom>
                        Cài đặt
                      </Typography>

                      <FormControlLabel
                        control={
                          <Switch
                            checked={formData.isPrivate}
                            onChange={(e) => setFormData(prev => ({ ...prev, isPrivate: e.target.checked }))}
                          />
                        }
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {formData.isPrivate ? <VisibilityOffIcon /> : <VisibilityIcon />}
                            {formData.isPrivate ? 'Cuộc họp riêng tư' : 'Cuộc họp công khai'}
                          </Box>
                        }
                      />
                    </CardContent>
                  </Card>
                </Stack>
              </Grid>

              {/* Actions */}
              <Grid item xs={12}>
                {error && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                  </Alert>
                )}

                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                  <Button
                    variant="outlined"
                    size="large"
                    startIcon={<CancelIcon />}
                    onClick={() => navigate('/meetings')}
                    disabled={loading}
                  >
                    Hủy
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    startIcon={<SaveIcon />}
                    disabled={loading}
                    sx={{ minWidth: 140 }}
                  >
                    {loading ? 'Đang tạo...' : 'Tạo cuộc họp'}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </form>
        </Box>
      </Container>

      {/* User Selection Modals */}
      <UserExplorerModal
        open={showOrganizerModal}
        onClose={() => setShowOrganizerModal(false)}
        onConfirm={handleOrganizerChange}
        title="Chọn người chủ trì"
        initialSelected={formData.organizer ? [formData.organizer] : []}
        multiSelect={false}
      />

      <UserExplorerModal
        open={showAttendeesModal}
        onClose={() => setShowAttendeesModal(false)}
        onConfirm={handleAttendeesChange}
        title="Chọn người tham gia"
        initialSelected={formData.attendees}
        multiSelect={true}
      />

      <UserExplorerModal
        open={showSecretaryModal}
        onClose={() => setShowSecretaryModal(false)}
        onConfirm={handleSecretaryChange}
        title="Chọn thư ký"
        initialSelected={formData.secretary ? [formData.secretary] : []}
        multiSelect={false}
        filterRoles={['secretary']}
      />
    </>
  );
};

export default CreateMeeting;
