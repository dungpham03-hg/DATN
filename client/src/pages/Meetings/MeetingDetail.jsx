import React, { useEffect, useRef, useState } from 'react';
import { QuillWrapper } from '../../components/QuillEditor';
import {
  Container,
  Paper,
  Box,
  Stack,
  Typography,
  Chip,
  Avatar,
  Divider,
  Grid,
  Button,
  IconButton,
  Skeleton,
  alpha,
  useTheme,
  TextField,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ButtonGroup,
  Tooltip,
  Badge,
  InputAdornment,
  Link
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import LaunchIcon from '@mui/icons-material/Launch';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import {
  ArrowBack as BackIcon,
  CalendarMonth as CalendarIcon,
  AccessTime as TimeIcon,
  LocationOn as LocationIcon,
  MeetingRoom as RoomIcon,
  Person as PersonIcon,
  Groups as GroupsIcon,
  MoreVert as MoreIcon,
  Close as CloseIcon,
  ThumbUpAltOutlined as ThumbUpIcon,
  ThumbDownAltOutlined as ThumbDownIcon,
  RemoveCircleOutline as NeutralIcon,
  TaskAltOutlined as TaskIcon,
  PersonAddAlt as PersonAddIcon,
  Attachment as AttachmentIcon
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { getMeetingStatus } from '../../utils/dateUtils';
import dayjs from 'dayjs';

// Định nghĩa các hàm định dạng thời gian và ngày tháng sử dụng dayjs (chỉ một lần)
const formatDateTime = (iso) => (iso ? dayjs(iso).format('DD/MM/YYYY HH:mm') : '—');
const formatDate = (iso) => (iso ? dayjs(iso).format('DD/MM/YYYY') : '—');
const formatTimeRange = (startIso, endIso) => {
  const start = startIso ? dayjs(startIso).format('HH:mm') : '';
  const end = endIso ? dayjs(endIso).format('HH:mm') : '';
  return start && end ? `${start} - ${end}` : (start || end || '—');
};
const formatTime = (iso) => (iso ? dayjs(iso).format('HH:mm') : '');
const formatOnlyDate = (iso) => (iso ? dayjs(iso).format('DD/MM/YYYY') : '—');

// API base URL cho các gọi API nội bộ trang MeetingDetail
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';
const formatWeekdayDate = (iso) => (iso ? dayjs(iso).format('dddd, DD/MM/YYYY') : '—');

const formatFileSize = (bytes) => {
  if (bytes === null || bytes === undefined) return '—';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = Number(bytes);
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size % 1 === 0 ? size : size.toFixed(1)} ${units[unitIndex]}`;
};

// Component để hiển thị file text
const TextFileViewer = ({ url, fileName }) => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { token, user } = useAuth();

  useEffect(() => {
    const fetchTextContent = async () => {
      try {
        setLoading(true);
        // URL đã có token embedded, không cần thêm header
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const text = await response.text();
        setContent(text);
      } catch (err) {
        console.error('Error fetching text file:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTextContent();
  }, [url]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Typography>Đang tải nội dung...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Typography color="error" sx={{ mb: 2 }}>Lỗi khi tải file: {error}</Typography>
        <Button variant="outlined" component="a" href={url} download>
          Tải xuống file
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      <Typography variant="h6" sx={{ mb: 2, pb: 1, borderBottom: 1, borderColor: 'divider' }}>
        {fileName}
      </Typography>
      <Box
        component="pre"
        sx={{
          width: '100%',
          height: 'calc(100% - 60px)',
          overflow: 'auto',
          bgcolor: 'grey.50',
          p: 2,
          borderRadius: 1,
          fontFamily: 'monospace',
          fontSize: '0.875rem',
          lineHeight: 1.5,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word'
        }}
      >
        {content}
      </Box>
    </Box>
  );
};

const MeetingDetail = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { id } = useParams();
  const { token, user } = useAuth();

  const API_SERVER = (process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api').replace('/api','');

  const toPublicUrl = (rawPath) => {
    if (!rawPath) return '';
    if (/^https?:\/\//i.test(rawPath)) return rawPath;
    let normalized = String(rawPath).replace(/\\/g, '/');
    const uploadsIdx = normalized.toLowerCase().lastIndexOf('/uploads/');
    if (uploadsIdx !== -1) {
      normalized = normalized.slice(uploadsIdx);
    } else {
      // try strip local prefix like e:/datn/server
      const serverIdx = normalized.toLowerCase().lastIndexOf('/server/');
      if (serverIdx !== -1) {
        normalized = normalized.slice(serverIdx + '/server'.length);
      }
      if (!normalized.startsWith('/uploads/')) {
        // best effort: ensure leading slash
        if (!normalized.startsWith('/')) normalized = '/' + normalized;
      }
    }
    if (!normalized.startsWith('/')) normalized = '/' + normalized;
    return `${API_SERVER}${normalized}`;
  };

  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newDecision, setNewDecision] = useState('');
  const [newTask, setNewTask] = useState('');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [filesState, setFilesState] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({}); // {fileName: percent}
  // viewingFile state đã được xóa - files mở trong tab mới
  
  // Agenda states
  const [agendaItems, setAgendaItems] = useState([]);
  const [agendaDialogOpen, setAgendaDialogOpen] = useState(false);
  const [editingAgendaItem, setEditingAgendaItem] = useState(null);
  const [newAgendaItem, setNewAgendaItem] = useState({
    title: '',
    description: '',
    order: 1
  });

  // Notes states (for comments-like UI)
  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  // Minutes states
  const [minutesHistory, setMinutesHistory] = useState([]);
  const [currentMinutes, setCurrentMinutes] = useState(null);
  // Lưu _id biên bản đang mở để tránh bị đổi sau khi refresh dữ liệu
  const currentMinutesIdRef = useRef(null);
  useEffect(() => { currentMinutesIdRef.current = currentMinutes?._id || null; }, [currentMinutes]);
  const [minutesDialogOpen, setMinutesDialogOpen] = useState(false);
  const [savingMinutes, setSavingMinutes] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [viewMinutesModal, setViewMinutesModal] = useState({
    open: false,
    minutes: null,
  });
  
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';
  const [meetingLinkValue, setMeetingLinkValue] = useState('');
  const [savingLink, setSavingLink] = useState(false);

  const fetchMeeting = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/meetings/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const mt = res.data.meeting;
      setMeeting(mt);
      const isUrl = (s) => {
        if (!s || typeof s !== 'string') return false;
        try { new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`); return true; } catch { return false; }
      };
      const initialLink = mt?.meetingLink && mt.meetingLink.trim() ? mt.meetingLink.trim() : (isUrl(mt?.location) ? mt.location.trim() : '');
      setMeetingLinkValue(initialLink);
      // Đồng bộ danh sách file từ attachments field
      const mt2 = res.data.meeting || {};
      const filesFromServer = Array.isArray(mt2.attachments) ? mt2.attachments : [];
      setFilesState(filesFromServer);
      
      // Load agenda items
      const agendaFromServer = Array.isArray(mt2.agenda) ? mt2.agenda : [];
      setAgendaItems(agendaFromServer);
      
      // Notes are loaded directly from meeting.notes
      
      // Load minutes history from meeting object
      const newHistory = mt2.minutesHistory || [];
      setMinutesHistory(newHistory);
      // Giữ nguyên biên bản đang mở nếu còn tồn tại; nếu không thì lấy phần tử mới nhất
      const latestMinutes = newHistory.length > 0 ? newHistory[newHistory.length - 1] : null;
      const preservedId = currentMinutesIdRef.current;
      const preserved = preservedId
        ? newHistory.find(m => String(m._id) === String(preservedId))
        : null;
      setCurrentMinutes(preserved || latestMinutes);
    } catch (err) {
      console.error('Error fetching meeting detail:', err);
    } finally {
      setLoading(false);
    }
  };
  const canEdit = () => {
    if (!user || !meeting) return false;
    const role = user.role;
    const isOwner = meeting.organizer?._id === user._id;
    return ['admin', 'manager', 'secretary', 'assistant'].includes(role) || isOwner;
  };

  // Helper function to download file with token
  const downloadFileWithToken = async (url, fileName) => {
    try {
      const response = await axios.get(url, {
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

  const handleSaveMeetingLink = async () => {
    try {
      setSavingLink(true);
      // Chuẩn hóa: tự thêm https:// nếu người dùng quên
      const link = (() => {
        const v = (meetingLinkValue || '').trim();
        return /^https?:\/\//i.test(v) ? v : (v ? `https://${v}` : '');
      })();
      await axios.put(`${API_BASE_URL}/meetings/${id}`, { meetingLink: link }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchMeeting();
    } catch (e) {
      console.error('Save meeting link error:', e);
      alert(e.response?.data?.message || 'Không thể lưu link họp');
    } finally {
      setSavingLink(false);
    }
  };


  useEffect(() => {
    fetchMeeting();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Agenda functions
  const handleAddAgendaItem = () => {
    setEditingAgendaItem(null);
    setNewAgendaItem({
      title: '',
      description: '',
      order: agendaItems.length + 1
    });
    setAgendaDialogOpen(true);
  };

  const handleEditAgendaItem = (item) => {
    setEditingAgendaItem(item);
    setNewAgendaItem({
      title: item.title || '',
      description: item.description || '',
      order: item.order || 1
    });
    setAgendaDialogOpen(true);
  };

  const handleSaveAgendaItem = async () => {
    try {
      const agendaData = {
        ...newAgendaItem,
        meetingId: id
      };

      if (editingAgendaItem) {
        // Update existing item
        await axios.put(`${API_BASE_URL}/meetings/${id}/agenda/${editingAgendaItem._id}`, agendaData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setAgendaItems(prev => prev.map(item => 
          item._id === editingAgendaItem._id ? { ...item, ...agendaData } : item
        ));
      } else {
        // Add new item
        const response = await axios.post(`${API_BASE_URL}/meetings/${id}/agenda`, agendaData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setAgendaItems(prev => [...prev, response.data.agendaItem]);
      }

      setAgendaDialogOpen(false);
      setNewAgendaItem({ title: '', description: '', order: 1 });
    } catch (error) {
      console.error('Error saving agenda item:', error);
      alert('Có lỗi xảy ra khi lưu mục chương trình');
    }
  };

  const handleDeleteAgendaItem = async (itemId) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa mục này?')) {
      try {
        await axios.delete(`${API_BASE_URL}/meetings/${id}/agenda/${itemId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setAgendaItems(prev => prev.filter(item => item._id !== itemId));
      } catch (error) {
        console.error('Error deleting agenda item:', error);
        alert('Có lỗi xảy ra khi xóa mục chương trình');
      }
    }
  };

  const handleCancelAgendaDialog = () => {
    setAgendaDialogOpen(false);
    setNewAgendaItem({ title: '', description: '', order: 1 });
    setEditingAgendaItem(null);
  };

  // Notes functions (comments-like UI)
  const handleSaveNote = async () => {
    if (!newNote.trim()) {
      alert('Vui lòng nhập nội dung ghi chú');
      return;
    }

    setSavingNote(true);
    try {
      await axios.post(`${API_BASE_URL}/meetings/${id}/notes`, {
        text: newNote.trim()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setNewNote('');
      fetchMeeting(); // Refresh to get updated notes
    } catch (error) {
      console.error('Error saving note:', error);
      alert('Có lỗi xảy ra khi lưu ghi chú');
    } finally {
      setSavingNote(false);
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa ghi chú này?')) {
      try {
        await axios.delete(`${API_BASE_URL}/meetings/${id}/notes/${noteId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchMeeting(); // Refresh to get updated notes
      } catch (error) {
        console.error('Error deleting note:', error);
        alert('Có lỗi xảy ra khi xóa ghi chú');
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSaveNote();
    }
  };

  // Minutes functions

  const handleOpenMinutesDialog = async (minutes = null) => {
    try {
    if (!minutes) {
        // Tạo biên bản rỗng để lấy _id ngay khi bấm "Tạo biên bản mới"
        const res = await axios.post(`${API_BASE_URL}/meetings/${id}/minutes`, {
          content: ''
        }, { headers: { Authorization: `Bearer ${token}` } });
        const created = res.data?.minutes || { content: '' };
        setCurrentMinutes(created);
    } else {
      setCurrentMinutes(minutes);
    }
    setMinutesDialogOpen(true);
    } catch (e) {
      console.error('Create empty minutes on open error:', e);
      alert(e.response?.data?.message || 'Không thể khởi tạo biên bản mới');
    }
  };

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

  const handleDeleteMinutes = async (minutes) => {
    if (!minutes?._id) return;
    
    try {
      await axios.delete(`${API_BASE_URL}/meetings/${id}/minutes/${minutes._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Xóa biên bản thành công');
      await fetchMeeting();
    } catch (error) {
      console.error('Error deleting minutes:', error);
      alert(error.response?.data?.message || 'Không thể xóa biên bản');
    }
  };

  // Tạo/ cập nhật biên bản ngầm để lấy minutesId khi cần (không yêu cầu người dùng bấm Lưu nháp)
  const ensureMinutesId = async () => {
    if (currentMinutes?._id) return currentMinutes._id;
    const res = await axios.post(`${API_BASE_URL}/meetings/${id}/minutes`, {
      content: currentMinutes?.content || ''
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    setCurrentMinutes(res.data?.minutes);
    return res.data?.minutes?._id;
  };

  const handleSaveMinutesDraft = async () => {
    setSavingMinutes(true);
    try {
      console.log('Saving minutes draft...');
      console.log('Current minutes:', currentMinutes);
      console.log('Meeting ID:', id);
      console.log('User token:', token ? 'present' : 'missing');

      if (currentMinutes && currentMinutes._id) {
        console.log('Updating existing minutes with ID:', currentMinutes._id);
        // Update existing minutes
        const response = await axios.put(`${API_BASE_URL}/meetings/${id}/minutes/${currentMinutes._id}`, {
          content: currentMinutes.content
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Update response:', response.data);
        alert('Cập nhật biên bản thành công');
      } else {
        console.log('Creating new minutes...');
        // Create new minutes
        const response = await axios.post(`${API_BASE_URL}/meetings/${id}/minutes`, {
          content: currentMinutes?.content || ''
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Create response:', response.data);

        // Cập nhật currentMinutes với _id mới
        setCurrentMinutes(response.data.minutes);
        alert('Tạo biên bản thành công');
      }

      setMinutesDialogOpen(false);

      // Refresh meeting data to get updated minutes
      await fetchMeeting();
    } catch (error) {
      console.error('Error saving minutes:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        headers: error.config?.headers
      });
      alert(`Có lỗi xảy ra khi lưu biên bản: ${error.response?.data?.message || error.message}`);
    } finally {
      setSavingMinutes(false);
    }
  };

  const handleSubmitMinutes = async () => {
    const hasContent = Boolean(currentMinutes?.content && currentMinutes.content.trim());
    const hasAttachment = Boolean(currentMinutes?.attachment && (currentMinutes.attachment.path || currentMinutes.attachment.name));
    if (!currentMinutes || (!hasContent && !hasAttachment)) {
      alert('Vui lòng nhập nội dung hoặc đính kèm ít nhất 1 file trước khi gửi');
      return;
    }

    if (window.confirm('Bạn có chắc chắn muốn gửi biên bản để phê duyệt?')) {
      setSavingMinutes(true);
      try {
        // Nếu là biên bản mới (chưa có _id), tạo trước rồi submit
        if (!currentMinutes._id) {
          console.log("Frontend: Creating new minutes before submitting.");
          console.log("Frontend: Meeting ID for creation ->", id);
          console.log("Frontend: Content for new minutes ->", currentMinutes.content);
          // Tạo biên bản mới trước
          const createResponse = await axios.post(`${API_BASE_URL}/meetings/${id}/minutes`, {
            content: currentMinutes.content || ''
          }, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          // Sau đó submit biên bản vừa tạo
          console.log("Frontend: Submitting newly created minutes.");
          console.log("Frontend: Meeting ID for submission ->", id);
          console.log("Frontend: Minutes ID for submission ->", createResponse.data.minutes._id);
          await axios.post(`${API_BASE_URL}/meetings/${id}/minutes/${createResponse.data.minutes._id}/submit`, {
            content: currentMinutes.content || ''
          }, {
            headers: { Authorization: `Bearer ${token}` }
          });
        } else {
          // Nếu đã có _id, cập nhật content trước khi submit
          console.log("Frontend: Updating and submitting existing minutes.");
          console.log("Frontend: Meeting ID for submission ->", id);
          console.log("Frontend: Minutes ID for submission ->", currentMinutes._id);
          
          // Update content trước
          await axios.put(`${API_BASE_URL}/meetings/${id}/minutes/${currentMinutes._id}`, {
            content: currentMinutes.content || ''
          }, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          // Sau đó submit
          await axios.post(`${API_BASE_URL}/meetings/${id}/minutes/${currentMinutes._id}/submit`, {
            content: currentMinutes.content || ''
          }, {
            headers: { Authorization: `Bearer ${token}` }
          });
        }
        
        setMinutesDialogOpen(false);
        alert('Gửi biên bản thành công');
        
        // Refresh meeting data to get updated minutes
        await fetchMeeting();
      } catch (error) {
        console.error('Error submitting minutes:', error);
        alert('Có lỗi xảy ra khi gửi biên bản');
      } finally {
        setSavingMinutes(false);
      }
    }
  };


  const handleCancelMinutesDialog = () => {
    setMinutesDialogOpen(false);
  };

  const handleUploadAttachment = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    // Kiểm tra kích thước file (max 50MB)
    for (const file of files) {
      if (file.size > 50 * 1024 * 1024) {
        alert(`File ${file.name} không được vượt quá 50MB`);
        return;
      }
    }

    // currentMinutes đã được khởi tạo với _id khi bấm "Tạo biên bản mới"

    setUploadingAttachment(true);
    try {
      const minutesId = currentMinutes._id;
      const formData = new FormData();
      files.forEach((f) => formData.append('attachments', f));

      await axios.post(
        `${API_BASE_URL}/meetings/${id}/minutes/${minutesId}/attachments`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert('Upload file đính kèm thành công');
      
      // Refresh meeting data to get updated attachment
      await fetchMeeting();
    } catch (error) {
      console.error('Error uploading attachment:', error);
      const errorMessage = error.response?.data?.message || 'Có lỗi xảy ra khi upload file';
      alert(errorMessage);
    } finally {
      setUploadingAttachment(false);
    }
  };

  const handleDeleteAttachment = async () => {
    if (!currentMinutes) return;
    
    if (window.confirm('Bạn có chắc chắn muốn xóa file đính kèm này?')) {
      try {
        await axios.delete(`${API_BASE_URL}/meetings/${id}/minutes/${currentMinutes._id}/attachments`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        alert('Xóa file đính kèm thành công');
        
        // Refresh meeting data to get updated attachment
        await fetchMeeting();
      } catch (error) {
        console.error('Error deleting attachment:', error);
        alert('Có lỗi xảy ra khi xóa file');
      }
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderHeader = () => {
    if (loading || !meeting) {
      return (
        <Paper elevation={0} sx={{ p: 3, borderRadius: 3, mb: 3 }}>
          <Skeleton variant="text" width={240} height={36} />
          <Skeleton variant="text" width={320} />
        </Paper>
      );
    }

    const status = getMeetingStatus(meeting.startTime, meeting.endTime);
    const meetingTypeLabel = meeting.meetingType === 'online' ? 'Trực tuyến' : meeting.meetingType === 'hybrid' ? 'Kết hợp' : 'Trực tiếp';
    const attendeesCount = Array.isArray(meeting.attendees) ? meeting.attendees.length : 0;
    const room = meeting.room;
    const getLocationText = () => {
      const parts = [];
      // Room-based info
      if (room) {
        const roomName = typeof room === 'object' ? (room.name || '') : '';
        const floor = typeof room === 'object'
          ? (typeof room.location === 'string' ? room.location : (room.location?.floor || ''))
          : '';
        const building = typeof room === 'object' ? (room.location?.building || '') : '';
        if (roomName) parts.push(roomName);
        if (floor) parts.push(floor);
        if (building) parts.push(building);
      }
      // Fallback to normalized location or raw location
      if (parts.length === 0 && meeting.roomName) parts.push(meeting.roomName);
      if (parts.length === 0 && meeting.roomLocationFloor) parts.push(meeting.roomLocationFloor);
      if (parts.length === 0 && meeting.location) parts.push(meeting.location);
      return parts.filter(Boolean).join(' - ') || '—';
    };
    const locationText = getLocationText();
    return (
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: 3,
          mb: 3,
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          background: theme.palette.mode === 'light' ? 'linear-gradient(180deg, #fff 0%, #fafafa 100%)' : 'linear-gradient(180deg, #121212 0%, #0f0f0f 100%)'
        }}
      >
        <Stack spacing={1}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
              <IconButton onClick={() => navigate(-1)}>
                <BackIcon />
              </IconButton>
              <Typography variant="h6" fontWeight={700} noWrap>{meeting.title}</Typography>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip size="small" label={status === 'upcoming' ? 'Đã lên lịch' : status === 'ongoing' ? 'Đang diễn ra' : 'Đã kết thúc'} color={status === 'ongoing' ? 'success' : status === 'upcoming' ? 'info' : 'default'} />
              {meeting.priority && (
                <Chip size="small" label={meeting.priority === 'urgent' ? 'Cao' : meeting.priority === 'high' ? 'Cao' : meeting.priority === 'medium' ? 'Trung bình' : 'Thấp'} color={meeting.priority === 'high' || meeting.priority === 'urgent' ? 'error' : 'warning'} variant="outlined" />
              )}
            </Stack>
          </Stack>
          <Stack direction="row" spacing={3} alignItems="center" sx={{ color: 'text.secondary' }}>
            <Stack direction="row" spacing={0.75} alignItems="center">
              <CalendarIcon sx={{ fontSize: 16 }} />
              <Typography variant="body2">{formatDateTime(meeting.startTime).slice(0,10)} {formatTimeRange(meeting.startTime, meeting.endTime)}</Typography>
            </Stack>
            <Stack direction="row" spacing={0.75} alignItems="center">
              <GroupsIcon sx={{ fontSize: 16 }} />
              <Typography variant="body2">{attendeesCount} người tham gia</Typography>
            </Stack>
            <Stack direction="row" spacing={0.75} alignItems="center">
              <LocationIcon sx={{ fontSize: 16 }} />
              <Typography variant="body2">{locationText}</Typography>
            </Stack>
          </Stack>
        </Stack>
      </Paper>
    );
  };

  const renderInfo = () => {
    if (loading || !meeting) {
      return (
        <Paper elevation={0} sx={{ p: 3, borderRadius: 2 }}>
          <Skeleton variant="rounded" height={140} />
        </Paper>
      );
    }

    const organizer = meeting.organizer;
    const meetingTypeLabel = meeting.meetingType === 'online' ? 'Trực tuyến' : meeting.meetingType === 'hybrid' ? 'Kết hợp' : 'Trực tiếp';
    const description = meeting.description || '—';
    const organizerName = organizer?.fullName || organizer?.email || '—';

    return (
      <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Thông tin tóm tắt</Typography>
        <Stack spacing={2}>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Mô tả</Typography>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{description}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Người tổ chức</Typography>
            <Typography variant="body2" fontWeight={600}>{organizerName}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Loại cuộc họp</Typography>
            <Chip size="small" label={meetingTypeLabel} />
          </Box>

          {(meeting.meetingType === 'online' || meeting.meetingType === 'hybrid') && (
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Link họp trực tuyến</Typography>
              {meetingLinkValue ? (
                <Stack spacing={1}>
                  <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                    <a href={meetingLinkValue} target="_blank" rel="noreferrer">{meetingLinkValue}</a>
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    <Button variant="outlined" endIcon={<LaunchIcon />} onClick={() => window.open(meetingLinkValue, '_blank')}>
                      Tham gia ngay
                    </Button>
                    <Button variant="text" onClick={() => { navigator.clipboard.writeText(meetingLinkValue); }} startIcon={<ContentCopyIcon />}>Copy</Button>
                  </Stack>
                </Stack>
              ) : (
                <Typography variant="body2">—</Typography>
              )}
            </Box>
          )}
        </Stack>
      </Paper>
    );
  };

  const renderAttendees = () => {
    if (loading || !meeting) {
      return (
        <Paper elevation={0} sx={{ p: 3, borderRadius: 2 }}>
          <Skeleton variant="rounded" height={120} />
        </Paper>
      );
    }

    const attendees = Array.isArray(meeting.attendees) ? meeting.attendees : [];

    const getStatusChip = (statusRaw) => {
      const status = (statusRaw || '').toLowerCase();
      if (status === 'accepted' || status === 'confirmed' || status === 'attending' || status === 'joined') {
        return <Chip size="small" color="success" label="Tham gia" />;
      }
      if (status === 'declined' || status === 'rejected' || status === 'no') {
        return <Chip size="small" color="error" label="Từ chối" />;
      }
      return <Chip size="small" color="warning" label="Đang chờ xác nhận" />;
    };

    const getUserPosition = (user) => {
      return user?.position || user?.title || user?.jobTitle || user?.role || '—';
    };

    const getInitials = (nameOrEmail) => {
      const str = nameOrEmail || '';
      const parts = str.trim().split(' ');
      if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      return str.substring(0, 2).toUpperCase();
    };

    return (
      <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Người tham gia ({attendees.length})</Typography>
        <Stack spacing={1.25}>
          {attendees.map((a) => {
            const user = a.user || {};
            const displayName = user.fullName || user.email || '—';
            return (
              <Stack key={user._id || displayName} direction="row" spacing={1} alignItems="center" sx={{ py: 0.5 }}>
                <Avatar src={user.avatar} sx={{ width: 36, height: 36 }}>
                  {(!user.avatar && displayName) ? getInitials(displayName) : null}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={600} noWrap>{displayName}</Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>{getUserPosition(user)}</Typography>
                </Box>
                {getStatusChip(a.status)}
              </Stack>
            );
          })}
        </Stack>
      </Paper>
    );
  };

  const renderAgenda = () => {
    if (loading || !meeting) {
      return (
        <Paper elevation={0} sx={{ p: 3, borderRadius: 2 }}>
          <Skeleton variant="rounded" height={140} />
        </Paper>
      );
    }

    const agenda = Array.isArray(meeting.agenda) ? meeting.agenda : [];
    return (
      <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="subtitle1" fontWeight={700}>Chương trình họp</Typography>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={handleAddAgendaItem}
            sx={{
              backgroundColor: '#1976d2',
              color: 'white',
              borderRadius: '8px',
              textTransform: 'none',
              fontWeight: 500,
              fontSize: '0.875rem',
              padding: '6px 16px',
              boxShadow: '0 2px 4px rgba(25, 118, 210, 0.2)',
              '&:hover': {
                backgroundColor: '#1565c0',
                boxShadow: '0 4px 8px rgba(25, 118, 210, 0.3)',
                transform: 'translateY(-1px)',
              },
              transition: 'all 0.2s ease-in-out',
            }}
          >
            Thêm mục
          </Button>
        </Stack>
        
        {agendaItems.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Chưa có mục nào trong chương trình họp
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Nhấn "Thêm mục" để bắt đầu tạo chương trình họp
            </Typography>
          </Box>
        ) : (
          <Stack spacing={2}>
            {agendaItems
              .sort((a, b) => (a.order || 0) - (b.order || 0))
              .map((item, idx) => (
                <Box 
                  key={item._id || idx} 
                  sx={{ 
                    p: 2, 
                    borderRadius: 2, 
                    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                    backgroundColor: 'white',
                    position: 'relative',
                    '&:hover': {
                      borderColor: alpha(theme.palette.primary.main, 0.3),
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                    },
                    transition: 'all 0.2s ease-in-out',
                  }}
                >
                  <Stack direction="row" spacing={2} alignItems="flex-start">
                    {/* Số thứ tự trong vòng tròn xanh */}
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        backgroundColor: '#1976d2',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        fontWeight: 600,
                        fontSize: '0.875rem',
                      }}
                    >
                      {item.order || idx + 1}
                    </Box>
                    
                    {/* Nội dung mục */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body1" fontWeight={600} sx={{ mb: 0.5 }}>
                        {item.title || `Mục ${idx + 1}`}
                      </Typography>
                {item.description && (
                        <Box 
                          sx={{ 
                            mb: 1,
                            '& p': { margin: 0, marginBottom: 0.5 },
                            '& ul, & ol': { margin: 0, paddingLeft: 2 },
                            '& h1, & h2, & h3': { margin: 0, marginBottom: 0.5, fontSize: '0.875rem' },
                            '& strong': { fontWeight: 600 },
                            '& em': { fontStyle: 'italic' },
                            '& a': { color: '#1976d2', textDecoration: 'none' },
                            '& a:hover': { textDecoration: 'underline' },
                          }}
                          dangerouslySetInnerHTML={{ __html: item.description }}
                        />
                      )}
                    </Box>
                    
                    {/* Buttons thao tác */}
                    <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
                      <IconButton
                        size="small"
                        onClick={() => handleEditAgendaItem(item)}
                        sx={{
                          color: '#666',
                          '&:hover': {
                            backgroundColor: alpha('#1976d2', 0.1),
                            color: '#1976d2',
                          },
                        }}
                        title="Chỉnh sửa"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteAgendaItem(item._id)}
                        sx={{
                          color: '#666',
                          '&:hover': {
                            backgroundColor: alpha('#d32f2f', 0.1),
                            color: '#d32f2f',
                          },
                        }}
                        title="Xóa"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Stack>
              </Box>
            ))}
          </Stack>
        )}
      </Paper>
    );
  };

  const renderFiles = () => {
    if (loading || !meeting) {
      return (
        <Paper elevation={0} sx={{ p: 3, borderRadius: 2 }}>
          <Skeleton variant="rounded" height={120} />
        </Paper>
      );
    }

    // Sử dụng state tập trung để đảm bảo hiển thị
    const files = filesState;
    const API_SERVER = (process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api').replace('/api', '');
      const resolveFileUrl = (file) => {
    if (!file) return '#';
    // Hỗ trợ nhiều cấu trúc trả về: {url}, {path}, hoặc plain string
    const raw = file.url || file.path || file.filePath || file;
    if (typeof raw !== 'string') return '#';
    return raw.startsWith('http') ? raw : `${API_SERVER}${raw.startsWith('/') ? raw : `/${raw}`}`;
  };

  const resolveFileViewUrl = (file) => {
    if (!file) return '#';
    // Tạo URL cho endpoint view (inline) thay vì download
    const fileId = file._id;
    console.log('🔍 File object for view URL:', file);
    console.log('🔍 File ID:', fileId);
    if (!fileId) {
      console.log('🔍 No file ID, using fallback URL');
      return resolveFileUrl(file); // Fallback nếu không có _id
    }
    // Thêm token vào URL để iframe có thể truy cập
    const viewUrl = `${API_BASE_URL}/meetings/${id}/files/${fileId}/view?token=${encodeURIComponent(token)}`;
    console.log('🔍 Generated view URL:', viewUrl);
    return viewUrl;
  };



    const getDisplayName = (f) => {
      console.log('🔍 File object for display name:', f);
      
      // Backend đã xử lý encoding, ưu tiên trường 'name' đã được decode
      const possibleNames = [
        f.name, // Trường đã được backend decode
        f.originalName, // Backup nếu có
        f.fileName, 
        f.filename
      ].filter(Boolean);
      
      console.log('🔍 Possible names:', possibleNames);
      
      if (possibleNames.length > 0) {
        const displayName = possibleNames[0];
        console.log('🔍 Using display name:', displayName);
        return displayName;
      }
      
      console.log('🔍 No name found, using default');
      return 'Tệp không tên';
    };
    const onSelectFiles = (e) => {
      const filesArr = Array.from(e.target.files || []);
      setSelectedFiles(filesArr);
    };

    const onDropFiles = (e) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      const filesArr = Array.from(e.dataTransfer?.files || []);
      if (filesArr.length) setSelectedFiles(filesArr);
    };

    const onDragOver = (e) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(true);
    };

    const onDragLeave = (e) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
    };

    const onUploadFiles = async () => {
      if (!selectedFiles.length) return;
      try {
        setUploading(true);
        console.log('🔍 Starting upload for files:', selectedFiles.map(f => f.name));
        const uploaded = [];
        for (const file of selectedFiles) {
          const formData = new FormData();
          formData.append('file', file);
          console.log('🔍 Uploading file:', file.name, 'to endpoint:', `${API_BASE_URL}/meetings/${id}/files`);
          const response = await axios.post(`${API_BASE_URL}/meetings/${id}/files`, formData, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data'
            },
            onUploadProgress: (evt) => {
              if (!evt.total) return;
              const percent = Math.round((evt.loaded * 100) / evt.total);
              setUploadProgress(prev => ({ ...prev, [file.name]: percent }));
            }
          });
          console.log('🔍 Upload response:', response.data);
          console.log('🔍 Attachment data:', response.data.attachment);
          if (response.data?.attachment) {
            uploaded.push(response.data.attachment);
          }
        }
        setSelectedFiles([]);
        setUploadProgress({});
        console.log('🔍 Refreshing meeting data...');
        // Một số API GET không trả attachments ngay; cập nhật state cục bộ để hiển thị ngay
        if (uploaded.length > 0) {
          setFilesState(prev => ([...prev, ...uploaded]));
        } else {
          await fetchMeeting();
        }
        console.log('🔍 Meeting data refreshed');
        console.log('🔍 Updated meeting files:', (uploaded.length ? uploaded : (meeting?.summaryFiles || meeting?.attachments || meeting?.files)));
      } catch (err) {
        console.error('❌ Upload files error:', err);
        console.error('❌ Error details:', err.response?.data || err.message);
        
        // Hiển thị thông báo lỗi cho user
        const errorMessage = err.response?.data?.message || err.message || 'Lỗi không xác định khi upload file';
        alert(`Lỗi upload file: ${errorMessage}`);
      } finally {
        setUploading(false);
      }
    };

    const handleDeleteFile = async (f) => {
      try {
        const idOrPath = f._id || encodeURIComponent(f.path || f.url || f.name || '');
        await axios.delete(`${API_BASE_URL}/meetings/${id}/files/${idOrPath}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (err) {
        console.error('Delete file error (optimistic remove anyway):', err?.response?.data || err.message);
      } finally {
        setFilesState(prev => prev.filter(x => (x._id || x.path || x.url || x.name) !== (f._id || f.path || f.url || f.name)));
      }
    };

    return (
      <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Tài liệu đính kèm</Typography>

        {/* Upload area */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }} sx={{ mb: 2 }}>
          <Button component="label" variant="outlined" disabled={uploading} sx={{ borderRadius: 2 }}>
            Chọn tệp
            <input type="file" hidden multiple onChange={onSelectFiles} />
          </Button>
          <Button variant="contained" onClick={onUploadFiles} disabled={uploading || selectedFiles.length === 0} sx={{ borderRadius: 2 }}>
            {uploading ? 'Đang tải lên...' : 'Tải lên'}
          </Button>
          {selectedFiles.length > 0 && (
            <Typography variant="body2" color="text.secondary">{selectedFiles.length} tệp đã chọn</Typography>
          )}
        </Stack>

        {/* Drag & drop area */}
        <Box
          onDrop={onDropFiles}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          sx={{
            border: `1px dashed ${alpha(theme.palette.primary.main, 0.4)}`,
            borderRadius: 2,
            p: 2,
            mb: 2,
            bgcolor: dragActive ? alpha(theme.palette.primary.main, 0.04) : 'transparent',
            color: 'text.secondary',
            textAlign: 'center'
          }}
        >
          Kéo và thả tệp vào đây để tải lên
        </Box>

        {files.length === 0 ? (
          <Typography variant="body2" color="text.secondary">Chưa có tài liệu.</Typography>
        ) : (
          <Stack spacing={1}>
            {files.map((f) => {
              const displayName = getDisplayName(f);
              const fileExtension = displayName.split('.').pop()?.toLowerCase() || '';
              
              // Tạo thumbnail/icon dựa trên loại file
              const getFileIcon = () => {
                if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(fileExtension)) {
                  // Hiển thị thumbnail cho ảnh
                  return (
                    <Box sx={{ 
                      width: 32, 
                      height: 32, 
                      borderRadius: 1, 
                      overflow: 'hidden',
                      border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: alpha(theme.palette.primary.main, 0.1)
                    }}>
                      <img 
                        src={resolveFileViewUrl(f)}
                        alt={displayName}
                        style={{ 
                          width: '100%', 
                          height: '100%', 
                          objectFit: 'cover' 
                        }}
                        onError={(e) => {
                          // Fallback to icon if image fails to load
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'block';
                        }}
                      />
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          display: 'none',
                          fontSize: '10px',
                          fontWeight: 'bold',
                          color: theme.palette.primary.main
                        }}
                      >
                        IMG
                      </Typography>
                    </Box>
                  );
                } else {
                  // Icon cho các loại file khác
                  const getFileTypeColor = () => {
                    if (fileExtension === 'pdf') return '#d32f2f';
                    if (['doc', 'docx'].includes(fileExtension)) return '#1976d2';
                    if (['xls', 'xlsx'].includes(fileExtension)) return '#388e3c';
                    if (['ppt', 'pptx'].includes(fileExtension)) return '#f57c00';
                    if (['txt', 'md'].includes(fileExtension)) return '#616161';
                    return theme.palette.primary.main;
                  };
                  
                  return (
                    <Box sx={{ 
                      width: 32, 
                      height: 32, 
                      borderRadius: 1,
                      bgcolor: alpha(getFileTypeColor(), 0.1),
                      border: `1px solid ${alpha(getFileTypeColor(), 0.3)}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          fontSize: '9px',
                          fontWeight: 'bold',
                          color: getFileTypeColor(),
                          textTransform: 'uppercase'
                        }}
                      >
                        {fileExtension || 'FILE'}
                      </Typography>
                    </Box>
                  );
                }
              };
              
              return (
                <Stack key={f._id || f.path || f.url || f.name} direction="row" spacing={1} alignItems="center" sx={{ p: 1.5, borderRadius: 1, border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
                  {getFileIcon()}
                  <Typography variant="body2" sx={{ flex: 1 }} noWrap title={displayName}>{displayName}</Typography>
                  {uploadProgress[displayName] ? (
                    <Typography variant="caption" color="text.secondary">
                      {uploadProgress[displayName]}%
                    </Typography>
                  ) : (
                    <Stack direction="row" spacing={1}>
                      <IconButton 
                        size="small" 
                        sx={{
                          backgroundColor: '#1976d2',
                          color: 'white',
                          borderRadius: '8px',
                          padding: '8px',
                          boxShadow: '0 2px 4px rgba(25, 118, 210, 0.2)',
                          '&:hover': {
                            backgroundColor: '#1565c0',
                            boxShadow: '0 4px 8px rgba(25, 118, 210, 0.3)',
                            transform: 'translateY(-1px)',
                          },
                          transition: 'all 0.2s ease-in-out',
                        }}
                        onClick={() => {
                          const fileId = f._id;
                          console.log('🔍 [FRONTEND] Click Tải - File ID:', fileId);
                          console.log('🔍 [FRONTEND] Meeting ID:', id);
                          
                          if (fileId) {
                            // Tải file - dùng endpoint /open để force download
                            const downloadUrl = `${API_BASE_URL}/meetings/${id}/files/${fileId}/open`;
                            console.log('🔍 [FRONTEND] Generated download URL:', downloadUrl);
                            window.open(downloadUrl, '_blank');
                          } else {
                            alert('Không thể tải file này');
                          }
                        }}
                        title="Tải xuống"
                      >
                        <DownloadIcon fontSize="small" />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        sx={{
                          borderColor: '#d32f2f',
                          color: '#d32f2f',
                          borderRadius: '8px',
                          padding: '8px',
                          border: '1px solid #d32f2f',
                          '&:hover': {
                            borderColor: '#b71c1c',
                            backgroundColor: '#ffebee',
                            color: '#b71c1c',
                            transform: 'translateY(-1px)',
                          },
                          transition: 'all 0.2s ease-in-out',
                        }}
                        onClick={() => handleDeleteFile(f)}
                        title="Xóa"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  )}
                </Stack>
              );
            })}
          </Stack>
        )}
      </Paper>
    );
  };


  const renderMessages = () => {
    if (loading || !meeting) {
      return (
        <Paper elevation={0} sx={{ p: 3, borderRadius: 2 }}>
          <Skeleton variant="rounded" height={150} />
        </Paper>
      );
    }

    const messages = Array.isArray(meeting.summaryMessages) && meeting.summaryMessages.length > 0
      ? meeting.summaryMessages
      : (Array.isArray(meeting.messages) ? meeting.messages : []);

    return (
      <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Thảo luận</Typography>
        {messages.length === 0 ? (
          <Typography variant="body2" color="text.secondary">Chưa có thảo luận.</Typography>
        ) : (
          <Stack spacing={1.25}>
            {messages.map((m, idx) => (
              <Stack key={m._id || idx} direction="row" spacing={1} alignItems="flex-start">
                <Avatar src={m.sender?.avatar || m.author?.avatar} sx={{ width: 28, height: 28 }} />
                <Box sx={{ p: 1.25, borderRadius: 1, bgcolor: alpha(theme.palette.primary.main, 0.04), border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
                  <Typography variant="body2" fontWeight={600}>{m.sender?.fullName || m.author?.fullName || 'Người dùng'}</Typography>
                  <Typography variant="body2" color="text.secondary">{m.content || m.text}</Typography>
                </Box>
              </Stack>
            ))}
          </Stack>
        )}
      </Paper>
    );
  };

  const renderDecisions = () => {
    if (loading || !meeting) {
      return (
        <Paper elevation={0} sx={{ p: 3, borderRadius: 2 }}>
          <Skeleton variant="rounded" height={150} />
        </Paper>
      );
    }

    const decisions = Array.isArray(meeting.decisions) ? meeting.decisions : [];

    const canCreateDecision = () => {
      if (!user || !meeting) return false;
      const isOrganizer = meeting.organizer?._id === user._id;
      const isSecretary = meeting.secretary?._id === user._id;
      const privileged = ['admin','assistant'].includes(user.role);
      return isOrganizer || isSecretary || privileged;
    };

    const submitDecision = async () => {
      const title = (newDecision || '').trim();
      if (!title) return;
      try {
        await axios.post(`${API_BASE_URL}/meetings/${id}/decisions`, { title }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setNewDecision('');
        await fetchMeeting();
      } catch (error) {
        console.error('Create decision error:', error);
        alert(error.response?.data?.message || 'Không thể tạo quyết định');
      }
    };

    const vote = async (decisionId, choice) => {
      try {
        await axios.post(`${API_BASE_URL}/meetings/${id}/decisions/${decisionId}/vote`, { choice }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        await fetchMeeting();
      } catch (error) {
        console.error('Vote error:', error);
        alert(error.response?.data?.message || 'Không thể bỏ phiếu');
      }
    };
    return (
      <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Thống nhất & Quyết định</Typography>
        <Stack spacing={1} sx={{ mb: 1.5 }}>
          {decisions.length === 0 && (
            <Typography variant="body2" color="text.secondary">Chưa có quyết định.</Typography>
          )}
          {decisions.map((d, idx) => {
            const counts = (d.votes || []).reduce((acc, v) => {
              acc[v.choice] = (acc[v.choice] || 0) + 1;
              return acc;
            }, { yes: 0, no: 0, abstain: 0 });
            const myVote = (d.votes || []).find(v => v.user?._id === user._id || v.user === user._id)?.choice;
            const isOrganizer = meeting.organizer?._id === user._id;
            const isSecretary = meeting.secretary?._id === user._id;
            const canModerate = isOrganizer || isSecretary || ['admin','assistant'].includes(user.role);
            return (
              <Box key={d._id || idx} sx={{ p: 1.25, borderRadius: 1, border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
                <Typography variant="body2" fontWeight={600}>{d.title || `Quyết định ${idx + 1}`}</Typography>
                {d.description && (
                  <Typography variant="caption" color="text.secondary">{d.description}</Typography>
                )}
                <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 1 }}>
                  <Tooltip title={d.finalized ? 'Đã chốt (không thể bỏ phiếu)' : `Tán thành (${counts.yes})`}>
                    <IconButton
                      size="small"
                      onClick={() => !d.finalized && vote(d._id,'yes')}
                      disabled={d.finalized}
                      sx={{
                        border: `1px solid ${alpha(theme.palette.success.main, 0.35)}`,
                        bgcolor: myVote==='yes' ? alpha(theme.palette.success.main, 0.15) : 'transparent',
                        color: theme.palette.success.main,
                        '&:hover': { bgcolor: alpha(theme.palette.success.main, 0.1) }
                      }}
                    >
                      <Badge 
                        color="success"
                        badgeContent={counts.yes}
                        invisible={counts.yes === 0}
                        overlap="circular"
                        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                        sx={{ '& .MuiBadge-badge': { fontSize: '0.65rem', height: 16, minWidth: 16, border: '2px solid white' } }}
                      >
                        <ThumbUpIcon fontSize="small" />
                      </Badge>
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={d.finalized ? 'Đã chốt (không thể bỏ phiếu)' : `Không tán thành (${counts.no})`}>
                    <IconButton
                      size="small"
                      onClick={() => !d.finalized && vote(d._id,'no')}
                      disabled={d.finalized}
                      sx={{
                        border: `1px solid ${alpha(theme.palette.error.main, 0.35)}`,
                        bgcolor: myVote==='no' ? alpha(theme.palette.error.main, 0.15) : 'transparent',
                        color: theme.palette.error.main,
                        '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.1) }
                      }}
                    >
                      <Badge 
                        color="error" 
                        badgeContent={counts.no}
                        invisible={counts.no === 0}
                        overlap="circular"
                        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                        sx={{ '& .MuiBadge-badge': { fontSize: '0.65rem', height: 16, minWidth: 16, border: '2px solid white' } }}
                      >
                        <ThumbDownIcon fontSize="small" />
                      </Badge>
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={d.finalized ? 'Đã chốt (không thể bỏ phiếu)' : `Không ý kiến (${counts.abstain})`}>
                    <IconButton
                      size="small"
                      onClick={() => !d.finalized && vote(d._id,'abstain')}
                      disabled={d.finalized}
                      sx={{
                        border: `1px solid ${alpha(theme.palette.info.main, 0.35)}`,
                        bgcolor: myVote==='abstain' ? alpha(theme.palette.info.main, 0.15) : 'transparent',
                        color: theme.palette.info.main,
                        '&:hover': { bgcolor: alpha(theme.palette.info.main, 0.1) }
                      }}
                    >
                      <Badge 
                        color="info" 
                        badgeContent={counts.abstain}
                        invisible={counts.abstain === 0}
                        overlap="circular"
                        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                        sx={{ '& .MuiBadge-badge': { fontSize: '0.65rem', height: 16, minWidth: 16, border: '2px solid white' } }}
                      >
                        <NeutralIcon fontSize="small" />
                      </Badge>
                    </IconButton>
                  </Tooltip>
                  {canModerate && (
                    <Stack direction="row" spacing={0.5} sx={{ ml: 1 }}>
                      <Tooltip title={d.finalized ? 'Đã chốt' : 'Chốt kết quả'}>
                        <span>
                        <IconButton size="small" color={d.finalized ? 'default' : 'primary'} disabled={d.finalized} onClick={async ()=>{ try{ await axios.post(`${API_BASE_URL}/meetings/${id}/decisions/${d._id}/finalize`, {}, { headers:{ Authorization:`Bearer ${token}` }}); await fetchMeeting(); }catch(err){ console.error(err); alert(err.response?.data?.message||'Không thể chốt'); } }}>
                          <SaveIcon fontSize="small" />
                        </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Xóa quyết định">
                        <span>
                        <IconButton size="small" disabled={d.finalized} onClick={async ()=>{ if(!window.confirm('Xóa quyết định này?')) return; try{ await axios.delete(`${API_BASE_URL}/meetings/${id}/decisions/${d._id}`, { headers:{ Authorization:`Bearer ${token}` }}); await fetchMeeting(); }catch(err){ console.error(err); alert(err.response?.data?.message||'Không thể xóa'); } }}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                        </span>
                      </Tooltip>
                    </Stack>
                  )}
                </Stack>
              </Box>
            );
          })}
        </Stack>
        {canCreateDecision() && (
          <Stack direction="row" spacing={1}>
            <TextField
              size="small"
              placeholder="Thêm quyết định mới..."
              value={newDecision}
              onChange={(e) => setNewDecision(e.target.value)}
              fullWidth
            />
            <Button variant="contained" onClick={submitDecision}>Thêm</Button>
          </Stack>
        )}
      </Paper>
    );
  };

  const renderTasks = () => {
    if (loading || !meeting) {
      return (
        <Paper elevation={0} sx={{ p: 3, borderRadius: 2 }}>
          <Skeleton variant="rounded" height={150} />
        </Paper>
      );
    }

    const tasks = Array.isArray(meeting.tasks) ? meeting.tasks : [];

    const attendees = Array.isArray(meeting.attendees) ? meeting.attendees.map(a => a.user) : [];

    const createTask = async () => {
      const title = (newTask || '').trim();
      if (!title) return;
      try {
        await axios.post(`${API_BASE_URL}/meetings/${id}/tasks`, {
          title,
          assignee: taskAssignee || undefined
        }, { headers: { Authorization: `Bearer ${token}` } });
        setNewTask('');
        setTaskAssignee('');
        await fetchMeeting();
      } catch (error) {
        console.error('Create task error:', error);
        alert(error.response?.data?.message || 'Không thể tạo nhiệm vụ');
      }
    };

    const toggleTask = async (taskId) => {
      try {
        await axios.put(`${API_BASE_URL}/meetings/${id}/tasks/${taskId}/toggle`, {}, { headers: { Authorization: `Bearer ${token}` } });
        await fetchMeeting();
      } catch (error) {
        console.error('Toggle task error:', error);
        alert(error.response?.data?.message || 'Không thể cập nhật nhiệm vụ');
      }
    };
    return (
      <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Nhiệm vụ cần làm</Typography>
        <Stack spacing={1} sx={{ mb: 1.5 }}>
          {tasks.length === 0 && (
            <Typography variant="body2" color="text.secondary">Chưa có nhiệm vụ.</Typography>
          )}
          {tasks.map((t, idx) => (
            <Box
              key={t._id || idx}
              onClick={() => toggleTask(t._id)}
              sx={{
                p: 1.25,
                borderRadius: 2,
                border: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
                bgcolor: t.completed ? alpha(theme.palette.success.main, 0.06) : 'background.paper',
                boxShadow: 0.5,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                transition: 'all .15s ease',
                '&:hover': { boxShadow: 1, borderColor: alpha(theme.palette.primary.main, 0.2) },
                position: 'relative'
              }}
            >
              <Box sx={{ width: 6, height: '100%', borderRadius: 2, bgcolor: t.completed ? 'success.main' : 'primary.main', mr: 1 }} />
              <Box sx={{ flex: 1 }}>
                <Typography
                  variant="body2"
                  sx={{ color: t.completed ? 'text.secondary' : 'text.primary', textDecoration: t.completed ? 'line-through' : 'none' }}
                >
                  {t.title || `Nhiệm vụ ${idx + 1}`}
                </Typography>
                {t.assignee && (
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                    <Avatar src={t.assignee?.avatar} sx={{ width: 22, height: 22 }} />
                    <Typography variant="caption" color="text.secondary">{t.assignee?.fullName || t.assignee?.email}</Typography>
                  </Stack>
                )}
              </Box>
              <Chip size="small" color={t.completed ? 'success' : 'primary'} variant={t.completed ? 'filled' : 'outlined'} label={t.completed ? 'Đã xong' : 'Đang làm'} sx={{ borderRadius: 1.5 }} />
            </Box>
          ))}
        </Stack>
        <Stack spacing={1}>
          <TextField
            size="medium"
            multiline
            minRows={2}
            maxRows={5}
            placeholder="Mô tả nhiệm vụ chi tiết..."
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <TaskIcon sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              )
            }}
            sx={{ '& .MuiInputBase-root': { p: 1.25, borderRadius: 2, bgcolor: alpha(theme.palette.primary.main, 0.03) } }}
          />
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
            <FormControl size="small" sx={{ minWidth: 240 }}>
              <InputLabel><PersonAddIcon sx={{ mr: 1, verticalAlign: 'middle' }} />Giao cho</InputLabel>
              <Select
                label="Giao cho"
                value={taskAssignee}
                onChange={(e) => setTaskAssignee(e.target.value)}
                renderValue={(value) => {
                  if (!value) return 'Giao cho';
                  const u = attendees.find(x => x._id === value);
                  return u?.fullName || u?.email || 'Giao cho';
                }}
              >
                <MenuItem value=""><em>Không chọn</em></MenuItem>
                {attendees.map(u => (
                  <MenuItem key={u._id} value={u._id}>{u.fullName || u.email}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Box sx={{ flex: 1 }} />
            <Button variant="contained" size="medium" disabled={!newTask.trim()} onClick={createTask} sx={{ px: 3, borderRadius: 2 }}>Thêm</Button>
          </Stack>
        </Stack>
      </Paper>
    );
  };

  const renderMinutes = () => {
    if (loading || !meeting) {
      return (
        <Paper elevation={0} sx={{ p: 3, borderRadius: 2 }}>
          <Skeleton variant="rounded" height={200} />
        </Paper>
      );
    }

    const getStatusColor = (status) => {
      switch (status) {
        case 'draft': return 'default';
        case 'pending': return 'warning';
        case 'approved': return 'success';
        case 'rejected': return 'error';
        default: return 'default';
      }
    };

    const getStatusText = (status) => {
      switch (status) {
        case 'draft': return 'Bản nháp';
        case 'pending': return 'Chờ duyệt';
        case 'approved': return 'Đã duyệt';
        case 'rejected': return 'Bị từ chối';
        default: return 'Chưa có';
      }
    };

    const canEdit = user?.role === 'secretary' || user?.role === 'admin' || user?.role === 'manager';

    return (
      <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="subtitle1" fontWeight={700}>Lịch sử biên bản</Typography>
          {canEdit && (
            <Button
              variant="outlined"
              size="small"
              onClick={() => handleOpenMinutesDialog(null)}
              sx={{
                borderRadius: '8px',
                textTransform: 'none',
                fontWeight: 500,
                fontSize: '0.875rem',
                padding: '4px 12px',
              }}
            >
              Tạo biên bản mới
            </Button>
          )}
        </Stack>

        <Stack spacing={2}>
          {minutesHistory && minutesHistory.length > 0 ? (
            minutesHistory.map((minutes, index) => (
              <Box 
                key={minutes._id}
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
                  backgroundColor: 'background.paper',
                  mb: 1.5,
                  cursor: 'pointer',
                  '&:hover': {
                    borderColor: alpha(theme.palette.primary.main, 0.25),
                    boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
                  },
                  transition: 'all 0.2s ease-in-out',
                }}
                onClick={() => handleViewMinutes(minutes)}
              >
                <Stack spacing={1}>
                  {/* Header với status */}
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography 
                        variant="body2" 
                        fontWeight={700}
                        sx={{
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: '60vw'
                        }}
                      >
                        Biên bản #{minutesHistory.length - index}
                      </Typography>
                      <Chip 
                        size="small" 
                        label={getStatusText(minutes.status)} 
                        color={getStatusColor(minutes.status)}
                        variant="outlined"
                      />
                    </Stack>
                    {canEdit && minutes.status === 'draft' && (
                      <Button
                        variant="text"
                        size="small"
                        onClick={() => handleOpenMinutesDialog(minutes)}
                        sx={{
                          textTransform: 'none',
                          fontWeight: 500,
                          fontSize: '0.75rem',
                          padding: '2px 8px',
                          minWidth: 'auto',
                        }}
                      >
                        Chỉnh sửa
                      </Button>
                    )}
                  </Stack>

                  {/* Content preview */}
                  <Box sx={{ p: 1, borderRadius: 1, bgcolor: 'grey.50', border: `1px solid ${alpha(theme.palette.divider, 0.08)}` }}>
                    <Typography
                      variant="body2"
                      sx={{
                        color: 'text.secondary',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {minutes.content}
                    </Typography>
                  </Box>

                  {/* Footer info */}
                  <Stack spacing={0.5}>
                    {/* Dòng 1: file đính kèm nếu có */}
                    {minutes.attachment && minutes.attachment.name && (
                      <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
                        <AttachmentIcon fontSize="inherit" sx={{ fontSize: 14, color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary" sx={{ minWidth: 0, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {minutes.attachment.name}
                        </Typography>
                      </Stack>
                    )}

                    {/* Dòng 2: thông tin người và thời gian ngắn gọn */}
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap' }}>
                      {minutes.reviewer && minutes.submittedAt && (
                        <Typography variant="caption" color="text.secondary">
                          Gửi: {minutes.reviewer.fullName} ({formatDateTime(minutes.submittedAt)})
                        </Typography>
                      )}
                      {minutes.approvedBy && minutes.approvedAt && (
                        <Typography variant="caption" color="text.secondary">
                          • Duyệt: {minutes.approvedBy.fullName} ({formatDateTime(minutes.approvedAt)})
                        </Typography>
                      )}
                      {minutes.createdBy && (
                        <Typography variant="caption" color="text.secondary">
                          • Tạo: {minutes.createdBy.fullName}
                        </Typography>
                      )}
                      <Typography variant="caption" color="text.secondary">
                        • {formatOnlyDate(minutes.createdAt)}
                      </Typography>
                    </Stack>
                  </Stack>
                </Stack>
              </Box>
            ))
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Chưa có biên bản nào
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {canEdit ? 'Nhấn "Tạo biên bản mới" để bắt đầu' : 'Liên hệ thư ký để tạo biên bản'}
              </Typography>
            </Box>
          )}
        </Stack>
      </Paper>
    );
  };

  const renderNotes = () => {
    if (loading || !meeting) {
      return (
        <Paper elevation={0} sx={{ p: 3, borderRadius: 2 }}>
          <Skeleton variant="rounded" height={150} />
        </Paper>
      );
    }

    const notes = Array.isArray(meeting.notes) ? meeting.notes : [];
    return (
      <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Ghi chú ({notes.length})</Typography>
        
        {/* Ô soạn thảo trực tiếp */}
        <Box sx={{ mb: 3 }}>
          <Stack direction="row" spacing={2} alignItems="flex-start">
            <Avatar 
              src={user?.avatar} 
              sx={{ width: 40, height: 40, flexShrink: 0, mt: 0.5 }}
            >
              {user?.fullName?.charAt(0)?.toUpperCase()}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <TextField
                multiline
                rows={3}
                fullWidth
                placeholder="Viết ghi chú..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                onKeyPress={handleKeyPress}
                variant="outlined"
                disabled={savingNote}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    backgroundColor: 'white',
                    '&:hover': {
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: alpha(theme.palette.primary.main, 0.5),
                      },
                    },
                    '&.Mui-focused': {
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: theme.palette.primary.main,
                        borderWidth: 2,
                      },
                    },
                  },
                }}
              />
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Nhấn Ctrl + Enter để gửi
                </Typography>
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleSaveNote}
                  disabled={!newNote.trim() || savingNote}
                  sx={{
                    backgroundColor: '#1976d2',
                    color: 'white',
                    borderRadius: '8px',
                    textTransform: 'none',
                    fontWeight: 500,
                    fontSize: '0.875rem',
                    padding: '6px 16px',
                    boxShadow: '0 2px 4px rgba(25, 118, 210, 0.2)',
                    '&:hover': {
                      backgroundColor: '#1565c0',
                      boxShadow: '0 4px 8px rgba(25, 118, 210, 0.3)',
                    },
                    '&:disabled': {
                      backgroundColor: '#e0e0e0',
                      color: '#9e9e9e',
                    }
                  }}
                >
                  {savingNote ? 'Đang gửi...' : 'Gửi'}
                </Button>
              </Stack>
            </Box>
          </Stack>
        </Box>
        
        {notes.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Chưa có ghi chú nào
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Viết ghi chú ở trên để bắt đầu
            </Typography>
          </Box>
        ) : (
          <Stack spacing={2}>
            {notes
              .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
              .map((note, idx) => (
                <Box 
                  key={note._id || idx} 
                  sx={{ 
                    p: 2, 
                    borderRadius: 2, 
                    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                    backgroundColor: 'white',
                    '&:hover': {
                      borderColor: alpha(theme.palette.primary.main, 0.3),
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                    },
                    transition: 'all 0.2s ease-in-out',
                  }}
                >
                  <Stack direction="row" spacing={2} alignItems="flex-start">
                    <Avatar 
                      src={note.author?.avatar} 
                      sx={{ width: 40, height: 40, flexShrink: 0 }}
                    >
                      {note.author?.fullName?.charAt(0)?.toUpperCase()}
                    </Avatar>
                    
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                        <Typography variant="body2" fontWeight={600}>
                          {note.author?.fullName || '—'}
                        </Typography>
                        <Stack direction="row" spacing={0.5}>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteNote(note._id)}
                            sx={{
                              color: '#666',
                              '&:hover': {
                                backgroundColor: alpha('#d32f2f', 0.1),
                                color: '#d32f2f',
                              },
                            }}
                            title="Xóa"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      </Stack>
                      
                      <Typography variant="body2" sx={{ mb: 1, whiteSpace: 'pre-wrap' }}>
                        {note.text}
                      </Typography>
                      
                      <Typography variant="caption" color="text.secondary">
                        {formatDateTime(note.createdAt)}
                      </Typography>
                </Box>
              </Stack>
                </Box>
            ))}
          </Stack>
        )}
      </Paper>
    );
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 3 }}>
        {/* Header + quick actions */}
        <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 3, border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between">
            <Box>
              <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5 }}>Chi tiết cuộc họp</Typography>
              <Typography variant="body2" color="text.secondary">Xem và quản lý thông tin chi tiết cuộc họp</Typography>
            </Box>
            <Stack direction="row" spacing={1.5}>
              <Button variant="outlined" onClick={() => navigate(-1)}>Quay lại</Button>
              <Button variant="outlined">Chỉnh sửa</Button>
              <Button variant="outlined">In biên bản</Button>
            </Stack>
          </Stack>
        </Paper>



        {renderHeader()}
        <Grid container spacing={3}>
          {/* Left column */}
          <Grid item xs={12} md={4} lg={3}>
            {renderInfo()}
            <Box sx={{ height: 16 }} />
            {renderAttendees()}
            <Box sx={{ height: 16 }} />
            {renderFiles()}
          </Grid>

          {/* Middle column */}
          <Grid item xs={12} md={8} lg={6}>
            {renderAgenda()}
            <Box sx={{ height: 16 }} />
            {renderNotes()}
          </Grid>

          {/* Right column */}
          <Grid item xs={12} md={12} lg={3}>
            {renderMinutes()}
            <Box sx={{ height: 16 }} />
            {renderDecisions()}
            <Box sx={{ height: 16 }} />
            {renderTasks()}
            <Box sx={{ height: 16 }} />
            {renderMessages()}
          </Grid>
        </Grid>
        
        {/* Đã xóa toàn bộ modal và functions cũ */}
        {false && (
          <Box
            sx={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              bgcolor: 'rgba(0,0,0,0.8)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              p: 2
            }}
                         onClick={() => setViewFileModal({ open: false, url: '', fileName: '', fileType: '' })}
          >
            <Box
              sx={{
                bgcolor: 'white',
                borderRadius: 2,
                width: '90%',
                height: '90%',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">{viewFileModal.fileName}</Typography>
                <IconButton onClick={() => setViewFileModal({ open: false, url: '', fileName: '', fileType: '', fileId: '' })}>
                   <CloseIcon />
                 </IconButton>
              </Box>
                             <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                 {(() => {
                   const fileType = viewFileModal.fileType;
                   
                  // PDF files - sử dụng iframe với fallback
                   if (fileType === 'pdf') {
                     return (
                      <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
                       <iframe
                          src={`${viewFileModal.url}#view=FitH&toolbar=1&navpanes=1&scrollbar=1&page=1&zoom=page-fit`}
                         style={{ width: '100%', height: '100%', border: 'none' }}
                         title={viewFileModal.fileName}
                          onLoad={(e) => {
                            // Ẩn loading indicator khi PDF load xong
                            setTimeout(() => {
                              const loadingEl = document.getElementById('pdf-loading');
                              if (loadingEl) loadingEl.style.display = 'none';
                            }, 1000);
                          }}
                          onError={(e) => {
                            // Nếu PDF không load được, hiển thị fallback
                            const loadingEl = document.getElementById('pdf-loading');
                            if (loadingEl) {
                              loadingEl.innerHTML = `
                                <div style="text-align: center; padding: 20px;">
                                  <h3>Không thể hiển thị PDF</h3>
                                  <p>Trình duyệt không hỗ trợ xem PDF inline.</p>
                                  <div style="margin-top: 20px;">
                                    <button onclick="window.open('/pdfjs-viewer.html?file=${encodeURIComponent(viewFileModal.url)}&name=${encodeURIComponent(viewFileModal.fileName)}', '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes')" 
                                            style="padding: 10px 20px; margin: 5px; background: #1976d2; color: white; border: none; border-radius: 4px; cursor: pointer;">
                                      Mở với Viewer
                                    </button>
                                    <a href="${viewFileModal.url}" download 
                                       style="padding: 10px 20px; margin: 5px; background: #388e3c; color: white; text-decoration: none; border-radius: 4px; display: inline-block;">
                                      Tải xuống
                                    </a>
                                  </div>
                                </div>
                              `;
                            }
                          }}
                        />
                        <Box 
                          id="pdf-loading"
                          sx={{ 
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: 'rgba(255,255,255,0.95)',
                            zIndex: 1
                          }}
                        >
                          <Box sx={{ 
                            width: 80, 
                            height: 80, 
                            borderRadius: 2,
                            bgcolor: alpha('#d32f2f', 0.1),
                            border: `2px solid ${alpha('#d32f2f', 0.3)}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mb: 2
                          }}>
                            <Typography variant="h5" sx={{ color: '#d32f2f', fontWeight: 'bold' }}>
                              PDF
                            </Typography>
                          </Box>
                          <Typography variant="h6" sx={{ mb: 1 }}>Đang tải PDF...</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {viewFileModal.fileName}
                          </Typography>
                        </Box>
                        
                        {/* Toolbar với các tùy chọn */}
                        <Box sx={{ 
                          position: 'absolute', 
                          top: 10, 
                          right: 10, 
                          display: 'flex', 
                          gap: 1,
                          zIndex: 10
                        }}>
                          <Button 
                            size="small"
                            variant="contained"
                            onClick={() => {
                              const currentFile = filesState.find(f => f._id === viewFileModal.fileId);
                              if (currentFile) {
                                const publicUrl = resolveFilePublicUrl(currentFile);
                                const directViewUrl = `${publicUrl}#view=FitH&toolbar=1&navpanes=1&scrollbar=1&page=1&zoom=page-fit`;
                                window.open(directViewUrl, '_blank');
                              } else {
                                const directViewUrl = `${viewFileModal.url}#view=FitH&toolbar=1&navpanes=1&scrollbar=1&page=1&zoom=page-fit`;
                                window.open(directViewUrl, '_blank');
                              }
                            }}
                            sx={{ opacity: 0.9 }}
                          >
                            Mở tab mới
                          </Button>
                        </Box>
                      </Box>
                     );
                   }
                   
                   // Image files - sử dụng img tag
                   if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(fileType)) {
                     return (
                       <img
                         src={viewFileModal.url}
                         alt={viewFileModal.fileName}
                         style={{ 
                           maxWidth: '100%', 
                           maxHeight: '100%', 
                           objectFit: 'contain' 
                         }}
                         onError={(e) => {
                           console.log('Image load error, falling back to iframe');
                           e.target.style.display = 'none';
                           const iframe = document.createElement('iframe');
                           iframe.src = viewFileModal.url;
                           iframe.style.cssText = 'width: 100%; height: 100%; border: none;';
                           e.target.parentNode.appendChild(iframe);
                         }}
                       />
                     );
                   }
                   
                   // Text files - sử dụng fetch và hiển thị text
                   if (['txt', 'md', 'json', 'xml', 'html', 'css', 'js'].includes(fileType)) {
                     return (
                       <Box sx={{ width: '100%', height: '100%', overflow: 'auto', p: 2 }}>
                         <TextFileViewer url={viewFileModal.url} fileName={viewFileModal.fileName} />
                       </Box>
                     );
                   }
                   
                  // Office files - hiển thị options để xem
                  if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(fileType)) {
                   return (
                     <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 3 }}>
                        <Box sx={{ 
                          width: 120, 
                          height: 120, 
                          borderRadius: 2,
                          bgcolor: (() => {
                            if (['doc', 'docx'].includes(fileType)) return alpha('#1976d2', 0.1);
                            if (['xls', 'xlsx'].includes(fileType)) return alpha('#388e3c', 0.1);
                            if (['ppt', 'pptx'].includes(fileType)) return alpha('#f57c00', 0.1);
                            return alpha(theme.palette.primary.main, 0.1);
                          })(),
                          border: `2px solid ${(() => {
                            if (['doc', 'docx'].includes(fileType)) return alpha('#1976d2', 0.3);
                            if (['xls', 'xlsx'].includes(fileType)) return alpha('#388e3c', 0.3);
                            if (['ppt', 'pptx'].includes(fileType)) return alpha('#f57c00', 0.3);
                            return alpha(theme.palette.primary.main, 0.3);
                          })()}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mb: 3
                        }}>
                          <Typography 
                            variant="h4" 
                            sx={{ 
                              fontWeight: 'bold',
                              color: (() => {
                                if (['doc', 'docx'].includes(fileType)) return '#1976d2';
                                if (['xls', 'xlsx'].includes(fileType)) return '#388e3c';
                                if (['ppt', 'pptx'].includes(fileType)) return '#f57c00';
                                return theme.palette.primary.main;
                              })(),
                              textTransform: 'uppercase'
                            }}
                          >
                            {fileType}
                       </Typography>
                        </Box>
                        
                        <Typography variant="h6" color="text.primary" sx={{ mb: 1, textAlign: 'center' }}>
                          {viewFileModal.fileName}
                        </Typography>
                        
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 4, textAlign: 'center', maxWidth: '500px' }}>
                          File Microsoft Office cần được xem bằng viewer chuyên dụng hoặc tải xuống để mở bằng ứng dụng Office.
                        </Typography>
                        
                        {/* Các tùy chọn xem file */}
                        <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap">
                         <Button 
                           variant="contained" 
                            size="large"
                            startIcon={<span>📖</span>}
                            onClick={() => {
                              const currentFile = filesState.find(f => f._id === viewFileModal.fileId);
                              if (currentFile) {
                                const publicUrl = resolveFilePublicUrl(currentFile);
                                // Mở trực tiếp với browser's built-in viewer
                                const directViewUrl = `${publicUrl}#view=FitH&toolbar=1&navpanes=1&scrollbar=1&page=1&zoom=page-fit`;
                                window.open(directViewUrl, '_blank');
                              } else {
                                // Fallback: mở trực tiếp
                                const directViewUrl = `${viewFileModal.url}#view=FitH&toolbar=1&navpanes=1&scrollbar=1&page=1&zoom=page-fit`;
                                window.open(directViewUrl, '_blank');
                              }
                            }}
                            sx={{ minWidth: '160px' }}
                          >
                            Mở trực tiếp
                         </Button>
                         <Button 
                           variant="outlined" 
                           size="large"
                           startIcon={<span>🔧</span>}
                           onClick={() => {
                             const currentFile = filesState.find(f => f._id === viewFileModal.fileId);
                             if (currentFile) {
                               testViewAccess(currentFile);
                             }
                           }}
                           sx={{ minWidth: '160px' }}
                         >
                           Test API
                         </Button>
                         <Button 
                           variant="outlined" 
                            size="large"
                            startIcon={<span>💾</span>}
                           component="a" 
                           href={viewFileModal.url} 
                           download
                            sx={{ minWidth: '160px' }}
                         >
                           Tải xuống
                         </Button>
                       </Stack>
                        
                        {/* Ghi chú */}
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 3, textAlign: 'center', fontStyle: 'italic' }}>
                          💡 Để có trải nghiệm tốt nhất, hãy tải xuống file và mở bằng Microsoft Office
                        </Typography>
                      </Box>
                    );
                  }
                  
                  // Các file khác - hiển thị thông báo và tùy chọn
                  return (
                    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 3 }}>
                      <Box sx={{ 
                        width: 120, 
                        height: 120, 
                        borderRadius: 2,
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        border: `2px dashed ${alpha(theme.palette.primary.main, 0.3)}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mb: 3
                      }}>
                        <Typography 
                          variant="h4" 
                          sx={{ 
                            fontWeight: 'bold',
                            color: theme.palette.primary.main,
                            textTransform: 'uppercase'
                          }}
                        >
                          {fileType || 'FILE'}
                        </Typography>
                      </Box>
                      
                      <Typography variant="h6" color="text.primary" sx={{ mb: 1 }}>
                        {viewFileModal.fileName}
                      </Typography>
                      
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center', maxWidth: '400px' }}>
                        File {fileType?.toUpperCase()} không thể xem trước trực tiếp. Bạn có thể tải xuống hoặc mở bằng ứng dụng phù hợp.
                      </Typography>
                      
                      <Stack direction="row" spacing={2} sx={{ mb: 2 }} flexWrap="wrap">
                        <Button 
                          variant="contained" 
                          startIcon={<span>📖</span>}
                           onClick={() => {
                             const currentFile = filesState.find(f => f._id === viewFileModal.fileId);
                             if (currentFile) {
                               const publicUrl = resolveFilePublicUrl(currentFile);
                               // Mở trực tiếp với browser viewer
                               const directViewUrl = `${publicUrl}#view=FitH&toolbar=1&navpanes=1&scrollbar=1&page=1&zoom=page-fit`;
                               window.open(directViewUrl, '_blank');
                             } else {
                               // Fallback: mở trực tiếp
                               const directViewUrl = `${viewFileModal.url}#view=FitH&toolbar=1&navpanes=1&scrollbar=1&page=1&zoom=page-fit`;
                               window.open(directViewUrl, '_blank');
                             }
                           }}
                         >
                           Mở trực tiếp
                         </Button>
                         <Button 
                           variant="outlined" 
                          startIcon={<span>💾</span>}
                           component="a" 
                           href={viewFileModal.url} 
                           download
                         >
                           Tải xuống
                         </Button>
                       </Stack>
                      
                     </Box>
                   );
                 })()}
               </Box>
            </Box>
          </Box>
        )}
      </Box>

      {/* Agenda Dialog */}
      <Dialog 
        open={agendaDialogOpen} 
        onClose={handleCancelAgendaDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
          }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h6" fontWeight={600}>
            {editingAgendaItem ? 'Chỉnh sửa mục chương trình' : 'Thêm mục chương trình mới'}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={3}>
            <TextField
              label="Tiêu đề mục"
              value={newAgendaItem.title}
              onChange={(e) => setNewAgendaItem(prev => ({ ...prev, title: e.target.value }))}
              fullWidth
              required
              placeholder="Nhập tiêu đề mục chương trình..."
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                }
              }}
            />
            
            <Box>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 500, color: 'text.primary' }}>
                Mô tả chi tiết
              </Typography>
              <QuillWrapper
                value={newAgendaItem.description}
                onChange={(value) => setNewAgendaItem(prev => ({ ...prev, description: value }))}
                placeholder="Nhập mô tả chi tiết cho mục này..."
                modules={{
                  toolbar: [
                    [{ 'header': [1, 2, 3, false] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    [{ 'indent': '-1'}, { 'indent': '+1' }],
                    ['link'],
                    ['clean']
                  ],
                }}
                formats={[
                  'header', 'bold', 'italic', 'underline', 'strike',
                  'list', 'bullet', 'indent', 'link'
                ]}
                style={{
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  border: '1px solid #c4c4c4',
                }}
                theme="snow"
              />
            </Box>
            
            <TextField
              label="Thứ tự"
              type="number"
              value={newAgendaItem.order}
              onChange={(e) => setNewAgendaItem(prev => ({ ...prev, order: parseInt(e.target.value) || 1 }))}
              inputProps={{ min: 1 }}
              sx={{
                minWidth: 120,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                }
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button
            onClick={handleCancelAgendaDialog}
            startIcon={<CancelIcon />}
            sx={{
              color: '#666',
              textTransform: 'none',
              fontWeight: 500,
            }}
          >
            Hủy
          </Button>
          <Button
            onClick={handleSaveAgendaItem}
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={!newAgendaItem.title.trim()}
            sx={{
              backgroundColor: '#1976d2',
              color: 'white',
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 500,
              padding: '8px 24px',
              boxShadow: '0 2px 4px rgba(25, 118, 210, 0.2)',
              '&:hover': {
                backgroundColor: '#1565c0',
                boxShadow: '0 4px 8px rgba(25, 118, 210, 0.3)',
              },
              '&:disabled': {
                backgroundColor: '#e0e0e0',
                color: '#9e9e9e',
              }
            }}
          >
            {editingAgendaItem ? 'Cập nhật' : 'Thêm mục'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Minutes Dialog */}
      <Dialog 
        open={minutesDialogOpen} 
        onClose={handleCancelMinutesDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
          }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h6" fontWeight={600}>
            {currentMinutes ? 'Chỉnh sửa biên bản' : 'Tạo biên bản mới'}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 500, color: 'text.primary' }}>
              Nội dung biên bản
            </Typography>
            <Box sx={{
              '& .ql-container': {
                minHeight: 240,
                backgroundColor: 'white',
                borderBottomLeftRadius: 8,
                borderBottomRightRadius: 8,
              },
              '& .ql-toolbar': {
                borderTopLeftRadius: 8,
                borderTopRightRadius: 8,
              }
            }}>
              <QuillWrapper
                value={currentMinutes?.content || ''}
                onChange={(val) => setCurrentMinutes(prev => ({ ...(prev || {}), content: val }))}
                readOnly={!!savingMinutes}
                placeholder="Nhập nội dung biên bản cuộc họp..."
              />
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Tối đa 20,000 ký tự
            </Typography>
          </Box>

          {/* File attachment section */}
          <Box sx={{ mt: 3 }}>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 500, color: 'text.primary' }}>
              File đính kèm (tùy chọn)
            </Typography>
            
            {Array.isArray(currentMinutes?.attachments) && currentMinutes.attachments.length > 0 ? (
              <Box sx={{ 
                p: 1.5, 
                borderRadius: 1, 
                bgcolor: 'grey.50',
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                mb: 2
              }}>
                <Stack spacing={1}>
                  {currentMinutes.attachments.map((f, idx) => (
                    <Stack key={idx} direction="row" spacing={1} alignItems="center">
                      <Typography variant="body2" color="text.secondary">📎</Typography>
                      <Typography variant="body2" color="text.primary" sx={{ fontWeight: 500, flex: 1 }} noWrap title={f.name}>
                        {f.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        ({formatFileSize(f.size)})
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1 }}>
                  <input
                    type="file"
                    id="minutes-attachment-more"
                    multiple
                    onChange={handleUploadAttachment}
                    style={{ display: 'none' }}
                    accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                  />
                  <label htmlFor="minutes-attachment-more">
                    <Button size="small" variant="outlined" component="span">Thêm file</Button>
                  </label>
                  <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={handleDeleteAttachment}>Xóa tất cả</Button>
                </Box>
              </Box>
            ) : (
              <Box sx={{ 
                p: 2, 
                borderRadius: 1, 
                border: `2px dashed ${alpha(theme.palette.divider, 0.3)}`,
                textAlign: 'center',
                mb: 2,
                '&:hover': {
                  borderColor: alpha(theme.palette.primary.main, 0.5),
                  backgroundColor: alpha(theme.palette.primary.main, 0.02),
                },
                transition: 'all 0.2s ease-in-out',
              }}>
                <input
                  type="file"
                  id="minutes-attachment"
                  multiple
                  onChange={handleUploadAttachment}
                  style={{ display: 'none' }}
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                />
                <label htmlFor="minutes-attachment">
                  <Button
                    component="span"
                    variant="outlined"
                    disabled={uploadingAttachment}
                    sx={{
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    {uploadingAttachment ? 'Đang upload...' : '📎 Chọn file đính kèm'}
                  </Button>
                </label>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Hỗ trợ: PDF, DOC, DOCX, TXT, JPG, PNG (tối đa 50MB)
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button
            onClick={handleCancelMinutesDialog}
            startIcon={<CancelIcon />}
            disabled={savingMinutes}
            sx={{
              color: '#666',
              textTransform: 'none',
              fontWeight: 500,
            }}
          >
            Hủy
          </Button>
          <Button
            onClick={handleSaveMinutesDraft}
            variant="outlined"
            startIcon={<SaveIcon />}
            disabled={savingMinutes}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 500,
              padding: '8px 24px',
            }}
          >
            {savingMinutes ? 'Đang lưu...' : 'Lưu nháp'}
          </Button>
          <Button
            onClick={handleSubmitMinutes}
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={(()=>{ const hasContent = Boolean(currentMinutes?.content && currentMinutes.content.trim()); const hasAttachment = Boolean(currentMinutes?.attachment && (currentMinutes.attachment.path || currentMinutes.attachment.name)); return (!hasContent && !hasAttachment) || savingMinutes;})()}
            sx={{
              backgroundColor: '#1976d2',
              color: 'white',
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 500,
              padding: '8px 24px',
              boxShadow: '0 2px 4px rgba(25, 118, 210, 0.2)',
              '&:hover': {
                backgroundColor: '#1565c0',
                boxShadow: '0 4px 8px rgba(25, 118, 210, 0.3)',
              },
              '&:disabled': {
                backgroundColor: '#e0e0e0',
                color: '#9e9e9e',
              }
            }}
          >
            {savingMinutes ? 'Đang gửi...' : 'Gửi để duyệt'}
          </Button>
          {/* Xoá khỏi lịch sử */}
          {currentMinutes?._id && (
            <Button
              onClick={async ()=>{
                if (!window.confirm('Xoá biên bản này khỏi lịch sử? Thao tác không thể hoàn tác.')) return;
                try {
                  await axios.delete(`${API_BASE_URL}/meetings/${id}/minutes/${currentMinutes._id}`, { headers: { Authorization: `Bearer ${token}` } });
                  setMinutesDialogOpen(false);
                  await fetchMeeting();
                } catch (e) {
                  console.error('delete minutes error', e);
                  alert(e.response?.data?.message || 'Không thể xoá biên bản');
                }
              }}
              color="error"
              variant="outlined"
              startIcon={<DeleteIcon />}
              disabled={savingMinutes}
              sx={{ ml: { xs: 0, md: 1 } }}
            >
              Xoá khỏi lịch sử
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* View Minutes Dialog */}
      <MinutesViewDialog 
        open={viewMinutesModal.open}
        onClose={handleCloseViewMinutesModal}
        minutes={viewMinutesModal.minutes}
        meetingId={id}
        apiBaseUrl={API_BASE_URL}
        downloadFileWithToken={downloadFileWithToken}
        onEdit={handleOpenMinutesDialog}
        onDelete={handleDeleteMinutes}
        canEdit={canEdit()}
      />

    </Container>
  );
};

export const MinutesViewDialog = ({ open, onClose, minutes, meetingId, apiBaseUrl, downloadFileWithToken, onEdit, onDelete, canEdit }) => {
  const theme = useTheme();
  const formatDateTime = (iso) => (iso ? dayjs(iso).format('DD/MM/YYYY HH:mm') : '—');

  const getStatusText = (status) => {
    switch (status) {
      case 'draft': return 'Bản nháp';
      case 'pending': return 'Chờ duyệt';
      case 'approved': return 'Đã phê duyệt';
      case 'rejected': return 'Từ chối';
      default: return status;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'success';
      case 'pending': return 'warning';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
        }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6" fontWeight={600}>
            {minutes?.title || 'Chi tiết biên bản'}
          </Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent dividers sx={{ pt: 2 }}>
        {minutes ? (
          <Stack spacing={2}>
            <Box>
              <Typography variant="body2" color="text.secondary">Trạng thái:</Typography>
              <Chip 
                label={getStatusText(minutes.status)}
                color={getStatusColor(minutes.status)}
                size="small"
                sx={{ mt: 0.5 }}
              />
            </Box>
            
            <Box>
              <Typography variant="body2" color="text.secondary">Thư ký:</Typography>
              <Typography variant="body1" fontWeight={500}>{minutes.createdBy?.fullName || '—'}</Typography>
            </Box>

            <Box>
              <Typography variant="body2" color="text.secondary">Ngày tạo:</Typography>
              <Typography variant="body1" fontWeight={500}>{formatDateTime(minutes.createdAt)}</Typography>
            </Box>

            {minutes.submittedAt && minutes.reviewer && (
              <Box>
                <Typography variant="body2" color="text.secondary">Ngày gửi duyệt:</Typography>
                <Typography variant="body1" fontWeight={500}>
                  {formatDateTime(minutes.submittedAt)} bởi {minutes.reviewer?.fullName || '—'}
                </Typography>
              </Box>
            )}

            {minutes.reviewedAt && minutes.reviewer && (
              <Box>
                <Typography variant="body2" color="text.secondary">Ngày duyệt:</Typography>
                <Typography variant="body1" fontWeight={500}>
                  {formatDateTime(minutes.reviewedAt)} bởi {minutes.reviewer?.fullName || '—'}
                </Typography>
              </Box>
            )}
            
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Nội dung:</Typography>
              <Box
                sx={{
                  p: 2,
                  borderRadius: 1,
                  bgcolor: 'grey.50',
                  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                  lineHeight: 1.6,
                  fontSize: '0.9rem',
                  color: 'text.primary',
                  maxHeight: '400px',
                  overflowY: 'auto',
                  '& p': { margin: '0 0 0.5em 0' },
                  '& ul, & ol': { paddingLeft: '1.5em', margin: '0.5em 0' },
                  '& h1, & h2, & h3': { margin: '0.5em 0' },
                  '& img': { maxWidth: '100%' },
                }}
                dangerouslySetInnerHTML={{ 
                  __html: minutes.content || '<p style="color: #999;">Không có nội dung.</p>' 
                }}
              />
            </Box>

            {minutes.attachment && minutes.attachment.name && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>File đính kèm:</Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  {(() => {
                    const fileId = minutes.attachment._id || minutes.attachment.id;
                    const href = fileId ? `${apiBaseUrl}/meetings/${meetingId}/files/${fileId}/open` : `${apiBaseUrl}/meetings/${meetingId}/minutes/${minutes._id}/attachment/open`;
                    return (
                      <Link 
                        href={href}
                        target="_blank"
                        rel="noreferrer"
                        download={minutes.attachment.name || true}
                        sx={{ display: 'flex', alignItems: 'center', gap: 0.5, textDecoration: 'none' }}
                      >
                        <AttachmentIcon fontSize="small" />
                        <Typography variant="body1" fontWeight={500} color="primary">
                          {minutes.attachment.name}
                        </Typography>
                      </Link>
                    );
                  })()}
                  <Typography variant="caption" color="text.secondary">
                    ({formatFileSize(minutes.attachment.size)})
                  </Typography>

                  {/* Nút tải xuống */}
                  <Tooltip title="Tải xuống">
                    <IconButton
                      size="small"
                      onClick={() => {
                        const fileId = minutes.attachment._id || minutes.attachment.id;
                        const downloadUrl = fileId
                          ? `${apiBaseUrl}/meetings/${meetingId}/files/${fileId}/open`
                          : `${apiBaseUrl}/meetings/${meetingId}/minutes/${minutes._id}/attachment/open`;
                        downloadFileWithToken(downloadUrl, minutes.attachment.name || 'attachment');
                      }}
                      sx={{
                        ml: 0.5,
                        color: 'success.main',
                        '&:hover': { bgcolor: alpha('#2e7d32', 0.08) }
                      }}
                    >
                      <DownloadIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Box>
            )}

            {/* Multiple attachments (minutesHistory array) */}
            {Array.isArray(minutes.attachments) && minutes.attachments.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Các file đính kèm:</Typography>
                <Stack spacing={1}>
                  {minutes.attachments.map((att, idx) => (
                    <Stack key={att._id || idx} direction="row" spacing={1} alignItems="center">
                      <AttachmentIcon fontSize="small" />
                      <Link
                        href={`${apiBaseUrl}/meetings/${meetingId}/minutes/${minutes._id}/attachments/${att._id || att.id}/view`}
                        target="_blank"
                        rel="noreferrer"
                        sx={{ textDecoration: 'none' }}
                      >
                        <Typography variant="body1" fontWeight={500} color="primary" noWrap title={att.name}>
                          {att.name}
                        </Typography>
                      </Link>
                      <Typography variant="caption" color="text.secondary">
                        ({formatFileSize(att.size)})
                      </Typography>
                      <Tooltip title="Tải xuống">
                        <IconButton
                          size="small"
                          onClick={() => {
                            const downloadUrl = `${apiBaseUrl}/meetings/${meetingId}/minutes/${minutes._id}/attachments/${att._id || att.id}/download`;
                            downloadFileWithToken(downloadUrl, att.name || 'attachment');
                          }}
                          sx={{ ml: 0.5 }}
                        >
                          <DownloadIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  ))}
                </Stack>
              </Box>
            )}

          </Stack>
        ) : (
          <Typography>Không có dữ liệu biên bản để hiển thị.</Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 3, pt: 1, justifyContent: 'space-between' }}>
        <Box>
          {canEdit && minutes?.status === 'draft' && (
            <>
              <Button
                onClick={() => {
                  onClose();
                  if (onEdit) onEdit(minutes);
                }}
                variant="outlined"
                color="primary"
                startIcon={<EditIcon />}
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 500,
                  mr: 1,
                }}
              >
                Sửa
              </Button>
              <Button
                onClick={() => {
                  if (window.confirm('Bạn có chắc chắn muốn xóa biên bản này?')) {
                    onClose();
                    if (onDelete) onDelete(minutes);
                  }
                }}
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 500,
                }}
              >
                Xóa
              </Button>
            </>
          )}
        </Box>
        <Button
          onClick={onClose}
          variant="contained"
          sx={{
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 500,
            padding: '8px 24px',
          }}
        >
          Đóng
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MeetingDetail;


