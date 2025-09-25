import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';
import { ToastContainer } from '../components/Toast';

const NotificationContext = createContext();

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const { token, user } = useAuth();
  const { socket, isConnected, connectionError, isDisabled } = useSocket();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [lastFetchTime, setLastFetchTime] = useState(null);
  
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';
  const pollingIntervalRef = useRef(null);
  const POLLING_INTERVAL = 30000; // 30 seconds
  const lastNotificationIdRef = useRef(null);

  // Fetch notifications từ server với error handling và retry
  const fetchNotifications = async (showLoading = true) => {
    if (!token) return;
    
    try {
      if (showLoading) setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000 // 10 second timeout
      });
      
      const newNotifications = response.data.notifications || [];
      const newUnreadCount = response.data.unreadCount || 0;
      
      // Chỉ cập nhật nếu có thay đổi
      setNotifications(prev => {
        if (JSON.stringify(prev) !== JSON.stringify(newNotifications)) {
          return newNotifications;
        }
        return prev;
      });
      
      setUnreadCount(newUnreadCount);
      setLastFetchTime(new Date());
      
      // Lưu ID của notification mới nhất
      if (newNotifications.length > 0) {
        lastNotificationIdRef.current = newNotifications[0]._id;
      }
    } catch (error) {
      console.error('❌ Error fetching notifications:', error);
      if (error.response?.status === 401) {
        // Token expired, sẽ được xử lý bởi auth interceptor
        return;
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Polling backup khi Socket.IO không hoạt động
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    
    pollingIntervalRef.current = setInterval(() => {
      if (token && (!isConnected || connectionError)) {
        fetchNotifications(false); // Không hiển thị loading khi polling
      }
    }, POLLING_INTERVAL);
  }, [token, isConnected, connectionError]);

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  // Đánh dấu thông báo đã đọc
  const markAsRead = async (notificationId) => {
    try {
      await axios.put(
        `${API_BASE_URL}/notifications/${notificationId}/read`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setNotifications(prev => 
        prev.map(notif => 
          notif._id === notificationId 
            ? { ...notif, read: true, readAt: new Date() }
            : notif
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Đánh dấu tất cả đã đọc
  const markAllAsRead = async () => {
    try {
      await axios.put(
        `${API_BASE_URL}/notifications/read-all`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, read: true, readAt: new Date() }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Xóa thông báo
  const deleteNotification = async (notificationId) => {
    try {
      await axios.delete(
        `${API_BASE_URL}/notifications/${notificationId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setNotifications(prev => prev.filter(notif => notif._id !== notificationId));
      setUnreadCount(prev => {
        const notif = notifications.find(n => n._id === notificationId);
        return notif && !notif.read ? prev - 1 : prev;
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  // Lắng nghe real-time notifications từ Socket.IO với improved handling
  useEffect(() => {
    if (!socket || !user) return;

    const handleNewNotification = (notification) => {
      // Kiểm tra xem notification đã tồn tại chưa (tránh duplicate)
      setNotifications(prev => {
        const exists = prev.some(n => n._id === notification._id);
        if (!exists) {
          return [notification, ...prev];
        }
        return prev;
      });
      
      setUnreadCount(prev => prev + 1);
      
      // Hiển thị browser notification nếu được phép
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/favicon.ico',
          tag: notification._id,
          requireInteraction: true,
          silent: false
        });
      }
    };

    socket.on('newNotification', handleNewNotification);

    return () => {
      socket.off('newNotification', handleNewNotification);
    };
  }, [socket, user]);

  // Quản lý polling dựa trên trạng thái Socket.IO
  useEffect(() => {
    if (token && user) {
      if (isConnected && !connectionError && !isDisabled) {
        // Socket.IO hoạt động tốt, dừng polling
        stopPolling();
      } else {
        // Socket.IO có vấn đề hoặc bị disable, bắt đầu polling
        startPolling();
      }
    } else {
      stopPolling();
    }
  }, [token, user, isConnected, connectionError, isDisabled, startPolling, stopPolling]);

  // Fetch notifications khi user login và cleanup
  useEffect(() => {
    if (token && user) {
      fetchNotifications();
      
      // Request permission cho browser notifications
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
    } else {
      // Clear data khi logout
      setNotifications([]);
      setUnreadCount(0);
      setLastFetchTime(null);
      stopPolling();
    }

    // Cleanup function
    return () => {
      stopPolling();
    };
  }, [token, user, stopPolling]);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random();
    const newToast = {
      id,
      message,
      type,
      duration
    };
    
    setToasts(prev => [...prev, newToast]);
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const success = useCallback((message, duration) => addToast(message, 'success', duration), [addToast]);
  const error = useCallback((message, duration) => addToast(message, 'error', duration), [addToast]);
  const warning = useCallback((message, duration) => addToast(message, 'warning', duration), [addToast]);
  const info = useCallback((message, duration) => addToast(message, 'info', duration), [addToast]);

  const value = {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    success,
    error,
    warning,
    info,
    addToast,
    removeToast,
    // Thêm các state mới
    isConnected,
    connectionError,
    isDisabled,
    lastFetchTime
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </NotificationContext.Provider>
  );
}; 