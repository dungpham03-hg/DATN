import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Chip,
  LinearProgress,
  Slider,
  IconButton,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Checkbox,
  Paper,
  Avatar,
  Stack,
  Alert
} from '@mui/material';
import {
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Send as SendIcon,
  AttachFile as AttachFileIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import useFollowUps from '../../hooks/useFollowUps';

/**
 * TaskDetailDialog Component
 * Dialog hiển thị và chỉnh sửa chi tiết task
 */
const TaskDetailDialog = ({
  open,
  task,
  onClose,
  onSave,
  onComplete,
  readOnly = false
}) => {
  const {
    updateTask,
    updateProgress,
    completeTask,
    addComment
  } = useFollowUps();

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignee: '',
    dueDate: '',
    priority: 'medium',
    status: 'not_started',
    progress: 0,
    subtasks: [],
    tags: []
  });

  const [newComment, setNewComment] = useState('');
  const [newSubtask, setNewSubtask] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Initialize form data
  useEffect(() => {
    if (task && open) {
      setFormData({
        title: task.title || '',
        description: task.description || '',
        assignee: task.assignee?._id || '',
        dueDate: task.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : '',
        priority: task.priority || 'medium',
        status: task.status || 'not_started',
        progress: task.progress || 0,
        subtasks: task.subtasks || [],
        tags: task.tags || []
      });
      setNewComment('');
      setError('');
    }
  }, [task, open]);

  // Handle input change
  const handleChange = (field) => (event) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  // Handle progress change
  const handleProgressChange = (event, newValue) => {
    setFormData(prev => ({
      ...prev,
      progress: newValue
    }));
  };

  // Handle add subtask
  const handleAddSubtask = () => {
    if (newSubtask.trim()) {
      setFormData(prev => ({
        ...prev,
        subtasks: [
          ...prev.subtasks,
          {
            title: newSubtask.trim(),
            completed: false,
            createdAt: new Date()
          }
        ]
      }));
      setNewSubtask('');
    }
  };

  // Handle toggle subtask
  const handleToggleSubtask = (index) => {
    setFormData(prev => ({
      ...prev,
      subtasks: prev.subtasks.map((st, i) =>
        i === index ? { ...st, completed: !st.completed } : st
      )
    }));
  };

  // Handle delete subtask
  const handleDeleteSubtask = (index) => {
    setFormData(prev => ({
      ...prev,
      subtasks: prev.subtasks.filter((_, i) => i !== index)
    }));
  };

  // Handle save
  const handleSave = async () => {
    setLoading(true);
    setError('');

    try {
      const updates = {
        title: formData.title,
        description: formData.description,
        assignee: formData.assignee,
        dueDate: formData.dueDate,
        priority: formData.priority,
        status: formData.status,
        progress: formData.progress,
        subtasks: formData.subtasks,
        tags: formData.tags
      };

      const result = await updateTask(task._id, updates);

      if (result.success) {
        onSave && onSave(result.task);
        onClose();
      } else {
        setError(result.error || 'Lỗi khi cập nhật task');
      }
    } catch (err) {
      setError(err.message || 'Lỗi khi cập nhật task');
    } finally {
      setLoading(false);
    }
  };

  // Handle complete
  const handleComplete = async () => {
    setLoading(true);
    setError('');

    try {
      const result = await completeTask(task._id);

      if (result.success) {
        onComplete && onComplete(result.task);
        onClose();
      } else {
        setError(result.error || 'Lỗi khi hoàn thành task');
      }
    } catch (err) {
      setError(err.message || 'Lỗi khi hoàn thành task');
    } finally {
      setLoading(false);
    }
  };

  // Handle add comment
  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      const result = await addComment(task._id, newComment.trim());

      if (result.success) {
        setNewComment('');
        // Update task in parent (reload data)
      } else {
        setError(result.error || 'Lỗi khi thêm comment');
      }
    } catch (err) {
      setError(err.message || 'Lỗi khi thêm comment');
    }
  };

  if (!task) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" component="div">
            Chi tiết công việc
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Title */}
          <Grid item xs={12}>
            <TextField
              label="Tiêu đề"
              fullWidth
              required
              value={formData.title}
              onChange={handleChange('title')}
              disabled={readOnly}
            />
          </Grid>

          {/* Description */}
          <Grid item xs={12}>
            <TextField
              label="Mô tả"
              fullWidth
              multiline
              rows={3}
              value={formData.description}
              onChange={handleChange('description')}
              disabled={readOnly}
            />
          </Grid>

          {/* Assignee & Due Date */}
          <Grid item xs={12} md={6}>
            <TextField
              label="Người thực hiện"
              fullWidth
              value={task.assignee?.fullName || 'Chưa gán'}
              disabled
              helperText={task.assignee?.department || ''}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              label="Hạn hoàn thành"
              type="date"
              fullWidth
              value={formData.dueDate}
              onChange={handleChange('dueDate')}
              disabled={readOnly}
              InputLabelProps={{
                shrink: true,
              }}
            />
          </Grid>

          {/* Priority & Status */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Mức độ ưu tiên</InputLabel>
              <Select
                value={formData.priority}
                onChange={handleChange('priority')}
                label="Mức độ ưu tiên"
                disabled={readOnly}
              >
                <MenuItem value="low">Thấp</MenuItem>
                <MenuItem value="medium">Trung bình</MenuItem>
                <MenuItem value="high">Cao</MenuItem>
                <MenuItem value="urgent">Khẩn cấp</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Trạng thái</InputLabel>
              <Select
                value={formData.status}
                onChange={handleChange('status')}
                label="Trạng thái"
                disabled={readOnly}
              >
                <MenuItem value="not_started">Chưa bắt đầu</MenuItem>
                <MenuItem value="in_progress">Đang thực hiện</MenuItem>
                <MenuItem value="blocked">Bị chặn</MenuItem>
                <MenuItem value="completed">Hoàn thành</MenuItem>
                <MenuItem value="cancelled">Đã hủy</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Progress */}
          <Grid item xs={12}>
            <Typography gutterBottom>
              Tiến độ: {formData.progress}%
            </Typography>
            <Slider
              value={formData.progress}
              onChange={handleProgressChange}
              disabled={readOnly}
              valueLabelDisplay="auto"
              step={5}
              marks
              min={0}
              max={100}
              color={formData.progress === 100 ? 'success' : 'primary'}
            />
            <LinearProgress
              variant="determinate"
              value={formData.progress}
              sx={{ height: 8, borderRadius: 1, mt: 1 }}
              color={formData.progress === 100 ? 'success' : 'primary'}
            />
          </Grid>

          {/* Subtasks */}
          <Grid item xs={12}>
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              Subtasks ({formData.subtasks.filter(st => st.completed).length}/{formData.subtasks.length})
            </Typography>

            <List dense>
              {formData.subtasks.map((subtask, index) => (
                <ListItem
                  key={index}
                  dense
                  secondaryAction={
                    !readOnly && (
                      <IconButton
                        edge="end"
                        onClick={() => handleDeleteSubtask(index)}
                        size="small"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )
                  }
                >
                  <ListItemIcon>
                    <Checkbox
                      edge="start"
                      checked={subtask.completed}
                      onChange={() => handleToggleSubtask(index)}
                      disabled={readOnly}
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={subtask.title}
                    sx={{
                      textDecoration: subtask.completed ? 'line-through' : 'none',
                      opacity: subtask.completed ? 0.6 : 1
                    }}
                  />
                </ListItem>
              ))}
            </List>

            {!readOnly && (
              <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Thêm subtask..."
                  value={newSubtask}
                  onChange={(e) => setNewSubtask(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAddSubtask();
                    }
                  }}
                />
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={handleAddSubtask}
                >
                  Thêm
                </Button>
              </Box>
            )}
          </Grid>

          {/* Comments */}
          <Grid item xs={12}>
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              Comments ({task.comments?.length || 0})
            </Typography>

            {/* Comments list */}
            <Box sx={{ maxHeight: 300, overflowY: 'auto', mb: 2 }}>
              {task.comments && task.comments.length > 0 ? (
                <Stack spacing={2}>
                  {task.comments.map((comment, index) => (
                    <Paper key={index} elevation={0} sx={{ p: 2, bgcolor: 'grey.50' }}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                        <Avatar
                          src={comment.user?.avatar}
                          alt={comment.user?.fullName}
                          sx={{ width: 32, height: 32 }}
                        >
                          {comment.user?.fullName?.charAt(0)}
                        </Avatar>
                        <Box sx={{ flexGrow: 1 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="subtitle2" fontWeight={600}>
                              {comment.user?.fullName || 'User'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {format(new Date(comment.createdAt), 'dd/MM/yyyy HH:mm')}
                            </Typography>
                          </Box>
                          <Typography variant="body2">
                            {comment.text}
                          </Typography>
                          {comment.attachments && comment.attachments.length > 0 && (
                            <Box sx={{ mt: 1 }}>
                              {comment.attachments.map((att, idx) => (
                                <Chip
                                  key={idx}
                                  icon={<AttachFileIcon />}
                                  label={att.name}
                                  size="small"
                                  sx={{ mr: 0.5 }}
                                />
                              ))}
                            </Box>
                          )}
                        </Box>
                      </Box>
                    </Paper>
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                  Chưa có comment nào
                </Typography>
              )}
            </Box>

            {/* Add comment form */}
            {!readOnly && (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  size="small"
                  fullWidth
                  multiline
                  rows={2}
                  placeholder="Thêm comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                />
                <Button
                  variant="contained"
                  startIcon={<SendIcon />}
                  onClick={handleAddComment}
                  disabled={!newComment.trim()}
                  sx={{ minWidth: 100 }}
                >
                  Gửi
                </Button>
              </Box>
            )}
          </Grid>

          {/* Metadata */}
          {task.createdBy && (
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="caption" color="text.secondary">
                  Tạo bởi: {task.createdBy.fullName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Ngày tạo: {format(new Date(task.createdAt), 'dd/MM/yyyy HH:mm')}
                </Typography>
              </Box>
            </Grid>
          )}
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        {!readOnly && task.status !== 'completed' && (
          <Button
            variant="contained"
            color="success"
            startIcon={<CheckCircleIcon />}
            onClick={handleComplete}
            disabled={loading}
          >
            Đánh dấu hoàn thành
          </Button>
        )}
        
        <Box sx={{ flexGrow: 1 }} />
        
        <Button onClick={onClose} disabled={loading}>
          Đóng
        </Button>
        
        {!readOnly && (
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default TaskDetailDialog;

