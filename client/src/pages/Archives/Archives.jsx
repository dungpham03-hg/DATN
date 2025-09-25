import React, { useEffect, useState } from 'react';
import {
  Container,
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Pagination,
  IconButton,
  OutlinedInput,
  InputAdornment,
  CircularProgress,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import { alpha, useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import dayjs from 'dayjs';
import { useAuth } from '../../contexts/AuthContext';

const Archives = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { token } = useAuth();
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

  const [archives, setArchives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  const fetchArchives = async (nextPage = 1, search = '') => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/archives`, {
        params: { page: nextPage, limit: 10, search },
        headers: { Authorization: `Bearer ${token}` }
      });
      setArchives(res.data.archives || []);
      setPages(res.data.pagination?.pages || 1);
      setError('');
    } catch (e) {
      setError('Không thể tải dữ liệu lưu trữ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArchives(page, searchTerm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleSearch = async (e) => {
    e.preventDefault();
    setPage(1);
    await fetchArchives(1, searchTerm);
  };

  const formatDate = (d) => (d ? dayjs(d).format('DD/MM/YYYY') : '—');

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 3 }}>
        <Paper elevation={0} sx={{ p: 2.5, mb: 2, borderRadius: 2, border: `1px solid ${alpha(theme.palette.divider, 0.1)}`, background: `linear-gradient(180deg, ${alpha(theme.palette.primary.light, 0.08)} 0%, transparent 100%)` }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
              <Box sx={{ width: 40, height: 40, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: alpha(theme.palette.primary.main, 0.12), color: theme.palette.primary.main }}>
                <DescriptionOutlinedIcon />
              </Box>
              <Box>
                <Typography variant="h6" fontWeight={800}>Kho lưu trữ cuộc họp</Typography>
                <Typography variant="body2" color="text.secondary">Tìm kiếm, xem chi tiết và quản lý bản lưu biên bản, tài liệu họp</Typography>
              </Box>
            </Box>
            <Box component="form" onSubmit={handleSearch} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <OutlinedInput
                size="small"
                placeholder="Tìm theo tiêu đề, cuộc họp, thẻ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                startAdornment={<InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>}
                sx={{ borderRadius: 2, width: { xs: '100%', sm: 320 } }}
              />
              <IconButton onClick={() => fetchArchives(page, searchTerm)} size="small"><RefreshIcon /></IconButton>
              <Button type="submit" variant="contained">Tìm</Button>
            </Box>
          </Box>
        </Paper>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        )}

        <Card>
            <CardContent sx={{ p: 0 }}>
              <TableContainer component={Paper} elevation={0} sx={{ maxHeight: 560 }}>
                <Table stickyHeader size="small" sx={{
                  '& thead th': {
                    bgcolor: alpha(theme.palette.primary.light, 0.1),
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.6)}`
                  }
                }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Tiêu đề</TableCell>
                      <TableCell>Cuộc họp</TableCell>
                      <TableCell>Trạng thái BB</TableCell>
                      <TableCell>Loại</TableCell>
                      <TableCell>Ngày lưu</TableCell>
                      <TableCell>Tags</TableCell>
                      <TableCell align="right">Hành động</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
                          <Box sx={{ py: 6 }}><CircularProgress size={26} /></Box>
                        </TableCell>
                      </TableRow>
                    ) : archives.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
                          <Box sx={{ py: 8, display: 'flex', justifyContent: 'center' }}>
                            <Paper elevation={0} sx={{ px: 4, py: 5, textAlign: 'center', borderRadius: 3, maxWidth: 520, border: `1px dashed ${alpha(theme.palette.divider, 0.6)}` }}>
                              <DescriptionOutlinedIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                              <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>Chưa có bản lưu nào</Typography>
                              <Typography variant="body2" color="text.secondary">Hãy thử thay đổi từ khóa tìm kiếm hoặc kiểm tra lại quyền truy cập.</Typography>
                            </Paper>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ) : (
                      archives.map((ar) => (
                        <TableRow key={ar._id} hover>
                          <TableCell sx={{ cursor: 'pointer' }} onClick={() => navigate(`/archives/${ar._id}`)}>
                            {ar.title}
                          </TableCell>
                          <TableCell>{ar.meetingSnapshot?.title || '—'}</TableCell>
                          <TableCell>
                            {(() => {
                              const minutesSn = Array.isArray(ar.minutesSnapshots) ? ar.minutesSnapshots : [];
                              const protocolSn = Array.isArray(ar.protocolSnapshots) ? ar.protocolSnapshots : [];
                              const all = [...minutesSn, ...protocolSn];
                              if (all.length === 0) return '—';

                              // Xác định trạng thái tổng hợp: ưu tiên Approved > Rejected > Pending > Draft
                              const hasApproved = all.some(s => s.isApproved || s.status === 'approved');
                              const hasRejected = all.some(s => s.status === 'rejected');
                              const hasPending = all.some(s => ['pending', 'pending_approval', 'pending_review'].includes(s.status));

                              let status = 'draft';
                              if (hasApproved) status = 'approved';
                              else if (hasRejected && !hasPending) status = 'rejected';
                              else if (hasPending) status = 'pending_approval';

                              const map = {
                                draft: { color: 'default', label: 'Bản nháp' },
                                pending: { color: 'warning', label: 'Chờ duyệt' },
                                pending_review: { color: 'warning', label: 'Chờ rà soát' },
                                pending_approval: { color: 'warning', label: 'Chờ phê duyệt' },
                                approved: { color: 'success', label: 'Đã phê duyệt' },
                                rejected: { color: 'error', label: 'Từ chối' },
                              };
                              const cfg = map[status] || { color: 'default', label: status };
                              return <Chip size="small" color={cfg.color} label={cfg.label} />;
                            })()}
                          </TableCell>
                          <TableCell>
                            <Chip label={ar.archiveType || '—'} size="small" color="default" />
                          </TableCell>
                          <TableCell>{formatDate(ar.archivedAt)}</TableCell>
                          <TableCell>
                            {Array.isArray(ar.tags) && ar.tags.length > 0 ? (
                              ar.tags.slice(0, 3).map((tag, idx) => (
                                <Chip key={idx} label={tag} size="small" sx={{ mr: 0.5 }} />
                              ))
                            ) : '—'}
                          </TableCell>
                          <TableCell align="right">
                            <Button size="small" variant="outlined" onClick={() => navigate(`/archives/${ar._id}`)}>
                              Xem
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>

        {pages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <Pagination
              count={pages}
              page={page}
              onChange={(_, p) => setPage(p)}
              color="primary"
              shape="rounded"
            />
          </Box>
        )}
      </Box>
    </Container>
  );
};

export default Archives;


