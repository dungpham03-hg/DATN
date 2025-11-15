import { useState, useCallback } from 'react';
import axios from 'axios';

/**
 * Custom hook for Follow-up/Task Management
 * Provides CRUD operations and real-time updates
 */
const useFollowUps = () => {
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    notStarted: 0,
    inProgress: 0,
    blocked: 0,
    completed: 0,
    overdue: 0,
    dueSoon: 0
  });

  /**
   * Fetch tasks với filters
   */
  const fetchTasks = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      
      if (filters.status) params.append('status', filters.status);
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.assignee) params.append('assignee', filters.assignee);
      if (filters.meeting) params.append('meeting', filters.meeting);
      if (filters.overdue) params.append('overdue', 'true');
      if (filters.dueSoon) params.append('dueSoon', 'true');
      if (filters.page) params.append('page', filters.page);
      if (filters.limit) params.append('limit', filters.limit);

      const response = await axios.get(`/api/followups?${params.toString()}`);
      
      setTasks(response.data.followUps || []);
      
      return {
        success: true,
        tasks: response.data.followUps || [],
        pagination: response.data.pagination
      };

    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Lỗi khi tải tasks';
      setError(errorMsg);
      return { success: false, error: errorMsg };

    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch my tasks
   */
  const fetchMyTasks = useCallback(async (status = 'all') => {
    setLoading(true);
    setError(null);

    try {
      const params = status !== 'all' ? `?status=${status}` : '';
      const response = await axios.get(`/api/followups/my-tasks${params}`);
      
      setTasks(response.data.tasks || []);
      
      return {
        success: true,
        tasks: response.data.tasks || [],
        grouped: response.data.grouped
      };

    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Lỗi khi tải tasks của bạn';
      setError(errorMsg);
      return { success: false, error: errorMsg };

    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch task detail
   */
  const fetchTaskDetail = useCallback(async (taskId) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`/api/followups/${taskId}`);
      
      setSelectedTask(response.data);
      
      return {
        success: true,
        task: response.data
      };

    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Lỗi khi tải chi tiết task';
      setError(errorMsg);
      return { success: false, error: errorMsg };

    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Create new task
   */
  const createTask = useCallback(async (taskData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post('/api/followups', taskData);
      
      // Add to local state
      setTasks(prev => [response.data.followUp, ...prev]);
      
      return {
        success: true,
        task: response.data.followUp,
        message: response.data.message
      };

    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Lỗi khi tạo task';
      setError(errorMsg);
      return { success: false, error: errorMsg };

    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Update task
   */
  const updateTask = useCallback(async (taskId, updates) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.put(`/api/followups/${taskId}`, updates);
      
      // Update local state
      setTasks(prev => prev.map(t => 
        t._id === taskId ? response.data.followUp : t
      ));
      
      if (selectedTask?._id === taskId) {
        setSelectedTask(response.data.followUp);
      }
      
      return {
        success: true,
        task: response.data.followUp,
        message: response.data.message
      };

    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Lỗi khi cập nhật task';
      setError(errorMsg);
      return { success: false, error: errorMsg };

    } finally {
      setLoading(false);
    }
  }, [selectedTask]);

  /**
   * Delete task
   */
  const deleteTask = useCallback(async (taskId) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.delete(`/api/followups/${taskId}`);
      
      // Remove from local state
      setTasks(prev => prev.filter(t => t._id !== taskId));
      
      if (selectedTask?._id === taskId) {
        setSelectedTask(null);
      }
      
      return {
        success: true,
        message: response.data.message
      };

    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Lỗi khi xóa task';
      setError(errorMsg);
      return { success: false, error: errorMsg };

    } finally {
      setLoading(false);
    }
  }, [selectedTask]);

  /**
   * Add comment to task
   */
  const addComment = useCallback(async (taskId, text, attachments = []) => {
    setError(null);

    try {
      const response = await axios.post(`/api/followups/${taskId}/comments`, {
        text,
        attachments
      });
      
      // Update local state
      setTasks(prev => prev.map(t => {
        if (t._id === taskId) {
          return { ...t, comments: response.data.comments };
        }
        return t;
      }));
      
      if (selectedTask?._id === taskId) {
        setSelectedTask(prev => ({
          ...prev,
          comments: response.data.comments
        }));
      }
      
      return {
        success: true,
        comments: response.data.comments
      };

    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Lỗi khi thêm comment';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  }, [selectedTask]);

  /**
   * Update progress
   */
  const updateProgress = useCallback(async (taskId, progress) => {
    setError(null);

    try {
      const response = await axios.put(`/api/followups/${taskId}/progress`, {
        progress
      });
      
      // Update local state
      setTasks(prev => prev.map(t => 
        t._id === taskId ? response.data.followUp : t
      ));
      
      if (selectedTask?._id === taskId) {
        setSelectedTask(response.data.followUp);
      }
      
      return {
        success: true,
        task: response.data.followUp
      };

    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Lỗi khi cập nhật tiến độ';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  }, [selectedTask]);

  /**
   * Complete task
   */
  const completeTask = useCallback(async (taskId) => {
    setError(null);

    try {
      const response = await axios.put(`/api/followups/${taskId}/complete`);
      
      // Update local state
      setTasks(prev => prev.map(t => 
        t._id === taskId ? response.data.followUp : t
      ));
      
      if (selectedTask?._id === taskId) {
        setSelectedTask(response.data.followUp);
      }
      
      return {
        success: true,
        task: response.data.followUp,
        message: response.data.message
      };

    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Lỗi khi hoàn thành task';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  }, [selectedTask]);

  /**
   * Fetch statistics
   */
  const fetchStats = useCallback(async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.meeting) params.append('meeting', filters.meeting);
      if (filters.scope) params.append('scope', filters.scope);
      
      const query = params.toString();
      const response = await axios.get(`/api/followups/stats/overview${query ? `?${query}` : ''}`);
      setStats(response.data);
      return { success: true, stats: response.data };

    } catch (err) {
      console.error('Error fetching stats:', err);
      return { success: false, error: err.message };
    }
  }, []);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Format helper: Get status color
   */
  const getStatusColor = useCallback((status) => {
    switch (status) {
      case 'not_started': return 'default';
      case 'in_progress': return 'primary';
      case 'blocked': return 'error';
      case 'completed': return 'success';
      case 'cancelled': return 'default';
      default: return 'default';
    }
  }, []);

  /**
   * Format helper: Get priority color
   */
  const getPriorityColor = useCallback((priority) => {
    switch (priority) {
      case 'low': return 'default';
      case 'medium': return 'info';
      case 'high': return 'warning';
      case 'urgent': return 'error';
      default: return 'default';
    }
  }, []);

  /**
   * Format helper: Get due date status
   */
  const getDueDateStatus = useCallback((task) => {
    if (task.status === 'completed' || task.status === 'cancelled') {
      return { status: 'completed', color: 'success', label: 'Hoàn thành' };
    }
    
    const now = new Date();
    const due = new Date(task.dueDate);
    const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { 
        status: 'overdue', 
        color: 'error', 
        label: `Quá hạn ${Math.abs(diffDays)} ngày` 
      };
    } else if (diffDays === 0) {
      return { status: 'due_today', color: 'warning', label: 'Hết hạn hôm nay' };
    } else if (diffDays <= 3) {
      return { 
        status: 'due_soon', 
        color: 'warning', 
        label: `Còn ${diffDays} ngày` 
      };
    } else {
      return { 
        status: 'normal', 
        color: 'default', 
        label: `Còn ${diffDays} ngày` 
      };
    }
  }, []);

  return {
    tasks,
    selectedTask,
    loading,
    error,
    stats,
    fetchTasks,
    fetchMyTasks,
    fetchTaskDetail,
    createTask,
    updateTask,
    deleteTask,
    addComment,
    updateProgress,
    completeTask,
    fetchStats,
    clearError,
    setSelectedTask,
    getStatusColor,
    getPriorityColor,
    getDueDateStatus
  };
};

export default useFollowUps;

