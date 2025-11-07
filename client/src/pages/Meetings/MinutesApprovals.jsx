import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  Avatar,
  Box,
  Button,
  Chip,
  Container,
  IconButton,
  InputAdornment,
  OutlinedInput,
  Paper,
  Stack,
  Tooltip,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Grid,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import ViewListIcon from '@mui/icons-material/ViewList';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import { alpha, useTheme } from '@mui/material/styles';
import dayjs from 'dayjs';
import { useAuth } from '../../contexts/AuthContext';
import { MinutesViewDialog } from './MeetingDetail';
import { ProtocolCard } from '../../components/Protocols';
import { useSearchParams, useLocation } from 'react-router-dom';

const MinutesApprovals = () => {
  const theme = useTheme();
  const { token, user } = useAuth();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  
  // Lấy meetingId từ query params hoặc từ localStorage (nếu đang ở MeetingDetail)
  const meetingIdFromQuery = searchParams.get('meetingId');
  const meetingIdFromStorage = localStorage.getItem('currentMeetingId');
  const meetingId = meetingIdFromQuery || meetingIdFromStorage || null;
  
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

  // Helper function to download file with token
  const downloadFileWithToken = async (url, fileName) => {
    if (!token) {
      console.error('No access token available');
      alert('Vui lòng đăng nhập lại');
      return;
    }

    try {
      // Check if URL contains /api already
      const fullUrl = url.includes(API_BASE_URL) ? url : `${API_BASE_URL}${url}`;
      
      const response = await axios.get(fullUrl, {
        headers: {
          Authorization: `Bearer ${token}`
        },
        responseType: 'blob'
      });

      // Create blob URL and trigger download
      const blob = new Blob([response.data]);
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = fileName || 'download';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Download error:', error);
      alert('Không thể tải file. Vui lòng thử lại.');
    }
  };

  const [loading, setLoading] = useState(true);
  const [minutes, setMinutes] = useState([]);
  const [error, setError] = useState('');
  const [viewModal, setViewModal] = useState({ open: false, minutes: null });
  const [confirm, setConfirm] = useState({ open: false, minutes: null, submitting: false });
  const [rejectDlg, setRejectDlg] = useState({ open: false, minutes: null, submitting: false });
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('card'); // 'card' or 'list'

  const canApprove = useMemo(() => user?.role === 'admin' || user?.role === 'manager', [user]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      // Nếu có meetingId trong query params, chỉ lấy biên bản của cuộc họp đó
      if (meetingId) {
        // Lấy biên bản từ collection Minutes cho cuộc họp cụ thể
        const res = await axios.get(`${API_BASE_URL}/minutes`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { meeting: meetingId, status: 'pending_approval' },
        });
        const minutesFromMain = res.data.minutes || [];

        // Lấy biên bản từ minutesHistory của cuộc họp đó
        try {
          const res2 = await axios.get(`${API_BASE_URL}/meetings/${meetingId}/minutes`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const list = (res2?.data?.minutesHistory || []).filter(x => x.status === 'pending');
          
          // Lấy thông tin cuộc họp để có title
          const meetingRes = await axios.get(`${API_BASE_URL}/meetings/${meetingId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const meeting = meetingRes?.data?.meeting;

          const minutesFromHistory = list.map(x => {
            let attachmentArray = [];
            if (x.attachments && Array.isArray(x.attachments) && x.attachments.length > 0) {
              attachmentArray = x.attachments.map(a => ({
                name: a.name || 'Đính kèm',
                path: a.path,
                size: a.size
              }));
            } else if (x.attachment) {
              attachmentArray = [{
                name: x.attachment.name || 'Đính kèm',
                path: x.attachment.path,
                size: x.attachment.size
              }];
            }

            return {
              _id: x._id,
              title: meeting?.title || 'Biên bản cuộc họp',
              content: x.content,
              meeting: { _id: meetingId, title: meeting?.title, location: meeting?.location },
              status: 'pending_approval',
              createdAt: x.createdAt,
              submittedAt: x.submittedAt,
              reviewedAt: x.reviewedAt,
              reviewer: x.reviewer,
              createdBy: x.createdBy,
              attachment: x.attachment,
              attachments: attachmentArray,
              metadata: { requiredVoteCount: (meeting?.attendees?.length || 0), receivedVoteCount: 0 },
              __source: 'minutesHistory',
            };
          });

          // Hợp nhất danh sách
          const byId = new Map();
          minutesFromMain.forEach(x => byId.set(String(x._id), x));
          minutesFromHistory.forEach(x => {
            const key = String(x._id);
            if (!byId.has(key)) byId.set(key, x);
          });

          const combined = Array.from(byId.values());
          setMinutes(combined);
          return;
        } catch (err) {
          console.error('Error fetching meeting minutes:', err);
        }
      }

      // Lấy danh sách biên bản ở trạng thái chờ phê duyệt từ collection Minutes
      const res = await axios.get(`${API_BASE_URL}/minutes`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { status: 'pending_approval' },
      });
      const minutesFromMain = res.data.minutes || [];

      // Đồng bộ thêm các biên bản ở minutesHistory của Meetings (status: 'pending')
      const meetingsRes = await axios.get(`${API_BASE_URL}/meetings`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: 1000 },
      });
      const meetings = meetingsRes?.data?.docs || meetingsRes?.data?.meetings || [];

      // Lấy chi tiết minutesHistory đã populate cho các meeting có pending
      const pendingMeetings = meetings.filter(m => (m.minutesHistory || []).some(x => x.status === 'pending'));
      const historyDetails = await Promise.all(pendingMeetings.map(async (m) => {
        try {
          const res2 = await axios.get(`${API_BASE_URL}/meetings/${m._id}/minutes`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const list = (res2?.data?.minutesHistory || []).filter(x => x.status === 'pending');
          return list.map(x => {
            // Hỗ trợ cả attachment (1 file) và attachments (nhiều file)
            let attachmentArray = [];
            if (x.attachments && Array.isArray(x.attachments) && x.attachments.length > 0) {
              attachmentArray = x.attachments.map(a => ({
                name: a.name || 'Đính kèm',
                path: a.path,
                size: a.size
              }));
            } else if (x.attachment) {
              attachmentArray = [{
                name: x.attachment.name || 'Đính kèm',
                path: x.attachment.path,
                size: x.attachment.size
              }];
            }

            return {
              _id: x._id,
              title: m.title || 'Biên bản cuộc họp',
              content: x.content,
              meeting: { _id: m._id, title: m.title, location: m.location },
              status: 'pending_approval',
              createdAt: x.createdAt,
              submittedAt: x.submittedAt,
              reviewedAt: x.reviewedAt,
              reviewer: x.reviewer, // đã populate
              createdBy: x.createdBy, // đã populate
              attachment: x.attachment,
              attachments: attachmentArray,
              metadata: { requiredVoteCount: (m?.attendees?.length || 0), receivedVoteCount: 0 },
              __source: 'minutesHistory',
            };
          });
        } catch {
          return [];
        }
      }));
      const minutesFromHistory = historyDetails.flat();

      // Hợp nhất danh sách, ưu tiên bản ghi từ collection Minutes nếu trùng _id
      const byId = new Map();
      minutesFromMain.forEach(x => byId.set(String(x._id), x));
      minutesFromHistory.forEach(x => {
        const key = String(x._id);
        if (!byId.has(key)) byId.set(key, x);
      });

      const combined = Array.from(byId.values());
      setMinutes(combined);
    } catch (e) {
      setError(e?.response?.data?.message || 'Không thể tải danh sách biên bản');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingId]); // Re-fetch khi meetingId thay đổi

  const handleApprove = async () => {
    if (!confirm.minutes) return;
    setConfirm(prev => ({ ...prev, submitting: true }));
    try {
      if (confirm.minutes.__source === 'minutesHistory') {
        await axios.post(`${API_BASE_URL}/meetings/${confirm.minutes.meeting._id}/minutes/${confirm.minutes._id}/approve`, { approve: true }, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.post(`${API_BASE_URL}/minutes/${confirm.minutes._id}/approve`, {}, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      setConfirm({ open: false, minutes: null, submitting: false });
      await fetchData();
      
      // Force refresh Dashboard
      if (window.refreshDashboard) {
        window.refreshDashboard();
      }
    } catch (e) {
      setConfirm(prev => ({ ...prev, submitting: false }));
      setError(e?.response?.data?.message || 'Phê duyệt thất bại');
    }
  };

  const handleReject = async () => {
    if (!rejectDlg.minutes) return;
    setRejectDlg(prev => ({ ...prev, submitting: true }));
    try {
      // Từ chối chỉ áp dụng cho minutesHistory qua endpoint meetings
      await axios.post(`${API_BASE_URL}/meetings/${rejectDlg.minutes.meeting._id}/minutes/${rejectDlg.minutes._id}/approve`, { approve: false }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRejectDlg({ open: false, minutes: null, submitting: false });
      await fetchData();
      
      // Force refresh Dashboard
      if (window.refreshDashboard) {
        window.refreshDashboard();
      }
    } catch (e) {
      setRejectDlg(prev => ({ ...prev, submitting: false }));
      setError(e?.response?.data?.message || 'Từ chối thất bại');
    }
  };

  const statusChip = (status) => {
    const map = {
      draft: { color: 'default', label: 'Bản nháp' },
      pending_review: { color: 'warning', label: 'Chờ rà soát' },
      pending_approval: { color: 'warning', label: 'Chờ phê duyệt' },
      approved: { color: 'success', label: 'Đã phê duyệt' },
      rejected: { color: 'error', label: 'Từ chối' },
    };
    const cfg = map[status] || { color: 'default', label: status };
    return <Chip size="small" color={cfg.color} label={cfg.label} />;
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return minutes;
    return minutes.filter(m =>
      (m.title || '').toLowerCase().includes(q) ||
      (m?.meeting?.title || '').toLowerCase().includes(q) ||
      (m?.createdBy?.fullName || '').toLowerCase().includes(q)
    );
  }, [minutes, search]);


  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Paper elevation={0} sx={{ p: 2.5, mb: 2, borderRadius: 2, border: `1px solid ${alpha(theme.palette.divider, 0.1)}`, background: `linear-gradient(180deg, ${alpha(theme.palette.primary.light, 0.08)} 0%, transparent 100%)` }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between" spacing={1.5}>
          <Stack direction="row" alignItems="center" spacing={1.25}>
            <Box sx={{ width: 40, height: 40, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: alpha(theme.palette.primary.main, 0.12), color: theme.palette.primary.main }}>
              <DescriptionOutlinedIcon />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={800} sx={{ letterSpacing: 0.2 }}>Phê duyệt biên bản</Typography>
              <Typography variant="body2" color="text.secondary">
                {meetingId 
                  ? 'Biên bản của cuộc họp hiện tại' 
                  : 'Không bỏ lỡ biên bản nào cần phê duyệt của doanh nghiệp bạn'}
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1.5} alignItems="center" width={{ xs: '100%', sm: 'auto' }}>
            <OutlinedInput
              size="small"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tiêu đề, cuộc họp, thư ký..."
              startAdornment={<InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>}
              sx={{ borderRadius: 2, width: { xs: '100%', sm: 320 } }}
            />
            
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(e, newMode) => newMode && setViewMode(newMode)}
              size="small"
              sx={{ border: `1px solid ${alpha(theme.palette.divider, 0.2)}` }}
            >
              <ToggleButton value="card" size="small">
                <ViewModuleIcon fontSize="small" />
              </ToggleButton>
              <ToggleButton value="list" size="small">
                <ViewListIcon fontSize="small" />
              </ToggleButton>
            </ToggleButtonGroup>
            
            <Tooltip title="Làm mới">
              <IconButton onClick={fetchData} size="small">
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </Paper>

      <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
        {loading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={28} />
          </Box>
        ) : filtered.length === 0 ? (
                    <Box sx={{ py: 10, display: 'flex', justifyContent: 'center' }}>
                      <Paper
                        elevation={0}
                        sx={{
                          px: 4,
                          py: 5,
                          borderRadius: 3,
                          textAlign: 'center',
                          maxWidth: 560,
                          width: '100%',
                          border: `1px dashed ${alpha(theme.palette.divider, 0.6)}`,
                          background: `linear-gradient(180deg, ${alpha(theme.palette.primary.light, 0.06)} 0%, transparent 80%)`,
                        }}
                      >
                        <DescriptionOutlinedIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                        <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>Không có biên bản chờ phê duyệt</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          Hãy kiểm tra bộ lọc, xóa từ khóa tìm kiếm hoặc làm mới danh sách bên dưới.
                        </Typography>

                        <Stack spacing={1.2} sx={{ mb: 2.5 }}>
                          <Stack direction="row" spacing={1} justifyContent="center" alignItems="center">
                            <Chip label="Nhấn Enter để tìm kiếm" size="small" variant="outlined" />
                            <Chip label="Ctrl + R để làm mới" size="small" variant="outlined" />
                          </Stack>
                        </Stack>

                        <Stack direction="row" spacing={1.2} justifyContent="center">
                          <Button variant="outlined" size="small" onClick={() => setSearch('')}>Xóa tìm kiếm</Button>
                          <Button variant="contained" size="small" onClick={fetchData} startIcon={<RefreshIcon />}>Làm mới</Button>
                        </Stack>
                      </Paper>
                    </Box>
        ) : (
          <Grid container spacing={3}>
              {filtered.map(item => (
              <Grid item xs={12} sm={6} lg={4} key={item._id}>
                <ProtocolCard
                  protocol={{
                    ...item,
                    secretary: item.createdBy || item.secretary,
                    attachments: item.attachments || []
                  }}
                  onView={() => setViewModal({ open: true, minutes: item })}
                  onApprove={() => setConfirm({ open: true, minutes: item, submitting: false })}
                  onReject={() => setRejectDlg({ open: true, minutes: item, submitting: false })}
                  canApprove={canApprove}
                  allowReject={item.__source === 'minutesHistory'}
                  showActions={true}
                />
              </Grid>
            ))}
          </Grid>
        )}
      </Paper>

      {/* Xem biên bản */}
      <MinutesViewDialog
        open={viewModal.open}
        onClose={() => setViewModal({ open: false, minutes: null })}
        minutes={viewModal.minutes}
        meetingId={viewModal.minutes?.meeting?._id}
        apiBaseUrl={API_BASE_URL}
        downloadFileWithToken={downloadFileWithToken}
      />

      {/* Xác nhận phê duyệt */}
      <Dialog open={confirm.open} onClose={() => setConfirm({ open: false, minutes: null, submitting: false })}>
        <DialogTitle>Xác nhận phê duyệt</DialogTitle>
        <DialogContent>
          <Typography>Bạn có chắc muốn phê duyệt biên bản “{confirm.minutes?.title}”?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirm({ open: false, minutes: null, submitting: false })}>Hủy</Button>
          <Button variant="contained" color="success" onClick={handleApprove} disabled={confirm.submitting} startIcon={confirm.submitting ? <CircularProgress size={16} color="inherit" /> : <CheckCircleIcon />}>
            {confirm.submitting ? 'Đang phê duyệt...' : 'Phê duyệt'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Xác nhận từ chối */}
      <Dialog open={rejectDlg.open} onClose={() => setRejectDlg({ open: false, minutes: null, submitting: false })}>
        <DialogTitle>Xác nhận từ chối</DialogTitle>
        <DialogContent>
          <Typography>Bạn có chắc muốn từ chối biên bản “{rejectDlg.minutes?.title}”?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDlg({ open: false, minutes: null, submitting: false })}>Hủy</Button>
          <Button variant="contained" color="error" onClick={handleReject} disabled={rejectDlg.submitting}>
            {rejectDlg.submitting ? <CircularProgress size={16} color="inherit" /> : 'Từ chối'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default MinutesApprovals;


