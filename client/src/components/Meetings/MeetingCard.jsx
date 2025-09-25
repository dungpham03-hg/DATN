import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  IconButton,
  Stack,
  Avatar,
  useTheme,
  alpha
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  AccessTime as AccessTimeIcon,
  LocationOn as LocationIcon,
  Groups as GroupsIcon,
  CalendarMonth as CalendarIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { getMeetingStatus } from '../../utils/dateUtils';

const MeetingCard = ({ meeting, onMenuClick, onEditClick, canEdit }) => {
  const theme = useTheme();
  const navigate = useNavigate();

  const status = getMeetingStatus(meeting.startTime, meeting.endTime);

  // Debug: Check room data
  console.log('🔍 MeetingCard - Meeting data:', {
    id: meeting._id,
    title: meeting.title,
    room: meeting.room,
    location: meeting.location,
    hasRoom: !!meeting.room,
    roomName: meeting.room?.name,
    roomLocation: meeting.room?.location
  });

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatWeekdayDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric'
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
      cancelled: 'error',
      unknown: 'warning'
    };
    return colors[status] || 'default';
  };

  const getStatusLabel = (status) => {
    const labels = {
      ongoing: 'Đang diễn ra',
      upcoming: 'Sắp diễn ra',
      completed: 'Đã kết thúc',
      cancelled: 'Đã hủy',
      unknown: 'Không xác định'
    };
    return labels[status] || 'Không xác định';
  };

  const getPriorityChip = () => {
    const p = meeting.priority;
    if (!p) return null;
    const map = { low: 'Thấp', medium: 'Trung bình', high: 'Cao', urgent: 'Khẩn cấp' };
    const color = p === 'urgent' || p === 'high' ? 'error' : 'warning';
    return (
      <Chip size="small" label={map[p] || p} color={color} />
    );
  };

  const meetingTypeLabel = meeting.meetingType === 'online' ? 'Trực tuyến' : meeting.meetingType === 'hybrid' ? 'Kết hợp' : 'Trực tiếp';
  const attendees = Array.isArray(meeting.attendees) ? meeting.attendees.map(a => a.user || a) : (meeting.participants || []);
  const attendeesCount = attendees.length || 0;

  return (
    <Card
      elevation={0}
      sx={{
        height: '100%',
        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        borderRadius: 3,
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out',
        position: 'relative',
        overflow: 'hidden',
        '&:hover': {
          borderColor: theme.palette.primary.main,
          boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.12)}`,
          transform: 'translateY(-4px)'
        },
        '&:before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${alpha(theme.palette.primary.main, 0.7)} 100%)`,
          opacity: 0,
          transition: 'opacity 0.2s ease-in-out'
        },
        '&:hover:before': {
          opacity: 1
        }
      }}
      onClick={() => navigate(`/meetings/${meeting._id}`)}
    >
      <CardContent sx={{ p: 3 }}>
        {/* Title Row */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
          <Typography 
            variant="subtitle1" 
            fontWeight={700}
            noWrap
            sx={{ color: 'primary.main' }}
          >
            {meeting.title}
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            {getPriorityChip()}
            {canEdit && (
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditClick && onEditClick(meeting);
                }}
                sx={{
                  color: 'text.secondary',
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    color: 'primary.main'
                  }
                }}
              >
                <EditIcon />
              </IconButton>
            )}
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onMenuClick && onMenuClick(e, meeting);
              }}
              sx={{ 
                color: 'text.secondary',
                '&:hover': {
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  color: 'primary.main'
                }
              }}
            >
              <MoreVertIcon />
            </IconButton>
          </Stack>
        </Box>

        {meeting.description && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {meeting.description}
          </Typography>
        )}

        {/* Status + Type */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Chip size="small" label={status === 'upcoming' ? 'Đã lên lịch' : getStatusLabel(status)} color={getStatusColor(status)} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
            <LocationIcon sx={{ fontSize: 16 }} />
            <Typography variant="body2" color="text.secondary">{meetingTypeLabel}</Typography>
          </Box>
        </Box>

        {/* Details */}
        <Stack spacing={1.25} sx={{ mb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CalendarIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">{formatWeekdayDate(meeting.startTime)}</Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AccessTimeIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">{formatTime(meeting.startTime)} - {formatTime(meeting.endTime)}</Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocationIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary" noWrap>
              {meeting.room ? `${meeting.room.name} - ${meeting.room.location?.floor || ''}` : (meeting.location || '—')}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <GroupsIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">{attendeesCount} người tham gia</Typography>
          </Box>
        </Stack>

        {/* Organizer */}
        <Box sx={{ mt: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Tổ chức bởi: {meeting.organizer?.fullName || meeting.organizer?.email || '—'}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default MeetingCard;
