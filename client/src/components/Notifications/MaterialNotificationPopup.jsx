import React, { useState } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Avatar,
  IconButton,
  Chip,
  Button,
  Divider,
  Paper,
  Stack,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  useTheme,
  alpha
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  CalendarMonth as CalendarIcon,
  Description as FileIcon,
  Mail as MailIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
  MarkEmailRead as MarkReadIcon,
  CheckCircle as AcceptIcon,
  Cancel as DeclineIcon,
  Comment as CommentIcon} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import axios from 'axios';
import SocketStatusAlert from './SocketStatusAlert';

const MaterialNotificationPopup = ({ onClose }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotification();
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [responding, setResponding] = useState(false);
  
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

  const handleNotificationClick = async (notification) => {
    // Đánh dấu đã đọc
    if (!notification.read) {
      await markAsRead(notification._id);
    }

    // Navigate tùy theo loại thông báo
    if ((notification.type === 'meeting_invite' || notification.type === 'minutes_pending') && notification.data?.meetingId) {
      navigate(`/meetings/${notification.data.meetingId._id || notification.data.meetingId}${notification.type==='minutes_pending' ? '?openMinutes=1' : ''}`);
    }
    if (notification.type === 'protocol_pending' && notification.data?.meetingId) {
      const id = notification.data.meetingId._id || notification.data.meetingId;
      navigate(`/meetings/${id}?openProtocol=1`);
    }
    if (notification.type === 'invite_response' && notification.data?.meetingId) {
      const id = notification.data.meetingId._id || notification.data.meetingId;
      navigate(`/meetings/${id}`);
    }
    
    onClose?.();
  };

  // Hàm xử lý phản hồi lời mời
  const handleInviteResponse = async (notification, status, reason = '') => {
    if (!notification.data?.meetingId) return;
    
    try {
      setResponding(true);
      const meetingId = notification.data.meetingId._id || notification.data.meetingId;
      
      await axios.post(`${API_BASE_URL}/meetings/${meetingId}/respond-invite`, {
        status,
        reason
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Đánh dấu thông báo đã đọc
      await markAsRead(notification._id);
      
      // Đóng modal và reset state
      setShowDeclineModal(false);
      setDeclineReason('');
      setSelectedNotification(null);
      
    } catch (error) {
      console.error('Error responding to invite:', error);
    } finally {
      setResponding(false);
    }
  };

  const handleAcceptInvite = (notification) => {
    handleInviteResponse(notification, 'accepted');
  };

  const handleDeclineInvite = (notification) => {
    setSelectedNotification(notification);
    setShowDeclineModal(true);
  };

  const confirmDecline = () => {
    if (selectedNotification) {
      handleInviteResponse(selectedNotification, 'declined', declineReason);
    }
  };

  const getNotificationIcon = (type) => {
    const iconProps = { sx: { fontSize: 20 } };
    switch (type) {
      case 'meeting_invite':
        return <CalendarIcon color="primary" {...iconProps} />;
      case 'minutes_pending':
        return <FileIcon color="warning" {...iconProps} />;
      case 'protocol_pending':
        return <FileIcon color="info" {...iconProps} />;
      case 'invite_response':
        return <MailIcon color="primary" {...iconProps} />;
      default:
        return <NotificationsIcon color="action" {...iconProps} />;
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'meeting_invite':
        return theme.palette.primary.main;
      case 'minutes_pending':
        return theme.palette.warning.main;
      case 'protocol_pending':
        return theme.palette.info.main;
      case 'invite_response':
        return theme.palette.success.main;
      default:
        return theme.palette.grey[500];
    }
  };

  const formatTime = (date) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: vi });
  };

  const getTypeLabel = (type) => {
    const labels = {
      meeting_invite: 'Lời mời họp',
      minutes_pending: 'Biên bản chờ duyệt',
      protocol_pending: 'Nghị quyết chờ duyệt',
      invite_response: 'Phản hồi lời mời'
    };
    return labels[type] || 'Thông báo';
  };

  return (
    <Box sx={{ width: 360, maxHeight: '80vh' }}>
      {/* Socket Status Alert */}
      <SocketStatusAlert />
      
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h6" fontWeight={600}>
            Thông báo
          </Typography>
          {unreadCount > 0 && (
            <Button
              size="small"
              onClick={markAllAsRead}
              startIcon={<MarkReadIcon />}
              sx={{ fontSize: '0.75rem' }}
            >
              Đọc tất cả
            </Button>
          )}
        </Stack>
        {unreadCount > 0 && (
          <Typography variant="caption" color="text.secondary">
            {unreadCount} thông báo chưa đọc
          </Typography>
        )}
      </Box>

      {/* Notification List - single scroll via container (no inner scrollbars) */}
      <Box sx={{ overflow: 'visible' }}>
        {notifications.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <NotificationsIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
            <Typography variant="body2" color="text.secondary">
              Không có thông báo nào
            </Typography>
          </Box>
        ) : (
          <List sx={{ py: 0 }}>
            {notifications.slice(0, 10).map((notification, index) => (
              <React.Fragment key={notification._id}>
                <ListItem
                  alignItems="flex-start"
                  sx={{
                    cursor: 'pointer',
                    bgcolor: !notification.read ? alpha(theme.palette.primary.main, 0.04) : 'transparent',
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.08)},
                    borderLeft: !notification.read ? `3px solid ${getNotificationColor(notification.type)}` : 'none',
                    pl: !notification.read ? 1.5 : 2}}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <ListItemAvatar>
                    <Avatar
                      sx={{
                        bgcolor: alpha(getNotificationColor(notification.type), 0.1),
                        color: getNotificationColor(notification.type),
                        width: 40,
                        height: 40}}
                    >
                      {getNotificationIcon(notification.type)}
                    </Avatar>
                  </ListItemAvatar>
                  
                  <ListItemText
                    primary={
                      <Box>
                        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                          <Typography variant="subtitle2" fontWeight={600} noWrap>
                            {notification.title}
                          </Typography>
                          {!notification.read && (
                            <Box
                              sx={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                bgcolor: 'primary.main',
                                flexShrink: 0}}
                            />
                          )}
                        </Stack>
                        <Chip
                          label={getTypeLabel(notification.type)}
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: '0.6rem',
                            bgcolor: alpha(getNotificationColor(notification.type), 0.1),
                            color: getNotificationColor(notification.type)}}
                        />
                      </Box>
                    }
                    secondary={
                      <Box sx={{ mt: 1 }}>
                        <Box sx={{ mb: 1, color: 'text.secondary' }}>
                          {notification.message}
                        </Box>
                        
                        {/* Hiển thị lý do từ chối nếu có */}
                        {notification.type === 'invite_response' && 
                         notification.data?.response === 'declined' && 
                         notification.data?.reason && (
                          <Alert 
                            severity="warning" 
                            icon={<CommentIcon />}
                            sx={{ 
                              fontSize: '0.75rem',
                              py: 0.5,
                              '& .Alert-message': { py: 0 }
                            }}
                          >
                            <Box component="span" variant="caption">
                              <strong>Lý do từ chối:</strong> {notification.data.reason}
                            </Box>
                          </Alert>
                        )}
                        
                        {/* Action buttons for meeting invites */}
                        {notification.type === 'meeting_invite' && !notification.data?.responded && (
                          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                            <Button
                              size="small"
                              variant="contained"
                              color="success"
                              startIcon={<AcceptIcon />}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAcceptInvite(notification);
                              }}
                              disabled={responding}
                              sx={{ fontSize: '0.7rem', py: 0.5 }}
                            >
                              Chấp nhận
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              startIcon={<DeclineIcon />}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeclineInvite(notification);
                              }}
                              disabled={responding}
                              sx={{ fontSize: '0.7rem', py: 0.5 }}
                            >
                              Từ chối
                            </Button>
                          </Stack>
                        )}
                        
                        <Box component="span" sx={{ mt: 1, display: 'block', color: 'text.disabled', fontSize: '0.75rem' }}>
                          {formatTime(notification.createdAt)}
                        </Box>
                      </Box>
                    }
                  />
                  
                  <ListItemSecondaryAction>
                    <Stack direction="column" spacing={0.5}>
                      {!notification.read && (
                        <Tooltip title="Đánh dấu đã đọc">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notification._id);
                            }}
                          >
                            <CheckIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="Xóa thông báo">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification._id);
                          }}
                          sx={{ color: 'error.main' }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </ListItemSecondaryAction>
                </ListItem>
                {index < notifications.slice(0, 10).length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}
      </Box>

      {/* Footer */}
      {notifications.length > 10 && (
        <>
          <Divider />
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Button
              fullWidth
              variant="text"
              onClick={() => {
                navigate('/notifications');
                onClose?.();
              }}
            >
              Xem tất cả thông báo
            </Button>
          </Box>
        </>
      )}

      {/* Decline Modal */}
      <Dialog open={showDeclineModal} onClose={() => setShowDeclineModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Từ chối lời mời</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Bạn có thể để lại lý do từ chối (tùy chọn):
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            placeholder="Nhập lý do từ chối..."
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            variant="outlined"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeclineModal(false)} disabled={responding}>
            Hủy
          </Button>
          <Button
            onClick={confirmDecline}
            variant="contained"
            color="error"
            disabled={responding}
            startIcon={responding ? <CircularProgress size={16} /> : <DeclineIcon />}
          >
            Từ chối
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MaterialNotificationPopup;
