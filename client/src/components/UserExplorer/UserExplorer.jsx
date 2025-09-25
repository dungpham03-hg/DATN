import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TreeView,
  TreeItem,
  Checkbox,
  Avatar,
  Chip,
  TextField,
  InputAdornment,
  IconButton,
  Collapse,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemButton,
  Paper,
  Divider,
  Button,
  Stack,
  Badge,
  Tooltip,
  useTheme,
  alpha
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ChevronRight as ChevronRightIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  Folder as FolderIcon,
  FolderOpen as FolderOpenIcon,
  Person as PersonIcon,
  Group as GroupIcon,
  CheckBox as CheckBoxIcon,
  CheckBoxOutlineBlank as CheckBoxOutlineBlankIcon,
  IndeterminateCheckBox as IndeterminateCheckBoxIcon
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';

const UserExplorer = ({ 
  selectedUsers = [], 
  onSelectionChange, 
  title = "Chọn người dùng",
  multiSelect = true,
  filterRoles = null, // ['secretary', 'assistant'] để filter roles
  maxHeight = 400
}) => {
  const theme = useTheme();
  const { token } = useAuth();
  
  const [departments, setDepartments] = useState([]);
  const [usersByDept, setUsersByDept] = useState({});
  const [expandedDepts, setExpandedDepts] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredData, setFilteredData] = useState({});

  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

  useEffect(() => {
    fetchDepartmentsAndUsers();
  }, []);

  useEffect(() => {
    filterData();
  }, [searchTerm, usersByDept]);

  const fetchDepartmentsAndUsers = async () => {
    try {
      setLoading(true);
      
      // Fetch departments
      const deptResponse = await axios.get(`${API_BASE_URL}/departments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Fetch all users
      const usersResponse = await axios.get(`${API_BASE_URL}/auth/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      let users = usersResponse.data.users || [];
      
      // Filter by roles if specified
      if (filterRoles && filterRoles.length > 0) {
        users = users.filter(user => filterRoles.includes(user.role));
      }
      
      const departments = deptResponse.data || [];
      
      // Group users by department
      const grouped = {};
      departments.forEach(dept => {
        grouped[dept] = users.filter(user => user.department === dept);
      });
      
      // Add users without department
      const usersWithoutDept = users.filter(user => !user.department || user.department === '');
      if (usersWithoutDept.length > 0) {
        grouped['Không phòng ban'] = usersWithoutDept;
      }
      
      setDepartments(departments);
      setUsersByDept(grouped);
      
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterData = () => {
    if (!searchTerm.trim()) {
      setFilteredData(usersByDept);
      return;
    }

    const filtered = {};
    Object.keys(usersByDept).forEach(dept => {
      const filteredUsers = usersByDept[dept].filter(user =>
        user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.position && user.position.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      
      if (filteredUsers.length > 0) {
        filtered[dept] = filteredUsers;
      }
    });
    
    setFilteredData(filtered);
  };

  const handleDeptToggle = (dept) => {
    const newExpanded = new Set(expandedDepts);
    if (newExpanded.has(dept)) {
      newExpanded.delete(dept);
    } else {
      newExpanded.add(dept);
    }
    setExpandedDepts(newExpanded);
  };

  const handleUserSelect = (user) => {
    if (!multiSelect) {
      onSelectionChange([user]);
      return;
    }

    const isSelected = selectedUsers.some(u => u._id === user._id);
    let newSelection;
    
    if (isSelected) {
      newSelection = selectedUsers.filter(u => u._id !== user._id);
    } else {
      newSelection = [...selectedUsers, user];
    }
    
    onSelectionChange(newSelection);
  };

  const handleDeptSelect = (dept) => {
    if (!multiSelect) return;
    
    const deptUsers = filteredData[dept] || [];
    const allSelected = deptUsers.every(user => 
      selectedUsers.some(selected => selected._id === user._id)
    );
    
    let newSelection = [...selectedUsers];
    
    if (allSelected) {
      // Deselect all users in this department
      newSelection = newSelection.filter(selected => 
        !deptUsers.some(deptUser => deptUser._id === selected._id)
      );
    } else {
      // Select all users in this department
      deptUsers.forEach(user => {
        if (!newSelection.some(selected => selected._id === user._id)) {
          newSelection.push(user);
        }
      });
    }
    
    onSelectionChange(newSelection);
  };

  const getDeptSelectionState = (dept) => {
    const deptUsers = filteredData[dept] || [];
    if (deptUsers.length === 0) return 'none';
    
    const selectedCount = deptUsers.filter(user => 
      selectedUsers.some(selected => selected._id === user._id)
    ).length;
    
    if (selectedCount === 0) return 'none';
    if (selectedCount === deptUsers.length) return 'all';
    return 'partial';
  };

  const renderDeptCheckbox = (dept) => {
    const state = getDeptSelectionState(dept);
    
    if (state === 'all') {
      return <CheckBoxIcon color="primary" />;
    } else if (state === 'partial') {
      return <IndeterminateCheckBoxIcon color="primary" />;
    } else {
      return <CheckBoxOutlineBlankIcon />;
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
  };

  const clearSelection = () => {
    onSelectionChange([]);
  };

  if (loading) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography>Đang tải...</Typography>
      </Box>
    );
  }

  return (
    <Paper elevation={0} sx={{ border: `1px solid ${alpha(theme.palette.divider, 0.1)}`, borderRadius: 2 }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="h6" fontWeight={600}>
            {title}
          </Typography>
          {selectedUsers.length > 0 && (
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip 
                label={`${selectedUsers.length} đã chọn`} 
                color="primary" 
                size="small"
              />
              <Button size="small" onClick={clearSelection}>
                Xóa tất cả
              </Button>
            </Stack>
          )}
        </Stack>
        
        {/* Search */}
        <TextField
          size="small"
          placeholder="Tìm kiếm người dùng..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: searchTerm && (
              <InputAdornment position="end">
                <IconButton size="small" onClick={clearSearch}>
                  <ClearIcon />
                </IconButton>
              </InputAdornment>
            )
          }}
          sx={{ width: '100%' }}
        />
      </Box>

      {/* Tree View */}
      <Box sx={{ maxHeight, overflow: 'auto' }}>
        {Object.keys(filteredData).length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary">
              {searchTerm ? 'Không tìm thấy người dùng nào' : 'Không có dữ liệu'}
            </Typography>
          </Box>
        ) : (
          <List dense>
            {Object.keys(filteredData).map((dept) => {
              const deptUsers = filteredData[dept];
              const isExpanded = expandedDepts.has(dept);
              
              return (
                <Box key={dept}>
                  {/* Department Header */}
                  <ListItem
                    sx={{
                      bgcolor: alpha(theme.palette.primary.main, 0.05),
                      borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`
                    }}
                  >
                    <ListItemButton
                      onClick={() => handleDeptToggle(dept)}
                      sx={{ flex: 1, py: 1 }}
                    >
                      <Box sx={{ mr: 1 }}>
                        {isExpanded ? <ExpandMoreIcon /> : <ChevronRightIcon />}
                      </Box>
                      <Box sx={{ mr: 1 }}>
                        {isExpanded ? <FolderOpenIcon /> : <FolderIcon />}
                      </Box>
                      <ListItemText
                        primary={
                          <Typography variant="subtitle2" fontWeight={600}>
                            {dept}
                          </Typography>
                        }
                        secondary={`${deptUsers.length} người`}
                      />
                      <Badge badgeContent={deptUsers.filter(user => 
                        selectedUsers.some(selected => selected._id === user._id)
                      ).length} color="primary" sx={{ mr: 1 }} />
                    </ListItemButton>
                    
                    {multiSelect && (
                      <IconButton
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeptSelect(dept);
                        }}
                        size="small"
                      >
                        {renderDeptCheckbox(dept)}
                      </IconButton>
                    )}
                  </ListItem>

                  {/* Department Users */}
                  <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding>
                      {deptUsers.map((user) => {
                        const isSelected = selectedUsers.some(u => u._id === user._id);
                        
                        return (
                          <ListItem
                            key={user._id}
                            sx={{ 
                              pl: 4,
                              '&:hover': {
                                bgcolor: alpha(theme.palette.primary.main, 0.04)
                              }
                            }}
                          >
                            <ListItemButton
                              onClick={() => handleUserSelect(user)}
                              sx={{ flex: 1, py: 0.5 }}
                            >
                              <ListItemAvatar>
                                {user.avatar ? 
                                  <Avatar src={user.avatar} sx={{ width: 32, height: 32 }} /> :
                                  <Avatar sx={{ width: 32, height: 32, fontSize: 14 }}>
                                    {user.fullName?.charAt(0)?.toUpperCase()}
                                  </Avatar>
                                }
                              </ListItemAvatar>
                              <ListItemText
                                primary={
                                  <Typography variant="body2" fontWeight={isSelected ? 600 : 400}>
                                    {user.fullName}
                                  </Typography>
                                }
                                secondary={
                                  <Typography variant="caption" color="text.secondary">
                                    {user.position || user.role} • {user.email}
                                  </Typography>
                                }
                              />
                            </ListItemButton>
                            
                            <Checkbox
                              checked={isSelected}
                              onChange={() => handleUserSelect(user)}
                              size="small"
                            />
                          </ListItem>
                        );
                      })}
                    </List>
                  </Collapse>
                </Box>
              );
            })}
          </List>
        )}
      </Box>
      
      {/* Selected Users Summary */}
      {selectedUsers.length > 0 && (
        <Box sx={{ p: 2, borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`, bgcolor: alpha(theme.palette.primary.main, 0.02) }}>
          <Typography variant="caption" color="text.secondary" gutterBottom>
            Đã chọn ({selectedUsers.length}):
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
            {selectedUsers.slice(0, 5).map((user) => (
              <Chip
                key={user._id}
                label={user.fullName}
                size="small"
                variant="outlined"
                onDelete={() => handleUserSelect(user)}
                avatar={
                  user.avatar ? 
                    <Avatar src={user.avatar} /> :
                    <Avatar>{user.fullName?.charAt(0)?.toUpperCase()}</Avatar>
                }
              />
            ))}
            {selectedUsers.length > 5 && (
              <Chip 
                label={`+${selectedUsers.length - 5} khác`} 
                size="small" 
                variant="outlined" 
              />
            )}
          </Box>
        </Box>
      )}
    </Paper>
  );
};

export default UserExplorer;
