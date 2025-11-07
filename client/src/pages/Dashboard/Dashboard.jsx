import React, { useEffect, useState } from 'react';
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
  useMediaQuery,
  alpha,
  Badge
} from '@mui/material';
import { useSocket } from '../../contexts/SocketContext';
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
  Refresh as RefreshIcon} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import { ProtocolList } from '../../components/Protocols';
import { getMeetingStatus } from '../../utils/dateUtils';
import QuickActions from '../../components/ui/quick-actions';

const Dashboard = () => {
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));
  const { user, token, loading: authLoading } = useAuth();
  const { socket, isConnected, connectionError } = useSocket();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    today: 0,
    upcoming: 0,
    completed: 0,
    total: 0
  });
  const [recentMeetings, setRecentMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingProtocols, setPendingProtocols] = useState([]);
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [pendingMeetings, setPendingMeetings] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

  useEffect(() => {
    if (user && token) {
      fetchDashboardData();
      
      // Use polling if Socket.IO is not connected
      const usePolling = !isConnected;
      const pollingInterval = 60000; // 60s polling interval
      
      const interval = setInterval(() => {
        if (usePolling || !isConnected) {
          console.log('🔄 Polling dashboard data...');
          fetchDashboardData();
        }
      }, pollingInterval);
      
      return () => clearInterval(interval);
    }
  }, [user, token, isConnected]);

  // Refresh when component becomes visible (user navigates back to dashboard)
  useEffect(() => {
    if (user && token && document.visibilityState === 'visible') {
      fetchDashboardData();
    }
  }, [document.visibilityState]);

  // Listen for real-time updates via Socket.IO
  useEffect(() => {
    if (!socket) return;

    const handleRefresh = () => {
      console.log('🔄 Real-time update received, refreshing dashboard...');
      fetchDashboardData();
    };

    // Listen for various update events
    socket.on('protocolApproved', handleRefresh);
    socket.on('protocolRejected', handleRefresh);
    socket.on('invitationAccepted', handleRefresh);
    socket.on('invitationDeclined', handleRefresh);
    socket.on('meetingApproved', handleRefresh);
    socket.on('meetingRejected', handleRefresh);

    return () => {
      socket.off('protocolApproved', handleRefresh);
      socket.off('protocolRejected', handleRefresh);
      socket.off('invitationAccepted', handleRefresh);
      socket.off('invitationDeclined', handleRefresh);
      socket.off('meetingApproved', handleRefresh);
      socket.off('meetingRejected', handleRefresh);
    };
  }, [socket]);

  // Expose refresh function to window for manual trigger
  useEffect(() => {
    window.refreshDashboard = () => {
      console.log('🔄 Manually refreshing dashboard...');
      fetchDashboardData();
    };
    return () => {
      delete window.refreshDashboard;
    };
  }, []);

  const fetchDashboardData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      
      // Fetch meetings data
      try {
        const meetingsResponse = await axios.get(`${API_BASE_URL}/meetings`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 15000
        });
        
        const meetings = meetingsResponse.data.meetings || [];
        
        // Calculate stats
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const todayMeetings = meetings.filter(meeting => {
          const meetingDate = new Date(meeting.startTime);
          return meetingDate >= today && meetingDate < tomorrow;
        });
        
        const upcomingMeetings = meetings.filter(meeting => {
          const meetingDate = new Date(meeting.startTime);
          return meetingDate > now;
        });
        
        const completedMeetings = meetings.filter(meeting => {
          const meetingDate = new Date(meeting.startTime);
          return meetingDate < now;
        });
        
        setStats({
          today: todayMeetings.length,
          upcoming: upcomingMeetings.length,
          completed: completedMeetings.length,
          total: meetings.length
        });
        
        // Get recent meetings
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const recent = meetings
          .filter(meeting => {
            const meetingDate = new Date(meeting.startTime);
            return meetingDate >= sevenDaysAgo;
          })
          .sort((a, b) => new Date(b.startTime) - new Date(a.startTime))
          .slice(0, 5);
        
        // Debug: Check room data in recent meetings
        console.log('🔍 Dashboard - Recent meetings room data:', recent.map(meeting => ({
          id: meeting._id,
          title: meeting.title,
          room: meeting.room,
          location: meeting.location,
          hasRoom: !!meeting.room,
          roomName: meeting.room?.name
        })));
        
        setRecentMeetings(recent);
      } catch (error) {
        console.error('Error fetching meetings:', error);
        setRecentMeetings([]);
        setStats({ today: 0, upcoming: 0, completed: 0, total: 0 });
      }
      
      // Fetch pending protocols from Minutes (minutesHistory) - they disappear after approval
      try {
        // Get meetings with pending minutes
        const meetingsRes = await axios.get(`${API_BASE_URL}/meetings`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { limit: 1000 },
          timeout: 10000
        });
        
        const meetings = meetingsRes.data.meetings || [];
        const pendingMinutes = [];
        
        meetings.forEach(meeting => {
          if (meeting.minutesHistory && Array.isArray(meeting.minutesHistory)) {
            const pending = meeting.minutesHistory.filter(m => 
              m.status === 'pending' || m.status === 'pending_approval'
            );
            pending.forEach(min => {
              pendingMinutes.push({
                ...min,
                __source: 'minutesHistory',
                meeting: { _id: meeting._id, title: meeting.title },
                secretary: min.createdBy,
                createdAt: min.createdAt || new Date(),
                updatedAt: min.updatedAt || min.createdAt || new Date()
              });
            });
          }
        });
        
        // Also check Protocol collection
        try {
          const protRes = await axios.get(`${API_BASE_URL}/protocols?status=pending`, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 10000
          });
          const protocolsFromProtocol = (protRes.data.protocols || []).filter(p => 
            p.status === 'pending' || p.status === 'pending_approval'
          );
          pendingMinutes.push(...protocolsFromProtocol);
        } catch (protError) {
          console.error('Error fetching protocols:', protError);
        }
        
        setPendingProtocols(pendingMinutes);
      } catch (error) {
        console.error('Error fetching minutes:', error);
        setPendingProtocols([]);
      }

      // Fetch pending invitations (only invited status)
      try {
        const invitationsRes = await axios.get(`${API_BASE_URL}/meetings/invitations`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000
        });
        // Filter to only show truly pending invitations
        const pendingInvites = (invitationsRes.data.invitations || []).filter(inv => 
          inv.attendeeStatus === 'invited' || inv.attendeeStatus === 'pending'
        );
        setPendingInvitations(pendingInvites);
      } catch (error) {
        console.error('Error fetching invitations:', error);
        setPendingInvitations([]);
      }

      // Fetch pending meeting approvals (for admin/manager only)
      if (user && ['admin', 'manager'].includes(user.role)) {
        try {
          const approvalsRes = await axios.get(`${API_BASE_URL}/meetings/pending-approval`, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 10000
          });
          setPendingMeetings(approvalsRes.data.meetings || []);
        } catch (error) {
          console.error('Error fetching pending approvals:', error);
          setPendingMeetings([]);
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleManualRefresh = () => {
    setRefreshing(true);
    fetchDashboardData(true);
  };

  const handleStatCardClick = (type) => {
    const routes = {
      today: '/meetings?filter=today',
      upcoming: '/meetings?filter=upcoming',
      completed: '/meetings?filter=completed',
      total: '/meetings'
    };
    navigate(routes[type] || '/meetings');
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      ongoing: 'success',
      upcoming: 'info',
      completed: 'default',
      cancelled: 'error'
    };
    return colors[status] || 'default';
  };

  const getStatusLabel = (status) => {
    const labels = {
      ongoing: 'Đang diễn ra',
      upcoming: 'Sắp diễn ra',
      completed: 'Đã kết thúc',
      cancelled: 'Đã hủy'
    };
    return labels[status] || status;
  };

  const statsCards = [
    {
      title: 'Hôm nay',
      value: stats.today,
      icon: <EventAvailableIcon />,
      color: theme.palette.success.main,
      bgColor: alpha(theme.palette.success.main, 0.1),
      type: 'today'
    },
    {
      title: 'Sắp tới',
      value: stats.upcoming,
      icon: <EventIcon />,
      color: theme.palette.info.main,
      bgColor: alpha(theme.palette.info.main, 0.1),
      type: 'upcoming'
    },
    {
      title: 'Đã hoàn thành',
      value: stats.completed,
      icon: <CheckCircleIcon />,
      color: theme.palette.primary.main,
      bgColor: alpha(theme.palette.primary.main, 0.1),
      type: 'completed'
    },
    {
      title: 'Tổng cộng',
      value: stats.total,
      icon: <CalendarIcon />,
      color: theme.palette.warning.main,
      bgColor: alpha(theme.palette.warning.main, 0.1),
      type: 'total'
    }
  ];

  // Loading state
  if (authLoading || loading) {
    return (
      <Container maxWidth="xl">
        <Box sx={{ py: 3 }}>
          <Grid container spacing={3}>
            {[1, 2, 3, 4].map((item) => (
              <Grid item xs={12} sm={6} md={3} key={item}>
                <Card sx={{ height: 120 }}>
                  <CardContent>
                    <Skeleton variant="text" width="60%" />
                    <Skeleton variant="text" width="40%" height={40} />
                  </CardContent>
                </Card>
              </Grid>
            ))}
            <Grid item xs={12} md={8}>
              <Card>
                <CardContent>
                  <Skeleton variant="text" width="40%" height={30} />
                  <Skeleton variant="rectangular" height={200} sx={{ mt: 2 }} />
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Skeleton variant="text" width="60%" height={30} />
                  <Skeleton variant="rectangular" height={200} sx={{ mt: 2 }} />
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 3 }}>
        {/* Socket.IO Status Indicator (only show if not connected) */}
        {!isConnected && (
          <Alert severity="info" sx={{ mb: 3 }}>
            Đang sử dụng chế độ polling (cập nhật mỗi 60s). Real-time updates không khả dụng.
          </Alert>
        )}
        
        {/* Header */}
        <Paper 
          elevation={0}
          className="slide-in-up"
          sx={{ 
            mb: { xs: 2, sm: 3, md: 4 }, 
            p: { xs: 2, sm: 3, md: 4 },
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
            color: 'white',
            position: 'relative',
            overflow: 'hidden',
            borderRadius: { xs: 2, sm: 3, md: 4 },
            boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.15)',
            '&:hover': {
              transform: { xs: 'none', sm: 'translateY(-2px)' },
              boxShadow: '0 15px 35px -5px rgba(59, 130, 246, 0.2)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }
          }}
        >
          {/* Background decoration */}
          <Box 
            className="float"
            sx={{
              position: 'absolute',
              top: -50,
              right: -50,
              width: { xs: 0, sm: 120, md: 200 },
              height: { xs: 0, sm: 120, md: 200 },
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 70%, transparent 100%)',
              zIndex: 0
            }} 
          />
          <Box 
            className="float"
            sx={{
              position: 'absolute',
              bottom: -30,
              left: -30,
              width: { xs: 0, sm: 100, md: 150 },
              height: { xs: 0, sm: 100, md: 150 },
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.03) 70%, transparent 100%)',
              zIndex: 0,
              animationDelay: '1s'
            }} 
          />
          <Box 
            className="pulse"
            sx={{
              position: 'absolute',
              top: '20%',
              left: '10%',
              width: { xs: 0, sm: 60, md: 80 },
              height: { xs: 0, sm: 60, md: 80 },
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)',
              zIndex: 0,
              animationDelay: '2s'
            }} 
          />
          
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Grid container alignItems="center" spacing={{ xs: 2, sm: 3 }}>
              <Grid item xs={12} md={8}>
                <Typography variant="h5" fontWeight={700} gutterBottom sx={{ color: 'white', fontSize: { xs: '1.25rem', sm: '1.5rem', md: '2rem' } }}>
                  Chào mừng trở lại, {user?.fullName?.split(' ').pop() || 'Người dùng'}! 
                </Typography>
                <Typography variant="h6" sx={{ opacity: 0.9, fontWeight: 400, fontSize: { xs: '0.95rem', md: '1.25rem' } }}>
                  {new Date().toLocaleDateString('vi-VN', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.8, mt: 1, fontSize: { xs: '0.85rem', md: '0.95rem' } }}>
                  Quản lý cuộc họp hiệu quả với Meeting Manager
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box sx={{ display: 'flex', justifyContent: { xs: 'stretch', md: 'flex-end' }, gap: 1, flexDirection: { xs: 'column', sm: 'row' } }}>
                  {(user?.role === 'admin' || user?.role === 'manager') && (
                    <Button
                      variant="outlined"
                      size={isMdUp ? 'large' : 'medium'}
                      startIcon={<TrendingUpIcon />}
                      onClick={() => navigate('/reports')}
                      sx={{
                        color: 'white',
                        borderColor: 'rgba(255,255,255,0.4)'
                      }}
                    >
                      Báo cáo thống kê
                    </Button>
                  )}
                  <Button
                    variant="contained"
                    size={isMdUp ? 'large' : 'medium'}
                    startIcon={<AddIcon />}
                    onClick={() => navigate('/meetings/create')}
                    disabled={!['admin', 'manager', 'secretary'].includes(user?.role)}
                    sx={{
                      bgcolor: 'rgba(255,255,255,0.2)',
                      color: 'white',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255,255,255,0.3)',
                      fontWeight: 600,
                      px: { xs: 2, md: 3 },
                      py: { xs: 1, md: 1.5 },
                      '&:hover': {
                        bgcolor: 'rgba(255,255,255,0.3)',
                        transform: { xs: 'none', sm: 'translateY(-2px)' },
                        boxShadow: theme.shadows[8]
                      },
                      '&:disabled': {
                        bgcolor: 'rgba(255,255,255,0.1)',
                        color: 'rgba(255,255,255,0.5)'
                      }
                    }}
                  >
                    Tạo cuộc họp mới
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </Paper>

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {statsCards.map((card, index) => (
            <Grid item xs={12} sm={6} md={3} key={card.type}>
              <Card 
                elevation={0}
                className="slide-in-up"
                sx={{ 
                  cursor: 'pointer',
                  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                  borderRadius: { xs: 2, sm: 3, md: 4 },
                  position: 'relative',
                  overflow: 'hidden',
                  background: 'rgba(255, 255, 255, 0.9)',
                  backdropFilter: 'blur(10px)',
                  animationDelay: `${index * 100}ms`,
                  '&:hover': {
                    transform: { xs: 'none', sm: 'translateY(-4px) scale(1.01)' },
                    boxShadow: `0 10px 25px -5px ${alpha(card.color, 0.15)}, 0 0 0 1px ${alpha(card.color, 0.08)}`,
                    borderColor: card.color,
                    '& .stat-icon': {
                      transform: { xs: 'none', sm: 'scale(1.05) rotate(2deg)' },
                      filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
                    },
                    '& .stat-value': {
                      transform: { xs: 'none', sm: 'scale(1.05)' },
                      color: card.color
                    }
                  },
                  '&:before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 5,
                    background: `linear-gradient(90deg, ${card.color} 0%, ${alpha(card.color, 0.8)} 50%, ${card.color} 100%)`,
                    zIndex: 1,
                    borderRadius: '16px 16px 0 0'
                  }
                }}
                onClick={() => handleStatCardClick(card.type)}
              >
                <CardContent sx={{ p: { xs: 2, md: 3 }, position: 'relative', zIndex: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                    <Box>
                      <Typography 
                        color="text.secondary" 
                        variant="body2" 
                        fontWeight={600}
                        sx={{ 
                          textTransform: 'uppercase', 
                          letterSpacing: 1,
                          fontSize: { xs: '0.7rem', md: '0.75rem' },
                          opacity: 0.8
                        }}
                      >
                        {card.title}
                      </Typography>
                      <Typography 
                        className="stat-value"
                        variant="h3" 
                        fontWeight={800} 
                        sx={{ 
                          color: card.color, 
                          mt: 1,
                          transition: 'all 0.3s ease',
                          textShadow: `0 2px 4px ${alpha(card.color, 0.2)}`,
                          fontSize: { xs: '2rem', sm: '2.25rem', md: '2.5rem' }
                        }}
                      >
                        {card.value}
                      </Typography>
                    </Box>
                    <Box
                      className="stat-icon"
                      sx={{
                        width: { xs: 48, sm: 56, md: 64 },
                        height: { xs: 48, sm: 56, md: 64 },
                        borderRadius: 3,
                        background: `linear-gradient(135deg, ${card.bgColor} 0%, ${alpha(card.color, 0.1)} 100%)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: card.color,
                        boxShadow: `0 8px 32px ${alpha(card.color, 0.3)}, inset 0 1px 0 rgba(255,255,255,0.5)`,
                        border: `2px solid ${alpha(card.color, 0.1)}`,
                        transition: 'all 0.3s ease',
                        position: 'relative',
                        overflow: 'hidden',
                        '&:before': {
                          content: '""',
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          background: `linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 100%)`,
                          borderRadius: 'inherit'
                        }
                      }}
                    >
                      {React.cloneElement(card.icon, { 
                        sx: { 
                          fontSize: { xs: 24, sm: 28, md: 32 },
                          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
                          position: 'relative',
                          zIndex: 1
                        } 
                      })}
                    </Box>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      className="pulse"
                      sx={{
                        width: { xs: 6, md: 8 },
                        height: { xs: 6, md: 8 },
                        borderRadius: '50%',
                        background: `linear-gradient(135deg, ${card.color} 0%, ${alpha(card.color, 0.6)} 100%)`,
                        boxShadow: `0 0 8px ${alpha(card.color, 0.4)}`,
                        animationDelay: `${index * 200}ms`
                      }}
                    />
                    <Typography 
                      variant="caption" 
                      color="text.secondary" 
                      fontWeight={600}
                      sx={{ 
                        fontSize: { xs: '0.7rem', md: '0.75rem' },
                        opacity: 0.8
                      }}
                    >
                      Dữ liệu thời gian thực
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Main Content */}
        <Grid container spacing={3}>
          {/* Recent Meetings */}
          <Grid item xs={12} md={8}>
            <Card 
              elevation={0}
              className="slide-in-left"
              sx={{ 
                height: '100%',
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                borderRadius: { xs: 2, sm: 3, md: 4 },
                background: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(10px)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: { xs: 'none', sm: 'translateY(-2px)' },
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                  borderColor: alpha(theme.palette.primary.main, 0.2)
                }
              }}
            >
              <CardContent sx={{ p: 0 }}>
                {/* Card Header */}
                <Box sx={{ 
                  p: { xs: 2, md: 3 }, 
                  pb: 2,
                  borderBottom: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
                  background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.02)} 0%, ${alpha(theme.palette.primary.main, 0.01)} 100%)`,
                  position: 'relative',
                  overflow: 'hidden',
                  '&:before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 3,
                    background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${alpha(theme.palette.primary.main, 0.6)} 100%)`,
                    borderRadius: '0 0 4px 4px'
                  }
                }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="h6" fontWeight={600} gutterBottom>
                        Cuộc họp gần đây
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Theo dõi các cuộc họp trong 7 ngày qua
                      </Typography>
                    </Box>
                    <Button
                      variant="outlined"
                      size="small"
                      endIcon={<ArrowForwardIcon />}
                      onClick={() => navigate('/meetings')}
                      sx={{ 
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: 500
                      }}
                    >
                      Xem tất cả
                    </Button>
                  </Box>
                </Box>

                {/* Meetings List */}
                <Box sx={{ p: { xs: 1.5, md: 2 } }}>
                  {recentMeetings.length > 0 ? (
                    <Stack spacing={2}>
                      {recentMeetings.map((meeting, index) => {
                        const status = getMeetingStatus(meeting.startTime, meeting.endTime);
                        return (
                          <Paper
                            key={meeting._id}
                            elevation={0}
                            sx={{
                              p: { xs: 1.75, md: 2.5 },
                              cursor: 'pointer',
                              borderRadius: 2,
                              border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
                              transition: 'all 0.2s ease-in-out',
                              '&:hover': {
                                borderColor: theme.palette.primary.main,
                                boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.1)}`,
                                transform: { xs: 'none', sm: 'translateY(-2px)' }
                              }
                            }}
                            onClick={() => navigate(`/meetings/${meeting._id}`)}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: { xs: 1.5, md: 2 } }}>
                              <Box
                                sx={{
                                  width: { xs: 40, md: 48 },
                                  height: { xs: 40, md: 48 },
                                  borderRadius: 2,
                                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: 'primary.main',
                                  flexShrink: 0
                                }}
                              >
                                <CalendarIcon />
                              </Box>
                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                  <Typography variant="subtitle1" fontWeight={600} noWrap sx={{ flex: 1, fontSize: { xs: '0.95rem', md: '1rem' } }}>
                                    {meeting.title}
                                  </Typography>
                                  <Chip
                                    label={getStatusLabel(status)}
                                    color={getStatusColor(status)}
                                    size="small"
                                    sx={{ fontWeight: 500 }}
                                  />
                                </Box>
                                <Stack spacing={0.8}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <AccessTimeIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                    <Typography variant="body2" color="text.secondary">
                                      {formatDate(meeting.startTime)} • {formatTime(meeting.startTime)} - {formatTime(meeting.endTime)}
                                    </Typography>
                                  </Box>
                                  {(meeting.room || meeting.location) && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <LocationIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                      <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: { xs: '70%', md: '100%' } }}>
                                        {meeting.room ? meeting.room.name : meeting.location}
                                      </Typography>
                                    </Box>
                                  )}
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <GroupsIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                    <Typography variant="body2" color="text.secondary">
                                      {meeting.participants?.length || 0} người tham gia
                                    </Typography>
                                  </Box>
                                </Stack>
                              </Box>
                              <IconButton 
                                size="small"
                                sx={{ 
                                  color: 'text.secondary',
                                  '&:hover': { color: 'primary.main' }
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/meetings/${meeting._id}`);
                                }}
                              >
                                <ArrowForwardIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          </Paper>
                        );
                      })}
                    </Stack>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: { xs: 4, md: 6 } }}>
                      <Box
                        sx={{
                          width: { xs: 64, md: 80 },
                          height: { xs: 64, md: 80 },
                          borderRadius: '50%',
                          bgcolor: alpha(theme.palette.primary.main, 0.1),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mx: 'auto',
                          mb: 2
                        }}
                      >
                        <EventBusyIcon sx={{ fontSize: { xs: 32, md: 40 }, color: 'primary.main' }} />
                      </Box>
                      <Typography variant="h6" fontWeight={500} gutterBottom>
                        Chưa có cuộc họp nào
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Tạo cuộc họp đầu tiên để bắt đầu
                      </Typography>
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Right Sidebar */}
          <Grid item xs={12} md={4}>
            <Stack spacing={3}>
              {/* Quick Actions */}
              <Card 
                elevation={0}
                className="slide-in-right"
                sx={{ 
                  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                  borderRadius: { xs: 2, sm: 3, md: 4 },
                  background: 'rgba(255, 255, 255, 0.9)',
                  backdropFilter: 'blur(10px)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: { xs: 'none', sm: 'translateY(-1px)' },
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.03)',
                    borderColor: alpha(theme.palette.primary.main, 0.15)
                  }
                }}
              >
                <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Các tính năng được sử dụng nhiều nhất
                  </Typography>
                  <QuickActions
                    userId={user?._id}
                    onNavigate={(path) => navigate(path)}
                    catalog={[
                      { id: 'meetings', icon: <CalendarIcon />, text: 'Xem lịch họp', path: '/meetings', color: 'primary' },
                      { id: 'rooms', icon: <LocationIcon />, text: 'Quản lý phòng họp', path: '/meeting-rooms', color: 'success' },
                      { id: 'archives', icon: <AssignmentIcon />, text: 'Lưu trữ tài liệu', path: '/archives', color: 'warning' },
                      { id: 'invitations', icon: <MailIcon />, text: 'Lời mời họp', path: '/invitations', color: 'info' },
                      { id: 'reports', icon: <TrendingUpIcon />, text: 'Báo cáo thống kê', path: '/reports', color: 'secondary' },
                      { id: 'create', icon: <AddIcon />, text: 'Tạo cuộc họp mới', path: '/meetings/create', color: 'success' }
                    ]}
                  />
                </CardContent>
              </Card>

              {/* Pending Items */}
              {(pendingProtocols.length > 0 || pendingInvitations.length > 0 || pendingMeetings.length > 0) && (
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6" fontWeight={600}>
                        Chờ xử lý
                      </Typography>
                      <IconButton 
                        size="small" 
                        onClick={handleManualRefresh}
                        disabled={refreshing}
                        sx={{ 
                          '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.1) }
                        }}
                      >
                        <RefreshIcon 
                          fontSize="small" 
                          sx={{
                            animation: refreshing ? 'spin 1s linear infinite' : 'none',
                            '@keyframes spin': {
                              '0%': { transform: 'rotate(0deg)' },
                              '100%': { transform: 'rotate(360deg)' }
                            }
                          }}
                        />
                      </IconButton>
                    </Box>
                    <List sx={{ py: 0 }}>
                      {pendingProtocols.length > 0 && (
                        <Box
                          sx={{
                            cursor: 'pointer',
                            '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.04) }
                          }}
                          onClick={() => navigate('/protocol-approvals')}
                        >
                          <ListItem
                            sx={{ px: 0 }}
                          >
                            <ListItemAvatar>
                              <Badge badgeContent={pendingProtocols.length} color="error">
                                <Avatar sx={{ bgcolor: alpha(theme.palette.warning.main, 0.1), color: 'warning.main' }}>
                                  <DescriptionIcon />
                                </Avatar>
                              </Badge>
                            </ListItemAvatar>
                            <ListItemText
                              primary="Biên bản chờ duyệt"
                              secondary={`${pendingProtocols.length} biên bản`}
                            />
                          </ListItem>
                          
                          {/* Hiển thị danh sách biên bản gọn gàng */}
                          <Box sx={{ px: 2, pb: 2 }}>
                            <ProtocolList
                              protocols={pendingProtocols}
                              maxItems={3}
                              onView={(protocol) => {
                                // Navigate to protocol detail or open modal
                                console.log('View protocol:', protocol);
                              }}
                              canApprove={user?.role === 'admin' || user?.role === 'manager'}
                            />
                          </Box>
                        </Box>
                      )}
                      {pendingInvitations.length > 0 && (
                        <ListItem
                          sx={{
                            px: 0,
                            cursor: 'pointer',
                            '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.04) }
                          }}
                          onClick={() => navigate('/invitations')}
                        >
                          <ListItemAvatar>
                            <Badge badgeContent={pendingInvitations.length} color="error">
                              <Avatar sx={{ bgcolor: alpha(theme.palette.info.main, 0.1), color: 'info.main' }}>
                                <MailIcon />
                              </Avatar>
                            </Badge>
                          </ListItemAvatar>
                          <ListItemText
                            primary="Lời mời họp"
                            secondary={`${pendingInvitations.length} lời mời`}
                          />
                        </ListItem>
                      )}
                      {pendingMeetings.length > 0 && (
                        <ListItem
                          sx={{
                            px: 0,
                            cursor: 'pointer',
                            '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.04) }
                          }}
                          onClick={() => navigate('/meeting-approvals')}
                        >
                          <ListItemAvatar>
                            <Badge badgeContent={pendingMeetings.length} color="error">
                              <Avatar sx={{ bgcolor: alpha(theme.palette.error.main, 0.1), color: 'error.main' }}>
                                <ScheduleIcon />
                              </Avatar>
                            </Badge>
                          </ListItemAvatar>
                          <ListItemText
                            primary="Cuộc họp chờ phê duyệt"
                            secondary={`${pendingMeetings.length} cuộc họp`}
                          />
                        </ListItem>
                      )}
                    </List>
                  </CardContent>
                </Card>
              )}


            </Stack>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default Dashboard;
