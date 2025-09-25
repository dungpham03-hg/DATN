import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);
export const useSocket = () => useContext(SocketContext);

const SocketProvider = ({ children }) => {
  const { token } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [isDisabled, setIsDisabled] = useState(false);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 3; // Giảm số lần retry
  const reconnectDelay = 2000; // Tăng delay lên 2 giây

  const connectSocket = () => {
    if (!token || isDisabled) return null;

    const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';
    const SOCKET_SERVER = API_BASE.replace('/api', '');

    const newSocket = io(SOCKET_SERVER, {
      auth: { token },
      autoConnect: true,
      reconnection: false, // Tắt auto reconnection để tránh vòng lặp
      timeout: 15000,
      forceNew: true,
      transports: ['websocket', 'polling'],
      path: '/socket.io',
      withCredentials: false,
      upgrade: false,
      rememberUpgrade: false
    });

    // Connection event handlers
    newSocket.on('connect', () => {
      setIsConnected(true);
      setConnectionError(null);
      reconnectAttemptsRef.current = 0;
    });

    newSocket.on('disconnect', (reason) => {
      setIsConnected(false);
      
      // Nếu disconnect không phải do client, thử reconnect
      if (reason !== 'io client disconnect' && token) {
        scheduleReconnect();
      }
    });

    newSocket.on('connect_error', (error) => {
      setConnectionError(error.message);
      setIsConnected(false);
      
      // Chỉ thử reconnect nếu chưa vượt quá số lần thử
      if (token && reconnectAttemptsRef.current < maxReconnectAttempts) {
        scheduleReconnect();
      } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
        setIsDisabled(true);
        setConnectionError('Không thể kết nối Socket.IO. Đã tắt real-time connection.');
      }
    });

    newSocket.on('reconnect', (attemptNumber) => {
      setIsConnected(true);
      setConnectionError(null);
      reconnectAttemptsRef.current = 0;
    });

    newSocket.on('reconnect_attempt', (attemptNumber) => {
      reconnectAttemptsRef.current = attemptNumber;
    });

    newSocket.on('reconnect_error', (error) => {
      setConnectionError(error.message);
    });

    newSocket.on('reconnect_failed', () => {
      setConnectionError('Không thể kết nối lại. Vui lòng tải lại trang.');
      setIsConnected(false);
    });

    return newSocket;
  };

  const scheduleReconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (reconnectAttemptsRef.current >= maxReconnectAttempts || isDisabled) {
      return;
    }

    const delay = Math.min(reconnectDelay * Math.pow(2, reconnectAttemptsRef.current), 30000); // Max 30s
    reconnectAttemptsRef.current++;

    reconnectTimeoutRef.current = setTimeout(() => {
      if (token && !socket?.connected && !isDisabled) {
        const newSocket = connectSocket();
        if (newSocket) {
          setSocket(newSocket);
        }
      }
    }, delay);
  };

  useEffect(() => {
    if (!token || isDisabled) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
        setConnectionError(null);
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      reconnectAttemptsRef.current = 0;
      return;
    }

    // Tạo socket mới khi có token và chưa bị disable
    const newSocket = connectSocket();
    setSocket(newSocket);

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, [token, isDisabled]);

  const value = {
    socket,
    isConnected,
    connectionError,
    isDisabled,
    // Function để reset và thử lại
    resetSocket: () => {
      setIsDisabled(false);
      setConnectionError(null);
      reconnectAttemptsRef.current = 0;
      if (token) {
        const newSocket = connectSocket();
        setSocket(newSocket);
      }
    },
    // Function để tắt hoàn toàn Socket.IO
    disableSocket: () => {
      setIsDisabled(true);
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      setConnectionError('Socket.IO đã bị tắt thủ công');
    }
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketProvider; 