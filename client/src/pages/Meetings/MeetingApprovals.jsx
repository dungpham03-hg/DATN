import React, { useEffect, useState } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  CircularProgress, 
  Alert, 
  Card, 
  CardContent, 
  Button, 
  Stack, 
  Chip,
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  TextField,
  Avatar,
  Divider
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Schedule as ScheduleIcon,
  Room as RoomIcon,
  Group as GroupIcon
} from '@mui/icons-material';
import axios from 'axios';
import dayjs from 'dayjs';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const MeetingApprovals = () => {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [approvalDialog, setApprovalDialog] = useState({ open: false, mode: null, meetingId: null });
  const [note, setNote] = useState('');
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

  const fetchPendingApprovals = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/meetings/pending-approval`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMeetings(res.data.meetings);
      setError('');
    } catch (err) {
      console.error('Error fetching pending approvals:', err);
      setError('Không thể tải danh sách cuộc họp chờ phê duyệt.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = (meetingId) => {
    setApprovalDialog({ open: true, mode: 'approve', meetingId });
    setNote('');
  };

  const handleReject = (meetingId) => {
    setApprovalDialog({ open: true, mode: 'reject', meetingId });
    setNote('');
  };

  const handleCloseDialog = () => {
    setApprovalDialog({ open: false, mode: null, meetingId: null });
    setNote('');
  };

  const handleSubmitApproval = async () => {
    try {
      await axios.put(`${API_BASE_URL}/meetings/${approvalDialog.meetingId}/approval`, {
        status: approvalDialog.mode === 'approve' ? 'approved' : 'rejected',
        note
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert(approvalDialog.mode === 'approve' ? 'Đã phê duyệt cuộc họp' : 'Đã từ chối cuộc họp');
      handleCloseDialog();
      fetchPendingApprovals();
      
      // Force refresh Dashboard
      if (window.refreshDashboard) {
        window.refreshDashboard();
      }
    } catch (err) {
      console.error('Error submitting approval:', err);
      alert(`Lỗi khi phê duyệt: ${err.response?.data?.message || err.message}`);
    }
  };

  const handleViewDetails = (meetingId) => {
    navigate(`/meetings/${meetingId}`);
  };

  const getLocationText = (meeting) => {
    if (meeting.meetingType === 'online') return 'Trực tuyến';
    if (meeting.room) {
      return meeting.room.name || (meeting.room.location?.floor ? meeting.room.location.floor : '—');
    }
    return meeting.location || '—';
  };

  useEffect(() => {
    fetchPendingApprovals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
        <Typography variant="h6" textAlign="center" mt={2}>Đang tải danh sách phê duyệt...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom fontWeight={700}>
        Phê duyệt cuộc họp
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {meetings.length === 0 ? (
        <Alert severity="info">Không có cuộc họp nào cần phê duyệt.</Alert>
      ) : (
        <Stack spacing={3} sx={{ mt: 3 }}>
          {meetings.map((meeting) => (
            <Card key={meeting._id} sx={{ borderRadius: 2, boxShadow: 3 }}>
              <CardContent>
                <Stack spacing={2}>
                  {/* Header */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h5" fontWeight={600}>{meeting.title}</Typography>
                    <Chip 
                      label="Chờ phê duyệt" 
                      color="warning" 
                      size="medium"
                      icon={<ScheduleIcon />}
                    />
                  </Box>

                  <Divider />

                  {/* Organizer */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar sx={{ width: 32, height: 32 }}>
                      {meeting.organizer?.fullName?.charAt(0).toUpperCase() || 'U'}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" color="text.secondary">Người tổ chức</Typography>
                      <Typography variant="body1" fontWeight={500}>
                        {meeting.organizer?.fullName || '—'}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Time */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ScheduleIcon fontSize="small" color="action" />
                    <Typography variant="body2">
                      {dayjs(meeting.startTime).format('DD/MM/YYYY HH:mm')} - {dayjs(meeting.endTime).format('HH:mm')}
                    </Typography>
                  </Box>

                  {/* Location */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <RoomIcon fontSize="small" color="action" />
                    <Typography variant="body2">{getLocationText(meeting)}</Typography>
                  </Box>

                  {/* Attendees count */}
                  {meeting.attendees && meeting.attendees.length > 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <GroupIcon fontSize="small" color="action" />
                      <Typography variant="body2">
                        {meeting.attendees.length} người tham gia
                      </Typography>
                    </Box>
                  )}

                  {/* Description */}
                  {meeting.description && (
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Mô tả: {meeting.description}
                      </Typography>
                    </Box>
                  )}

                  <Divider />

                  {/* Actions */}
                  <Stack direction="row" spacing={2} justifyContent="flex-end">
                    <Button 
                      variant="outlined" 
                      onClick={() => handleViewDetails(meeting._id)}
                    >
                      Xem chi tiết
                    </Button>
                    <Button 
                      variant="outlined" 
                      color="error" 
                      startIcon={<CancelIcon />}
                      onClick={() => handleReject(meeting._id)}
                    >
                      Từ chối
                    </Button>
                    <Button 
                      variant="contained" 
                      color="success"
                      startIcon={<CheckCircleIcon />}
                      onClick={() => handleApprove(meeting._id)}
                    >
                      Phê duyệt
                    </Button>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      {/* Approval Dialog */}
      <Dialog open={approvalDialog.open} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {approvalDialog.mode === 'approve' ? 'Phê duyệt cuộc họp' : 'Từ chối cuộc họp'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label={approvalDialog.mode === 'approve' ? 'Ghi chú (Tùy chọn)' : 'Lý do từ chối'}
            type="text"
            fullWidth
            variant="outlined"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            multiline
            rows={4}
            required={approvalDialog.mode === 'reject'}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="primary">
            Hủy
          </Button>
          <Button 
            onClick={handleSubmitApproval} 
            color={approvalDialog.mode === 'approve' ? 'success' : 'error'}
            variant="contained"
            disabled={approvalDialog.mode === 'reject' && !note.trim()}
          >
            {approvalDialog.mode === 'approve' ? 'Phê duyệt' : 'Từ chối'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default MeetingApprovals;
