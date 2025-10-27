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
  ToggleButton,
  ToggleButtonGroup,
  FormControlLabel,
  Switch
} from '@mui/material';
import axios from 'axios';
import dayjs from 'dayjs';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Invitations = () => {
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDeclineDialog, setOpenDeclineDialog] = useState(false);
  const [selectedMeetingId, setSelectedMeetingId] = useState(null);
  const [declineReason, setDeclineReason] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [includePast, setIncludePast] = useState(false);
  const { token } = useAuth();
  const navigate = useNavigate();
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

  const getLocationText = (invite) => {
    if (invite.meetingType === 'online') return 'Trực tuyến';
    if (invite.room && (invite.room.name || invite.room.location)) {
      const floor = typeof invite.room.location === 'string' 
        ? invite.room.location 
        : (invite.room.location?.floor || '');
      const parts = [invite.room.name, floor].filter(Boolean);
      if (parts.length > 0) return parts.join(' - ');
    }
    return invite.location || '—';
  };

  const fetchInvitations = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (includePast) params.append('includePast', 'true');
      const res = await axios.get(`${API_BASE_URL}/meetings/invitations?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInvitations(res.data.invitations);
      setError('');
    } catch (err) {
      console.error('Error fetching invitations:', err);
      setError('Không thể tải danh sách lời mời.');
    } finally {
      setLoading(false);
    }
  };

  const handleRespondInvite = async (meetingId, responseStatus) => {
    try {
      await axios.post(`${API_BASE_URL}/meetings/${meetingId}/respond-invite`, { 
        response: responseStatus, 
        reason: responseStatus === 'declined' ? declineReason : '' 
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(`Bạn đã ${responseStatus === 'accepted' ? 'chấp nhận' : 'từ chối'} lời mời.`);
      setOpenDeclineDialog(false);
      setDeclineReason('');
      fetchInvitations();
      
      // Force refresh Dashboard
      if (window.refreshDashboard) {
        window.refreshDashboard();
      }
    } catch (err) {
      console.error('Error responding to invite:', err);
      alert(`Lỗi khi phản hồi lời mời: ${err.response?.data?.message || err.message}`);
    }
  };

  const handleOpenDeclineDialog = (meetingId) => {
    setSelectedMeetingId(meetingId);
    setOpenDeclineDialog(true);
  };

  const handleCloseDeclineDialog = () => {
    setOpenDeclineDialog(false);
    setSelectedMeetingId(null);
    setDeclineReason('');
  };

  const handleJoinMeeting = (meetingLink, meetingId) => {
    if (meetingLink) {
      window.open(meetingLink, '_blank');
    } else {
      navigate(`/meetings/${meetingId}`); // Điều hướng đến trang chi tiết cuộc họp
    }
  };

  useEffect(() => {
    fetchInvitations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, includePast]);

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
        <Typography variant="h6" textAlign="center" mt={2}>Đang tải lời mời...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom fontWeight={700}>
        Lời mời tham gia cuộc họp
      </Typography>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <ToggleButtonGroup
          value={statusFilter}
          exclusive
          size="small"
          onChange={(e, val) => val && setStatusFilter(val)}
        >
          <ToggleButton value="all">Tất cả</ToggleButton>
          <ToggleButton value="pending">Chờ xử lý</ToggleButton>
          <ToggleButton value="accepted">Đã chấp nhận</ToggleButton>
          <ToggleButton value="declined">Đã từ chối</ToggleButton>
        </ToggleButtonGroup>
        <FormControlLabel
          control={<Switch checked={includePast} onChange={(e) => setIncludePast(e.target.checked)} />}
          label="Hiển thị đã kết thúc"
        />
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {invitations.length === 0 ? (
        <Alert severity="info">Bạn không có lời mời nào đang chờ xử lý.</Alert>
      ) : (
        <Stack spacing={3}>
          {invitations.map((invite) => (
            <Card key={invite._id} sx={{ borderRadius: 2, boxShadow: 3 }}>
              <CardContent>
                <Stack spacing={2}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6" fontWeight={600}>{invite.title}</Typography>
                    <Chip 
                      label={invite.timeStatus === 'upcoming' ? 'Sắp tới' : invite.timeStatus === 'ongoing' ? 'Đang diễn ra' : invite.timeStatus}
                      color={invite.timeStatus === 'upcoming' ? 'info' : invite.timeStatus === 'ongoing' ? 'primary' : 'default'}
                      size="small"
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary">Mô tả: {invite.description || 'Không có'}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Thời gian: {dayjs(invite.startTime).format('DD/MM/YYYY HH:mm')} - {dayjs(invite.endTime).format('DD/MM/YYYY HH:mm')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">Địa điểm: {getLocationText(invite)}</Typography>
                  <Typography variant="body2" color="text.secondary">Người tổ chức: {invite.organizer?.fullName || '—'}</Typography>
                  
                  <Stack direction="row" spacing={1} justifyContent="flex-end" mt={2}>
                    {invite.attendeeStatus === 'invited' ? (
                      <>
                        <Button variant="outlined" color="error" onClick={() => handleOpenDeclineDialog(invite._id)}>
                          Từ chối
                        </Button>
                        <Button variant="contained" color="success" onClick={() => handleRespondInvite(invite._id, 'accepted')}>
                          Chấp nhận
                        </Button>
                      </>
                    ) : invite.attendeeStatus === 'accepted' ? (
                      <>
                        <Chip label="Đã chấp nhận" color="success" size="small" sx={{ mr: 1 }} />
                        {invite.timeStatus !== 'ended' && (
                          <Button variant="contained" onClick={() => handleJoinMeeting(invite.meetingLink, invite._id)}>
                            Tham gia cuộc họp
                          </Button>
                        )}
                      </>
                    ) : invite.attendeeStatus === 'declined' ? (
                      <Chip label="Đã từ chối" color="error" size="small" />
                    ) : null}
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      <Dialog open={openDeclineDialog} onClose={handleCloseDeclineDialog}>
        <DialogTitle>Từ chối lời mời</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Lý do từ chối (Tùy chọn)"
            type="text"
            fullWidth
            variant="outlined"
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            multiline
            rows={4}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeclineDialog} color="primary">
            Hủy
          </Button>
          <Button onClick={() => handleRespondInvite(selectedMeetingId, 'declined')} color="error">
            Từ chối
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Invitations;
