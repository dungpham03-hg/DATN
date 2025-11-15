import React, { useState } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TablePagination,
  Chip,
  LinearProgress,
  Avatar,
  IconButton,
  Tooltip,
  Checkbox,
  Typography,
  Stack
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  MoreVert as MoreVertIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

/**
 * TaskListView Component
 * Hiển thị tasks dạng table với sort, filter, pagination
 */
const TaskListView = ({
  tasks = [],
  onTaskClick,
  onEdit,
  onDelete,
  onComplete,
  selectable = false,
  onSelectionChange
}) => {
  const [orderBy, setOrderBy] = useState('dueDate');
  const [order, setOrder] = useState('asc');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selected, setSelected] = useState([]);

  // Sort handler
  const handleSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  // Selection handlers
  const handleSelectAll = (event) => {
    if (event.target.checked) {
      const newSelected = tasks.map(t => t._id);
      setSelected(newSelected);
      onSelectionChange && onSelectionChange(newSelected);
    } else {
      setSelected([]);
      onSelectionChange && onSelectionChange([]);
    }
  };

  const handleSelectOne = (taskId) => {
    const selectedIndex = selected.indexOf(taskId);
    let newSelected = [];

    if (selectedIndex === -1) {
      newSelected = [...selected, taskId];
    } else {
      newSelected = selected.filter(id => id !== taskId);
    }

    setSelected(newSelected);
    onSelectionChange && onSelectionChange(newSelected);
  };

  // Pagination handlers
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Sort tasks
  const sortedTasks = [...tasks].sort((a, b) => {
    let aVal = a[orderBy];
    let bVal = b[orderBy];

    // Handle nested fields
    if (orderBy === 'assignee') {
      aVal = a.assignee?.fullName || '';
      bVal = b.assignee?.fullName || '';
    }

    if (orderBy === 'dueDate') {
      aVal = new Date(a.dueDate).getTime();
      bVal = new Date(b.dueDate).getTime();
    }

    if (order === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  // Paginate
  const paginatedTasks = sortedTasks.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  // Helper functions
  const getStatusColor = (status) => {
    switch (status) {
      case 'not_started': return 'default';
      case 'in_progress': return 'primary';
      case 'blocked': return 'error';
      case 'completed': return 'success';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'low': return 'default';
      case 'medium': return 'info';
      case 'high': return 'warning';
      case 'urgent': return 'error';
      default: return 'default';
    }
  };

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

  const getPriorityLabel = (priority) => {
    const labels = {
      'low': 'Thấp',
      'medium': 'TB',
      'high': 'Cao',
      'urgent': 'Gấp'
    };
    return labels[priority] || priority;
  };

  const isOverdue = (task) => {
    if (task.status === 'completed' || task.status === 'cancelled') return false;
    return new Date(task.dueDate) < new Date();
  };

  return (
    <Paper elevation={0} sx={{ width: '100%', border: 1, borderColor: 'divider' }}>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              {selectable && (
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={selected.length > 0 && selected.length < tasks.length}
                    checked={tasks.length > 0 && selected.length === tasks.length}
                    onChange={handleSelectAll}
                  />
                </TableCell>
              )}
              
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'title'}
                  direction={orderBy === 'title' ? order : 'asc'}
                  onClick={() => handleSort('title')}
                >
                  Công việc
                </TableSortLabel>
              </TableCell>

              <TableCell>
                <TableSortLabel
                  active={orderBy === 'assignee'}
                  direction={orderBy === 'assignee' ? order : 'asc'}
                  onClick={() => handleSort('assignee')}
                >
                  Người thực hiện
                </TableSortLabel>
              </TableCell>

              <TableCell>
                <TableSortLabel
                  active={orderBy === 'priority'}
                  direction={orderBy === 'priority' ? order : 'asc'}
                  onClick={() => handleSort('priority')}
                >
                  Mức độ
                </TableSortLabel>
              </TableCell>

              <TableCell>
                <TableSortLabel
                  active={orderBy === 'status'}
                  direction={orderBy === 'status' ? order : 'asc'}
                  onClick={() => handleSort('status')}
                >
                  Trạng thái
                </TableSortLabel>
              </TableCell>

              <TableCell>
                <TableSortLabel
                  active={orderBy === 'progress'}
                  direction={orderBy === 'progress' ? order : 'asc'}
                  onClick={() => handleSort('progress')}
                >
                  Tiến độ
                </TableSortLabel>
              </TableCell>

              <TableCell>
                <TableSortLabel
                  active={orderBy === 'dueDate'}
                  direction={orderBy === 'dueDate' ? order : 'asc'}
                  onClick={() => handleSort('dueDate')}
                >
                  Hạn hoàn thành
                </TableSortLabel>
              </TableCell>

              <TableCell align="right">Thao tác</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {paginatedTasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={selectable ? 8 : 7} align="center" sx={{ py: 8 }}>
                  <Typography variant="body2" color="text.secondary">
                    Không có công việc nào
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedTasks.map((task) => {
                const isItemSelected = selected.indexOf(task._id) !== -1;
                const isTaskOverdue = isOverdue(task);

                return (
                  <TableRow
                    key={task._id}
                    hover
                    onClick={() => onTaskClick && onTaskClick(task)}
                    selected={isItemSelected}
                    sx={{
                      cursor: onTaskClick ? 'pointer' : 'default',
                      bgcolor: isTaskOverdue ? 'error.lighter' : 'inherit',
                      '&:hover': {
                        bgcolor: isTaskOverdue ? 'error.light' : 'action.hover'
                      }
                    }}
                  >
                    {selectable && (
                      <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isItemSelected}
                          onChange={() => handleSelectOne(task._id)}
                        />
                      </TableCell>
                    )}

                    {/* Title */}
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {task.title}
                      </Typography>
                      {task.meeting && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          {task.meeting.title}
                        </Typography>
                      )}
                    </TableCell>

                    {/* Assignee */}
                    <TableCell>
                      {task.assignee ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar
                            src={task.assignee.avatar}
                            alt={task.assignee.fullName}
                            sx={{ width: 32, height: 32 }}
                          >
                            {task.assignee.fullName?.charAt(0)}
                          </Avatar>
                          <Box>
                            <Typography variant="body2">
                              {task.assignee.fullName}
                            </Typography>
                            {task.assignee.department && (
                              <Typography variant="caption" color="text.secondary">
                                {task.assignee.department}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          Chưa gán
                        </Typography>
                      )}
                    </TableCell>

                    {/* Priority */}
                    <TableCell>
                      <Chip
                        label={getPriorityLabel(task.priority)}
                        color={getPriorityColor(task.priority)}
                        size="small"
                      />
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <Chip
                        label={getStatusLabel(task.status)}
                        color={getStatusColor(task.status)}
                        size="small"
                      />
                    </TableCell>

                    {/* Progress */}
                    <TableCell sx={{ minWidth: 120 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LinearProgress
                          variant="determinate"
                          value={task.progress || 0}
                          sx={{ flexGrow: 1, height: 6, borderRadius: 1 }}
                          color={task.progress === 100 ? 'success' : 'primary'}
                        />
                        <Typography variant="caption" sx={{ minWidth: 35 }}>
                          {task.progress || 0}%
                        </Typography>
                      </Box>
                    </TableCell>

                    {/* Due Date */}
                    <TableCell>
                      <Typography
                        variant="body2"
                        color={isTaskOverdue ? 'error.main' : 'text.primary'}
                        fontWeight={isTaskOverdue ? 600 : 400}
                      >
                        {format(new Date(task.dueDate), 'dd/MM/yyyy', { locale: vi })}
                      </Typography>
                      {isTaskOverdue && (
                        <Typography variant="caption" color="error" display="block">
                          Quá hạn
                        </Typography>
                      )}
                    </TableCell>

                    {/* Actions */}
                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        {task.status !== 'completed' && onComplete && (
                          <Tooltip title="Hoàn thành">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => onComplete(task)}
                            >
                              <CheckCircleIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {onEdit && (
                          <Tooltip title="Chỉnh sửa">
                            <IconButton
                              size="small"
                              onClick={() => onEdit(task)}
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
                              onClick={() => {
                                if (window.confirm('Bạn có chắc muốn xóa task này?')) {
                                  onDelete(task);
                                }
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      {tasks.length > 0 && (
        <TablePagination
          component="div"
          count={tasks.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[5, 10, 25, 50]}
          labelRowsPerPage="Số dòng mỗi trang:"
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} của ${count}`}
        />
      )}
    </Paper>
  );
};

export default TaskListView;

