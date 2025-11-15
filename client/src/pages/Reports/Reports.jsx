import React, { useEffect, useState } from 'react';
import {
  Container,
  Box,
  Paper,
  Typography,
  Grid,
  TextField,
  Button,
  useTheme,
  alpha,
  ButtonGroup,
  Chip,
  Stack,
  Skeleton,
  Tabs,
  Tab,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line
} from 'recharts';
import {
  Assessment as AssessmentIcon,
  Event as EventIcon,
  Description as DescriptionIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';

const Reports = () => {
  const theme = useTheme();
  const { token, user } = useAuth();
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [currentTab, setCurrentTab] = useState(0); // 0: Meetings, 1: Minutes, 2: Tasks
  
  // Data states
  const [meetingsData, setMeetingsData] = useState(null);
  const [minutesData, setMinutesData] = useState(null);
  const [tasksData, setTasksData] = useState(null);
  
  const [loading, setLoading] = useState(false);

  const canView = user && (user.role === 'admin' || user.role === 'manager' || user.role === 'secretary');

  const fetchAllData = async () => {
    if (!canView) return;
    
    try {
      setLoading(true);
      const params = { from, to };

      // Fetch all stats in parallel
      const [meetingsRes, minutesRes, tasksRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/meetings/stats/summary`, {
          params,
          headers: { Authorization: `Bearer ${token}` }
        }).catch(e => ({ data: null })),
        
        axios.get(`${API_BASE_URL}/minutes/stats/overview`, {
          params,
          headers: { Authorization: `Bearer ${token}` }
        }).catch(e => ({ data: null })),
        
        axios.get(`${API_BASE_URL}/followups/stats/report`, {
          params,
          headers: { Authorization: `Bearer ${token}` }
        }).catch(e => ({ data: null }))
      ]);

      setMeetingsData(meetingsRes.data?.data || null);
      setMinutesData(minutesRes.data?.data || null);
      setTasksData(tasksRes.data?.data || null);

    } catch (e) {
      console.error('Error fetching stats:', e);
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
      const q = Math.floor(now.getMonth() / 3);
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

  useEffect(() => {
    fetchAllData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!canView) {
    return (
      <Container maxWidth="xl">
        <Box sx={{ py: 6 }}>
          <Typography variant="h6" color="text.secondary">
            Bạn không có quyền xem báo cáo thống kê.
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 3 }}>
        {/* Header */}
        <Paper
          elevation={0}
          sx={{
            mb: 3,
            p: 4,
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
            color: 'white',
            borderRadius: 3
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <AssessmentIcon sx={{ fontSize: 40 }} />
            <Box>
              <Typography variant="h4" fontWeight={700}>
                Báo Cáo Thống Kê
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.9, mt: 0.5 }}>
                Phân tích toàn diện về cuộc họp, biên bản và công việc
              </Typography>
            </Box>
          </Box>
        </Paper>

        {/* Filters */}
        <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: 2, border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4} md={3}>
              <TextField
                label="Từ ngày"
                type="date"
                fullWidth
                size="small"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>
            <Grid item xs={12} sm={4} md={3}>
              <TextField
                label="Đến ngày"
                type="date"
                fullWidth
                size="small"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                InputLabelProps={{
                  shrink: true,
                }}
                inputProps={{
                  min: from
                }}
              />
            </Grid>
            <Grid item xs={12} sm={4} md={'auto'}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="center">
                <Button variant="contained" onClick={fetchAllData} disabled={loading}>
                  Lọc
                </Button>
                <ButtonGroup variant="outlined" size="small" sx={{ flexWrap: 'wrap' }}>
                  <Button onClick={() => setQuickRange('7d')}>7 ngày</Button>
                  <Button onClick={() => setQuickRange('30d')}>30 ngày</Button>
                  <Button onClick={() => setQuickRange('quarter')}>Quý</Button>
                  <Button onClick={() => setQuickRange('year')}>Năm</Button>
                </ButtonGroup>
                <Chip label="Xóa" onClick={() => setQuickRange('clear')} size="small" variant="outlined" />
              </Stack>
            </Grid>
          </Grid>
        </Paper>

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={currentTab} onChange={(e, v) => setCurrentTab(v)}>
            <Tab icon={<EventIcon />} label="Cuộc họp" iconPosition="start" />
            <Tab icon={<DescriptionIcon />} label="Biên bản" iconPosition="start" />
            <Tab icon={<AssignmentIcon />} label="Công việc" iconPosition="start" />
          </Tabs>
        </Box>

        {/* Content */}
        {loading && <LoadingSkeleton />}

        {/* Meetings Tab */}
        {!loading && currentTab === 0 && <MeetingsStats data={meetingsData} theme={theme} />}

        {/* Minutes Tab */}
        {!loading && currentTab === 1 && <MinutesStats data={minutesData} theme={theme} />}

        {/* Tasks Tab */}
        {!loading && currentTab === 2 && <TasksStats data={tasksData} theme={theme} />}
      </Box>
    </Container>
  );
};

// ==================== LOADING SKELETON ====================
const LoadingSkeleton = () => (
  <Grid container spacing={3}>
    {[0, 1, 2, 3].map((i) => (
      <Grid item xs={12} md={6} key={i}>
        <Paper elevation={0} sx={{ p: 2 }}>
          <Skeleton variant="text" width={220} height={28} sx={{ mb: 1 }} />
          <Skeleton variant="rectangular" height={280} />
        </Paper>
      </Grid>
    ))}
  </Grid>
);

// ==================== MEETINGS STATS ====================
const MeetingsStats = ({ data, theme }) => {
  if (!data) {
    return (
      <Box sx={{ py: 8, textAlign: 'center', color: 'text.secondary' }}>
        Không có dữ liệu cuộc họp
      </Box>
    );
  }

  const { overview, attendanceStats, byDepartment, byStatus, byMeetingType, topOrganizers } = data;

  return (
    <Box>
      {/* Overview Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ border: `2px solid ${theme.palette.primary.main}` }}>
            <CardContent>
              <Typography variant="h3" color="primary" fontWeight={700}>
                {overview?.total || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Tổng cuộc họp
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ border: `2px solid ${theme.palette.success.main}` }}>
            <CardContent>
              <Typography variant="h3" color="success.main" fontWeight={700}>
                {attendanceStats?.attendanceRate || 0}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Tỷ lệ tham dự
              </Typography>
              <Chip 
                label={`${attendanceStats?.attended || 0}/${attendanceStats?.totalInvited || 0} người`} 
                size="small" 
                color="success"
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ border: `2px solid ${theme.palette.info.main}` }}>
            <CardContent>
              <Typography variant="h3" color="info.main" fontWeight={700}>
                {overview?.avgAttendeesPerMeeting || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                TB người/cuộc họp
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ border: `2px solid ${theme.palette.warning.main}` }}>
            <CardContent>
              <Typography variant="h3" color="warning.main" fontWeight={700}>
                {overview?.avgDuration || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Thời lượng TB (phút)
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
        <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
            Tần suất sử dụng phòng
          </Typography>
          <Box sx={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.byRoom} margin={{ top: 10, right: 10, left: 0, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey={(e) => e.roomName || 'Chưa gán phòng'} 
                  interval={0} 
                  angle={-20} 
                  textAnchor="end" 
                  height={60} 
                />
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
          <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
            Phân bố mức độ ưu tiên
          </Typography>
          <Box sx={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={data.byPriority} 
                  dataKey="count" 
                  nameKey={(e) => e.priority || 'khác'} 
                  cx="50%" 
                  cy="50%" 
                  outerRadius={90} 
                  label
                >
                  {data.byPriority.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={[
                        theme.palette.primary.main,
                        theme.palette.success.main,
                        theme.palette.warning.main,
                        theme.palette.error.main
                      ][index % 4]} 
                    />
                  ))}
                </Pie>
                <Legend />
                <RTooltip />
              </PieChart>
            </ResponsiveContainer>
          </Box>
        </Paper>
      </Grid>

      {/* Theo phòng ban (NEW!) */}
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
              Theo phòng ban
            </Typography>
            <Box sx={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byDepartment}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="department" angle={-20} textAnchor="end" height={60} />
                  <YAxis allowDecimals={false} />
                  <RTooltip formatter={(v) => [v, 'Số cuộc họp']} />
                  <Bar dataKey="count" fill={theme.palette.success.main} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        {/* Theo trạng thái (NEW!) */}
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
              Theo trạng thái
            </Typography>
            <Box sx={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={byStatus}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label
                  >
                    {(byStatus || []).map((entry, index) => {
                      const statusColors = {
                        'scheduled': theme.palette.info.main,
                        'ongoing': theme.palette.primary.main,
                        'completed': theme.palette.success.main,
                        'cancelled': theme.palette.error.main,
                        'postponed': theme.palette.warning.main
                      };
                      return (
                        <Cell 
                          key={`cell-${index}`}
                          fill={statusColors[entry.status] || theme.palette.grey[400]}
                        />
                      );
                    })}
                  </Pie>
                  <Legend />
                  <RTooltip />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        {/* Loại cuộc họp (NEW!) */}
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
              Loại cuộc họp
            </Typography>
            <Box sx={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={byMeetingType}
                    dataKey="count"
                    nameKey="meetingType"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label
                  >
                    {(byMeetingType || []).map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`}
                        fill={[
                          theme.palette.primary.main,
                          theme.palette.success.main,
                          theme.palette.warning.main
                        ][index % 3]}
                      />
                    ))}
                  </Pie>
                  <Legend />
                  <RTooltip />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        {/* Top organizers (NEW!) */}
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
              Top người tổ chức
            </Typography>
            <Box sx={{ height: 280, overflowY: 'auto' }}>
              {topOrganizers && topOrganizers.length > 0 ? (
                <Stack spacing={1}>
                  {topOrganizers.map((org, index) => (
                    <Paper 
                      key={index} 
                      elevation={0} 
                      sx={{ 
                        p: 2, 
                        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2
                      }}
                    >
                      <Chip label={`#${index + 1}`} color="primary" size="small" />
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="body1" fontWeight={600}>
                          {org.organizerName || 'N/A'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {org.organizerDepartment || 'Chưa có phòng ban'}
                        </Typography>
                      </Box>
                      <Chip label={`${org.count} cuộc họp`} color="default" />
                    </Paper>
                  ))}
                </Stack>
              ) : (
                <Typography color="text.secondary">Chưa có dữ liệu</Typography>
              )}
            </Box>
          </Paper>
        </Grid>

      <Grid item xs={12}>
        <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
            Xu hướng số cuộc họp theo tháng
          </Typography>
          <Box sx={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.timelineMonthly}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey={(t) => `${t.month}/${t.year}`} />
                <YAxis allowDecimals={false} />
                <RTooltip formatter={(v) => [v, 'Số cuộc họp']} />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke={theme.palette.primary.main} 
                  strokeWidth={2} 
                  dot={{ r: 4 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        </Paper>
      </Grid>
      </Grid>
    </Box>
  );
};

// ==================== MINUTES STATS ====================
const MinutesStats = ({ data, theme }) => {
  if (!data) {
    return (
      <Box sx={{ py: 8, textAlign: 'center', color: 'text.secondary' }}>
        Không có dữ liệu biên bản
      </Box>
    );
  }

  const { overview, byStatus, bySecretary, timelineMonthly, voteStats } = data;

  // Format status for Vietnamese
  const statusLabels = {
    'draft': 'Nháp',
    'pending_review': 'Chờ duyệt',
    'pending_approval': 'Chờ phê duyệt',
    'approved': 'Đã duyệt',
    'rejected': 'Từ chối'
  };

  const byStatusFormatted = byStatus.map(item => ({
    ...item,
    statusLabel: statusLabels[item.status] || item.status
  }));

  return (
    <Box>
      {/* Overview Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ border: `2px solid ${theme.palette.primary.main}` }}>
            <CardContent>
              <Typography variant="h3" color="primary" fontWeight={700}>
                {overview.total || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Tổng biên bản
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ border: `2px solid ${theme.palette.success.main}` }}>
            <CardContent>
              <Typography variant="h3" color="success.main" fontWeight={700}>
                {overview.approved || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Đã phê duyệt
              </Typography>
              <Chip 
                label={`${overview.approvalRate || 0}% approval rate`} 
                size="small" 
                color="success"
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ border: `2px solid ${theme.palette.warning.main}` }}>
            <CardContent>
              <Typography variant="h3" color="warning.main" fontWeight={700}>
                {(overview.pending_review || 0) + (overview.pending_approval || 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Đang chờ duyệt
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ border: `2px solid ${theme.palette.info.main}` }}>
            <CardContent>
              <Typography variant="h3" color="info.main" fontWeight={700}>
                {overview.avgParticipationRate || 0}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Tỷ lệ tham gia bỏ phiếu
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
              Phân bố theo trạng thái
            </Typography>
            <Box sx={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={byStatusFormatted}
                    dataKey="count"
                    nameKey="statusLabel"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label
                  >
                    {byStatusFormatted.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`}
                        fill={[
                          theme.palette.grey[400],
                          theme.palette.warning.main,
                          theme.palette.info.main,
                          theme.palette.success.main,
                          theme.palette.error.main
                        ][index % 5]}
                      />
                    ))}
                  </Pie>
                  <Legend />
                  <RTooltip />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
              Thống kê bỏ phiếu
            </Typography>
            <Box sx={{ p: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="success.main" fontWeight={700}>
                      {voteStats.totalAgree || 0}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Đồng ý
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="error.main" fontWeight={700}>
                      {voteStats.totalDisagree || 0}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Không đồng ý
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h3" color="primary" fontWeight={700}>
                      {voteStats.agreeRate || 0}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Tỷ lệ đồng ý
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ textAlign: 'center', mt: 1 }}>
                    <Typography variant="h5" fontWeight={600}>
                      {voteStats.totalVotes || 0}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Tổng số phiếu bầu
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
              Top thư ký (theo số biên bản)
            </Typography>
            <Box sx={{ height: 280, overflowY: 'auto' }}>
              {bySecretary && bySecretary.length > 0 ? (
                <Stack spacing={1}>
                  {bySecretary.map((sec, index) => (
                    <Paper 
                      key={index} 
                      elevation={0} 
                      sx={{ 
                        p: 2, 
                        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2
                      }}
                    >
                      <Chip label={`#${index + 1}`} color="primary" size="small" />
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="body1" fontWeight={600}>
                          {sec.secretaryName || 'N/A'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {sec.secretaryDepartment || 'Chưa có phòng ban'}
                        </Typography>
                      </Box>
                      <Chip label={`${sec.count} biên bản`} color="default" />
                    </Paper>
                  ))}
                </Stack>
              ) : (
                <Typography color="text.secondary">Chưa có dữ liệu</Typography>
              )}
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
              Xu hướng biên bản theo tháng
            </Typography>
            <Box sx={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timelineMonthly}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey={(t) => `${t.month}/${t.year}`} />
                  <YAxis allowDecimals={false} />
                  <RTooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="total" 
                    stroke={theme.palette.primary.main} 
                    strokeWidth={2} 
                    name="Tổng số"
                    dot={{ r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="approved" 
                    stroke={theme.palette.success.main} 
                    strokeWidth={2} 
                    name="Đã duyệt"
                    dot={{ r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="rejected" 
                    stroke={theme.palette.error.main} 
                    strokeWidth={2} 
                    name="Từ chối"
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

// ==================== TASKS/FOLLOW-UPS STATS ====================
const TasksStats = ({ data, theme }) => {
  if (!data) {
    return (
      <Box sx={{ py: 8, textAlign: 'center', color: 'text.secondary' }}>
        Không có dữ liệu công việc
      </Box>
    );
  }

  const { 
    overview, 
    byStatus, 
    byPriority, 
    byAssignee, 
    byDepartment,
    byMeeting,
    timelineMonthly, 
    completionTimeAnalysis,
    subtasksAndComments
  } = data;

  const statusLabels = {
    'not_started': 'Chưa bắt đầu',
    'in_progress': 'Đang thực hiện',
    'blocked': 'Bị chặn',
    'completed': 'Hoàn thành',
    'cancelled': 'Đã hủy'
  };

  const priorityLabels = {
    'low': 'Thấp',
    'medium': 'Trung bình',
    'high': 'Cao',
    'urgent': 'Khẩn cấp'
  };

  const byStatusFormatted = byStatus.map(item => ({
    ...item,
    statusLabel: statusLabels[item.status] || item.status
  }));

  const byPriorityFormatted = byPriority.map(item => ({
    ...item,
    priorityLabel: priorityLabels[item.priority] || item.priority
  }));

  return (
    <Box>
      {/* Overview Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ border: `2px solid ${theme.palette.primary.main}` }}>
            <CardContent>
              <Typography variant="h3" color="primary" fontWeight={700}>
                {overview.total || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Tổng công việc
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ border: `2px solid ${theme.palette.success.main}` }}>
            <CardContent>
              <Typography variant="h3" color="success.main" fontWeight={700}>
                {overview.completed || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Hoàn thành
              </Typography>
              <Chip 
                label={`${overview.completionRate || 0}%`} 
                size="small" 
                color="success"
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ border: `2px solid ${theme.palette.warning.main}` }}>
            <CardContent>
              <Typography variant="h3" color="warning.main" fontWeight={700}>
                {overview.inProgress || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Đang thực hiện
              </Typography>
              <Chip 
                label={`${overview.avgProgress || 0}% avg`} 
                size="small" 
                color="warning"
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ border: `2px solid ${theme.palette.error.main}` }}>
            <CardContent>
              <Typography variant="h3" color="error.main" fontWeight={700}>
                {data.overdueAnalysis?.totalOverdue || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Quá hạn
              </Typography>
              <Chip 
                label={`${data.overdueAnalysis?.overdueRate || 0}%`} 
                size="small" 
                color="error"
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
              Phân bố theo trạng thái
            </Typography>
            <Box sx={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={byStatusFormatted}
                    dataKey="count"
                    nameKey="statusLabel"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label
                  >
                    {byStatusFormatted.map((entry, index) => {
                      const colors = {
                        'not_started': theme.palette.grey[400],
                        'in_progress': theme.palette.primary.main,
                        'blocked': theme.palette.error.main,
                        'completed': theme.palette.success.main,
                        'cancelled': theme.palette.grey[600]
                      };
                      return (
                        <Cell 
                          key={`cell-${index}`}
                          fill={colors[entry.status] || theme.palette.grey[400]}
                        />
                      );
                    })}
                  </Pie>
                  <Legend />
                  <RTooltip />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
              Phân bố theo mức độ ưu tiên
            </Typography>
            <Box sx={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byPriorityFormatted}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="priorityLabel" />
                  <YAxis allowDecimals={false} />
                  <RTooltip formatter={(v) => [v, 'Số công việc']} />
                  <Bar dataKey="count" fill={theme.palette.secondary.main} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
              Top người thực hiện (theo số công việc)
            </Typography>
            <Box sx={{ height: 280, overflowY: 'auto' }}>
              {byAssignee && byAssignee.length > 0 ? (
                <Stack spacing={1}>
                  {byAssignee.slice(0, 8).map((assignee, index) => (
                    <Paper 
                      key={index} 
                      elevation={0} 
                      sx={{ 
                        p: 2, 
                        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2
                      }}
                    >
                      <Chip label={`#${index + 1}`} color="primary" size="small" />
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="body1" fontWeight={600}>
                          {assignee.assigneeName || 'N/A'}
                        </Typography>
                        <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                          <Chip 
                            label={`${assignee.totalTasks} tasks`} 
                            size="small" 
                            variant="outlined" 
                          />
                          <Chip 
                            label={`${Math.round(assignee.completionRate || 0)}% done`} 
                            size="small" 
                            color="success"
                          />
                          {assignee.overdueTasks > 0 && (
                            <Chip 
                              label={`${assignee.overdueTasks} overdue`} 
                              size="small" 
                              color="error"
                            />
                          )}
                        </Stack>
                      </Box>
                    </Paper>
                  ))}
                </Stack>
              ) : (
                <Typography color="text.secondary">Chưa có dữ liệu</Typography>
              )}
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
              Phân tích thời gian hoàn thành
            </Typography>
            <Box sx={{ p: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Box sx={{ textAlign: 'center', mb: 2 }}>
                    <Typography variant="h3" color="primary" fontWeight={700}>
                      {completionTimeAnalysis?.avgDays || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Ngày trung bình để hoàn thành
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="success.main" fontWeight={700}>
                      {completionTimeAnalysis?.onTimeRate || 0}%
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Hoàn thành đúng hạn
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" fontWeight={700}>
                      {completionTimeAnalysis?.totalCompleted || 0}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Đã hoàn thành
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="body1" fontWeight={600}>
                      {overview.avgEstimatedHours || 0}h
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Ước tính TB
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="body1" fontWeight={600}>
                      {overview.avgActualHours || 0}h
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Thực tế TB
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          </Paper>
        </Grid>

        {/* Theo phòng ban */}
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
              Thống kê theo phòng ban
            </Typography>
            <Box sx={{ height: 320, overflowY: 'auto' }}>
              {byDepartment && byDepartment.length > 0 ? (
                <Stack spacing={1.5}>
                  {byDepartment.map((dept, index) => (
                    <Paper 
                      key={index} 
                      elevation={0} 
                      sx={{ 
                        p: 2, 
                        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                        bgcolor: alpha(theme.palette.primary.main, 0.02)
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="body1" fontWeight={600}>
                          {dept.department}
                        </Typography>
                        <Chip 
                          label={`${dept.total} tasks`} 
                          size="small" 
                          color="primary"
                        />
                      </Box>
                      <Grid container spacing={1} sx={{ mt: 1 }}>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">Hoàn thành</Typography>
                          <Typography variant="body2" fontWeight={600} color="success.main">
                            {dept.completed} ({Math.round(dept.completionRate)}%)
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">Đang làm</Typography>
                          <Typography variant="body2" fontWeight={600} color="primary.main">
                            {dept.inProgress}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">Quá hạn</Typography>
                          <Typography variant="body2" fontWeight={600} color="error.main">
                            {dept.overdue}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">Tiến độ TB</Typography>
                          <Typography variant="body2" fontWeight={600}>
                            {Math.round(dept.avgProgress)}%
                          </Typography>
                        </Grid>
                      </Grid>
                    </Paper>
                  ))}
                </Stack>
              ) : (
                <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                  Chưa có dữ liệu
                </Typography>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Theo cuộc họp */}
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
              Top cuộc họp (theo số công việc)
            </Typography>
            <Box sx={{ height: 320, overflowY: 'auto' }}>
              {byMeeting && byMeeting.length > 0 ? (
                <Stack spacing={1.5}>
                  {byMeeting.map((meeting, index) => (
                    <Paper 
                      key={index} 
                      elevation={0} 
                      sx={{ 
                        p: 2, 
                        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                        bgcolor: alpha(theme.palette.info.main, 0.02)
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="body2" fontWeight={600} sx={{ flex: 1, mr: 1 }}>
                          {meeting.meetingTitle}
                        </Typography>
                        <Chip 
                          label={`#${index + 1}`} 
                          size="small" 
                          color="info"
                        />
                      </Box>
                      <Grid container spacing={1} sx={{ mt: 1 }}>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">Tổng công việc</Typography>
                          <Typography variant="body2" fontWeight={600}>
                            {meeting.total}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">Hoàn thành</Typography>
                          <Typography variant="body2" fontWeight={600} color="success.main">
                            {meeting.completed} ({Math.round(meeting.completionRate)}%)
                          </Typography>
                        </Grid>
                      </Grid>
                    </Paper>
                  ))}
                </Stack>
              ) : (
                <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                  Chưa có dữ liệu
                </Typography>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Subtasks và Comments */}
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
              Thống kê Subtasks & Comments
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: alpha(theme.palette.primary.main, 0.05), borderRadius: 2 }}>
                  <Typography variant="h4" color="primary" fontWeight={700}>
                    {subtasksAndComments?.totalSubtasks || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Tổng subtasks
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: alpha(theme.palette.success.main, 0.05), borderRadius: 2 }}>
                  <Typography variant="h4" color="success.main" fontWeight={700}>
                    {subtasksAndComments?.completedSubtasks || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Đã hoàn thành
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: alpha(theme.palette.info.main, 0.05), borderRadius: 2 }}>
                  <Typography variant="h4" color="info.main" fontWeight={700}>
                    {subtasksAndComments?.totalComments || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Tổng comments
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: alpha(theme.palette.warning.main, 0.05), borderRadius: 2 }}>
                  <Typography variant="h4" color="warning.main" fontWeight={700}>
                    {subtasksAndComments?.subtaskCompletionRate || 0}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Tỷ lệ hoàn thành subtasks
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Tasks có subtasks
                </Typography>
                <Typography variant="h6" fontWeight={600}>
                  {subtasksAndComments?.tasksWithSubtasks || 0}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Tasks có comments
                </Typography>
                <Typography variant="h6" fontWeight={600}>
                  {subtasksAndComments?.tasksWithComments || 0}
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
              Xu hướng công việc theo tháng
            </Typography>
            <Box sx={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timelineMonthly}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey={(t) => `${t.month}/${t.year}`} />
                  <YAxis allowDecimals={false} />
                  <RTooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="total" 
                    stroke={theme.palette.primary.main} 
                    strokeWidth={2} 
                    name="Tổng số"
                    dot={{ r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="completed" 
                    stroke={theme.palette.success.main} 
                    strokeWidth={2} 
                    name="Hoàn thành"
                    dot={{ r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="overdue" 
                    stroke={theme.palette.error.main} 
                    strokeWidth={2} 
                    name="Quá hạn"
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Reports;
