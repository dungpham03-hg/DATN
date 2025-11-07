import React, { useState } from 'react';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  Badge,
  Chip,
  Tooltip,
  Collapse,
  Stack,
  useTheme,
  alpha,
  ListSubheader,
  Button,
  Grid as Col
} from '@mui/material';
import {
  Menu as MenuIcon,
  ChevronLeft as ChevronLeftIcon,
  Dashboard as DashboardIcon,
  CalendarMonth as CalendarIcon,
  MeetingRoom as RoomIcon,
  Archive as ArchiveIcon,
  Person as PersonIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Notifications as NotificationsIcon,
  ExpandLess,
  ExpandMore,
  Groups as GroupsIcon,
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  EventNote as EventNoteIcon,
  AdminPanelSettings as AdminIcon,
  Mail as MailIcon,
  Search as SearchIcon} from '@mui/icons-material';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useGlobalLoading } from '../../contexts/GlobalLoadingContext';
import BackdropLoading from '../BackdropLoading/MaterialBackdropLoading';
import MaterialNotificationPopup from '../Notifications/MaterialNotificationPopup';
import GlobalSearch from '../Search/GlobalSearch';

const drawerWidth = 280;
const miniDrawerWidth = 64;

// Custom transition timing
const transitionDuration = 300;
const transitionEasing = 'cubic-bezier(0.4, 0, 0.2, 1)';

const MaterialLayout = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { unreadCount, isConnected, connectionError, isDisabled } = useNotification();
  const { isLoading, loadingText, loadingType } = useGlobalLoading();
  
  const [open, setOpen] = useState(true);
  const [anchorEl, setAnchorEl] = useState(null);
  const [notificationAnchor, setNotificationAnchor] = useState(null);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

  const handleDrawerToggle = () => {
    setOpen(!open);
  };

  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = (event) => {
    setNotificationAnchor(event.currentTarget);
  };

  const handleNotificationClose = () => {
    setNotificationAnchor(null);
  };

  const handleLogout = () => {
    handleMenuClose();
    logout();
  };

  const handleNavigate = (path) => {
    navigate(path);
  };

  const toggleAdminMenu = () => {
    setAdminMenuOpen(!adminMenuOpen);
  };

  // Menu items chính
  const mainMenuItems = [
    { 
      text: 'Trang chủ', 
      icon: <DashboardIcon />, 
      path: '/dashboard',
      color: theme.palette.primary.main
    },
    { 
      text: 'Lịch họp', 
      icon: <CalendarIcon />, 
      path: '/meetings',
      color: theme.palette.info.main
    },
    { 
      text: 'Phòng họp', 
      icon: <RoomIcon />, 
      path: '/meeting-rooms',
      color: theme.palette.success.main
    },
    { 
      text: 'Lưu trữ', 
      icon: <ArchiveIcon />, 
      path: '/archives',
      color: theme.palette.warning.main
    },
    { 
      text: 'Lời mời', 
      icon: <MailIcon />, 
      path: '/invitations',
      color: theme.palette.secondary.main
    },
  ];

  // Menu items user
  const userMenuItems = [
    { 
      text: 'Hồ sơ', 
      icon: <PersonIcon />, 
      path: '/profile',
      color: theme.palette.primary.main
    },
    { 
      text: 'Cài đặt', 
      icon: <SettingsIcon />, 
      path: '/settings',
      color: theme.palette.text.secondary
    },
  ];

  // Admin menu items
  const adminMenuItems = [
    { 
      text: 'Duyệt phòng họp', 
      icon: <RoomIcon />, 
      path: '/room-approvals',
      roles: ['technician']
    },
    { 
      text: 'Phê duyệt cuộc họp', 
      icon: <ScheduleIcon />, 
      path: '/meeting-approvals',
      roles: ['admin', 'manager']
    },
    { 
      text: 'Phê duyệt biên bản', 
      icon: <CheckCircleIcon />, 
      path: '/protocol-approvals',
      roles: ['admin', 'manager']
    },
    { 
      text: 'Quản lý người dùng', 
      icon: <GroupsIcon />, 
      path: '/users',
      roles: ['admin', 'manager']
    },
    { 
      text: 'Báo cáo thống kê', 
      icon: <AssignmentIcon />, 
      path: '/reports',
      roles: ['admin', 'manager']
    },
  ];

  // Kiểm tra quyền admin
  const hasAdminAccess = user && ['admin', 'manager', 'technician'].includes(user.role);
  const visibleAdminItems = adminMenuItems.filter(item => 
    !item.roles || item.roles.includes(user?.role)
  );

  const getUserAvatar = () => {
    if (user?.avatar && user.avatar.startsWith('/uploads')) {
      return `${API_BASE_URL.replace('/api', '')}${user.avatar}`;
    }
    return user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.fullName || user?.email || 'U')}&background=1976d2&color=fff&bold=true`;
  };

  const isActivePath = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const getUserRole = () => {
    const roles = {
      admin: { label: 'Quản trị viên', color: 'error' },
      manager: { label: 'Quản lý', color: 'warning' },
      secretary: { label: 'Thư ký', color: 'info' },
      technician: { label: 'Kỹ thuật viên', color: 'info' },
      employee: { label: 'Nhân viên', color: 'default' },
      user: { label: 'Người dùng', color: 'default' }
    };
    return roles[user?.role] || roles.user;
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* AppBar */}
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${open ? drawerWidth : miniDrawerWidth}px)` },
          ml: { sm: `${open ? drawerWidth : miniDrawerWidth}px` },
          transition: theme.transitions.create(['margin', 'width'], {
            easing: transitionEasing,
            duration: `${transitionDuration}ms`
          }),
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          color: 'text.primary',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
          borderBottom: `1px solid rgba(226, 232, 240, 0.8)`}}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="toggle drawer"
            onClick={handleDrawerToggle}
            edge="start"
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {mainMenuItems.find(item => isActivePath(item.path))?.text || 
             visibleAdminItems.find(item => isActivePath(item.path))?.text || 
             'Meeting Manager'}
          </Typography>

          <Stack direction="row" spacing={1} alignItems="center">
            {/* Global Search */}
            <Tooltip title="Tìm kiếm (Ctrl+K)">
              <IconButton
                onClick={() => setSearchOpen(true)}
                sx={{
                  color: 'text.secondary',
                  '&:hover': {
                    bgcolor: alpha(theme.palette.action.hover, 0.08),
                    transform: 'scale(1.05)'
                  }
                }}
              >
                <SearchIcon />
              </IconButton>
            </Tooltip>

            {/* Notifications */}
             <Tooltip title={
               isDisabled
                 ? `Thông báo (${unreadCount || 0} chưa đọc) - Socket.IO đã tắt`
                 : connectionError 
                   ? `Thông báo (${unreadCount || 0} chưa đọc) - Kết nối có vấn đề: ${connectionError}`
                   : isConnected 
                     ? `Thông báo (${unreadCount || 0} chưa đọc) - Kết nối ổn định`
                     : `Thông báo (${unreadCount || 0} chưa đọc) - Đang kết nối...`
             }>
               <IconButton 
                 onClick={handleNotificationClick}
                 sx={{ 
                   color: isDisabled 
                     ? theme.palette.grey[500]
                     : isConnected 
                       ? theme.palette.primary.main 
                       : theme.palette.warning.main,
                   bgcolor: isDisabled
                     ? alpha(theme.palette.grey[500], 0.1)
                     : isConnected 
                       ? alpha(theme.palette.primary.main, 0.1)
                       : alpha(theme.palette.warning.main, 0.1),
                   border: `1px solid ${isDisabled
                     ? alpha(theme.palette.grey[500], 0.2)
                     : isConnected 
                       ? alpha(theme.palette.primary.main, 0.2)
                       : alpha(theme.palette.warning.main, 0.2)}`,
                   position: 'relative',
                   '&:hover': {
                     bgcolor: isDisabled
                       ? alpha(theme.palette.grey[500], 0.15)
                       : isConnected 
                         ? alpha(theme.palette.primary.main, 0.15)
                         : alpha(theme.palette.warning.main, 0.15),
                     color: isDisabled
                       ? theme.palette.grey[600]
                       : isConnected 
                         ? theme.palette.primary.dark
                         : theme.palette.warning.dark,
                     transform: 'scale(1.05)',
                     boxShadow: theme.shadows[4]
                   },
                   transition: 'all 0.2s ease-in-out'
                 }}
               >
                 <Badge 
                   badgeContent={unreadCount > 0 ? unreadCount : null} 
                   color="error"
                   max={99}
                   sx={{
                     '& .MuiBadge-badge': {
                       fontSize: '0.75rem',
                       minWidth: '18px',
                       height: '18px',
                       borderRadius: '9px',
                       border: `2px solid ${theme.palette.background.paper}`,
                       boxShadow: theme.shadows[3],
                       fontWeight: 'bold'
                     }
                   }}
                 >
                   <NotificationsIcon sx={{ fontSize: '1.4rem' }} />
                 </Badge>
                 {/* Connection status indicator */}
                 <Box
                   sx={{
                     position: 'absolute',
                     top: 2,
                     right: 2,
                     width: 8,
                     height: 8,
                     borderRadius: '50%',
                     bgcolor: isDisabled
                       ? theme.palette.grey[400]
                       : isConnected 
                         ? theme.palette.success.main 
                         : connectionError 
                           ? theme.palette.error.main 
                           : theme.palette.warning.main,
                     border: `1px solid ${theme.palette.background.paper}`,
                     boxShadow: theme.shadows[1]
                   }}
                 />
               </IconButton>
             </Tooltip>

            {/* User Avatar & Menu */}
            <Tooltip title="Tài khoản">
              <IconButton
                onClick={handleProfileMenuOpen}
                sx={{ p: 0.5 }}
              >
                <Avatar
                  alt={user?.fullName || 'User'}
                  src={getUserAvatar()}
                  sx={{ 
                    width: 36, 
                    height: 36,
                    bgcolor: theme.palette.primary.main,
                    fontSize: '1rem'}}
                />
              </IconButton>
            </Tooltip>
          </Stack>
        </Toolbar>
      </AppBar>

             {/* User Menu */}
       <Menu
         anchorEl={anchorEl}
         open={Boolean(anchorEl)}
         onClose={handleMenuClose}
         transformOrigin={{ horizontal: 'right', vertical: 'top' }}
         anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
         PaperProps={{
           elevation: 12,
           sx: {
             mt: 1.5,
             minWidth: 280,
             borderRadius: 3,
             overflow: 'visible',
             filter: 'drop-shadow(0px 4px 20px rgba(0,0,0,0.15))',
             border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
             '&:before': {
               content: '""',
               display: 'block',
               position: 'absolute',
               top: 0,
               right: 20,
               width: 12,
               height: 12,
               bgcolor: 'background.paper',
               transform: 'translateY(-50%) rotate(45deg)',
               zIndex: 0,
               border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
               borderBottom: 'none',
               borderRight: 'none'
             }
           }
         }}
       >
         {/* User Info Header */}
         <Box sx={{ 
           px: 3, 
           py: 2.5, 
           background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
           color: 'white',
           position: 'relative',
           overflow: 'hidden'
         }}>
           <Box sx={{ position: 'relative', zIndex: 1 }}>
             <Stack direction="row" spacing={2} alignItems="center">
               <Avatar
                 alt={user?.fullName || 'User'}
                 src={getUserAvatar()}
                 sx={{ 
                   width: 56, 
                   height: 56,
                   border: '3px solid rgba(255,255,255,0.2)',
                   boxShadow: theme.shadows[4]
                 }}
               />
               <Box sx={{ flex: 1, minWidth: 0 }}>
                 <Typography variant="h6" fontWeight={600} noWrap sx={{ color: 'white' }}>
                   {user?.fullName || 'Người dùng'}
                 </Typography>
                 <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }} noWrap>
                   {user?.email}
                 </Typography>
                 <Chip 
                   label={getUserRole().label} 
                   size="small" 
                   sx={{ 
                     bgcolor: 'rgba(255,255,255,0.2)',
                     color: 'white',
                     fontWeight: 500,
                     border: '1px solid rgba(255,255,255,0.3)'
                   }}
                 />
               </Box>
             </Stack>
           </Box>
           {/* Decorative background pattern */}
           <Box sx={{
             position: 'absolute',
             top: -20,
             right: -20,
             width: 80,
             height: 80,
             borderRadius: '50%',
             bgcolor: 'rgba(255,255,255,0.1)',
             zIndex: 0
           }} />
           <Box sx={{
             position: 'absolute',
             bottom: -30,
             left: -30,
             width: 60,
             height: 60,
             borderRadius: '50%',
             bgcolor: 'rgba(255,255,255,0.08)',
             zIndex: 0
           }} />
         </Box>

         {/* Menu Items */}
         <Box sx={{ py: 1 }}>
           <MenuItem 
             onClick={() => { handleMenuClose(); navigate('/profile'); }}
             sx={{ 
               mx: 1,
               borderRadius: 2,
               py: 1.5,
               '&:hover': {
                 bgcolor: alpha(theme.palette.primary.main, 0.08)
               }
             }}
           >
             <ListItemIcon sx={{ color: theme.palette.primary.main }}>
               <PersonIcon />
             </ListItemIcon>
             <ListItemText 
               primary="Hồ sơ cá nhân"
               primaryTypographyProps={{ fontWeight: 500 }}
             />
           </MenuItem>
           
           <MenuItem 
             onClick={() => { handleMenuClose(); navigate('/settings'); }}
             sx={{ 
               mx: 1,
               borderRadius: 2,
               py: 1.5,
               '&:hover': {
                 bgcolor: alpha(theme.palette.info.main, 0.08)
               }
             }}
           >
             <ListItemIcon sx={{ color: theme.palette.info.main }}>
               <SettingsIcon />
             </ListItemIcon>
             <ListItemText 
               primary="Cài đặt"
               primaryTypographyProps={{ fontWeight: 500 }}
             />
           </MenuItem>
         </Box>

         <Divider sx={{ mx: 2 }} />

         {/* Logout */}
         <Box sx={{ py: 1 }}>
           <MenuItem 
             onClick={handleLogout}
             sx={{ 
               mx: 1,
               borderRadius: 2,
               py: 1.5,
               '&:hover': {
                 bgcolor: alpha(theme.palette.error.main, 0.08)
               }
             }}
           >
             <ListItemIcon sx={{ color: theme.palette.error.main }}>
               <LogoutIcon />
             </ListItemIcon>
             <ListItemText 
               primary="Đăng xuất"
               primaryTypographyProps={{
                 color: 'error.main',
                 fontWeight: 500
               }}
             />
           </MenuItem>
         </Box>
       </Menu>

      {/* Notification Popup */}
      <Menu
        anchorEl={notificationAnchor}
        open={Boolean(notificationAnchor)}
        onClose={handleNotificationClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          elevation: 8,
          sx: {
            mt: 1.5,
            minWidth: 360,
            maxWidth: 400,
            borderRadius: 3,
            overflow: 'visible',
            filter: 'drop-shadow(0px 4px 16px rgba(0,0,0,0.15))',
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            '&:before': {
              content: '""',
              display: 'block',
              position: 'absolute',
              top: 0,
              right: 20,
              width: 12,
              height: 12,
              bgcolor: 'background.paper',
              transform: 'translateY(-50%) rotate(45deg)',
              zIndex: 0,
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              borderBottom: 'none',
              borderRight: 'none'
            }
          }
        }}
        slotProps={{
          paper: {
            style: {
              maxHeight: '70vh'
            }
          }
        }}
      >
        <MaterialNotificationPopup onClose={handleNotificationClose} />
      </Menu>

      {/* Drawer */}
      <Drawer
        variant="permanent"
        open={open}
        sx={{
          width: open ? drawerWidth : miniDrawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: open ? drawerWidth : miniDrawerWidth,
            boxSizing: 'border-box',
            transition: theme.transitions.create(['width', 'margin', 'padding'], {
              easing: transitionEasing,
              duration: `${transitionDuration}ms`
            }),
            overflowX: 'hidden',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            borderRight: `1px solid rgba(226, 232, 240, 0.8)`,
            // Fix border alignment and component spacing when collapsed
            // Smooth transitions for all elements
            '& *': {
              transition: theme.transitions.create(['all'], {
                easing: transitionEasing,
                duration: `${transitionDuration}ms`
              })
            },
            // Apply styles conditionally with smooth transitions
            '& .MuiList-root': {
              paddingLeft: open ? '8px' : '4px',
              paddingRight: open ? '8px' : '4px',
              transition: theme.transitions.create(['padding'], {
                easing: transitionEasing,
                duration: `${transitionDuration}ms`
              })
            },
            '& .MuiListItem-root': {
              paddingLeft: '0px',
              paddingRight: '0px',
              marginBottom: open ? '8px' : '4px',
              transition: theme.transitions.create(['margin'], {
                easing: transitionEasing,
                duration: `${transitionDuration}ms`
              })
            },
            '& .MuiListItemButton-root': {
              minHeight: '48px',
              paddingLeft: open ? '16px' : '12px',
              paddingRight: open ? '16px' : '12px',
              justifyContent: open ? 'flex-start' : 'center',
              borderRadius: '8px',
              margin: open ? '0 8px' : '0 4px',
              transition: theme.transitions.create(['padding', 'margin', 'justify-content'], {
                easing: transitionEasing,
                duration: `${transitionDuration}ms`
              })
            },
            '& .MuiListItemIcon-root': {
              minWidth: open ? '40px' : 'auto',
              marginRight: open ? '16px' : '0',
              transition: theme.transitions.create(['min-width', 'margin'], {
                easing: transitionEasing,
                duration: `${transitionDuration}ms`
              })
            },
            '& .MuiListItemText-root': {
              opacity: open ? 1 : 0,
              transform: open ? 'translateX(0)' : 'translateX(-20px)',
              transition: theme.transitions.create(['opacity', 'transform'], {
                easing: transitionEasing,
                duration: open ? `${transitionDuration}ms` : `${transitionDuration / 2}ms`,
                delay: open ? `${transitionDuration / 3}ms` : '0ms'
              })
            },
            '& .MuiCollapse-root': {
              display: open ? 'block' : 'none'
            },
            '& .MuiDivider-root': {
              marginLeft: open ? '16px' : '8px',
              marginRight: open ? '16px' : '8px',
              transition: theme.transitions.create(['margin'], {
                easing: transitionEasing,
                duration: `${transitionDuration}ms`
              })
            },
            // Smooth typography transitions
            '& .MuiTypography-root': {
              opacity: open ? 1 : 0,
              transform: open ? 'translateX(0)' : 'translateX(-10px)',
              transition: theme.transitions.create(['opacity', 'transform'], {
                easing: transitionEasing,
                duration: open ? `${transitionDuration}ms` : `${transitionDuration / 2}ms`,
                delay: open ? `${transitionDuration / 4}ms` : '0ms'
              })
            },
            // Expand/collapse icons smooth rotation
            '& .MuiSvgIcon-root': {
              transition: theme.transitions.create(['transform', 'opacity'], {
                easing: transitionEasing,
                duration: `${transitionDuration / 2}ms`
              })
            }
          }}}
      >
        {/* Drawer Header */}
        <Toolbar
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: open ? 'space-between' : 'center',
            px: open ? 2 : 1,
            borderBottom: `1px solid ${theme.palette.divider}`,
            transition: theme.transitions.create(['padding', 'justify-content'], {
              easing: transitionEasing,
              duration: `${transitionDuration}ms`
            })
          }}
        >
          {open && (
            <Stack 
              direction="row" 
              spacing={1} 
              alignItems="center"
              sx={{
                opacity: open ? 1 : 0,
                transform: open ? 'translateX(0)' : 'translateX(-20px)',
                transition: theme.transitions.create(['opacity', 'transform'], {
                  easing: transitionEasing,
                  duration: open ? `${transitionDuration}ms` : `${transitionDuration / 2}ms`,
                  delay: open ? `${transitionDuration / 4}ms` : '0ms'
                })
              }}
            >
              <EventNoteIcon 
                color="primary" 
                sx={{ 
                  fontSize: 32,
                  transition: theme.transitions.create(['transform'], {
                    easing: transitionEasing,
                    duration: `${transitionDuration / 2}ms`
                  }),
                  '&:hover': {
                    transform: 'scale(1.1)'
                  }
                }} 
              />
              <Box>
                <Typography 
                  variant="h6" 
                  fontWeight={600} 
                  color="primary"
                  sx={{
                    transition: theme.transitions.create(['opacity'], {
                      easing: transitionEasing,
                      duration: `${transitionDuration}ms`
                    })
                  }}
                >
                  Meeting Pro
                </Typography>
              </Box>
            </Stack>
          )}
          
          <IconButton 
            onClick={handleDrawerToggle} 
            size="small"
            sx={{
              position: open ? 'static' : 'absolute',
              top: open ? 'auto' : '50%',
              left: open ? 'auto' : '50%',
              transform: open ? 'none' : 'translate(-50%, -50%)',
              transition: theme.transitions.create(['transform', 'background-color', 'position'], {
                easing: transitionEasing,
                duration: `${transitionDuration / 2}ms`
              }),
              '&:hover': {
                transform: open ? 'scale(1.1)' : 'translate(-50%, -50%) scale(1.1)',
                bgcolor: alpha(theme.palette.primary.main, 0.1)
              }
            }}
          >
            {open ? <ChevronLeftIcon /> : <MenuIcon />}
          </IconButton>
        </Toolbar>

        {/* Main Menu */}
        <List sx={{ px: 1, pt: 2 }}>

          {mainMenuItems.map((item) => (
            <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => handleNavigate(item.path)}
                selected={isActivePath(item.path)}
                sx={{
                  borderRadius: 2,
                  mx: 0.5,
                  '&.Mui-selected': {
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.12)},
                    '& .MuiListItemIcon-root': {
                      color: theme.palette.primary.main}}}}
              >
                <ListItemIcon
                  sx={{
                    minWidth: open ? 40 : 'auto',
                    color: isActivePath(item.path) ? item.color : 'text.secondary'}}
                >
                  <Tooltip title={!open ? item.text : ''} placement="right">
                    {item.icon}
                  </Tooltip>
                </ListItemIcon>
                {open && (
                  <ListItemText 
                    primary={item.text}
                    primaryTypographyProps={{
                      fontSize: '0.938rem',
                      fontWeight: isActivePath(item.path) ? 500 : 400
                    }}
                  />
                )}
              </ListItemButton>
            </ListItem>
          ))}
        </List>

        {/* Admin Menu */}
        {hasAdminAccess && (
          <>
            <Divider sx={{ my: 1, mx: 2 }} />
            <List sx={{ px: 1 }}>
              {open && (
                <ListItemButton onClick={toggleAdminMenu} sx={{ borderRadius: 2, mx: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 40, color: 'error.main' }}>
                    <AdminIcon />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Quản trị"
                    primaryTypographyProps={{ fontSize: '0.938rem', fontWeight: 500 }}
                  />
                  {adminMenuOpen ? <ExpandLess /> : <ExpandMore />}
                </ListItemButton>
              )}
              
              <Collapse in={adminMenuOpen || !open} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                  {visibleAdminItems.map((item) => (
                    <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
                      <ListItemButton
                        onClick={() => handleNavigate(item.path)}
                        selected={isActivePath(item.path)}
                        sx={{
                          borderRadius: 2,
                          mx: 0.5,
                          pl: open ? 4 : 2,
                          '&.Mui-selected': {
                            bgcolor: alpha(theme.palette.error.main, 0.08),
                            '&:hover': {
                              bgcolor: alpha(theme.palette.error.main, 0.12)}}}}
                      >
                        <ListItemIcon
                          sx={{
                            minWidth: open ? 40 : 'auto',
                            color: isActivePath(item.path) ? 'error.main' : 'text.secondary'}}
                        >
                          <Tooltip title={!open ? item.text : ''} placement="right">
                            {item.icon}
                          </Tooltip>
                        </ListItemIcon>
                        {open && (
                          <ListItemText 
                            primary={item.text}
                            primaryTypographyProps={{
                              fontSize: '0.875rem',
                              fontWeight: isActivePath(item.path) ? 500 : 400
                            }}
                          />
                        )}
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              </Collapse>
            </List>
          </>
        )}

        {/* User Profile Menu Items */}
        <Box sx={{ mt: 2 }}>
          {userMenuItems.map((item) => (
            <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => handleNavigate(item.path)}
                selected={isActivePath(item.path)}
                sx={{
                  borderRadius: 2,
                  mx: 0.5,
                  '&.Mui-selected': {
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.12)
                    }
                  }
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: open ? 40 : 'auto',
                    color: isActivePath(item.path) ? item.color : 'text.secondary'
                  }}
                >
                  <Tooltip title={!open ? item.text : ''} placement="right">
                    {item.icon}
                  </Tooltip>
                </ListItemIcon>
                {open && (
                  <ListItemText 
                    primary={item.text}
                    primaryTypographyProps={{
                      fontSize: '0.875rem',
                      fontWeight: isActivePath(item.path) ? 500 : 400
                    }}
                  />
                )}
              </ListItemButton>
            </ListItem>
          ))}
        </Box>

        {/* User Section at Bottom */}
        <Box sx={{ 
          mt: 'auto', 
          p: open ? 2 : 1, 
          mx: open ? 0 : 1,
          borderTop: `1px solid ${theme.palette.divider}`,
          borderRadius: open ? 0 : '8px 8px 0 0',
          transition: theme.transitions.create(['padding', 'margin', 'border-radius'], {
            easing: transitionEasing,
            duration: `${transitionDuration}ms`
          })
        }}>
          <Stack 
            direction="row" 
            spacing={open ? 1.5 : 0} 
            alignItems="center"
            justifyContent={open ? 'flex-start' : 'center'}
            sx={{
              transition: theme.transitions.create(['justify-content', 'spacing'], {
                easing: transitionEasing,
                duration: `${transitionDuration}ms`
              })
            }}
          >
            <Avatar
              alt={user?.fullName || 'User'}
              src={getUserAvatar()}
              sx={{ 
                width: open ? 40 : 32, 
                height: open ? 40 : 32,
                transition: theme.transitions.create(['width', 'height'], {
                  easing: transitionEasing,
                  duration: `${transitionDuration}ms`
                }),
                '&:hover': {
                  transform: 'scale(1.05)',
                  boxShadow: theme.shadows[4]
                }
              }}
            />
            <Box 
              sx={{ 
                overflow: 'hidden', 
                flex: 1,
                opacity: open ? 1 : 0,
                transform: open ? 'translateX(0)' : 'translateX(-20px)',
                transition: theme.transitions.create(['opacity', 'transform'], {
                  easing: transitionEasing,
                  duration: open ? `${transitionDuration}ms` : `${transitionDuration / 2}ms`,
                  delay: open ? `${transitionDuration / 3}ms` : '0ms'
                })
              }}
            >
              <Typography 
                variant="body2" 
                fontWeight={500} 
                noWrap
                sx={{
                  transition: theme.transitions.create(['opacity'], {
                    easing: transitionEasing,
                    duration: `${transitionDuration}ms`
                  })
                }}
              >
                {user?.fullName || 'Người dùng'}
              </Typography>
              <Typography 
                variant="caption" 
                color="text.secondary" 
                noWrap
                sx={{
                  transition: theme.transitions.create(['opacity'], {
                    easing: transitionEasing,
                    duration: `${transitionDuration}ms`
                  })
                }}
              >
                {user?.email}
              </Typography>
            </Box>
          </Stack>
        </Box>
      </Drawer>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${open ? drawerWidth : miniDrawerWidth}px)` },
          transition: theme.transitions.create(['margin', 'width'], {
            easing: transitionEasing,
            duration: `${transitionDuration}ms`
          }),
          mt: 8}}
      >
        <Outlet />
      </Box>

      {/* Backdrop Loading */}
      <BackdropLoading 
        open={isLoading}
        message={loadingText}
      />

      {/* Global Search Dialog */}
      <GlobalSearch 
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
      />
    </Box>
  );
};

export default MaterialLayout;
