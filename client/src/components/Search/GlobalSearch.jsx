import React, { useState, useEffect } from 'react';
import {
  Box,
  Dialog,
  DialogContent,
  TextField,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Typography,
  Chip,
  InputAdornment,
  alpha,
  useTheme
} from '@mui/material';
import {
  Search as SearchIcon,
  MeetingRoom as MeetingRoomIcon,
  Person as PersonIcon,
  Archive as ArchiveIcon,
  CalendarMonth as CalendarIcon,
  Dashboard as DashboardIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';

const GlobalSearch = ({ open, onClose }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

  useEffect(() => {
    if (!open) {
      setSearchTerm('');
      setResults([]);
      return;
    }

    const searchDelay = setTimeout(() => {
      if (searchTerm.trim().length > 2) {
        performSearch();
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(searchDelay);
  }, [searchTerm, open]);

  const performSearch = async () => {
    setLoading(true);
    try {
      if (!token) {
        console.error('No token found');
        setResults([]);
        setLoading(false);
        return;
      }

      console.log('🔍 Performing global search with term:', searchTerm);
      
      const [meetingsRes, usersRes, archivesRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/meetings`, {
          params: { search: searchTerm, limit: 5 },
          headers: { Authorization: `Bearer ${token}` }
        }).catch((err) => {
          console.error('Meetings search error:', err);
          return { data: { meetings: [], docs: [] } };
        }),
        axios.get(`${API_BASE_URL}/users`, {
          params: { search: searchTerm, limit: 5 },
          headers: { Authorization: `Bearer ${token}` }
        }).catch((err) => {
          console.error('Users search error:', err);
          return { data: { users: [], docs: [] } };
        }),
        axios.get(`${API_BASE_URL}/archives`, {
          params: { search: searchTerm, limit: 5 },
          headers: { Authorization: `Bearer ${token}` }
        }).catch((err) => {
          console.error('Archives search error:', err);
          return { data: { archives: [], docs: [] } };
        })
      ]);

      console.log('🔍 Search results:', {
        meetings: meetingsRes.data.meetings || meetingsRes.data.docs || [],
        users: usersRes.data.users || usersRes.data.docs || [],
        archives: archivesRes.data.archives || archivesRes.data.docs || []
      });

      const combined = [
        ...(meetingsRes.data.meetings || meetingsRes.data.docs || []).map(item => ({
          ...item,
          type: 'meeting',
          icon: <CalendarIcon />
        })),
        ...(usersRes.data.users || usersRes.data.docs || []).map(item => ({
          ...item,
          type: 'user',
          icon: <PersonIcon />
        })),
        ...(archivesRes.data.archives || archivesRes.data.docs || []).map(item => ({
          ...item,
          type: 'archive',
          icon: <ArchiveIcon />
        }))
      ];

      console.log('🔍 Combined results:', combined);
      setResults(combined);
    } catch (error) {
      console.error('Global search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectItem = (item) => {
    let path = '';
    switch (item.type) {
      case 'meeting':
        path = `/meetings/${item._id}`;
        break;
      case 'user':
        path = `/users?search=${item.fullName}`;
        break;
      case 'archive':
        path = `/archives/${item._id}`;
        break;
      default:
        return;
    }
    
    navigate(path);
    onClose();
  };

  const getResultLabel = (item) => {
    switch (item.type) {
      case 'meeting':
        return item.title || 'Cuộc họp';
      case 'user':
        return item.fullName || item.email;
      case 'archive':
        return item.title || item.description;
      default:
        return 'Kết quả';
    }
  };

  const getResultSubtitle = (item) => {
    switch (item.type) {
      case 'meeting':
        return `${item.location} • ${new Date(item.startTime).toLocaleDateString('vi-VN')}`;
      case 'user':
        return item.email || '';
      case 'archive':
        return item.description?.substring(0, 50) + '...';
      default:
        return '';
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      PaperProps={{
        sx: {
          position: 'absolute',
          top: 80,
          maxHeight: '70vh'
        }
      }}
    >
      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ p: 2 }}>
          <TextField
            fullWidth
            autoFocus
            placeholder="Tìm kiếm cuộc họp, người dùng, lưu trữ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              )
            }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
        </Box>

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={32} />
          </Box>
        )}

        {!loading && results.length > 0 && (
          <List sx={{ py: 0, maxHeight: '50vh', overflow: 'auto' }}>
            {results.map((item) => (
              <ListItem
                key={`${item.type}-${item._id}`}
                disablePadding
              >
                <ListItemButton onClick={() => handleSelectItem(item)}>
                  <ListItemIcon>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={getResultLabel(item)}
                    secondary={getResultSubtitle(item)}
                  />
                  <Chip
                    label={item.type === 'meeting' ? 'Cuộc họp' : item.type === 'user' ? 'Người dùng' : 'Lưu trữ'}
                    size="small"
                    variant="outlined"
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}

        {!loading && searchTerm.length > 2 && results.length === 0 && (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Không tìm thấy kết quả nào
            </Typography>
          </Box>
        )}

        {searchTerm.length <= 2 && !loading && (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Nhập ít nhất 3 ký tự để tìm kiếm
            </Typography>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default GlobalSearch;

