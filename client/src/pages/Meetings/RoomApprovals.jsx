import React, { useEffect, useState } from 'react';
import { Container, Box, Paper, Typography, Stack, Chip, Button, TextField, alpha, useTheme } from '@mui/material';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';

const RoomApprovals = () => {
  const theme = useTheme();
  const { token } = useAuth();
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [noteMap, setNoteMap] = useState({});

  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

  const fetchPending = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/meetings`, {
        params: { limit: 1000 },
        headers: { Authorization: `Bearer ${token}` }
      });
      const list = (res.data.meetings || []).filter(m => m.room && m.roomApproval?.status === 'pending');
      setMeetings(list);
    } catch (e) {
      console.error('Fetch pending room approvals error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPending(); }, []);

  const act = async (id, status) => {
    try {
      const note = noteMap[id] || '';
      await axios.put(`${API_BASE_URL}/meetings/${id}/room-approval`, { status, note }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchPending();
    } catch (e) {
      console.error('Approve room error:', e);
      alert(e.response?.data?.message || 'Không thể cập nhật');
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 3 }}>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Duyệt phòng họp
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Danh sách cuộc họp có yêu cầu phòng đang chờ duyệt
        </Typography>

        {loading ? (
          <Typography>Đang tải...</Typography>
        ) : meetings.length === 0 ? (
          <Paper elevation={0} sx={{ p: 4, textAlign: 'center', border: `1px solid ${alpha(theme.palette.divider, 0.1)}`, borderRadius: 2 }}>
            <Typography>Không có yêu cầu nào.</Typography>
          </Paper>
        ) : (
          <Stack spacing={2}>
            {meetings.map(m => (
              <Paper key={m._id} elevation={0} sx={{ p: 2, border: `1px solid ${alpha(theme.palette.divider, 0.1)}`, borderRadius: 2 }}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }}>
                  <Box>
                    <Typography variant="h6" fontWeight={700}>{m.title}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Thời gian: {new Date(m.startTime).toLocaleString('vi-VN')} - {new Date(m.endTime).toLocaleString('vi-VN')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Phòng: {m.room?.name}
                    </Typography>
                    <Chip label="Chờ duyệt" color="warning" size="small" sx={{ mt: 1 }} />
                  </Box>
                  <Stack spacing={1} sx={{ minWidth: 280 }}>
                    <TextField
                      placeholder="Ghi chú (tuỳ chọn)"
                      size="small"
                      value={noteMap[m._id] || ''}
                      onChange={(e) => setNoteMap(prev => ({ ...prev, [m._id]: e.target.value }))}
                    />
                    <Stack direction="row" spacing={1}>
                      <Button variant="contained" color="success" onClick={() => act(m._id, 'approved')}>Duyệt</Button>
                      <Button variant="outlined" color="error" onClick={() => act(m._id, 'rejected')}>Từ chối</Button>
                    </Stack>
                  </Stack>
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}
      </Box>
    </Container>
  );
};

export default RoomApprovals;


