import React, { createContext, useContext, useReducer, useEffect } from 'react';
import axios from 'axios';
import { toast } from '../utils/toast';


// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

// Initial state
const initialState = {
  user: null,
  token: null,
  loading: true,
  isAuthenticated: false
};

// Action types
const AUTH_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGOUT: 'LOGOUT',
  UPDATE_USER: 'UPDATE_USER',
  AUTH_ERROR: 'AUTH_ERROR'
};

// Reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case AUTH_ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: action.payload
      };
    
    case AUTH_ACTIONS.LOGIN_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        loading: false
      };
    
    case AUTH_ACTIONS.LOGOUT:
      return {
        ...initialState,
        loading: false
      };
    
    case AUTH_ACTIONS.UPDATE_USER:
      return {
        ...state,
        user: action.payload
      };
    
    case AUTH_ACTIONS.AUTH_ERROR:
      return {
        ...initialState,
        loading: false
      };
    
    default:
      return state;
  }
};

// Create context
export const AuthContext = createContext();

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Auth Provider component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const [isLoggingIn, setIsLoggingIn] = React.useState(false);
  


  // Set up axios interceptors
  useEffect(() => {
    // Request interceptor to add token
    const requestInterceptor = axios.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle token expiry
    const responseInterceptor = axios.interceptors.response.use(
      (res) => res,
      (err) => {
        if (
          err.response?.status === 401 &&
          !isLoggingIn &&             // KHÔNG trong lúc "login"
          state.isAuthenticated       // Đã đăng nhập trước đó
        ) {
          // Đăng xuất "im lặng" để tránh toast "Đã đăng xuất"
          logout(true);
          toast.error('Phiên đăng nhập đã hết hạn');
        }
        return Promise.reject(err);
      }
    );

    // Cleanup interceptors
    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, []);

  // Check if user is logged in on mount
  useEffect(() => {
    checkAuth();
  }, []);

  // Check authentication status
  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
        return;
      }
      
      // Lấy thông tin user
      const response = await axios.get(`${API_BASE_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      dispatch({
        type: AUTH_ACTIONS.LOGIN_SUCCESS,
        payload: {
          user: response.data.user,
          token
        }
      });
    } catch (error) {
      localStorage.removeItem('token');
      dispatch({ type: AUTH_ACTIONS.AUTH_ERROR });
    }
  };

  // Login function
  const login = async (emailOrToken, password, userOverride = null) => {
    try {
      setIsLoggingIn(true);
      toast.dismiss();
      
      let response;
      let token;
      let user;

      // Nếu chỉ có một tham số và nó là string dài, coi như đó là token từ OAuth
      if (typeof emailOrToken === 'string' && !password && emailOrToken.length > 50) {
        token = emailOrToken;
        
        // Lưu token vào localStorage
        localStorage.setItem('token', token);

        if (userOverride) {
          user = userOverride;
        } else {
          // Lấy thông tin user
          try {
            response = await axios.get(`${API_BASE_URL}/auth/me`, {
              headers: {
                Authorization: `Bearer ${token}`
              }
            });
            user = response.data.user;
          } catch (error) {
            localStorage.removeItem('token');
            throw new Error('Không thể lấy thông tin người dùng');
          }
        }
      } else {
        // Đăng nhập thông thường bằng email/password
        try {
          response = await axios.post(`${API_BASE_URL}/auth/login`, {
            email: emailOrToken,
            password
          });
          token = response.data.token;
          user = response.data.user;
          localStorage.setItem('token', token);
        } catch (error) {
          throw error;
        }
      }

      // Cập nhật state
      dispatch({
        type: AUTH_ACTIONS.LOGIN_SUCCESS,
        payload: {
          user,
          token
        }
      });

      return { user, token };
    } catch (error) {
      dispatch({ type: AUTH_ACTIONS.AUTH_ERROR });
      throw error;
    } finally {
      setIsLoggingIn(false);
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
    }
  };

  // Register function
  const register = async (userData) => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
      
      const response = await axios.post(`${API_BASE_URL}/auth/register`, userData);

      const { user, token, refreshToken } = response.data;

      // Store tokens
      localStorage.setItem('token', token);
      localStorage.setItem('refreshToken', refreshToken);

      dispatch({
        type: AUTH_ACTIONS.LOGIN_SUCCESS,
        payload: { user, token }
      });

      toast.success('Đăng ký thành công!');
      return { success: true };
    } catch (error) {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
      const message = error.response?.data?.message || 'Đăng ký thất bại';
      toast.error(message);
      return { success: false, message };
    }
  };

  // Logout function
  const logout = React.useCallback(
    (silent = false) => {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      dispatch({ type: AUTH_ACTIONS.LOGOUT });

      // Chỉ toast khi user thực sự đã đăng nhập và không ở chế độ silent
      if (!silent && state.isAuthenticated) toast.info('Đã đăng xuất');
    },
    [state.isAuthenticated]
  );

  // Update user profile
  const updateProfile = async (userData, skipToast = false) => {
    try {
      const response = await axios.put(`${API_BASE_URL}/auth/profile`, userData);
      
      // Cập nhật ngay lập tức trong context
      dispatch({
        type: AUTH_ACTIONS.UPDATE_USER,
        payload: response.data.user
      });

      if (!skipToast) {
        toast.success('Cập nhật profile thành công!');
      }
      return { success: true, user: response.data.user };
    } catch (error) {
      const message = error.response?.data?.message || 'Cập nhật profile thất bại';
      if (!skipToast) {
        toast.error(message);
      }
      return { success: false, message };
    }
  };

  // Update user data immediately (for real-time sync)
  const updateUserData = (userData) => {
    dispatch({
      type: AUTH_ACTIONS.UPDATE_USER,
      payload: { ...state.user, ...userData }
    });
  };

  // Change password
  const changePassword = async (currentPassword, newPassword) => {
    try {
      await axios.post(`${API_BASE_URL}/auth/change-password`, {
        currentPassword,
        newPassword
      });

      toast.success('Đổi mật khẩu thành công!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Đổi mật khẩu thất bại';
      toast.error(message);
      return { success: false, message };
    }
  };

  const value = {
    ...state,
    dispatch,
    login,
    register,
    logout,
    updateProfile,
    updateUserData,
    changePassword,
    checkAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 