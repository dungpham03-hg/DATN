import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Container,
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  Tab,
  Tabs,
  LinearProgress,
  Alert,
  IconButton,
  Tooltip,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  useTheme,
  alpha
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Block as BlockIcon,
  TrendingUp as TrendingUpIcon,
  Event as EventIcon,
  ViewKanban as ViewKanbanIcon,
  ViewList as ViewListIcon,
  CalendarToday as CalendarIcon
} from '@mui/icons-material';
import useFollowUps from '../../hooks/useFollowUps';
import TaskCard from '../../components/Tasks/TaskCard';
import TaskListView from '../../components/Tasks/TaskListView';
import TaskKanbanView from '../../components/Tasks/TaskKanbanView';
import TaskDetailDialog from '../../components/Tasks/TaskDetailDialog';

/**
 * Task Management Dashboard
 * Quản lý công việc và follow-ups sau cuộc họp
 */
const TaskManagement = () => {
  const theme = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const meetingId = searchParams.get('meeting');
  const taskId = searchParams.get('task');
  
  const {
    tasks,
    loading,
    error,
    stats,
    fetchTasks,
    fetchStats,
    deleteTask,
    completeTask,
    getStatusColor,
    getPriorityColor,
    getDueDateStatus
  } = useFollowUps();

  const [viewMode, setViewMode] = useState('list'); // list, kanban, calendar
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [selectedTask, setSelectedTask] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, [statusFilter, meetingId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Open task detail if taskId in URL
  useEffect(() => {
    if (taskId && tasks.length > 0) {
      const task = tasks.find(t => t._id === taskId);
      if (task) {
        setSelectedTask(task);
        setDetailOpen(true);
        // Remove taskId from URL after opening
        searchParams.delete('task');
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [taskId, tasks]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = async () => {
    const filters = {};
    if (meetingId) {
      filters.meeting = meetingId;
    }
    if (statusFilter !== 'all') {
      filters.status = statusFilter;
    }

    await fetchTasks(filters);
    await fetchStats({ meeting: meetingId || undefined, scope: 'all' });
  };

  const handleRefresh = () => {
    loadData();
  };

  const handleViewChange = (event, newView) => {
    setViewMode(newView);
  };

  const handleStatusFilterChange = (event) => {
    setStatusFilter(event.target.value);
  };

  const handlePriorityFilterChange = (event) => {
    setPriorityFilter(event.target.value);
  };

  // Task handlers
  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setDetailOpen(true);
  };

  const handleCloseDetail = () => {
    setDetailOpen(false);
    setSelectedTask(null);
  };

  const handleTaskSaved = () => {
    loadData(); // Reload data
  };

  const handleTaskCompleted = async () => {
    await loadData(); // Reload data
  };

  const handleEdit = (task) => {
    setSelectedTask(task);
    setDetailOpen(true);
  };

  const handleDelete = async (task) => {
    const result = await deleteTask(task._id);
    if (result.success) {
      loadData();
    }
  };

  const handleComplete = async (task) => {
    const result = await completeTask(task._id);
    if (result.success) {
      loadData();
    }
  };

  // Filter tasks by priority
  const filteredTasks = priorityFilter === 'all' 
    ? tasks 
    : tasks.filter(t => t.priority === priorityFilter);

  // Group tasks by status for Kanban
  const groupedTasks = {
    not_started: filteredTasks.filter(t => t.status === 'not_started'),
    in_progress: filteredTasks.filter(t => t.status === 'in_progress'),
    blocked: filteredTasks.filter(t => t.status === 'blocked'),
    completed: filteredTasks.filter(t => t.status === 'completed')
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 3 }}>
        {/* Header */}
        <Paper
          elevation={0}
          sx={{
            mb: 4,
            p: 4,
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
            color: 'white',
            borderRadius: 3
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <AssignmentIcon sx={{ fontSize: 40 }} />
              <Box>
                <Typography variant="h4" fontWeight={700}>
                  Quản Lý Công Việc
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.9, mt: 0.5 }}>
                  {meetingId 
                    ? `Công việc từ cuộc họp (${tasks.length} nhiệm vụ)`
                    : 'Theo dõi và quản lý các công việc sau cuộc họp'
                  }
                </Typography>
              </Box>
            </Box>
            <Box>
              <Tooltip title="Làm mới">
                <IconButton onClick={handleRefresh} sx={{ color: 'white' }}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => {/* TODO: Open create dialog */}}
                sx={{
                  ml: 1,
                  bgcolor: 'white',
                  color: theme.palette.primary.main,
                  '&:hover': {
                    bgcolor: alpha('#fff', 0.9)
                  }
                }}
              >
                Tạo công việc
              </Button>
            </Box>
          </Box>
        </Paper>

        {/* Meeting Filter Alert */}
        {meetingId && (
          <Alert 
            severity="info" 
            sx={{ mb: 3 }}
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() => {
                  searchParams.delete('meeting');
                  setSearchParams(searchParams, { replace: true });
                }}
              >
                Xem tất cả
              </Button>
            }
          >
            Đang hiển thị công việc từ cuộc họp này. 
            <Button
              size="small"
              onClick={() => {
                searchParams.delete('meeting');
                setSearchParams(searchParams, { replace: true });
              }}
              sx={{ ml: 1, textTransform: 'none' }}
            >
              Xem tất cả công việc
            </Button>
          </Alert>
        )}

        {/* Statistics Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={0} sx={{ border: `2px solid ${theme.palette.primary.main}`, borderRadius: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h3" fontWeight={700} color="primary">
                      {stats.total || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Tổng công việc
                    </Typography>
                  </Box>
                  <AssignmentIcon sx={{ fontSize: 40, color: theme.palette.primary.main, opacity: 0.5 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={0} sx={{ border: `2px solid ${theme.palette.error.main}`, borderRadius: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h3" fontWeight={700} color="error">
                      {stats.overdue || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Quá hạn
                    </Typography>
                  </Box>
                  <WarningIcon sx={{ fontSize: 40, color: theme.palette.error.main, opacity: 0.5 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={0} sx={{ border: `2px solid ${theme.palette.warning.main}`, borderRadius: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h3" fontWeight={700} color="warning.main">
                      {stats.dueSoon || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Sắp đến hạn
                    </Typography>
                  </Box>
                  <ScheduleIcon sx={{ fontSize: 40, color: theme.palette.warning.main, opacity: 0.5 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={0} sx={{ border: `2px solid ${theme.palette.success.main}`, borderRadius: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h3" fontWeight={700} color="success.main">
                      {stats.completed || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Hoàn thành
                    </Typography>
                  </Box>
                  <CheckCircleIcon sx={{ fontSize: 40, color: theme.palette.success.main, opacity: 0.5 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Filters & View Toggle */}
        <Paper elevation={0} sx={{ p: 2, mb: 3, border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Trạng thái</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={handleStatusFilterChange}
                  label="Trạng thái"
                >
                  <MenuItem value="all">Tất cả</MenuItem>
                  <MenuItem value="not_started">Chưa bắt đầu</MenuItem>
                  <MenuItem value="in_progress">Đang thực hiện</MenuItem>
                  <MenuItem value="blocked">Bị chặn</MenuItem>
                  <MenuItem value="completed">Hoàn thành</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Mức độ</InputLabel>
                <Select
                  value={priorityFilter}
                  onChange={handlePriorityFilterChange}
                  label="Mức độ"
                >
                  <MenuItem value="all">Tất cả</MenuItem>
                  <MenuItem value="low">Thấp</MenuItem>
                  <MenuItem value="medium">Trung bình</MenuItem>
                  <MenuItem value="high">Cao</MenuItem>
                  <MenuItem value="urgent">Khẩn cấp</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={12} md={6}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                <Tabs value={viewMode} onChange={handleViewChange}>
                  <Tab icon={<ViewListIcon />} value="list" label="Danh sách" />
                  <Tab icon={<ViewKanbanIcon />} value="kanban" label="Kanban" />
                  <Tab icon={<CalendarIcon />} value="calendar" label="Lịch" disabled />
                </Tabs>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Loading */}
        {loading && <LinearProgress sx={{ mb: 3 }} />}

        {/* Content */}
        {viewMode === 'list' && filteredTasks.length > 0 && (
          <TaskListView
            tasks={filteredTasks}
            onTaskClick={handleTaskClick}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onComplete={handleComplete}
          />
        )}

        {viewMode === 'kanban' && filteredTasks.length > 0 && (
          <TaskKanbanView
            tasks={filteredTasks}
            onTaskClick={handleTaskClick}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onComplete={handleComplete}
          />
        )}

        {/* Empty State */}
        {!loading && filteredTasks.length === 0 && (
          <Paper elevation={0} sx={{ p: 6, textAlign: 'center', border: `1px dashed ${theme.palette.divider}` }}>
            <AssignmentIcon sx={{ fontSize: 64, color: theme.palette.text.disabled, mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Chưa có công việc nào
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Tạo công việc từ cuộc họp hoặc thêm mới công việc theo dõi
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={loadData}
            >
              Làm mới
            </Button>
          </Paper>
        )}
      </Box>

      {/* Task Detail Dialog */}
      <TaskDetailDialog
        open={detailOpen}
        task={selectedTask}
        onClose={handleCloseDetail}
        onSave={handleTaskSaved}
        onComplete={handleTaskCompleted}
      />
    </Container>
  );
};

export default TaskManagement;


