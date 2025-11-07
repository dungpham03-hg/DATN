import React, { useEffect, useMemo, useState } from 'react';
import {
  Container,
  Paper,
  Box,
  Stack,
  Typography,
  Grid,
  TextField,
  MenuItem,
  Button,
  Chip,
  Card,
  CardContent,
  CardActions,
  Divider,
  Tooltip,
  IconButton,
  Skeleton,
  alpha,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  MeetingRoom as RoomIcon,
  LocationOn as LocationIcon,
  Groups as GroupsIcon,
  Info as InfoIcon,
  Event as EventIcon,
  AccessTime as AccessTimeIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';

const MeetingRooms = () => {
  const theme = useTheme();
  const { token, user } = useAuth();

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({ floor: '', minCapacity: '', isActive: 'true' });
  const [timeFilter, setTimeFilter] = useState({ startTime: '', endTime: '', showAll: 'false' });
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [openDetail, setOpenDetail] = useState(false);
  const [openForm, setOpenForm] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [usageHistory, setUsageHistory] = useState([]);
  const [showUsageHistory, setShowUsageHistory] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    capacity: '',
    location: { floor: '', building: '', address: '' },
    facilities: [],
    description: '',
    isActive: true
  });

  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';
  const FACILITY_OPTIONS = [
    { value: 'projector', label: 'Máy chiếu' },
    { value: 'whiteboard', label: 'Bảng trắng' },
    { value: 'tv', label: 'Tivi' },
    { value: 'video_conference', label: 'Thiết bị họp trực tuyến' },
    { value: 'sound_system', label: 'Hệ thống âm thanh' },
    { value: 'air_conditioning', label: 'Điều hòa' },
    { value: 'wifi', label: 'Wi‑Fi' }
  ];
  const canCreateOrEdit = user && ['admin', 'manager', 'technician'].includes(user.role);
  const canDelete = user && ['admin', 'technician'].includes(user.role);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      setShowUsageHistory(false);
      const params = {};
      if (filters.isActive !== '') params.isActive = filters.isActive;
      if (filters.floor) params.floor = filters.floor;
      if (filters.minCapacity) params.minCapacity = Number(filters.minCapacity);

      // Nếu có chọn khoảng thời gian thì dùng API trạng thái/phòng trống
      if (timeFilter.startTime && timeFilter.endTime) {
        params.startTime = new Date(timeFilter.startTime).toISOString();
        params.endTime = new Date(timeFilter.endTime).toISOString();
        params.showAll = timeFilter.showAll;
      }

      const response = await axios.get(`${API_BASE_URL}/meeting-rooms`, {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });
      setRooms(response.data.rooms || []);
    } catch (error) {
      console.error('Error fetching meeting rooms:', error);
      setRooms([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsageHistory = async () => {
    if (!timeFilter.startTime || !timeFilter.endTime) {
      alert('Vui lòng chọn thời gian bắt đầu và kết thúc');
      return;
    }

    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/meeting-rooms/usage-history`, {
        params: {
          startTime: new Date(timeFilter.startTime).toISOString(),
          endTime: new Date(timeFilter.endTime).toISOString()
        },
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsageHistory(response.data.usageHistory || []);
      setShowUsageHistory(true);
    } catch (error) {
      console.error('Error fetching usage history:', error);
      alert(error.response?.data?.message || 'Có lỗi xảy ra khi tra cứu lịch sử');
      setUsageHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateTime) => {
    if (!dateTime) return '—';
    const date = new Date(dateTime);
    return date.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  useEffect(() => {
    fetchRooms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredRooms = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rooms;
    return rooms.filter((r) =>
      [r.name, r.location?.building, r.location?.floor, r.location?.address]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [rooms, query]);

  const formatLocation = (loc) => {
    if (!loc) return '—';
    const parts = [loc.building, loc.floor, loc.address].filter(Boolean);
    return parts.join(' • ');
  };

  const handleOpenDetail = (room) => {
    setSelectedRoom(room);
    setOpenDetail(true);
  };

  const handleCloseDetail = () => {
    setOpenDetail(false);
    setSelectedRoom(null);
  };

  const openCreate = () => {
    setIsEdit(false);
    setFormData({
      name: '',
      capacity: '',
      location: { floor: '', building: '', address: '' },
      facilities: [],
      description: '',
      isActive: true
    });
    setOpenForm(true);
  };

  const openEdit = (room) => {
    setIsEdit(true);
    setFormData({
      name: room.name || '',
      capacity: room.capacity || '',
      location: {
        floor: room.location?.floor || '',
        building: room.location?.building || '',
        address: room.location?.address || ''
      },
      facilities: Array.isArray(room.facilities) ? room.facilities : [],
      description: room.description || '',
      isActive: room.isActive !== false
    });
    setSelectedRoom(room);
    setOpenForm(true);
  };

  const closeForm = () => {
    setOpenForm(false);
    setSelectedRoom(null);
  };

  const handleFormChange = (path, value) => {
    setFormData((prev) => {
      if (path.startsWith('location.')) {
        const key = path.split('.')[1];
        return { ...prev, location: { ...prev.location, [key]: value } };
      }
      return { ...prev, [path]: value };
    });
  };

  const submitForm = async () => {
    try {
      const payload = {
        name: formData.name,
        capacity: Number(formData.capacity),
        location: {
          floor: formData.location.floor,
          building: formData.location.building,
          address: formData.location.address
        },
        facilities: formData.facilities,
        description: formData.description,
        isActive: !!formData.isActive
      };

      if (isEdit && selectedRoom?._id) {
        await axios.put(`${API_BASE_URL}/meeting-rooms/${selectedRoom._id}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post(`${API_BASE_URL}/meeting-rooms`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      closeForm();
      fetchRooms();
    } catch (error) {
      console.error('Error submit room form:', error);
    }
  };

  const deactivateRoom = async (roomId) => {
    if (!window.confirm('Bạn có chắc chắn muốn vô hiệu hóa phòng họp này? Phòng sẽ không khả dụng cho các yêu cầu đặt phòng mới.')) {
      return;
    }

    try {
      const response = await axios.put(`${API_BASE_URL}/meeting-rooms/${roomId}/deactivate`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.warning) {
        alert(response.data.warning);
      } else {
        alert('Vô hiệu hóa phòng họp thành công');
      }
      
      fetchRooms();
    } catch (error) {
      console.error('Error deactivating room:', error);
      alert(error.response?.data?.message || 'Có lỗi xảy ra khi vô hiệu hóa phòng họp');
    }
  };

  const activateRoom = async (roomId) => {
    try {
      await axios.put(`${API_BASE_URL}/meeting-rooms/${roomId}/activate`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Kích hoạt lại phòng họp thành công');
      fetchRooms();
    } catch (error) {
      console.error('Error activating room:', error);
      alert(error.response?.data?.message || 'Có lỗi xảy ra khi kích hoạt lại phòng họp');
    }
  };

  const deleteRoom = async (roomId, force = false) => {
    const confirmMessage = force 
      ? '⚠️ CẢNH BÁO: Bạn có chắc chắn muốn XÓA VĨNH VIỄN phòng họp này? Hành động này không thể hoàn tác và sẽ mất tất cả dữ liệu lịch sử liên quan đến phòng này.'
      : 'Bạn có chắc chắn muốn xóa phòng họp này? Phòng sẽ bị xóa vĩnh viễn khỏi hệ thống.';

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      const params = force ? { params: { force: 'true' } } : {};
      const response = await axios.delete(`${API_BASE_URL}/meeting-rooms/${roomId}`, {
        ...params,
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert(response.data.message || 'Xóa phòng họp thành công');
      fetchRooms();
    } catch (error) {
      console.error('Error deleting room:', error);
      const errorData = error.response?.data;
      
      if (error.response?.status === 400 && errorData?.warning) {
        // Nếu có cảnh báo về lịch sử, hỏi xem có muốn force delete không
        if (errorData.completedMeetingsCount && !force) {
          const forceDelete = window.confirm(
            `${errorData.warning}\n\nBạn có muốn xóa phòng này bất chấp lịch sử? (Hành động này không thể hoàn tác)`
          );
          if (forceDelete) {
            deleteRoom(roomId, true);
            return;
          }
        } else {
          // Có cuộc họp sắp tới, không thể xóa
          alert(errorData.warning || errorData.message);
        }
      } else {
        alert(errorData?.message || 'Có lỗi xảy ra khi xóa phòng họp');
      }
    }
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 3 }}>
        {/* Header */}
        <Paper
          elevation={0}
          sx={{
            mb: 3,
            p: 3,
            borderRadius: 3,
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            background: theme.palette.mode === 'light' ? 'linear-gradient(180deg, #fff 0%, #fafafa 100%)' : 'linear-gradient(180deg, #121212 0%, #0f0f0f 100%)'
          }}
        >
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between">
            <Stack direction="row" spacing={2} alignItems="center">
              <Box sx={{
                width: 44,
                height: 44,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 1.5,
                bgcolor: alpha(theme.palette.success.main, 0.12),
                color: theme.palette.success.main
              }}>
                <RoomIcon />
              </Box>
              <Box>
                <Typography variant="h6" fontWeight={700}>Quản lý phòng họp</Typography>
                <Typography variant="body2" color="text.secondary">
                  Xem, lọc và kiểm tra trạng thái phòng theo thời gian
                </Typography>
              </Box>
            </Stack>
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={fetchRooms}
              >
                Làm mới
              </Button>
              {canCreateOrEdit && (
                <Button variant="contained" onClick={openCreate}>Thêm phòng</Button>
              )}
            </Stack>
          </Stack>
        </Paper>

        {/* Filters */}
        <Paper elevation={0} sx={{ p: 2, borderRadius: 2, mb: 3, border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
          <Grid container spacing={1.5} alignItems="center">
            <Grid item xs={12} md>
              <TextField
                fullWidth
                placeholder="Tìm theo tên, tòa nhà, tầng, địa chỉ..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                InputProps={{ startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} /> }}
              />
            </Grid>
            <Grid item xs={6} sm={4} md={'auto'}>
              <TextField
                select
                label="Đang hoạt động"
                value={filters.isActive}
                onChange={(e) => setFilters((prev) => ({ ...prev, isActive: e.target.value }))}
                sx={{ minWidth: 160 }}
              >
                <MenuItem value="">Tất cả</MenuItem>
                <MenuItem value="true">Có</MenuItem>
                <MenuItem value="false">Không</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={6} sm={4} md={'auto'}>
              <TextField
                label="Tầng"
                value={filters.floor}
                onChange={(e) => setFilters((prev) => ({ ...prev, floor: e.target.value }))}
                sx={{ minWidth: 120 }}
              />
            </Grid>
            <Grid item xs={6} sm={4} md={'auto'}>
              <TextField
                type="number"
                label="Sức chứa tối thiểu"
                value={filters.minCapacity}
                onChange={(e) => setFilters((prev) => ({ ...prev, minCapacity: e.target.value }))}
                sx={{ minWidth: 180 }}
                inputProps={{ min: 0 }}
              />
            </Grid>
            <Grid item xs={12} md={'auto'}>
              <Button
                variant="contained"
                startIcon={<FilterIcon />}
                onClick={fetchRooms}
              >
                Áp dụng lọc
              </Button>
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          <Grid container spacing={1.5}>
            <Grid item xs={12} md={4}>
              <TextField
                type="datetime-local"
                label="Bắt đầu"
                value={timeFilter.startTime}
                onChange={(e) => setTimeFilter((p) => ({ ...p, startTime: e.target.value }))}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                type="datetime-local"
                label="Kết thúc"
                value={timeFilter.endTime}
                onChange={(e) => setTimeFilter((p) => ({ ...p, endTime: e.target.value }))}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                select
                label="Hiển thị"
                value={timeFilter.showAll}
                onChange={(e) => setTimeFilter((p) => ({ ...p, showAll: e.target.value }))}
                fullWidth
              >
                <MenuItem value="false">Chỉ phòng khả dụng</MenuItem>
                <MenuItem value="true">Tất cả (kèm trạng thái)</MenuItem>
              </TextField>
            </Grid>
          </Grid>
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1 }}>
            {showUsageHistory && (
              <Button 
                variant="outlined" 
                onClick={() => {
                  setShowUsageHistory(false);
                  fetchRooms();
                }}
              >
                Quay lại danh sách phòng
              </Button>
            )}
            <Button variant="outlined" onClick={fetchUsageHistory}>Tra cứu theo thời gian</Button>
          </Box>
        </Paper>

        {/* Content */}
        {loading ? (
          <Grid container spacing={3}>
            {Array.from({ length: 6 }).map((_, idx) => (
              <Grid item xs={12} md={6} lg={4} key={idx}>
                <Card elevation={0} sx={{ borderRadius: 2, border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
                  <CardContent>
                    <Skeleton variant="rounded" height={160} />
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : showUsageHistory ? (
          <>
            <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 2, border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                <EventIcon sx={{ color: theme.palette.primary.main }} />
                <Typography variant="h6" fontWeight={700}>
                  Lịch sử sử dụng phòng
                </Typography>
                <Chip label={`${usageHistory.length} cuộc họp`} size="small" color="primary" />
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Khoảng thời gian: {formatDateTime(timeFilter.startTime)} - {formatDateTime(timeFilter.endTime)}
              </Typography>
            </Paper>
            {usageHistory.length === 0 ? (
              <Paper elevation={0} sx={{ p: 4, textAlign: 'center', borderRadius: 2, border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
                <Typography variant="body1">Không có cuộc họp nào sử dụng phòng trong khoảng thời gian này.</Typography>
              </Paper>
            ) : (
              <Grid container spacing={3}>
                {usageHistory.map((item) => (
                  <Grid item xs={12} md={6} lg={4} key={item.meetingId}>
                    <Card elevation={0} sx={{ borderRadius: 2, border: `1px solid ${alpha(theme.palette.divider, 0.1)}`, transition: 'all .2s ease', '&:hover': { boxShadow: theme.shadows[3], transform: 'translateY(-2px)' } }}>
                      <CardContent>
                        <Stack direction="row" spacing={2} alignItems="flex-start">
                          <Box sx={{
                            width: 44,
                            height: 44,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 1.5,
                            bgcolor: alpha(theme.palette.info.main, 0.1),
                            color: theme.palette.info.main
                          }}>
                            <EventIcon />
                          </Box>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="subtitle1" fontWeight={700} noWrap>{item.meetingTitle}</Typography>
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                              <RoomIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                              <Typography variant="body2" color="text.secondary" noWrap>
                                {item.roomName}
                              </Typography>
                            </Stack>
                            {item.roomLocation && item.roomLocation !== '—' && (
                              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                                <LocationIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                                <Typography variant="body2" color="text.secondary" noWrap>
                                  {item.roomLocation}
                                </Typography>
                              </Stack>
                            )}
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                              <AccessTimeIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                              <Typography variant="body2" color="text.secondary">
                                {formatDateTime(item.startTime)} - {formatDateTime(item.endTime)}
                              </Typography>
                            </Stack>
                            {item.duration && (
                              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, ml: 3 }}>
                                Thời lượng: {item.duration} phút
                              </Typography>
                            )}
                            {item.organizer && (
                              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                                <PersonIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                                <Typography variant="body2" color="text.secondary" noWrap>
                                  {item.organizer.name}
                                </Typography>
                              </Stack>
                            )}
                          </Box>
                        </Stack>
                        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                          <Chip 
                            label={item.status === 'completed' ? 'Đã hoàn thành' : 
                                   item.status === 'scheduled' ? 'Đã lên lịch' :
                                   item.status === 'ongoing' ? 'Đang diễn ra' :
                                   item.status === 'cancelled' ? 'Đã hủy' :
                                   item.status === 'postponed' ? 'Đã hoãn' : item.status}
                            size="small"
                            color={item.status === 'completed' ? 'success' : 
                                   item.status === 'scheduled' ? 'info' :
                                   item.status === 'ongoing' ? 'warning' :
                                   item.status === 'cancelled' ? 'error' : 'default'}
                          />
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </>
        ) : (
          <>
            {filteredRooms.length === 0 ? (
              <Paper elevation={0} sx={{ p: 4, textAlign: 'center', borderRadius: 2, border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
                <Typography variant="body1">Không có phòng nào phù hợp.</Typography>
              </Paper>
            ) : (
              <Grid container spacing={3}>
                {filteredRooms.map((room) => (
                  <Grid item xs={12} md={6} lg={4} key={room._id}>
                    <Card elevation={0} sx={{ borderRadius: 2, border: `1px solid ${alpha(theme.palette.divider, 0.1)}`, transition: 'all .2s ease', '&:hover': { boxShadow: theme.shadows[3], transform: 'translateY(-2px)' } }}>
                      <CardContent>
                        <Stack direction="row" spacing={2} alignItems="flex-start">
                          <Box sx={{
                            width: 44,
                            height: 44,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 1.5,
                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                            color: theme.palette.primary.main
                          }}>
                            <RoomIcon />
                          </Box>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="subtitle1" fontWeight={700} noWrap>{room.name}</Typography>
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                              <LocationIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                              <Typography variant="body2" color="text.secondary" noWrap>
                                {formatLocation(room.location)}
                              </Typography>
                            </Stack>
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                              <GroupsIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                              <Typography variant="body2" color="text.secondary">
                                Sức chứa: {room.capacity || '—'} người
                              </Typography>
                              {room.availabilityStatus && (
                                <Chip
                                  label={room.availabilityMessage || room.availabilityStatus}
                                  color={room.availabilityStatus === 'available' ? 'success' : 'warning'}
                                  size="small"
                                  sx={{ ml: 'auto' }}
                                />
                              )}
                            </Stack>
                          </Box>
                          <Tooltip title="Xem chi tiết">
                            <IconButton onClick={() => handleOpenDetail(room)}>
                              <InfoIcon />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                        {room.description && (
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                            {room.description}
                          </Typography>
                        )}
                        {Array.isArray(room.facilities) && room.facilities.length > 0 && (
                          <Box sx={{ mt: 1.25, display: 'flex', flexWrap: 'wrap' }}>
                            {room.facilities.map((f) => {
                              const opt = FACILITY_OPTIONS.find((o) => o.value === f);
                              return (
                                <Chip
                                  key={f}
                                  label={opt?.label || f}
                                  size="small"
                                  sx={{ mr: 0.75, mb: 0.75 }}
                                />
                              );
                            })}
                          </Box>
                        )}
                      </CardContent>
                      <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                        <Chip size="small" label={room.isActive === false ? 'Đang vô hiệu' : 'Đang hoạt động'} color={room.isActive === false ? 'default' : 'success'} />
                        <Box>
                          <Button size="small" onClick={() => handleOpenDetail(room)}>Chi tiết</Button>
                          {canCreateOrEdit && (
                            <Button size="small" onClick={() => openEdit(room)}>Sửa</Button>
                          )}
                          {canDelete && (
                            <>
                              {room.isActive === false ? (
                                <Button size="small" color="success" onClick={() => activateRoom(room._id)}>Kích hoạt</Button>
                              ) : (
                                <Button size="small" color="warning" onClick={() => deactivateRoom(room._id)}>Vô hiệu</Button>
                              )}
                              <Button 
                                size="small" 
                                color="error" 
                                onClick={() => deleteRoom(room._id)}
                                sx={{ ml: 0.5 }}
                              >
                                Xóa
                              </Button>
                            </>
                          )}
                        </Box>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </>
        )}

        {/* Detail Dialog */}
        <Dialog open={openDetail} onClose={handleCloseDetail} maxWidth="sm" fullWidth>
          <DialogTitle>Chi tiết phòng họp</DialogTitle>
          <DialogContent dividers>
            {selectedRoom && (
              <Stack spacing={1.5}>
                <Typography variant="h6">{selectedRoom.name}</Typography>
                <Typography variant="body2" color="text.secondary">{formatLocation(selectedRoom.location)}</Typography>
                <Typography variant="body2">Sức chứa: {selectedRoom.capacity || '—'} người</Typography>
                {selectedRoom.availabilityStatus && (
                  <Chip
                    label={selectedRoom.availabilityMessage || selectedRoom.availabilityStatus}
                    color={selectedRoom.availabilityStatus === 'available' ? 'success' : 'default'}
                    size="small"
                    sx={{ width: 'fit-content' }}
                  />
                )}
                {selectedRoom.description && (
                  <Typography variant="body2" color="text.secondary">{selectedRoom.description}</Typography>
                )}
                {Array.isArray(selectedRoom.facilities) && selectedRoom.facilities.length > 0 && (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap' }}>
                    {selectedRoom.facilities.map((f) => {
                      const opt = FACILITY_OPTIONS.find((o) => o.value === f);
                      return (
                        <Chip
                          key={f}
                          label={opt?.label || f}
                          size="small"
                          sx={{ mr: 0.75, mb: 0.75 }}
                        />
                      );
                    })}
                  </Box>
                )}
              </Stack>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDetail}>Đóng</Button>
          </DialogActions>
        </Dialog>
      </Box>

      {/* Create/Edit Dialog */}
      <Dialog open={openForm} onClose={closeForm} maxWidth="sm" fullWidth>
        <DialogTitle>{isEdit ? 'Chỉnh sửa phòng họp' : 'Thêm phòng họp'}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12} md={8}>
              <TextField
                label="Tên phòng"
                fullWidth
                value={formData.name}
                onChange={(e) => handleFormChange('name', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                type="number"
                label="Sức chứa"
                fullWidth
                value={formData.capacity}
                onChange={(e) => handleFormChange('capacity', e.target.value)}
                inputProps={{ min: 1 }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField label="Tầng" fullWidth value={formData.location.floor} onChange={(e) => handleFormChange('location.floor', e.target.value)} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField label="Tòa nhà" fullWidth value={formData.location.building} onChange={(e) => handleFormChange('location.building', e.target.value)} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField label="Địa chỉ" fullWidth value={formData.location.address} onChange={(e) => handleFormChange('location.address', e.target.value)} />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Mô tả"
                fullWidth
                multiline
                minRows={2}
                value={formData.description}
                onChange={(e) => handleFormChange('description', e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                select
                SelectProps={{
                  multiple: true,
                  renderValue: (selected) => selected.map((v) => FACILITY_OPTIONS.find((o) => o.value === v)?.label || v).join(', ')
                }}
                label="Tiện nghi"
                fullWidth
                value={formData.facilities}
                onChange={(e) => handleFormChange('facilities', typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
              >
                {FACILITY_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                select
                label="Trạng thái"
                fullWidth
                value={formData.isActive ? 'true' : 'false'}
                onChange={(e) => handleFormChange('isActive', e.target.value === 'true')}
              >
                <MenuItem value="true">Đang hoạt động</MenuItem>
                <MenuItem value="false">Vô hiệu</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeForm}>Hủy</Button>
          <Button onClick={submitForm} variant="contained">Lưu</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default MeetingRooms;


