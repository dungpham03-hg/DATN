import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Stack,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import TaskCard from '../Tasks/TaskCard';
import TaskDetailDialog from '../Tasks/TaskDetailDialog';
import useFollowUps from '../../hooks/useFollowUps';

/**
 * MeetingFollowUps Component
 * Hiển thị danh sách công việc từ một cuộc họp
 */
const MeetingFollowUps = ({ meetingId }) => {
  const {
    tasks,
    loading,
    error,
    fetchTasks,
    deleteTask,
    completeTask
  } = useFollowUps();

  const [selectedTask, setSelectedTask] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    if (meetingId) {
      loadTasks();
    }
  }, [meetingId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadTasks = async () => {
    await fetchTasks({ meeting: meetingId });
  };

  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setDetailOpen(true);
  };

  const handleCloseDetail = () => {
    setDetailOpen(false);
    setSelectedTask(null);
  };

  const handleTaskSaved = () => {
    loadTasks(); // Reload
  };

  const handleTaskCompleted = () => {
    loadTasks(); // Reload
  };

  const handleEdit = (task) => {
    setSelectedTask(task);
    setDetailOpen(true);
  };

  const handleDelete = async (task) => {
    const result = await deleteTask(task._id);
    if (result.success) {
      loadTasks();
    }
  };

  const handleComplete = async (task) => {
    const result = await completeTask(task._id);
    if (result.success) {
      loadTasks();
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" fontWeight={600}>
          Công việc từ cuộc họp này ({tasks.length})
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            startIcon={<RefreshIcon />}
            onClick={loadTasks}
            disabled={loading}
          >
            Làm mới
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => {/* TODO: Open create dialog */}}
          >
            Tạo công việc
          </Button>
        </Stack>
      </Box>

      {/* Loading */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Tasks List */}
      {!loading && tasks.length > 0 && (
        <Stack spacing={2}>
          {tasks.map(task => (
            <TaskCard
              key={task._id}
              task={task}
              onClick={() => handleTaskClick(task)}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onComplete={handleComplete}
            />
          ))}
        </Stack>
      )}

      {/* Empty State */}
      {!loading && tasks.length === 0 && (
        <Paper
          elevation={0}
          sx={{
            p: 4,
            textAlign: 'center',
            border: '2px dashed',
            borderColor: 'divider'
          }}
        >
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Chưa có công việc nào từ cuộc họp này
          </Typography>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => {/* TODO: Open create dialog */}}
            sx={{ mt: 2 }}
          >
            Tạo công việc đầu tiên
          </Button>
        </Paper>
      )}

      {/* Task Detail Dialog */}
      <TaskDetailDialog
        open={detailOpen}
        task={selectedTask}
        onClose={handleCloseDetail}
        onSave={handleTaskSaved}
        onComplete={handleTaskCompleted}
      />
    </Box>
  );
};

export default MeetingFollowUps;

