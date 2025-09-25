import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Paper,
  Skeleton,
  Stack,
  Divider,
  Alert,
  AlertTitle,
  Tooltip,
  LinearProgress,
  useTheme,
  alpha,
  Badge,
  Tabs,
  Tab,
  TextField,
  InputAdornment,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Checkbox,
  CircularProgress,
  Fab
} from '@mui/material';
import {
  CalendarMonth as CalendarIcon,
  Groups as GroupsIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Add as AddIcon,
  ArrowForward as ArrowForwardIcon,
  LocationOn as LocationIcon,
  Assignment as AssignmentIcon,
  Mail as MailIcon,
  AccessTime as AccessTimeIcon,
  EventAvailable as EventAvailableIcon,
  EventBusy as EventBusyIcon,
  Event as EventIcon,
  TrendingUp as TrendingUpIcon,
  Pending as PendingIcon,
  Description as DescriptionIcon,
  Person as PersonIcon,
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useApiCall } from '../../hooks/useApiCall';
import { useMeetingFilter, useMeetingSearch, useMeetingSort } from '../../hooks/useMeetingStatus';
import { API_CONFIG, MEETING_STATUS, SUCCESS_MESSAGES, ERROR_MESSAGES, USER_ROLES } from '../../constants';
import { logApi, debug, error } from '../../utils/logger';
import { formatDate, formatTime, getMeetingStatus, isToday, getDateRange } from '../../utils/dateUtils';
import { MeetingCard } from '../../components/Meetings';

/**
 * Optimized Meetings component with clean code structure
 */
const MeetingsOptimized = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, token } = useAuth();

  // State management
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState(false);

  // API call hook
  const { execute: fetchMeetings } = useApiCall(async () => {
    const response = await fetch(`${API_CONFIG.BASE_URL}/meetings`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to fetch meetings');
    const data = await response.json();
    return data.meetings || [];
  });

  // Tab filters configuration
  const tabFilters = useMemo(() => [
    { label: 'Tất cả', value: 'all', icon: <CalendarIcon /> },
    { label: 'Hôm nay', value: 'today', icon: <EventAvailableIcon /> },
    { label: 'Sắp tới', value: 'upcoming', icon: <EventIcon /> },
    { label: 'Đang diễn ra', value: 'ongoing', icon: <ScheduleIcon /> },
    { label: 'Đã hoàn thành', value: 'completed', icon: <CheckCircleIcon /> }
  ], []);

  // Load meetings on component mount
  useEffect(() => {
    loadMeetings();
  }, []);

  // Handle URL state for edit mode
  useEffect(() => {
    if (location.state?.openEdit && location.state?.meetingId) {
      // Handle edit mode if needed
      debug('Edit mode triggered for meeting:', location.state.meetingId);
    }
  }, [location.state]);

  /**
   * Load meetings from API
   */
  const loadMeetings = useCallback(async () => {
    try {
      setLoading(true);
      const meetingsData = await fetchMeetings();
      setMeetings(meetingsData);
      logApi('GET', '/meetings', `Loaded ${meetingsData.length} meetings`);
    } catch (err) {
      error('Failed to load meetings', err);
    } finally {
      setLoading(false);
    }
  }, [fetchMeetings]);

  /**
   * Get filtered meetings based on selected tab and search term
   */
  const filteredMeetings = useMemo(() => {
    let filtered = meetings;

    // Filter by tab
    const tabValue = tabFilters[selectedTab].value;
    if (tabValue !== 'all') {
      filtered = filterMeetingsByTab(filtered, tabValue);
    }

    // Filter by search term
    if (searchTerm.trim()) {
      filtered = filterMeetingsBySearch(filtered, searchTerm.trim());
    }

    // Sort by start time (newest first)
    return filtered.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
  }, [meetings, selectedTab, searchTerm, tabFilters]);

  /**
   * Filter meetings by tab
   */
  const filterMeetingsByTab = useCallback((meetingsList, tabValue) => {
    const now = new Date();
    const { start: todayStart, end: todayEnd } = getDateRange('today');

    switch (tabValue) {
      case 'today':
        return meetingsList.filter(meeting => {
          const meetingDate = new Date(meeting.startTime);
          return meetingDate >= todayStart && meetingDate < todayEnd;
        });
      
      case 'upcoming':
        return meetingsList.filter(meeting => {
          const status = getMeetingStatus(meeting.startTime, meeting.endTime);
          return status === MEETING_STATUS.UPCOMING;
        });
      
      case 'ongoing':
        return meetingsList.filter(meeting => {
          const status = getMeetingStatus(meeting.startTime, meeting.endTime);
          return status === MEETING_STATUS.ONGOING;
        });
      
      case 'completed':
        return meetingsList.filter(meeting => {
          const status = getMeetingStatus(meeting.startTime, meeting.endTime);
          return status === MEETING_STATUS.COMPLETED;
        });
      
      default:
        return meetingsList;
    }
  }, []);

  /**
   * Filter meetings by search term
   */
  const filterMeetingsBySearch = useCallback((meetingsList, term) => {
    const searchLower = term.toLowerCase();
    return meetingsList.filter(meeting =>
      meeting.title?.toLowerCase().includes(searchLower) ||
      meeting.description?.toLowerCase().includes(searchLower) ||
      meeting.location?.toLowerCase().includes(searchLower) ||
      meeting.organizer?.fullName?.toLowerCase().includes(searchLower)
    );
  }, []);

  /**
   * Handle tab change
   */
  const handleTabChange = useCallback((event, newValue) => {
    setSelectedTab(newValue);
  }, []);

  /**
   * Handle search term change
   */
  const handleSearchChange = useCallback((event) => {
    setSearchTerm(event.target.value);
  }, []);

  /**
   * Handle meeting menu open
   */
  const handleMenuOpen = useCallback((event, meeting) => {
    setMenuAnchor(event.currentTarget);
    setSelectedMeeting(meeting);
  }, []);

  /**
   * Handle meeting menu close
   */
  const handleMenuClose = useCallback(() => {
    setMenuAnchor(null);
    setSelectedMeeting(null);
  }, []);

  /**
   * Handle meeting view
   */
  const handleViewMeeting = useCallback(() => {
    if (selectedMeeting) {
      navigate(`/meetings/${selectedMeeting._id}`);
    }
    handleMenuClose();
  }, [selectedMeeting, navigate, handleMenuClose]);

  /**
   * Handle meeting edit
   */
  const handleEditMeeting = useCallback(() => {
    if (selectedMeeting) {
      navigate(`/meetings/${selectedMeeting._id}/edit`);
    }
    handleMenuClose();
  }, [selectedMeeting, navigate, handleMenuClose]);

  /**
   * Handle meeting delete
   */
  const handleDeleteMeeting = useCallback(() => {
    setDeleteDialog(true);
    handleMenuClose();
  }, [handleMenuClose]);

  /**
   * Confirm meeting deletion
   */
  const handleDeleteConfirm = useCallback(async () => {
    if (!selectedMeeting) return;

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/meetings/${selectedMeeting._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to delete meeting');

      setMeetings(prev => prev.filter(m => m._id !== selectedMeeting._id));
      setDeleteDialog(false);
      setSelectedMeeting(null);
      
      debug('Meeting deleted successfully:', selectedMeeting._id);
    } catch (err) {
      error('Failed to delete meeting', err);
    }
  }, [selectedMeeting, token]);

  /**
   * Check if user can edit meeting
   */
  const canEditMeeting = useCallback((meeting) => {
    if (!user) return false;
    
    // Admin and manager can edit any meeting
    if (user.role === USER_ROLES.ADMIN || user.role === USER_ROLES.MANAGER) {
      return true;
    }
    
    // Organizer can edit their own meetings
    if (meeting.organizer && meeting.organizer._id === user._id) {
      return true;
    }
    
    return false;
  }, [user]);

  /**
   * Check if user can delete meeting
   */
  const canDeleteMeeting = useCallback((meeting) => {
    if (!user) return false;
    
    // Only admin and manager can delete meetings
    return user.role === USER_ROLES.ADMIN || user.role === USER_ROLES.MANAGER;
  }, [user]);

  /**
   * Get meeting status color
   */
  const getStatusColor = useCallback((status) => {
    const colors = {
      [MEETING_STATUS.ONGOING]: 'success',
      [MEETING_STATUS.UPCOMING]: 'info',
      [MEETING_STATUS.COMPLETED]: 'default',
      [MEETING_STATUS.CANCELLED]: 'error'
    };
    return colors[status] || 'default';
  }, []);

  /**
   * Get meeting status label
   */
  const getStatusLabel = useCallback((status) => {
    const labels = {
      [MEETING_STATUS.ONGOING]: 'Đang diễn ra',
      [MEETING_STATUS.UPCOMING]: 'Sắp diễn ra',
      [MEETING_STATUS.COMPLETED]: 'Đã hoàn thành',
      [MEETING_STATUS.CANCELLED]: 'Đã hủy'
    };
    return labels[status] || status;
  }, []);

  // Loading state
  if (loading) {
    return (
      <Container maxWidth="xl">
        <Box sx={{ py: 3 }}>
          <Grid container spacing={3}>
            {[1, 2, 3, 4].map((item) => (
              <Grid item xs={12} sm={6} md={4} key={item}>
                <Card>
                  <CardContent>
                    <Skeleton variant="text" width="60%" />
                    <Skeleton variant="text" width="40%" />
                    <Skeleton variant="rectangular" height={100} sx={{ mt: 2 }} />
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" fontWeight={700}>
            Quản lý cuộc họp
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/meetings/create')}
            disabled={!canEditMeeting({})}
          >
            Tạo cuộc họp mới
          </Button>
        </Box>

        {/* Search and Filters */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Stack spacing={3}>
              {/* Search */}
              <TextField
                fullWidth
                placeholder="Tìm kiếm cuộc họp..."
                value={searchTerm}
                onChange={handleSearchChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />

              {/* Tabs */}
              <Tabs
                value={selectedTab}
                onChange={handleTabChange}
                variant="scrollable"
                scrollButtons="auto"
              >
                {tabFilters.map((tab, index) => (
                  <Tab
                    key={tab.value}
                    label={tab.label}
                    icon={tab.icon}
                    iconPosition="start"
                  />
                ))}
              </Tabs>
            </Stack>
          </CardContent>
        </Card>

        {/* Meetings List */}
        {filteredMeetings.length > 0 ? (
          <Grid container spacing={3}>
            {filteredMeetings.map((meeting) => {
              const status = getMeetingStatus(meeting.startTime, meeting.endTime);
              return (
                <Grid item xs={12} sm={6} md={4} key={meeting._id}>
                  <MeetingCard
                    meeting={meeting}
                    status={status}
                    statusColor={getStatusColor(status)}
                    statusLabel={getStatusLabel(status)}
                    canEdit={canEditMeeting(meeting)}
                    canDelete={canDeleteMeeting(meeting)}
                    onView={() => navigate(`/meetings/${meeting._id}`)}
                    onEdit={() => navigate(`/meetings/${meeting._id}/edit`)}
                    onDelete={() => handleDeleteMeeting()}
                    onMenuOpen={(event) => handleMenuOpen(event, meeting)}
                  />
                </Grid>
              );
            })}
          </Grid>
        ) : (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <EventBusyIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Không có cuộc họp nào
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {searchTerm 
                  ? `Không tìm thấy cuộc họp nào với từ khóa "${searchTerm}"`
                  : 'Chưa có cuộc họp nào được tạo'
                }
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => navigate('/meetings/create')}
                disabled={!canEditMeeting({})}
              >
                Tạo cuộc họp đầu tiên
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Meeting Menu */}
        <Menu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={handleMenuClose}
        >
          <MenuItem onClick={handleViewMeeting}>
            <VisibilityIcon sx={{ mr: 1 }} />
            Xem chi tiết
          </MenuItem>
          {selectedMeeting && canEditMeeting(selectedMeeting) && (
            <MenuItem onClick={handleEditMeeting}>
              <EditIcon sx={{ mr: 1 }} />
              Chỉnh sửa
            </MenuItem>
          )}
          {selectedMeeting && canDeleteMeeting(selectedMeeting) && (
            <MenuItem onClick={handleDeleteMeeting} sx={{ color: 'error.main' }}>
              <DeleteIcon sx={{ mr: 1 }} />
              Xóa
            </MenuItem>
          )}
        </Menu>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)}>
          <DialogTitle>Xác nhận xóa cuộc họp</DialogTitle>
          <DialogContent>
            <Typography>
              Bạn có chắc chắn muốn xóa cuộc họp "{selectedMeeting?.title}"? 
              Hành động này không thể hoàn tác.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialog(false)}>
              Hủy
            </Button>
            <Button 
              onClick={handleDeleteConfirm} 
              color="error" 
              variant="contained"
            >
              Xóa
            </Button>
          </DialogActions>
        </Dialog>

        {/* Floating Action Button */}
        <Fab
          color="primary"
          aria-label="add meeting"
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            display: { xs: 'flex', md: 'none' }
          }}
          onClick={() => navigate('/meetings/create')}
          disabled={!canEditMeeting({})}
        >
          <AddIcon />
        </Fab>
      </Box>
    </Container>
  );
};

export default MeetingsOptimized;
