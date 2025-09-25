import React, { useState, useEffect } from 'react';
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
  Stack,
  Divider,
  Tabs,
  Tab,
  TextField,
  InputAdornment,
  Menu,
  MenuItem,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
  alpha,
  Skeleton,
  Snackbar,
  Alert
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  CalendarMonth as CalendarIcon,
  Schedule as ScheduleIcon,
  LocationOn as LocationIcon,
  Groups as GroupsIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  EventAvailable as EventAvailableIcon,
  EventBusy as EventBusyIcon,
  Event as EventIcon,
  CheckCircle as CheckCircleIcon,
  AccessTime as AccessTimeIcon,
  Today as TodayIcon,
  Upcoming as UpcomingIcon,
  History as HistoryIcon,
  ViewModule as GridViewIcon,
  CalendarViewMonth as CalendarViewIcon
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import { getMeetingStatus } from '../../utils/dateUtils';
import MeetingCard from '../../components/Meetings/MeetingCard';
import CalendarView from '../../components/Meetings/CalendarView';

const Meetings = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, token } = useAuth();
  
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAnchor, setFilterAnchor] = useState(null);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'calendar'
  const [calendarScope, setCalendarScope] = useState('all'); // 'all' | 'mine'
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    _id: '',
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    meetingType: 'offline',
    location: '',
    priority: 'medium',
    status: 'scheduled'
  });

  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

  const tabFilters = [
    { label: 'Tất cả', value: 'all', icon: <EventIcon /> },
    { label: 'Hôm nay', value: 'today', icon: <TodayIcon /> },
    { label: 'Sắp tới', value: 'upcoming', icon: <UpcomingIcon /> },
    { label: 'Đã kết thúc', value: 'completed', icon: <CheckCircleIcon /> }
  ];

  useEffect(() => {
    fetchMeetings();
  }, []);

  // Mở dialog chỉnh sửa khi nhận state từ điều hướng /meetings/:id/edit
  useEffect(() => {
    if (location.state?.openEdit && location.state?.meetingId) {
      const m = meetings.find(x => x._id === location.state.meetingId);
      if (m) {
        openEditDialog(m);
      } else {
        // Nếu chưa có trong state, fetch rồi mở
        (async () => {
          try {
            const res = await axios.get(`${API_BASE_URL}/meetings`, { headers: { Authorization: `Bearer ${token}` }, params: { limit: 1000 } });
            const list = res.data.meetings || [];
            setMeetings(list);
            const found = list.find(x => x._id === location.state.meetingId);
            if (found) openEditDialog(found);
          } catch (e) { console.error(e); }
        })();
      }
      navigate(location.pathname, { replace: true });
    }
  }, [location.state]);

  // Check for navigation state (e.g., after creating a new meeting)
  useEffect(() => {
    console.log('🔍 Location state changed:', location.state);
    if (location.state?.message) {
      console.log('🔍 Found message in location state:', location.state.message);
      console.log('🔍 New meeting ID in location state:', location.state.newMeetingId);
      
      const newMeetingId = location.state.newMeetingId;
      
      setSnackbar({
        open: true,
        message: location.state.message,
        severity: 'success'
      });
      
      // Clear the state to prevent showing the message again
      navigate(location.pathname, { replace: true });
      
      // Refresh meetings to show the newly created meeting with the stored ID
      if (newMeetingId) {
        console.log('🔍 Fetching meetings with new meeting ID:', newMeetingId);
        fetchMeetingsWithNewMeeting(newMeetingId);
      } else {
        fetchMeetings();
      }
    }
  }, [location.state]);

  const fetchMeetingsWithNewMeeting = async (newMeetingId) => {
    try {
      setLoading(true);
      
      const params = { newMeetingId, limit: 1000 }; // Tăng limit để fetch tất cả cuộc họp
      console.log('🔍 Fetching meetings with params:', params);
      
      const response = await axios.get(`${API_BASE_URL}/meetings`, {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });
      
                   console.log('🔍 API response:', response.data);
             console.log('🔍 Meetings received:', response.data.meetings?.length || 0);
             
             // Debug: Check room data in meetings
             if (response.data.meetings && response.data.meetings.length > 0) {
               console.log('🔍 Room data in meetings:');
               response.data.meetings.forEach((meeting, index) => {
                 console.log(`   Meeting ${index + 1}:`, {
                   id: meeting._id,
                   title: meeting.title,
                   room: meeting.room,
                   location: meeting.location,
                   hasRoom: !!meeting.room,
                   roomName: meeting.room?.name
                 });
               });
             }
      
      // Debug: Check if the new meeting is in the response
      const newMeeting = response.data.meetings?.find(m => m._id === newMeetingId);
      if (newMeeting) {
        console.log('✅ New meeting found in response:', {
          id: newMeeting._id,
          title: newMeeting.title,
          startTime: new Date(newMeeting.startTime),
          endTime: new Date(newMeeting.endTime),
          status: getMeetingStatus(newMeeting.startTime, newMeeting.endTime)
        });
      } else {
        console.log('❌ New meeting NOT found in response');
        console.log('🔍 All meeting IDs in response:', response.data.meetings?.map(m => m._id));
      }
      
      setMeetings(response.data.meetings || []);
    } catch (error) {
      console.error('Error fetching meetings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMeetings = async () => {
    try {
      setLoading(true);
      
      console.log('🔍 Fetching all meetings for calendar view...');
      
      const response = await axios.get(`${API_BASE_URL}/meetings`, {
        params: { 
          limit: 1000, // Tăng limit để fetch tất cả cuộc họp
          page: 1
        },
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('🔍 Meetings API response:', {
        totalDocs: response.data.totalDocs,
        meetingsReceived: response.data.meetings?.length || 0,
        hasMore: response.data.hasNextPage
      });
      
      // Log sample meetings để debug
      if (response.data.meetings && response.data.meetings.length > 0) {
        console.log('📅 Sample meetings:', response.data.meetings.slice(0, 3).map(m => ({
          id: m._id,
          title: m.title,
          startTime: m.startTime,
          endTime: m.endTime,
          room: m.room?.name || m.location
        })));
      }
      
      setMeetings(response.data.meetings || []);
    } catch (error) {
      console.error('❌ Error fetching meetings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyInvitedMeetings = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching meetings then filtering to only my related ones for private calendar...');
      const response = await axios.get(`${API_BASE_URL}/meetings`, {
        params: { limit: 1000, page: 1 },
        headers: { Authorization: `Bearer ${token}` }
      });
      const all = response.data?.meetings || [];
      const myId = user?._id;
      const filtered = all.filter((m) => {
        const isOrganizer = m.organizer?._id === myId || m.organizer === myId;
        const isSecretary = m.secretary?._id === myId || m.secretary === myId;
        const isAttendee = Array.isArray(m.attendees) && m.attendees.some((a) => {
          const uid = a.user?._id || a.user;
          return uid === myId;
        });
        return isOrganizer || isSecretary || isAttendee;
      });
      setMeetings(filtered);
    } catch (error) {
      console.error('❌ Error fetching my invited meetings:', error);
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch when switching view scope in calendar mode
  useEffect(() => {
    if (viewMode !== 'calendar') return;
    if (calendarScope === 'mine') {
      fetchMyInvitedMeetings();
    } else {
      fetchMeetings();
    }
  }, [viewMode, calendarScope]);

  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
  };

  const handleMenuClick = (event, meeting) => {
    setMenuAnchor(event.currentTarget);
    setSelectedMeeting(meeting);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelectedMeeting(null);
  };

  const openEditDialog = (meeting) => {
    if (!meeting) return;
    const toInputValue = (iso) => {
      try {
        const d = new Date(iso);
        const pad = (n) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      } catch { return ''; }
    };
    setEditForm({
      _id: meeting._id,
      title: meeting.title || '',
      description: meeting.description || '',
      startTime: toInputValue(meeting.startTime),
      endTime: toInputValue(meeting.endTime),
      meetingType: meeting.meetingType || 'offline',
      location: meeting.room?.name || meeting.location || ''
    });
    setEditDialogOpen(true);
  };

  const handleEditChange = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleEditSave = async () => {
    try {
      const payload = {
        title: editForm.title,
        description: editForm.description,
        startTime: new Date(editForm.startTime).toISOString(),
        endTime: new Date(editForm.endTime).toISOString(),
        meetingType: editForm.meetingType,
        location: editForm.location,
        priority: editForm.priority,
        status: editForm.status
      };
      await axios.put(`${API_BASE_URL}/meetings/${editForm._id}`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEditDialogOpen(false);
      await fetchMeetings();
      setSnackbar({ open: true, message: 'Cập nhật cuộc họp thành công', severity: 'success' });
    } catch (err) {
      console.error('Save meeting error:', err);
      setSnackbar({ open: true, message: err.response?.data?.message || 'Cập nhật thất bại', severity: 'error' });
    }
  };

  const handleDeleteClick = () => {
    setDeleteDialog(true);
    handleMenuClose();
  };

  const handleDeleteConfirm = async () => {
    try {
      await axios.delete(`${API_BASE_URL}/meetings/${selectedMeeting._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMeetings(meetings.filter(m => m._id !== selectedMeeting._id));
      setDeleteDialog(false);
      setSelectedMeeting(null);
    } catch (error) {
      console.error('Error deleting meeting:', error);
    }
  };

  const getFilteredMeetings = () => {
    let filtered = meetings;

    console.log('🔍 Total meetings before filtering:', meetings.length);
    console.log('🔍 Selected tab:', tabFilters[selectedTab].value);
    console.log('🔍 Current time:', new Date());
    
    // Debug: Check if we have any meetings with specific IDs we're looking for
    if (meetings.length > 0) {
      console.log('🔍 All meeting IDs in state:', meetings.map(m => m._id));
      console.log('🔍 All meeting titles in state:', meetings.map(m => m.title));
      console.log('🔍 All meeting start times in state:', meetings.map(m => new Date(m.startTime)));
      
      // Special debug: Check each meeting's status individually
      meetings.forEach((meeting, index) => {
        const status = getMeetingStatus(meeting.startTime, meeting.endTime);
        const now = new Date();
        const startTime = new Date(meeting.startTime);
        const timeDiff = startTime - now;
        const timeDiffMinutes = Math.floor(timeDiff / (1000 * 60));
        
        console.log(`🔍 Meeting ${index + 1} "${meeting.title}":`, {
          id: meeting._id,
          startTime: startTime,
          endTime: new Date(meeting.endTime),
          now: now,
          timeDiff: timeDiff,
          timeDiffMinutes: timeDiffMinutes,
          status: status,
          isUpcoming: status === 'upcoming',
          isPrivate: meeting.isPrivate,
          department: meeting.department,
          organizer: meeting.organizer?.fullName || meeting.organizer?._id
        });
      });
    }

    // Filter by tab
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    console.log('🔍 Today range:', { today, tomorrow });

    switch (tabFilters[selectedTab].value) {
      case 'today':
        filtered = filtered.filter(meeting => {
          const meetingDate = new Date(meeting.startTime);
          const isToday = meetingDate >= today && meetingDate < tomorrow;
          console.log(`🔍 Meeting "${meeting.title}" date: ${meetingDate}, isToday: ${isToday}`);
          return isToday;
        });
        console.log('🔍 After today filter:', filtered.length);
        break;
      case 'upcoming':
        console.log('🔍 Processing upcoming filter for', filtered.length, 'meetings');
        filtered = filtered.filter(meeting => {
          const status = getMeetingStatus(meeting.startTime, meeting.endTime);
          const isUpcoming = status === 'upcoming';
          const now = new Date();
          const startTime = new Date(meeting.startTime);
          const timeDiff = startTime - now;
          const timeDiffMinutes = Math.floor(timeDiff / (1000 * 60));
          
          console.log(`🔍 Meeting "${meeting.title}" (ID: ${meeting._id}):`, {
            startTime: startTime,
            endTime: new Date(meeting.endTime),
            now: now,
            timeDiff: timeDiff,
            timeDiffMinutes: timeDiffMinutes,
            status: status,
            isUpcoming: isUpcoming,
            organizer: meeting.organizer?.fullName || meeting.organizer?._id,
            isPrivate: meeting.isPrivate,
            department: meeting.department
          });
          
          if (!isUpcoming) {
            console.log(`❌ Meeting "${meeting.title}" filtered out - not upcoming`);
          } else {
            console.log(`✅ Meeting "${meeting.title}" included - is upcoming`);
          }
          
          return isUpcoming;
        });
        console.log('🔍 After upcoming filter:', filtered.length);
        console.log('🔍 Upcoming meetings:', filtered.map(m => ({ title: m.title, id: m._id, startTime: new Date(m.startTime) })));
        break;
      case 'completed':
        filtered = filtered.filter(meeting => {
          const status = getMeetingStatus(meeting.startTime, meeting.endTime);
          const isCompleted = status === 'completed';
          console.log(`🔍 Meeting "${meeting.title}" status: ${status}, isCompleted: ${isCompleted}`);
          return isCompleted;
        });
        console.log('🔍 After completed filter:', filtered.length);
        break;
      case 'ongoing':
        filtered = filtered.filter(meeting => {
          const status = getMeetingStatus(meeting.startTime, meeting.endTime);
          const isOngoing = status === 'ongoing';
          console.log(`🔍 Meeting "${meeting.title}" status: ${status}, isOngoing: ${isOngoing}`);
          return isOngoing;
        });
        console.log('🔍 After ongoing filter:', filtered.length);
        break;
      default:
        console.log('🔍 No tab filtering applied');
        break;
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(meeting =>
        meeting.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        meeting.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        meeting.location?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      console.log('🔍 After search filter:', filtered.length);
    }

    console.log('🔍 Final filtered meetings:', filtered.length);
    const sortedMeetings = filtered.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
    console.log('🔍 Sorted meetings:', sortedMeetings.map(m => ({ 
      title: m.title, 
      id: m._id,
      startTime: new Date(m.startTime),
      status: getMeetingStatus(m.startTime, m.endTime)
    })));
    
    // Special debug: Check if any meetings are missing from the final result
    if (meetings.length > 0 && filtered.length < meetings.length) {
      const missingMeetings = meetings.filter(m => !filtered.find(f => f._id === m._id));
      console.log('🔍 Missing meetings from filtered result:', missingMeetings.map(m => ({
        id: m._id,
        title: m.title,
        startTime: new Date(m.startTime),
        status: getMeetingStatus(m.startTime, m.endTime)
      })));
    }
    
    return sortedMeetings;
  };



  const canEditMeeting = (meeting) => {
    return ['admin', 'manager', 'secretary', 'assistant'].includes(user?.role) || 
           meeting?.createdBy === user?._id ||
           meeting?.organizer?._id === user?._id;
  };

  const canDeleteMeeting = (meeting) => {
    return ['admin', 'manager'].includes(user?.role) || 
           meeting?.createdBy === user?._id ||
           meeting?.organizer?._id === user?._id;
  };

  const filteredMeetings = getFilteredMeetings();
  
  // Debug: Check what meetings are actually being displayed
  useEffect(() => {
    console.log('🔍 Filtered meetings for display:', filteredMeetings.length);
    if (filteredMeetings.length > 0) {
      console.log('🔍 Meetings being displayed:', filteredMeetings.map(m => ({
        id: m._id,
        title: m.title,
        startTime: new Date(m.startTime),
        status: getMeetingStatus(m.startTime, m.endTime)
      })));
    } else {
      console.log('🔍 No meetings being displayed in current tab');
      
      // Special debug: Check if we have meetings but they're not being displayed
      if (meetings.length > 0) {
        console.log('🔍 We have meetings in state but none are being displayed!');
        console.log('🔍 All meetings in state:', meetings.map(m => ({
          id: m._id,
          title: m.title,
          startTime: new Date(m.startTime),
          status: getMeetingStatus(m.startTime, m.endTime),
          isPrivate: m.isPrivate,
          department: m.department,
          organizer: m.organizer?.fullName || m.organizer?._id
        })));
      }
    }
  }, [filteredMeetings, meetings]);

  // Get meeting counts for each tab
  const getMeetingCounts = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const counts = {
      all: meetings.length,
      today: meetings.filter(meeting => {
        const meetingDate = new Date(meeting.startTime);
        return meetingDate >= today && meetingDate < tomorrow;
      }).length,
      upcoming: meetings.filter(meeting => {
        const status = getMeetingStatus(meeting.startTime, meeting.endTime);
        return status === 'upcoming';
      }).length,
      completed: meetings.filter(meeting => {
        const status = getMeetingStatus(meeting.startTime, meeting.endTime);
        return status === 'completed';
      }).length,
      ongoing: meetings.filter(meeting => {
        const status = getMeetingStatus(meeting.startTime, meeting.endTime);
        return status === 'ongoing';
      }).length
    };

    // Debug: Log the counts
    console.log('🔍 Meeting counts:', counts);
    console.log('🔍 Current time for count calculation:', now);
    console.log('🔍 Today range for count calculation:', { today, tomorrow });

    return counts;
  };

  const meetingCounts = getMeetingCounts();

  if (loading) {
    return (
      <Container maxWidth="xl">
        <Box sx={{ py: 3 }}>
          <Skeleton variant="text" width="40%" height={40} sx={{ mb: 2 }} />
          <Skeleton variant="rectangular" height={60} sx={{ mb: 3 }} />
          <Grid container spacing={3}>
            {[1, 2, 3, 4].map((item) => (
              <Grid item xs={12} md={6} lg={4} key={item}>
                <Card>
                  <CardContent>
                    <Skeleton variant="text" width="60%" />
                    <Skeleton variant="text" width="40%" />
                    <Skeleton variant="rectangular" height={80} sx={{ mt: 2 }} />
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
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
            <Box>
              <Typography variant="h4" fontWeight={700} gutterBottom>
                Quản lý cuộc họp
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Tổ chức và theo dõi tất cả cuộc họp của bạn
              </Typography>
            </Box>
            {['admin', 'manager', 'secretary', 'assistant'].includes(user?.role) && (
              <Fab
                color="primary"
                variant="extended"
                onClick={() => navigate('/meetings/create')}
                sx={{
                  boxShadow: theme.shadows[8],
                  '&:hover': {
                    transform: 'scale(1.05)',
                    boxShadow: theme.shadows[12]
                  }
                }}
              >
                <AddIcon sx={{ mr: 1 }} />
                Tạo cuộc họp mới
              </Fab>
            )}
          </Box>

          {/* Search and Filter */}
          <Paper
            elevation={0}
            sx={{
              p: 2,
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              borderRadius: 3,
              background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.02)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`
            }}
          >
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
              <TextField
                fullWidth
                placeholder="Tìm kiếm cuộc họp..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  )
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    bgcolor: 'background.paper'
                  }
                }}
              />
              <Box sx={{ display: 'flex', gap: 1 }}>
                                 <Button
                   variant="outlined"
                   startIcon={<FilterIcon />}
                   onClick={(e) => setFilterAnchor(e.currentTarget)}
                   sx={{ borderRadius: 2, minWidth: 120 }}
                 >
                   Lọc
                 </Button>
                 <Button
                   variant="outlined"
                   onClick={fetchMeetings}
                   sx={{ borderRadius: 2, minWidth: 120 }}
                 >
                   Làm mới
                 </Button>
                
                {/* View Mode Toggle */}
                <Box
                  sx={{
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: 2,
                    overflow: 'hidden',
                    display: 'flex'
                  }}
                >
                  <Button
                    variant={viewMode === 'grid' ? 'contained' : 'text'}
                    onClick={() => setViewMode('grid')}
                    startIcon={<GridViewIcon />}
                    sx={{ 
                      borderRadius: 0,
                      minWidth: 'auto',
                      px: 2,
                      py: 1
                    }}
                  >
                    Lưới
                  </Button>
                  <Button
                    variant={viewMode === 'calendar' ? 'contained' : 'text'}
                    onClick={() => setViewMode('calendar')}
                    startIcon={<CalendarViewIcon />}
                    sx={{ 
                      borderRadius: 0,
                      minWidth: 'auto',
                      px: 2,
                      py: 1
                    }}
                  >
                    Lịch
                  </Button>
                </Box>
                {false && viewMode === 'calendar'}
              </Box>
            </Stack>
          </Paper>
        </Box>

                          {/* Tabs - Only show for grid view */}
         {viewMode === 'grid' && (
           <>
             {console.log('🔍 Rendering tabs with counts:', meetingCounts)}
             <Paper
               elevation={0}
               sx={{
                 mb: 3,
                 border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                 borderRadius: 3
               }}
             >
               <Tabs
                 value={selectedTab}
                 onChange={handleTabChange}
                 variant="fullWidth"
                 sx={{
                   '& .MuiTab-root': {
                     minHeight: 60,
                     textTransform: 'none',
                     fontWeight: 500
                   }
                 }}
               >
                 {tabFilters.map((tab, index) => (
                   <Tab
                     key={index}
                     icon={tab.icon}
                     iconPosition="start"
                     label={
                       <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                         <span>{tab.label}</span>
                         <Chip 
                           label={meetingCounts[tab.value] || 0}
                           size="small"
                           sx={{
                             height: 20,
                             fontSize: '0.75rem',
                             fontWeight: 600,
                             bgcolor: selectedTab === index ? 'primary.main' : alpha(theme.palette.primary.main, 0.1),
                             color: selectedTab === index ? 'white' : 'primary.main',
                             minWidth: 24
                           }}
                         />
                       </Box>
                     }
                   />
                 ))}
               </Tabs>
             </Paper>
           </>
         )}

        {/* Content Area */}
        {viewMode === 'calendar' ? (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 2 }}>
              <Box
                sx={{
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 2,
                  overflow: 'hidden',
                  display: 'flex',
                  backgroundColor: 'background.paper'
                }}
              >
                <Button
                  variant={calendarScope === 'all' ? 'contained' : 'text'}
                  onClick={() => setCalendarScope('all')}
                  startIcon={<EventIcon />}
                  sx={{ 
                    borderRadius: 0,
                    minWidth: 'auto',
                    px: 2,
                    py: 1
                  }}
                >
                  Lịch chung
                </Button>
                <Button
                  variant={calendarScope === 'mine' ? 'contained' : 'text'}
                  onClick={() => setCalendarScope('mine')}
                  startIcon={<EventAvailableIcon />}
                  sx={{ 
                    borderRadius: 0,
                    minWidth: 'auto',
                    px: 2,
                    py: 1
                  }}
                >
                  Lịch của tôi
                </Button>
              </Box>
            </Box>
            <CalendarView 
              meetings={meetings} 
              onMeetingClick={(meeting) => navigate(`/meetings/${meeting._id}`)}
            />
          </>
        ) : (
          /* Meetings Grid */
          filteredMeetings.length > 0 ? (
            <Grid container spacing={3}>
              {filteredMeetings.map((meeting) => {
                console.log('🔍 Rendering meeting card for:', {
                  id: meeting._id,
                  title: meeting.title,
                  startTime: new Date(meeting.startTime),
                  status: getMeetingStatus(meeting.startTime, meeting.endTime)
                });
                return (
                  <Grid item xs={12} md={6} lg={4} key={meeting._id}>
                    <MeetingCard 
                      meeting={meeting} 
                      onMenuClick={handleMenuClick}
                      onEditClick={openEditDialog}
                      canEdit={canEditMeeting(meeting)}
                    />
                  </Grid>
                );
              })}
            </Grid>
          ) : (
            <>
              {console.log('🔍 Rendering empty state - no meetings to display')}
              <Paper
                elevation={0}
                sx={{
                  p: 8,
                  textAlign: 'center',
                  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                  borderRadius: 3
                }}
              >
                <Box
                  sx={{
                    width: 120,
                    height: 120,
                    borderRadius: '50%',
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 3
                  }}
                >
                  <EventBusyIcon sx={{ fontSize: 60, color: 'primary.main' }} />
                </Box>
                <Typography variant="h5" fontWeight={600} gutterBottom>
                  Không tìm thấy cuộc họp
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                  {searchTerm
                    ? `Không có cuộc họp nào phù hợp với từ khóa "${searchTerm}"`
                    : `Không có cuộc họp nào trong mục "${tabFilters[selectedTab].label.toLowerCase()}"`
                  }
                </Typography>
                {['admin', 'manager', 'secretary', 'assistant'].includes(user?.role) && (
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => navigate('/meetings/create')}
                    size="large"
                    sx={{ borderRadius: 2 }}
                  >
                    Tạo cuộc họp đầu tiên
                  </Button>
                )}
              </Paper>
            </>
          )
        )}

        {/* Action Menu */}
        <Menu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={handleMenuClose}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <MenuItem onClick={() => {
            navigate(`/meetings/${selectedMeeting?._id}`);
            handleMenuClose();
          }}>
            <ViewIcon sx={{ mr: 1 }} />
            Xem chi tiết
          </MenuItem>
          {/* Đã có nút bút chì trên thẻ để chỉnh sửa, tránh trùng lặp */}
          {canDeleteMeeting(selectedMeeting) && (
            <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }}>
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
            <Button onClick={() => setDeleteDialog(false)}>Hủy</Button>
            <Button onClick={handleDeleteConfirm} color="error" variant="contained">
              Xóa
            </Button>
          </DialogActions>
        </Dialog>

        {/* Edit Meeting Dialog */}
        <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Chỉnh sửa cuộc họp</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Tiêu đề"
                fullWidth
                value={editForm.title}
                onChange={(e) => handleEditChange('title', e.target.value)}
              />
              <TextField
                label="Mô tả"
                fullWidth
                multiline
                minRows={3}
                value={editForm.description}
                onChange={(e) => handleEditChange('description', e.target.value)}
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Bắt đầu"
                  type="datetime-local"
                  fullWidth
                  value={editForm.startTime}
                  onChange={(e) => handleEditChange('startTime', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  label="Kết thúc"
                  type="datetime-local"
                  fullWidth
                  value={editForm.endTime}
                  onChange={(e) => handleEditChange('endTime', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Loại cuộc họp"
                  select
                  fullWidth
                  value={editForm.meetingType}
                  onChange={(e) => handleEditChange('meetingType', e.target.value)}
                >
                  <MenuItem value="offline">Trực tiếp</MenuItem>
                  <MenuItem value="online">Trực tuyến</MenuItem>
                  <MenuItem value="hybrid">Kết hợp</MenuItem>
                </TextField>

                <TextField
                  label="Mức ưu tiên"
                  select
                  fullWidth
                  value={editForm.priority}
                  onChange={(e) => handleEditChange('priority', e.target.value)}
                >
                  <MenuItem value="low">Thấp</MenuItem>
                  <MenuItem value="medium">Trung bình</MenuItem>
                  <MenuItem value="high">Cao</MenuItem>
                  <MenuItem value="urgent">Khẩn cấp</MenuItem>
                </TextField>
              </Stack>
              <TextField
                label="Trạng thái"
                select
                fullWidth
                value={editForm.status}
                onChange={(e) => handleEditChange('status', e.target.value)}
              >
                <MenuItem value="scheduled">Đã lên lịch</MenuItem>
                <MenuItem value="ongoing">Đang diễn ra</MenuItem>
                <MenuItem value="completed">Đã kết thúc</MenuItem>
                <MenuItem value="cancelled">Đã hủy</MenuItem>
                <MenuItem value="postponed">Hoãn</MenuItem>
              </TextField>
              <TextField
                label="Địa điểm/Phòng"
                fullWidth
                value={editForm.location}
                onChange={(e) => handleEditChange('location', e.target.value)}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialogOpen(false)}>Hủy</Button>
            <Button variant="contained" onClick={handleEditSave}>Lưu</Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar for notifications */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <Alert
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            severity={snackbar.severity}
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </Container>
  );
};

export default Meetings;
