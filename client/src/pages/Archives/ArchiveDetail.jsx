import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Container,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  Button,
  Chip,
  Alert,
  List,
  ListItem,
  TextField,
  CircularProgress,
  IconButton,
  Tooltip
} from '@mui/material';
import axios from 'axios';
import dayjs from 'dayjs';
import { useAuth } from '../../contexts/AuthContext';
import DescriptionIcon from '@mui/icons-material/Description'; // Icon cho biên bản
import VisibilityIcon from '@mui/icons-material/Visibility'; // Icon cho nút xem
import DownloadIcon from '@mui/icons-material/Download';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import CloseIcon from '@mui/icons-material/Close';
import { alpha, useTheme } from '@mui/material/styles';
import { formatFileSize } from '../../utils/dateUtils'; // Reuse this helper or define locally
import { MinutesViewDialog } from '../Meetings/MeetingDetail'; // Import MinutesViewDialog

const ArchiveDetail = () => {
  const { id } = useParams();
  const { token } = useAuth();
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

  const [archive, setArchive] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [protocols, setProtocols] = useState([]);
  const [protocolLoading, setProtocolLoading] = useState(true);
  const [summaryMessages, setSummaryMessages] = useState([]);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [uploadFiles, setUploadFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [downloadingIndex, setDownloadingIndex] = useState(null);
  const [viewMinutesModal, setViewMinutesModal] = useState({
    open: false,
    minutes: null,
  });

  const formatDate = (d) => (d ? dayjs(d).format('DD/MM/YYYY') : '—');
  const theme = useTheme(); // Initialize useTheme here

  const handleViewMinutes = (minutes) => {
    setViewMinutesModal({
      open: true,
      minutes: minutes,
    });
  };

  const handleCloseViewMinutesModal = () => {
    setViewMinutesModal({
      open: false,
      minutes: null,
    });
  };

  const fetchArchive = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/archives/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setArchive(res.data.archive);
      setError('');

      let meetingId = null;
      if (res.data.archive.meetingSnapshot?._id) meetingId = res.data.archive.meetingSnapshot._id;
      else if (res.data.archive.meeting) meetingId = typeof res.data.archive.meeting === 'string' ? res.data.archive.meeting : res.data.archive.meeting._id;
      else if (res.data.archive.meetingSnapshot?.meeting) meetingId = typeof res.data.archive.meetingSnapshot.meeting === 'string' ? res.data.archive.meetingSnapshot.meeting : res.data.archive.meetingSnapshot.meeting._id;

      if (meetingId && typeof meetingId === 'string') {
        // Tạm thời tắt tự động đồng bộ để tránh lỗi
        // await syncArchiveData(meetingId);
        fetchProtocols(meetingId);
        fetchSummary(meetingId);
      }
    } catch (e) {
      setError('Không thể tải chi tiết lưu trữ');
    } finally {
      setLoading(false);
    }
  };

  const fetchProtocols = async (meetingId) => {
    try {
      setProtocolLoading(true);
      const tokenHdr = { Authorization: `Bearer ${token}` };
      const protRes = await axios.get(`${API_BASE_URL}/protocols`, { params: { meeting: meetingId }, headers: tokenHdr });
      setProtocols(protRes.data.protocols || []);
    } catch (e) {
      setProtocols([]);
    } finally {
      setProtocolLoading(false);
    }
  };

  const fetchSummary = async (meetingId) => {
    try {
      setSummaryLoading(true);
      const response = await axios.get(`${API_BASE_URL}/meetings/${meetingId}`, { headers: { Authorization: `Bearer ${token}` } });
      setSummaryMessages(response.data.meeting?.summaryMessages || []);
    } catch (e) {
      setSummaryMessages([]);
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleDownloadDocument = async (idx, doc) => {
    try {
      setDownloadingIndex(idx);
      const response = await axios.get(
        `${API_BASE_URL}/archives/${id}/documents/${idx}/download`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        }
      );

      // Lấy tên file từ Content-Disposition nếu có
      const disposition = response.headers['content-disposition'] || '';
      const match = disposition.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
      const encodedName = match?.[1];
      const simpleName = match?.[2];
      const fileName = decodeURIComponent(encodedName || '') || simpleName || doc?.name || `file-${idx}`;

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Download failed', e);
      alert('Không thể tải file. Vui lòng thử lại.');
    } finally {
      setDownloadingIndex(null);
    }
  };

  const syncArchiveData = async (meetingId) => {
    try {
      setSyncing(true);
      setSyncMessage('Đang đồng bộ dữ liệu...');
      
      // Thử endpoint đơn giản trước
      console.log('Testing archive endpoint...');
      const testResponse = await axios.get(`${API_BASE_URL}/archives/test`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Test response:', testResponse.data);
      
      // Gọi API đồng bộ hoàn toàn (sử dụng endpoint update-protocols-minutes đã cải thiện)
      console.log('🔄 Calling complete sync...');
      const response = await axios.put(`${API_BASE_URL}/archives/${id}/update-protocols-minutes`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('Sync response:', response.data);
      setSyncMessage('Đồng bộ hoàn tất!');
      
      // Làm mới dữ liệu archive sau khi đồng bộ
      setTimeout(() => {
        fetchArchive();
        setSyncMessage('');
      }, 1000);
      
    } catch (e) {
      console.error('Lỗi đồng bộ:', e);
      console.error('Error response:', e.response?.data);
      setSyncMessage(`Lỗi đồng bộ: ${e.response?.data?.error || e.message}`);
      setTimeout(() => setSyncMessage(''), 5000);
    } finally {
      setSyncing(false);
    }
  };

  const handleManualSync = async () => {
    if (!archive) return;
    
    let meetingId = null;
    if (archive.meetingSnapshot?._id) meetingId = archive.meetingSnapshot._id;
    else if (archive.meeting) meetingId = typeof archive.meeting === 'string' ? archive.meeting : archive.meeting._id;
    else if (archive.meetingSnapshot?.meeting) meetingId = typeof archive.meetingSnapshot.meeting === 'string' ? archive.meetingSnapshot.meeting : archive.meetingSnapshot.meeting._id;
    
    if (meetingId) {
      await syncArchiveData(meetingId);
    }
  };

  useEffect(() => {
    fetchArchive();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleUploadFiles = async (e) => {
    e.preventDefault();
    if (!uploadFiles || uploadFiles.length === 0) return;
    try {
      setUploading(true);
      const formData = new FormData();
      for (const f of uploadFiles) formData.append('files', f);
      await axios.post(`${API_BASE_URL}/archives/${id}/upload`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      setUploadFiles([]);
      fetchArchive();
    } catch (e) {
      setError('Upload thất bại');
    } finally {
      setUploading(false);
    }
  };

  if (loading) return (
    <Container maxWidth="xl"><Box sx={{ py: 6, textAlign: 'center' }}>Đang tải...</Box></Container>
  );
  if (error) return (
    <Container maxWidth="xl"><Alert severity="error" sx={{ mt: 3 }}>{error}</Alert></Container>
  );
  if (!archive) return null;

  const baseUrlNoApi = API_BASE_URL.replace('/api', '');

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h4" fontWeight={700}>{archive.title}</Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {syncMessage && (
              <Typography variant="body2" color={syncMessage.includes('Lỗi') ? 'error' : 'success'}>
                {syncMessage}
              </Typography>
            )}
            <Button 
              variant="contained" 
              size="medium" 
              onClick={handleManualSync} 
              disabled={syncing || loading}
              startIcon={syncing ? <CircularProgress size={16} /> : null}
              sx={{ px: 3, py: 1 }}
            >
              {syncing ? 'Đang đồng bộ hoàn toàn...' : 'Đồng bộ hoàn toàn'}
            </Button>
            <Button variant="outlined" size="small" onClick={fetchArchive} disabled={loading}>Làm mới</Button>
          </Box>
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12} md={3}>
            <Card sx={{ mb: 3 }}>
              <CardHeader title="Thông tin cuộc họp" />
              <CardContent>
                <List>
                  <ListItem>Tiêu đề: {archive.meetingSnapshot?.title}</ListItem>
                  <ListItem>Thời gian: {formatDate(archive.meetingSnapshot?.startTime)} - {formatDate(archive.meetingSnapshot?.endTime)}</ListItem>
                  <ListItem>Địa điểm: {archive.meetingSnapshot?.location || '—'}</ListItem>
                  <ListItem>Người tổ chức: {archive.meetingSnapshot?.organizer?.fullName || '—'}</ListItem>
                  <ListItem>Thư ký: {archive.meetingSnapshot?.secretary?.fullName || '—'}</ListItem>
                  <ListItem>Số lượng tham gia: {archive.meetingSnapshot?.attendeeCount || 0}</ListItem>
                </List>
              </CardContent>
            </Card>

            <Card>
              <CardHeader title="Thông tin lưu trữ" />
              <CardContent>
                <List>
                  <ListItem>Loại: {archive.archiveType}</ListItem>
                  <ListItem>Ngày lưu: {formatDate(archive.archivedAt)}</ListItem>
                  <ListItem>Tổng tài liệu: {archive.statistics?.totalDocuments || 0}</ListItem>
                  <ListItem>Kích thước: {archive.statistics?.totalSize ? (archive.statistics.totalSize / (1024*1024)).toFixed(2) + ' MB' : '—'}</ListItem>
                  <ListItem>Lượt xem: {archive.statistics?.viewCount || 0}</ListItem>
                  <ListItem>Lượt tải: {archive.statistics?.downloadCount || 0}</ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            {Array.isArray(archive.documents) && archive.documents.length > 0 && (
              <Card sx={{ mb: 3 }}>
                <CardHeader title={`Tài liệu (${archive.documents.length})`} sx={{ py: 1.25 }} />
                <CardContent sx={{ pt: 1 }}>
                  <Box sx={{ display: 'grid', rowGap: 1 }}>
                  {archive.documents.map((doc, idx) => (
                      <Box
                        key={idx}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          p: 1,
                          borderRadius: 1.5,
                          bgcolor: 'background.default',
                          '&:hover': { bgcolor: 'action.hover' },
                        }}
                      >
                        <InsertDriveFileOutlinedIcon sx={{ color: 'text.secondary' }} fontSize="small" />
                        <Box sx={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
                          <Typography
                            variant="body2"
                            title={doc.name}
                            sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}
                          >{doc.name}</Typography>
                          <Box sx={{ mt: 0.25, display: 'flex', gap: 1, alignItems: 'center', minWidth: 0 }}>
                          <Chip size="small" label={
                            doc.type === 'summary_message_attachment' ? 'File tóm tắt' :
                            doc.type === 'summary_file' ? 'File summary' :
                            doc.type === 'meeting_attachment' ? 'File cuộc họp' :
                            doc.type === 'protocol_attachment' ? 'File biên bản' :
                            doc.type === 'minutes_attachment' ? 'File biên bản' :
                            doc.type === 'additional' ? 'File thêm' : 'Khác'
                            } sx={{ height: 20 }} />
                            <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                              {(doc.size / (1024*1024)).toFixed(2)} MB
                            </Typography>
                        </Box>
                      </Box>
                        <Tooltip title={downloadingIndex === idx ? 'Đang tải...' : 'Tải xuống'}>
                          <span>
                            <IconButton size="small" onClick={() => handleDownloadDocument(idx, doc)} disabled={downloadingIndex === idx}>
                              <DownloadIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                    </Box>
                  ))}
                  </Box>
                </CardContent>
              </Card>
            )}

            <Card sx={{ mb: 3 }}>
              <CardHeader title={`Biên bản cuộc họp (${protocols.length > 0 ? protocols.length : (archive.protocolSnapshots?.length || 0)})`} sx={{ py: 1.25 }} />
              <CardContent sx={{ pt: 1 }}>
                {protocolLoading ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><CircularProgress size={18} /> Đang tải...</Box>
                ) : (
                  (() => {
                    // Ưu tiên hiển thị protocolSnapshots từ archive trước
                    const list = (archive.protocolSnapshots && archive.protocolSnapshots.length > 0) 
                      ? archive.protocolSnapshots 
                      : (protocols.length > 0 ? protocols : []);
                    
                    console.log('📋 Displaying protocols:', list.length, 'items');
                    console.log('📋 Protocol titles:', list.map(p => p.title));
                    console.log('📋 Archive protocolSnapshots:', archive.protocolSnapshots?.length || 0);
                    console.log('📋 Live protocols:', protocols.length);
                    
                    if (list.length === 0) return <Typography color="text.secondary">Chưa có biên bản nào.</Typography>;
                    
                    return list.map((p, idx) => (
                      <Box key={p._id || idx} sx={{ p: 1, borderRadius: 1.5, '&:hover': { bgcolor: 'action.hover' } }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography 
                            variant="body2" 
                            fontWeight={600}
                            title={p.title}
                            sx={{
                              flex: 1,
                              minWidth: 0,
                              overflow: 'hidden',
                              whiteSpace: 'nowrap',
                              textOverflow: 'ellipsis'
                            }}
                          >{p.title}</Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: '0 0 auto' }}>
                            <Chip 
                              size="small" 
                              label={
                                p.status === 'approved' ? 'Đã phê duyệt' : 
                                p.status === 'pending' ? 'Chờ duyệt' : 
                                p.status === 'rejected' ? 'Từ chối' : 
                                p.status === 'draft' ? 'Bản nháp' : p.status
                              } 
                              color={
                                p.status === 'approved' ? 'success' : 
                                p.status === 'pending' ? 'warning' : 
                                p.status === 'rejected' ? 'error' : 'default'
                              } 
                            />
                            <Tooltip title="Xem">
                              <IconButton size="small" onClick={() => handleViewMinutes(p)}>
                                <VisibilityIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </Box>
                        <Typography 
                          variant="caption" 
                          color="text.secondary"
                          sx={{
                            display: 'block',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          Thư ký: {p.secretary?.fullName || '—'} • {dayjs(p.createdAt).format('DD/MM/YYYY HH:mm')}
                        </Typography>
                      </Box>
                    ));
                  })()
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader title={`Tóm tắt cuộc họp (${summaryMessages.length})`} />
              <CardContent>
                {summaryLoading ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><CircularProgress size={18} /> Đang tải tóm tắt...</Box>
                ) : summaryMessages.length === 0 ? (
                  <Typography color="text.secondary">Chưa có tóm tắt cuộc họp.</Typography>
                ) : (
                  summaryMessages.map((m) => (
                    <Box key={m._id} sx={{ py: 1.5, borderBottom: '1px solid #eee' }}>
                      {m.text && (
                        <Box className="ql-editor" sx={{ p: 1.5, bgcolor: 'background.default', borderRadius: 1 }} dangerouslySetInnerHTML={{ __html: m.text }} />
                      )}
                      {Array.isArray(m.attachments) && m.attachments.length > 0 && (
                        <Box sx={{ mt: 1 }}>
                          {m.attachments.map((file, idx) => (
                            <Box key={idx} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1, border: '1px solid #eee', borderRadius: 1, mb: 1 }}>
                              <Typography variant="body2" noWrap sx={{ mr: 2 }} title={file.name}>{file.name}</Typography>
                              <Box>
                                <Button size="small" sx={{ mr: 1 }} variant="outlined" href={`${API_BASE_URL}/meetings/${archive.meetingSnapshot?._id || archive.meeting}/summary-messages/${m._id}/files/${file._id}`} target="_blank">Xem</Button>
                                <Button size="small" variant="contained" href={`${API_BASE_URL}/meetings/${archive.meetingSnapshot?._id || archive.meeting}/summary-messages/${m._id}/files/${file._id}/download`} target="_blank">Tải</Button>
                              </Box>
                            </Box>
                          ))}
                        </Box>
                      )}
                      <Typography variant="caption" color="text.secondary">{dayjs(m.createdAt).format('DD/MM/YYYY HH:mm')}</Typography>
                    </Box>
                  ))
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardHeader title="Tải tài liệu lên" />
              <CardContent>
                <Box component="form" onSubmit={handleUploadFiles} sx={{
                  p: 1.5,
                  border: `1px dashed ${alpha(theme.palette.divider, 0.6)}`,
                  borderRadius: 2,
                  bgcolor: alpha(theme.palette.primary.light, 0.03)
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Button component="label" variant="outlined" size="small" sx={{ whiteSpace: 'nowrap' }}>
                      Chọn tệp
                      <input hidden type="file" multiple onChange={(e) => setUploadFiles(Array.from(e.target.files))} />
                    </Button>
                    <Button type="submit" variant="contained" size="small" disabled={uploading || uploadFiles.length === 0}>
                      {uploading ? 'Đang tải...' : 'Upload'}
                    </Button>
                  </Box>

                  {uploadFiles.length > 0 && (
                    <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {uploadFiles.map((f, idx) => (
                        <Chip
                          key={idx}
                          size="small"
                          label={`${f.name.length > 28 ? f.name.slice(0, 25) + '…' : f.name} • ${(f.size / (1024*1024)).toFixed(1)} MB`}
                          onDelete={() => setUploadFiles(prev => prev.filter((_, i) => i !== idx))}
                        />
                      ))}
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>

            {Array.isArray(archive.minutesSnapshots) && archive.minutesSnapshots.length > 0 && (
              <Card sx={{ mt: 3 }}>
                <CardHeader title={`Thống nhất (${archive.minutesSnapshots.length})`} />
                <CardContent>
                  {archive.minutesSnapshots.map((m, idx) => (
                    <Box key={m._id || idx} sx={{ py: 1.5, borderBottom: '1px solid #eee' }}>
                      <Typography fontWeight={600}>{m.title}</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <Chip size="small" color={m.isApproved ? 'success' : 'warning'} label={m.isApproved ? 'Đã duyệt' : 'Chưa duyệt'} />
                        <Typography variant="caption" color="text.secondary">{m.status}</Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary">Thư ký: {m.secretary?.fullName || '—'} • {dayjs(m.createdAt).format('DD/MM/YYYY')}</Typography>
                    </Box>
                  ))}
                </CardContent>
              </Card>
            )}
          </Grid>
        </Grid>
      </Box>
      <MinutesViewDialog
        open={viewMinutesModal.open}
        onClose={handleCloseViewMinutesModal}
        minutes={viewMinutesModal.minutes}
      />
    </Container>
  );
};

export default ArchiveDetail;


