import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Stack,
  Chip,
  alpha,
  useTheme
} from '@mui/material';
import {
  Circle as CircleIcon
} from '@mui/icons-material';
import TaskCard from './TaskCard';

/**
 * TaskKanbanView Component
 * Hiển thị tasks dạng Kanban board
 */
const TaskKanbanView = ({
  tasks = [],
  onTaskClick,
  onEdit,
  onDelete,
  onComplete
}) => {
  const theme = useTheme();

  // Group tasks by status
  const columns = [
    {
      id: 'not_started',
      title: 'Chưa bắt đầu',
      color: theme.palette.grey[600],
      tasks: tasks.filter(t => t.status === 'not_started')
    },
    {
      id: 'in_progress',
      title: 'Đang thực hiện',
      color: theme.palette.primary.main,
      tasks: tasks.filter(t => t.status === 'in_progress')
    },
    {
      id: 'blocked',
      title: 'Bị chặn',
      color: theme.palette.error.main,
      tasks: tasks.filter(t => t.status === 'blocked')
    },
    {
      id: 'completed',
      title: 'Hoàn thành',
      color: theme.palette.success.main,
      tasks: tasks.filter(t => t.status === 'completed')
    }
  ];

  return (
    <Box>
      <Grid container spacing={2}>
        {columns.map((column) => (
          <Grid item xs={12} sm={6} md={3} key={column.id}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                minHeight: 500,
                maxHeight: 'calc(100vh - 400px)',
                display: 'flex',
                flexDirection: 'column',
                border: 1,
                borderColor: 'divider',
                borderTop: 3,
                borderTopColor: column.color,
                bgcolor: alpha(column.color, 0.02)
              }}
            >
              {/* Column Header */}
              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircleIcon sx={{ fontSize: 12, color: column.color }} />
                  <Typography variant="h6" fontWeight={600}>
                    {column.title}
                  </Typography>
                </Box>
                <Chip
                  label={column.tasks.length}
                  size="small"
                  sx={{
                    bgcolor: alpha(column.color, 0.1),
                    color: column.color,
                    fontWeight: 600
                  }}
                />
              </Box>

              {/* Tasks List */}
              <Box
                sx={{
                  flexGrow: 1,
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  '&::-webkit-scrollbar': {
                    width: '6px',
                  },
                  '&::-webkit-scrollbar-track': {
                    background: alpha(theme.palette.divider, 0.1),
                    borderRadius: '10px',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    background: alpha(theme.palette.primary.main, 0.3),
                    borderRadius: '10px',
                    '&:hover': {
                      background: alpha(theme.palette.primary.main, 0.5),
                    }
                  }
                }}
              >
                <Stack spacing={2}>
                  {column.tasks.length > 0 ? (
                    column.tasks.map((task) => (
                      <TaskCard
                        key={task._id}
                        task={task}
                        onClick={() => onTaskClick && onTaskClick(task)}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onComplete={onComplete}
                        compact
                      />
                    ))
                  ) : (
                    <Paper
                      elevation={0}
                      sx={{
                        p: 3,
                        textAlign: 'center',
                        border: `2px dashed ${alpha(theme.palette.divider, 0.3)}`,
                        bgcolor: 'transparent'
                      }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        Không có task nào
                      </Typography>
                    </Paper>
                  )}
                </Stack>
              </Box>

              {/* Column Footer Stats */}
              {column.tasks.length > 0 && (
                <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                  <Grid container spacing={1}>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Tiến độ TB
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {Math.round(
                          column.tasks.reduce((sum, t) => sum + (t.progress || 0), 0) / column.tasks.length
                        )}%
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Quá hạn
                      </Typography>
                      <Typography variant="body2" fontWeight={600} color="error.main">
                        {column.tasks.filter(t => {
                          if (t.status === 'completed' || t.status === 'cancelled') return false;
                          return new Date(t.dueDate) < new Date();
                        }).length}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
              )}
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Summary Stats */}
      <Paper
        elevation={0}
        sx={{
          mt: 3,
          p: 2,
          border: 1,
          borderColor: 'divider',
          bgcolor: alpha(theme.palette.primary.main, 0.02)
        }}
      >
        <Typography variant="subtitle2" fontWeight={600} gutterBottom>
          Tổng quan
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={6} sm={3}>
            <Typography variant="caption" color="text.secondary">
              Tổng số
            </Typography>
            <Typography variant="h6" fontWeight={700}>
              {tasks.length}
            </Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="caption" color="text.secondary">
              Hoàn thành
            </Typography>
            <Typography variant="h6" fontWeight={700} color="success.main">
              {tasks.filter(t => t.status === 'completed').length}
            </Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="caption" color="text.secondary">
              Đang làm
            </Typography>
            <Typography variant="h6" fontWeight={700} color="primary.main">
              {tasks.filter(t => t.status === 'in_progress').length}
            </Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="caption" color="text.secondary">
              Quá hạn
            </Typography>
            <Typography variant="h6" fontWeight={700} color="error.main">
              {tasks.filter(t => {
                if (t.status === 'completed' || t.status === 'cancelled') return false;
                return new Date(t.dueDate) < new Date();
              }).length}
            </Typography>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default TaskKanbanView;

