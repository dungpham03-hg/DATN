import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Box,
  Chip,
  LinearProgress,
  IconButton,
  Tooltip,
  Avatar,
  Stack,
  Button
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  Comment as CommentIcon,
  AttachFile as AttachFileIcon,
  Warning as WarningIcon,
  Schedule as ScheduleIcon,
  Flag as FlagIcon
} from '@mui/icons-material';
import { format, formatDistanceToNow, isPast, differenceInDays } from 'date-fns';
import { vi } from 'date-fns/locale';

/**
 * TaskCard Component
 * Hiển thị task card với đầy đủ thông tin
 */
const TaskCard = ({
  task,
  onClick,
  onEdit,
  onDelete,
  onComplete,
  compact = false
}) => {
  // Status colors
  const getStatusColor = (status) => {
    switch (status) {
      case 'not_started': return 'default';
      case 'in_progress': return 'primary';
      case 'blocked': return 'error';
      case 'completed': return 'success';
      case 'cancelled': return 'default';
      default: return 'default';
    }
  };

  // Priority colors
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'low': return 'default';
      case 'medium': return 'info';
      case 'high': return 'warning';
      case 'urgent': return 'error';
      default: return 'default';
    }
  };

  // Status labels
  const getStatusLabel = (status) => {
    const labels = {
      'not_started': 'Chưa bắt đầu',
      'in_progress': 'Đang làm',
      'blocked': 'Bị chặn',
      'completed': 'Hoàn thành',
      'cancelled': 'Đã hủy'
    };
    return labels[status] || status;
  };

  // Priority labels
  const getPriorityLabel = (priority) => {
    const labels = {
      'low': 'Thấp',
      'medium': 'Trung bình',
      'high': 'Cao',
      'urgent': 'Khẩn cấp'
    };
    return labels[priority] || priority;
  };

  // Check if overdue
  const dueDate = new Date(task.dueDate);
  const isOverdue = task.status !== 'completed' && task.status !== 'cancelled' && isPast(dueDate);
  const daysUntil = differenceInDays(dueDate, new Date());

  // Due date status
  const getDueDateDisplay = () => {
    if (task.status === 'completed') {
      return { text: 'Hoàn thành', color: 'success.main' };
    }
    
    if (isOverdue) {
      return { 
        text: `Quá hạn ${Math.abs(daysUntil)} ngày`, 
        color: 'error.main',
        icon: <WarningIcon fontSize="small" />
      };
    }
    
    if (daysUntil === 0) {
      return { text: 'Hết hạn hôm nay', color: 'warning.main' };
    }
    
    if (daysUntil <= 3) {
      return { text: `Còn ${daysUntil} ngày`, color: 'warning.main' };
    }
    
    return { text: `Còn ${daysUntil} ngày`, color: 'text.secondary' };
  };

  const dueDateInfo = getDueDateDisplay();

  return (
    <Card 
      elevation={0}
      sx={{
        border: 1,
        borderColor: isOverdue ? 'error.main' : 'divider',
        borderLeft: 4,
        borderLeftColor: isOverdue ? 'error.main' : getPriorityColor(task.priority) + '.main',
        '&:hover': {
          boxShadow: 2,
          cursor: onClick ? 'pointer' : 'default'
        },
        transition: 'all 0.2s'
      }}
      onClick={onClick}
    >
      <CardContent sx={{ pb: 1 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
          <Box sx={{ flexGrow: 1, pr: 1 }}>
            <Typography variant="h6" component="div" sx={{ fontWeight: 600, mb: 0.5 }}>
              {task.title}
            </Typography>
            {!compact && task.description && (
              <Typography 
                variant="body2" 
                color="text.secondary" 
                sx={{ 
                  mb: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical'
                }}
              >
                {task.description}
              </Typography>
            )}
          </Box>
          
          {!compact && (
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); }}>
              <MoreVertIcon />
            </IconButton>
          )}
        </Box>

        {/* Status & Priority */}
        <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
          <Chip
            label={getStatusLabel(task.status)}
            color={getStatusColor(task.status)}
            size="small"
          />
          <Chip
            icon={<FlagIcon />}
            label={getPriorityLabel(task.priority)}
            color={getPriorityColor(task.priority)}
            size="small"
            variant="outlined"
          />
        </Stack>

        {/* Progress */}
        <Box sx={{ mb: 1.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              Tiến độ
            </Typography>
            <Typography variant="caption" fontWeight={600}>
              {task.progress || 0}%
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={task.progress || 0}
            sx={{ height: 6, borderRadius: 1 }}
            color={task.progress === 100 ? 'success' : 'primary'}
          />
        </Box>

        {/* Assignee & Due Date */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: !compact ? 1 : 0 }}>
          {/* Assignee */}
          {task.assignee && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar 
                src={task.assignee.avatar} 
                alt={task.assignee.fullName}
                sx={{ width: 24, height: 24 }}
              >
                {task.assignee.fullName?.charAt(0)}
              </Avatar>
              <Typography variant="caption" color="text.secondary">
                {task.assignee.fullName}
              </Typography>
            </Box>
          )}

          {/* Due Date */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {dueDateInfo.icon}
            <Typography 
              variant="caption" 
              color={dueDateInfo.color}
              fontWeight={isOverdue ? 600 : 400}
            >
              <ScheduleIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
              {dueDateInfo.text}
            </Typography>
          </Box>
        </Box>

        {/* Metadata (if not compact) */}
        {!compact && (
          <Box sx={{ display: 'flex', gap: 2, mt: 1.5, pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
            {/* Comments count */}
            {task.comments && task.comments.length > 0 && (
              <Tooltip title="Comments">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <CommentIcon fontSize="small" color="action" />
                  <Typography variant="caption" color="text.secondary">
                    {task.comments.length}
                  </Typography>
                </Box>
              </Tooltip>
            )}

            {/* Attachments count */}
            {task.attachments && task.attachments.length > 0 && (
              <Tooltip title="Attachments">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <AttachFileIcon fontSize="small" color="action" />
                  <Typography variant="caption" color="text.secondary">
                    {task.attachments.length}
                  </Typography>
                </Box>
              </Tooltip>
            )}

            {/* Subtasks */}
            {task.subtasks && task.subtasks.length > 0 && (
              <Tooltip title="Subtasks">
                <Typography variant="caption" color="text.secondary">
                  ✓ {task.subtasks.filter(st => st.completed).length}/{task.subtasks.length}
                </Typography>
              </Tooltip>
            )}
          </Box>
        )}
      </CardContent>

      {/* Actions */}
      {!compact && (onEdit || onDelete || onComplete) && (
        <CardActions sx={{ pt: 0, px: 2, pb: 2 }}>
          <Box sx={{ display: 'flex', gap: 1, width: '100%' }}>
            {task.status !== 'completed' && onComplete && (
              <Button
                size="small"
                variant="contained"
                color="success"
                startIcon={<CheckCircleIcon />}
                onClick={(e) => {
                  e.stopPropagation();
                  onComplete(task);
                }}
                sx={{ flexGrow: 1 }}
              >
                Hoàn thành
              </Button>
            )}
            {onEdit && (
              <Tooltip title="Chỉnh sửa">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(task);
                  }}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {onDelete && (
              <Tooltip title="Xóa">
                <IconButton
                  size="small"
                  color="error"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm('Bạn có chắc muốn xóa task này?')) {
                      onDelete(task);
                    }
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </CardActions>
      )}
    </Card>
  );
};

export default TaskCard;

