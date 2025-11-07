import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Box,
  Typography,
  Grid,
  TextField,
  MenuItem,
  Button,
  Chip,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Menu,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  Switch,
  FormControlLabel,
  Stack,
  Tooltip,
  Alert,
  Skeleton,
  alpha,
  useTheme,
  Card,
  CardContent,
  Divider,
  Badge
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  PersonOff as PersonOffIcon,
  LockReset as LockResetIcon,
  Refresh as RefreshIcon,
  Visibility as ViewIcon,
  Groups as GroupsIcon,
  AdminPanelSettings as AdminIcon,
  SupervisorAccount as ManagerIcon,
  AssignmentInd as SecretaryIcon,
  SupportAgent as AssistantIcon,
  Badge as EmployeeIcon,
  Clear as ClearIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import UserFormModal from '../../components/Users/UserFormModal';
import { usePermissions, PERMISSIONS } from '../../utils/permissions';

const UserManagement = () => {
  const theme = useTheme();
  const { token, user: currentUser } = useAuth();
  const permissions = usePermissions(currentUser?.role);

  // State
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    current: 1,
    total: 1,
    count: 0,
    totalUsers: 0
  });
  const [filters, setFilters] = useState({
    search: '',
    role: '',
    department: '',
    isActive: '',
    approvalStatus: ''
  });
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  
  // UI State
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [openUserForm, setOpenUserForm] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Filter options
  const [filterOptions, setFilterOptions] = useState({
    roles: [],
    departments: [],
    statusOptions: []
  });
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    recent: 0,
    byRole: [],
    byDepartment: []
  });

  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

  // Role icons and colors - Enhanced for better visibility
  const getRoleConfig = (role) => {
    const configs = {
      admin: { 
        icon: <AdminIcon />, 
        color: 'error', 
        label: 'Quản trị viên',
        bgColor: alpha(theme.palette.error.main, 0.15),
        textColor: theme.palette.error.main,
        borderColor: alpha(theme.palette.error.main, 0.3)
      },
      manager: { 
        icon: <ManagerIcon />, 
        color: 'warning', 
        label: 'Quản lý',
        bgColor: alpha(theme.palette.warning.main, 0.15),
        textColor: theme.palette.warning.dark,
        borderColor: alpha(theme.palette.warning.main, 0.3)
      },
      secretary: { 
        icon: <SecretaryIcon />, 
        color: 'info', 
        label: 'Thư ký',
        bgColor: alpha(theme.palette.info.main, 0.15),
        textColor: theme.palette.info.main,
        borderColor: alpha(theme.palette.info.main, 0.3)
      },
      technician: {
        icon: <AssistantIcon />, // reuse icon
        color: 'secondary',
        label: 'Kỹ thuật',
        bgColor: alpha(theme.palette.secondary.main, 0.15),
        textColor: theme.palette.secondary.dark,
        borderColor: alpha(theme.palette.secondary.main, 0.3)
      },
      employee: { 
        icon: <EmployeeIcon />, 
        color: 'default', 
        label: 'Nhân viên',
        bgColor: alpha(theme.palette.grey[700], 0.12),
        textColor: theme.palette.grey[700],
        borderColor: alpha(theme.palette.grey[600], 0.3)
      },
      guest: { 
        icon: <PersonIcon />, 
        color: 'default', 
        label: 'Khách',
        bgColor: alpha(theme.palette.grey[400], 0.12),
        textColor: theme.palette.grey[600],
        borderColor: alpha(theme.palette.grey[500], 0.3)
      }
    };
    return configs[role] || configs.employee;
  };

  useEffect(() => {
    console.log('🔍 UserManagement useEffect - Token:', token ? 'exists' : 'missing');
    console.log('👤 Current user:', currentUser);
    
    if (token && currentUser) {
      console.log('✅ User role:', currentUser.role);
      if (permissions.hasPermission(PERMISSIONS.USER_MANAGEMENT)) {
        fetchUsers();
      } else {
        console.warn('⚠️ User does not have user management permission');
      }
    }
  }, [token, currentUser, page, rowsPerPage, filters, sortBy, sortOrder]);

  useEffect(() => {
    if (token && currentUser && permissions.hasPermission(PERMISSIONS.STATS_VIEW)) {
      fetchStats();
    }
  }, [token, currentUser]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching users...', { token: token ? 'exists' : 'missing' });
      
      const params = new URLSearchParams({
        page: (page + 1).toString(),
        limit: rowsPerPage.toString(),
        search: filters.search,
        role: filters.role,
        department: filters.department,
        isActive: filters.isActive,
        approvalStatus: filters.approvalStatus,
        sortBy,
        sortOrder
      });

      console.log('📡 API URL:', `${API_BASE_URL}/users?${params}`);
      
      const response = await axios.get(`${API_BASE_URL}/users?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('✅ API Response:', response.data);

      console.log('👥 Users data from API:', response.data.users);
      setUsers(response.data.users || []);
      setPagination(response.data.pagination || {
        current: 1,
        total: 1,
        count: 0,
        totalUsers: 0
      });
      setFilterOptions(response.data.filters || {
        roles: [],
        departments: [],
        statusOptions: []
      });

    } catch (error) {
      console.error('❌ Error fetching users:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText
      });
      
      // Set default values on error
      setUsers([]);
      setPagination({
        current: 1,
        total: 1,
        count: 0,
        totalUsers: 0
      });
      setFilterOptions({
        roles: [],
        departments: [],
        statusOptions: []
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      console.log('📊 Fetching user stats...');
      const response = await axios.get(`${API_BASE_URL}/users/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('✅ Stats Response:', response.data);
      
      setStats(response.data.stats || {
        total: 0,
        active: 0,
        inactive: 0,
        recent: 0,
        byRole: [],
        byDepartment: []
      });

    } catch (error) {
      console.error('❌ Error fetching user stats:', error);
      console.error('Stats error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      setStats({
        total: 0,
        active: 0,
        inactive: 0,
        recent: 0,
        byRole: [],
        byDepartment: []
      });
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPage(0); // Reset to first page when filtering
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      role: '',
      department: '',
      isActive: '',
      approvalStatus: ''
    });
    setPage(0);
  };

  const handleMenuOpen = (event, user) => {
    console.log('🔽 Menu opened for user:', user);
    setAnchorEl(event.currentTarget);
    setSelectedUser(user);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedUser(null);
  };

  const handleEditUser = () => {
    console.log('✏️ Edit user clicked, selectedUser:', selectedUser);
    setOpenUserForm(true);
    setAnchorEl(null); // Close menu but keep selectedUser
  };

  const handleDeleteUser = () => {
    setOpenDeleteDialog(true);
    setAnchorEl(null); // Close menu but keep selectedUser
  };

  const handleToggleUserStatus = async () => {
    if (!selectedUser) return;

    try {
      setActionLoading(true);
      const endpoint = selectedUser.isActive ? 'deactivate' : 'activate';
      
      await axios.put(`${API_BASE_URL}/users/${selectedUser._id}/${endpoint}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      await fetchUsers();
      await fetchStats();
      handleMenuClose();

    } catch (error) {
      console.error('Error toggling user status:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser) return;

    try {
      setActionLoading(true);
      
      await axios.put(`${API_BASE_URL}/users/${selectedUser._id}/reset-password`, {
        newPassword: '123456'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert('Reset mật khẩu thành công! Mật khẩu mới: 123456');
      handleMenuClose();

    } catch (error) {
      console.error('Error resetting password:', error);
      alert('Lỗi khi reset mật khẩu');
    } finally {
      setActionLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!selectedUser) return;

    try {
      setActionLoading(true);
      
      await axios.delete(`${API_BASE_URL}/users/${selectedUser._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      await fetchUsers();
      await fetchStats();
      setOpenDeleteDialog(false);
      setSelectedUser(null);

    } catch (error) {
      console.error('Error deleting user:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveUser = async () => {
    if (!selectedUser) return;

    try {
      setActionLoading(true);
      
      await axios.put(`${API_BASE_URL}/users/${selectedUser._id}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert('Phê duyệt tài khoản thành công!');
      await fetchUsers();
      await fetchStats();
      handleMenuClose();

    } catch (error) {
      console.error('Error approving user:', error);
      alert(error.response?.data?.message || 'Lỗi khi phê duyệt tài khoản');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectUser = async () => {
    if (!selectedUser) return;

    const reason = prompt('Nhập lý do từ chối (tùy chọn):');
    if (reason === null) return; // User cancelled

    try {
      setActionLoading(true);
      
      await axios.put(`${API_BASE_URL}/users/${selectedUser._id}/reject`, {
        rejectionReason: reason || 'Không có lý do'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert('Từ chối tài khoản thành công!');
      await fetchUsers();
      await fetchStats();
      handleMenuClose();

    } catch (error) {
      console.error('Error rejecting user:', error);
      alert(error.response?.data?.message || 'Lỗi khi từ chối tài khoản');
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Chưa có';
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Chưa có';
    return new Date(dateString).toLocaleString('vi-VN');
  };

  // Check if user has permission to access user management
  if (currentUser && !permissions.hasPermission(PERMISSIONS.USER_MANAGEMENT)) {
    return (
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Alert severity="error">
          <Typography variant="h6" gutterBottom>
            Không có quyền truy cập
          </Typography>
          <Typography>
            Bạn cần có quyền quản lý người dùng để truy cập trang này.
            Vai trò hiện tại của bạn: <strong>{currentUser.role}</strong>
          </Typography>
        </Alert>
      </Container>
    );
  }

  if (loading && users.length === 0) {
    return (
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Skeleton variant="rectangular" height={200} sx={{ mb: 3, borderRadius: 2 }} />
        <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
          <Box>
            <Typography variant="h4" fontWeight={600} gutterBottom>
              Quản lý người dùng
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Quản lý tài khoản và quyền hạn của người dùng trong hệ thống
            </Typography>
          </Box>
          {permissions.hasPermission(PERMISSIONS.USER_CREATE) && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setOpenUserForm(true)}
              sx={{ minWidth: 140 }}
            >
              Thêm người dùng
            </Button>
          )}
        </Stack>

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1) }}>
                    <GroupsIcon color="primary" />
                  </Avatar>
                  <Box>
                    <Typography variant="h6" fontWeight={600}>
                      {stats.total}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Tổng người dùng
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Avatar sx={{ bgcolor: alpha(theme.palette.success.main, 0.1) }}>
                    <PersonIcon color="success" />
                  </Avatar>
                  <Box>
                    <Typography variant="h6" fontWeight={600}>
                      {stats.active}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Đang hoạt động
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Avatar sx={{ bgcolor: alpha(theme.palette.error.main, 0.1) }}>
                    <AdminIcon color="error" />
                  </Avatar>
                  <Box>
                    <Typography variant="h6" fontWeight={600}>
                      {stats.byRole.find(r => r._id === 'admin')?.count || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Quản trị viên
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Avatar sx={{ bgcolor: alpha(theme.palette.warning.main, 0.1) }}>
                    <ManagerIcon color="warning" />
                  </Avatar>
                  <Box>
                    <Typography variant="h6" fontWeight={600}>
                      {stats.byRole
                        .filter(r => ['manager', 'secretary'].includes(r._id))
                        .reduce((sum, r) => sum + r.count, 0)
                      }
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Quản lý & Thư ký
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Bộ lọc
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              size="small"
              placeholder="Tìm kiếm người dùng..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                endAdornment: filters.search && (
                  <IconButton size="small" onClick={() => handleFilterChange('search', '')}>
                    <ClearIcon />
                  </IconButton>
                )
              }}
            />
          </Grid>
          
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Vai trò</InputLabel>
              <Select
                value={filters.role}
                onChange={(e) => handleFilterChange('role', e.target.value)}
                label="Vai trò"
              >
                <MenuItem value="">Tất cả</MenuItem>
                {filterOptions.roles?.map(role => (
                  <MenuItem key={role} value={role}>
                    {getRoleConfig(role).label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Phòng ban</InputLabel>
              <Select
                value={filters.department}
                onChange={(e) => handleFilterChange('department', e.target.value)}
                label="Phòng ban"
              >
                <MenuItem value="">Tất cả</MenuItem>
                {filterOptions.departments?.map(dept => (
                  <MenuItem key={dept} value={dept}>
                    {dept}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Trạng thái</InputLabel>
              <Select
                value={filters.isActive}
                onChange={(e) => handleFilterChange('isActive', e.target.value)}
                label="Trạng thái"
              >
                <MenuItem value="">Tất cả</MenuItem>
                {filterOptions.statusOptions?.map(option => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Phê duyệt</InputLabel>
              <Select
                value={filters.approvalStatus}
                onChange={(e) => handleFilterChange('approvalStatus', e.target.value)}
                label="Phê duyệt"
              >
                <MenuItem value="">Tất cả</MenuItem>
                <MenuItem value="pending">Chờ phê duyệt</MenuItem>
                <MenuItem value="approved">Đã phê duyệt</MenuItem>
                <MenuItem value="rejected">Đã từ chối</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={3}>
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={fetchUsers}
                disabled={loading}
              >
                Làm mới
              </Button>
              <Button
                variant="outlined"
                startIcon={<ClearIcon />}
                onClick={clearFilters}
              >
                Xóa bộ lọc
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      {/* Users Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Người dùng</TableCell>
                <TableCell>Vai trò</TableCell>
                <TableCell>Phòng ban</TableCell>
                <TableCell>Trạng thái</TableCell>
                <TableCell>Đăng nhập cuối</TableCell>
                <TableCell>Ngày tạo</TableCell>
                <TableCell align="center">Thao tác</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: rowsPerPage }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><Skeleton variant="rectangular" height={40} /></TableCell>
                    <TableCell><Skeleton variant="rectangular" height={20} width={80} /></TableCell>
                    <TableCell><Skeleton variant="rectangular" height={20} width={100} /></TableCell>
                    <TableCell><Skeleton variant="rectangular" height={20} width={60} /></TableCell>
                    <TableCell><Skeleton variant="rectangular" height={20} width={120} /></TableCell>
                    <TableCell><Skeleton variant="rectangular" height={20} width={100} /></TableCell>
                    <TableCell><Skeleton variant="rectangular" height={20} width={40} /></TableCell>
                  </TableRow>
                ))
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      Không tìm thấy người dùng nào
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => {
                  const roleConfig = getRoleConfig(user.role);
                  const isCurrentUser = currentUser?._id === user._id;
                  
                  return (
                    <TableRow key={user._id} hover>
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={2}>
                          <Avatar
                            src={user.avatar}
                            sx={{ width: 40, height: 40 }}
                          >
                            {user.fullName?.charAt(0)?.toUpperCase()}
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle2" fontWeight={600}>
                              {user.fullName}
                              {isCurrentUser && (
                                <Chip label="Bạn" size="small" color="primary" sx={{ ml: 1 }} />
                              )}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {user.email}
                            </Typography>
                            {user.position && (
                              <Typography variant="caption" color="text.secondary">
                                {user.position}
                              </Typography>
                            )}
                          </Box>
                        </Stack>
                      </TableCell>
                      
                      <TableCell>
                        <Chip
                          icon={roleConfig.icon}
                          label={roleConfig.label}
                          variant="outlined"
                          size="small"
                          sx={{ 
                            bgcolor: roleConfig.bgColor,
                            color: roleConfig.textColor,
                            borderColor: roleConfig.borderColor,
                            fontWeight: 600,
                            '& .MuiChip-icon': {
                              color: roleConfig.textColor,
                              fontSize: '16px'
                            },
                            '& .MuiChip-label': {
                              fontWeight: 600,
                              fontSize: '0.75rem'
                            }
                          }}
                        />
                      </TableCell>
                      
                      <TableCell>
                        {user.department || (
                          <Typography color="text.secondary" variant="body2">
                            Chưa phân công
                          </Typography>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        <Stack spacing={1}>
                          <Chip
                            label={user.isActive ? 'Hoạt động' : 'Vô hiệu hóa'}
                            color={user.isActive ? 'success' : 'error'}
                            size="small"
                          />
                          {user.isFromDomainAuth && user.approvalStatus && (
                            <Chip
                              label={
                                user.approvalStatus === 'pending' ? 'Chờ phê duyệt' :
                                user.approvalStatus === 'approved' ? 'Đã phê duyệt' :
                                'Đã từ chối'
                              }
                              color={
                                user.approvalStatus === 'pending' ? 'warning' :
                                user.approvalStatus === 'approved' ? 'success' :
                                'error'
                              }
                              size="small"
                              variant="outlined"
                            />
                          )}
                        </Stack>
                      </TableCell>
                      
                      <TableCell>
                        {user.lastLogin ? (
                          <Tooltip title={formatDateTime(user.lastLogin)}>
                            <Typography variant="body2">
                              {formatDate(user.lastLogin)}
                            </Typography>
                          </Tooltip>
                        ) : (
                          <Typography color="text.secondary" variant="body2">
                            Chưa đăng nhập
                          </Typography>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        <Typography variant="body2">
                          {formatDate(user.createdAt)}
                        </Typography>
                      </TableCell>
                      
                      <TableCell align="center">
                        <IconButton
                          onClick={(e) => handleMenuOpen(e, user)}
                          disabled={actionLoading}
                        >
                          <MoreVertIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        <TablePagination
          component="div"
          count={pagination?.totalUsers || 0}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[10, 20, 50]}
          labelRowsPerPage="Số dòng mỗi trang:"
          labelDisplayedRows={({ from, to, count }) => 
            `${from}-${to} trong ${count}`
          }
        />
      </Paper>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        {/* Approve/Reject for pending domain users */}
        {selectedUser?.isFromDomainAuth && selectedUser?.approvalStatus === 'pending' && 
         ['admin', 'manager'].includes(currentUser?.role) && (
          <>
            <MenuItem onClick={handleApproveUser} disabled={actionLoading}>
              <ListItemIcon>
                <CheckCircleIcon color="success" />
              </ListItemIcon>
              <ListItemText>Phê duyệt tài khoản</ListItemText>
            </MenuItem>
            <MenuItem onClick={handleRejectUser} disabled={actionLoading}>
              <ListItemIcon>
                <CloseIcon color="error" />
              </ListItemIcon>
              <ListItemText>Từ chối tài khoản</ListItemText>
            </MenuItem>
            <Divider />
          </>
        )}

        {permissions.hasPermission(PERMISSIONS.USER_EDIT) && (
          <MenuItem onClick={handleEditUser}>
            <ListItemIcon>
              <EditIcon />
            </ListItemIcon>
            <ListItemText>Chỉnh sửa</ListItemText>
          </MenuItem>
        )}
        
        {permissions.hasAnyPermission([PERMISSIONS.USER_ACTIVATE, PERMISSIONS.USER_DEACTIVATE]) && (
          <MenuItem onClick={handleToggleUserStatus}>
            <ListItemIcon>
              {selectedUser?.isActive ? <PersonOffIcon /> : <PersonIcon />}
            </ListItemIcon>
            <ListItemText>
              {selectedUser?.isActive ? 'Vô hiệu hóa' : 'Kích hoạt'}
            </ListItemText>
          </MenuItem>
        )}
        
        {permissions.hasPermission(PERMISSIONS.USER_RESET_PASSWORD) && (
          <MenuItem onClick={handleResetPassword}>
            <ListItemIcon>
              <LockResetIcon />
            </ListItemIcon>
            <ListItemText>Reset mật khẩu</ListItemText>
          </MenuItem>
        )}
        
        <Divider />
        
        {permissions.hasPermission(PERMISSIONS.USER_DELETE) && (
          <MenuItem 
            onClick={handleDeleteUser}
            sx={{ color: 'error.main' }}
            disabled={selectedUser?._id === currentUser?._id}
          >
            <ListItemIcon>
              <DeleteIcon color="error" />
            </ListItemIcon>
            <ListItemText>Xóa người dùng</ListItemText>
          </MenuItem>
        )}
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle>Xác nhận xóa người dùng</DialogTitle>
        <DialogContent>
          <Typography>
            Bạn có chắc chắn muốn vô hiệu hóa người dùng "{selectedUser?.fullName}"?
            Hành động này có thể được hoàn tác.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>
            Hủy
          </Button>
          <Button 
            onClick={confirmDelete} 
            color="error" 
            variant="contained"
            disabled={actionLoading}
          >
            Xác nhận
          </Button>
        </DialogActions>
      </Dialog>

      {/* User Form Modal */}
      <UserFormModal
        open={openUserForm}
        onClose={() => {
          setOpenUserForm(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
        isEdit={Boolean(selectedUser)}
        onSuccess={() => {
          console.log('🔄 onSuccess called, refreshing user list and stats');
          fetchUsers();
          fetchStats();
        }}
        departments={filterOptions.departments || []}
      />
    </Container>
  );
};

export default UserManagement;
