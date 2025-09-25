import React, { useEffect, useState } from 'react';
import { Container, Box, Paper, Typography, Grid, FormControl, InputLabel, OutlinedInput, Button, useTheme, alpha, ButtonGroup, Chip, Stack, Skeleton } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';

const Reports = () => {
  const theme = useTheme();
  const { token, user } = useAuth();
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const canView = user && (user.role === 'admin' || user.role === 'manager');

  const fetchData = async () => {
    if (!canView) return;
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/meetings/stats/summary`, {
        params: { from, to },
        headers: { Authorization: `Bearer ${token}` }
      });
      setData(res.data.data);
    } catch (e) {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const setQuickRange = (type) => {
    const now = new Date();
    const pad = (n) => `${n}`.padStart(2, '0');
    const toStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    let start;
    let end = new Date(now);

    if (type === '7d') {
      start = new Date(now);
      start.setDate(start.getDate() - 6);
    } else if (type === '30d') {
      start = new Date(now);
      start.setDate(start.getDate() - 29);
    } else if (type === 'quarter') {
      const q = Math.floor(now.getMonth() / 3); // 0-3
      start = new Date(now.getFullYear(), q * 3, 1);
    } else if (type === 'year') {
      start = new Date(now.getFullYear(), 0, 1);
    } else if (type === 'clear') {
      setFrom('');
      setTo('');
      return;
    } else {
      return;
    }

    setFrom(toStr(start));
    setTo(toStr(end));
  };

  useEffect(() => { fetchData(); // initial
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!canView) {
    return (
      <Container maxWidth="xl"><Box sx={{ py: 6 }}>Bạn không có quyền xem báo cáo.</Box></Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 3 }}>
        <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>Báo cáo thống kê</Typography>

        <Paper elevation={0} sx={{ p: 2, mb: 2, borderRadius: 2, border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Từ ngày (YYYY-MM-DD)</InputLabel>
                <OutlinedInput label="Từ ngày (YYYY-MM-DD)" value={from} onChange={(e) => setFrom(e.target.value)} />
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Đến ngày (YYYY-MM-DD)</InputLabel>
                <OutlinedInput label="Đến ngày (YYYY-MM-DD)" value={to} onChange={(e) => setTo(e.target.value)} />
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4} md={'auto'}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="center">
                <Button variant="contained" onClick={fetchData} disabled={loading}>Lọc</Button>
                <ButtonGroup variant="outlined" size="small" sx={{ flexWrap: 'wrap' }}>
                  <Button onClick={() => setQuickRange('7d')}>7 ngày</Button>
                  <Button onClick={() => setQuickRange('30d')}>30 ngày</Button>
                  <Button onClick={() => setQuickRange('quarter')}>Quý này</Button>
                  <Button onClick={() => setQuickRange('year')}>Năm nay</Button>
                </ButtonGroup>
                <Chip label="Xóa lọc" onClick={() => setQuickRange('clear')} size="small" variant="outlined" />
              </Stack>
            </Grid>
          </Grid>
        </Paper>

        {loading && (
          <Grid container spacing={3}>
            {[0,1,2,3].map((i) => (
              <Grid item xs={12} md={6} key={i}>
                <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
                  <Skeleton variant="text" width={220} height={28} sx={{ mb: 1 }} />
                  <Skeleton variant="rectangular" height={280} sx={{ borderRadius: 1 }} />
                </Paper>
              </Grid>
            ))}
          </Grid>
        )}

        {!loading && !data && (
          <Box sx={{ py: 8, textAlign: 'center', color: 'text.secondary' }}>Không có dữ liệu. Hãy điều chỉnh bộ lọc và thử lại.</Box>
        )}

        {!loading && data && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
                <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>Tần suất sử dụng phòng</Typography>
                <Box sx={{ height: 280 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.byRoom} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey={(e) => e.roomName || 'Chưa gán phòng'} interval={0} angle={-20} textAnchor="end" height={60} />
                      <YAxis allowDecimals={false} />
                      <RTooltip formatter={(v) => [v, 'Số cuộc họp']} />
                      <Bar dataKey="count" fill={theme.palette.primary.main} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
                <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>Tần suất theo mức độ</Typography>
                <Box sx={{ height: 280 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={data.byPriority} dataKey="count" nameKey={(e)=>e.priority || 'khác'} cx="50%" cy="50%" outerRadius={90} label>
                        {data.byPriority.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={[theme.palette.primary.main, theme.palette.success.main, theme.palette.warning.main, theme.palette.info.main, theme.palette.error.main][index % 5]} />
                        ))}
                      </Pie>
                      <Legend />
                      <RTooltip formatter={(v, n, p) => [v, p?.payload?.priority || 'Mức độ']} />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
                <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>Phân bố số người tham gia</Typography>
                <Box sx={{ height: 280 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.byAttendees}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey={(b)=> (typeof b._id === 'string' ? b._id : `${b._id}`)} />
                      <YAxis allowDecimals={false} />
                      <RTooltip formatter={(v)=>[v,'Số cuộc họp']} labelFormatter={(l)=>`Số người: ${l}`} />
                      <Bar dataKey="count" fill={theme.palette.secondary?.main || '#8884d8'} radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
                <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>Số cuộc họp theo tháng</Typography>
                <Box sx={{ height: 280 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.timelineMonthly}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey={(t)=>`${t.month}/${t.year}`}/>
                      <YAxis allowDecimals={false} />
                      <RTooltip formatter={(v)=>[v,'Số cuộc họp']} />
                      <Line type="monotone" dataKey="count" stroke={theme.palette.primary.main} strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        )}
      </Box>
    </Container>
  );
}

export default Reports;


