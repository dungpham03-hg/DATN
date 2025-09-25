import { createTheme, alpha } from '@mui/material/styles';

// Modern Material UI theme với thiết kế hiện đại và gradient
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#3b82f6',
      light: '#60a5fa',
      dark: '#2563eb',
      contrastText: '#ffffff'},
    secondary: {
      main: '#64748b',
      light: '#94a3b8',
      dark: '#475569',
      contrastText: '#ffffff'},
    success: {
      main: '#059669',
      light: '#10b981',
      dark: '#047857'},
    warning: {
      main: '#d97706',
      light: '#f59e0b',
      dark: '#b45309'},
    error: {
      main: '#dc2626',
      light: '#ef4444',
      dark: '#b91c1c'},
    info: {
      main: '#0891b2',
      light: '#06b6d4',
      dark: '#0e7490'},
    background: {
      default: '#f8fafc',
      paper: '#ffffff'},
    text: {
      primary: 'rgba(15, 23, 42, 0.87)',
      secondary: 'rgba(71, 85, 105, 0.7)',
      disabled: 'rgba(148, 163, 184, 0.5)'},
    divider: 'rgba(226, 232, 240, 0.6)'},
  typography: {
    fontFamily: [
      '"Inter"',
      '"Noto Sans"',
      '"Noto Sans Vietnamese"',
      '"Source Sans Pro"',
      '"Open Sans"',
      'Roboto',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif'
    ].join(','),
    fontSize: 14,
    h1: {
      fontSize: '2.5rem',
      fontWeight: 600,
      letterSpacing: '-0.02em',
      lineHeight: 1.2,
      fontFamily: '"Inter", "Noto Sans", sans-serif'},
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      letterSpacing: '-0.02em',
      lineHeight: 1.3,
      fontFamily: '"Inter", "Noto Sans", sans-serif'},
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
      letterSpacing: '-0.015em',
      lineHeight: 1.4,
      fontFamily: '"Inter", "Noto Sans", sans-serif'},
    h4: {
      fontSize: '1.5rem',
      fontWeight: 500,
      letterSpacing: '-0.01em',
      lineHeight: 1.4,
      fontFamily: '"Inter", "Noto Sans", sans-serif'},
    h5: {
      fontSize: '1.25rem',
      fontWeight: 500,
      letterSpacing: '-0.005em',
      lineHeight: 1.5,
      fontFamily: '"Inter", "Noto Sans", sans-serif'},
    h6: {
      fontSize: '1.1rem',
      fontWeight: 500,
      letterSpacing: '0em',
      lineHeight: 1.6,
      fontFamily: '"Inter", "Noto Sans", sans-serif'},
    subtitle1: {
      fontSize: '1rem',
      fontWeight: 400,
      lineHeight: 1.75},
    subtitle2: {
      fontSize: '0.875rem',
      fontWeight: 500,
      lineHeight: 1.57},
    body1: {
      fontSize: '1rem',
      fontWeight: 400,
      lineHeight: 1.7,
      fontFamily: '"Inter", "Noto Sans", "Source Sans Pro", sans-serif'},
    body2: {
      fontSize: '0.875rem',
      fontWeight: 400,
      lineHeight: 1.6,
      fontFamily: '"Inter", "Noto Sans", "Source Sans Pro", sans-serif'},
    button: {
      fontSize: '0.875rem',
      fontWeight: 500,
      letterSpacing: '0.02857em',
      textTransform: 'uppercase'},
    caption: {
      fontSize: '0.75rem',
      fontWeight: 400,
      lineHeight: 1.66},
    overline: {
      fontSize: '0.75rem',
      fontWeight: 400,
      letterSpacing: '0.08333em',
      lineHeight: 2.66,
      textTransform: 'uppercase'}},
  shape: {
    borderRadius: 8},
  spacing: 8,
  shadows: [
    'none',
    '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0 35px 60px -12px rgba(0, 0, 0, 0.3)',
    '0 0 0 1px rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.1)',
    '0 0 0 1px rgba(0, 0, 0, 0.05), 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    '0 0 0 1px rgba(0, 0, 0, 0.05), 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    '0 0 0 1px rgba(0, 0, 0, 0.05), 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    '0 0 0 1px rgba(0, 0, 0, 0.05), 0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0 0 0 1px rgba(0, 0, 0, 0.05), 0 35px 60px -12px rgba(0, 0, 0, 0.3)',
    '0 0 0 1px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(99, 102, 241, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    '0 0 0 1px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(99, 102, 241, 0.1), 0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    '0 0 0 1px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(99, 102, 241, 0.1), 0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    '0 0 0 1px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(99, 102, 241, 0.1), 0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0 0 0 1px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(99, 102, 241, 0.1), 0 35px 60px -12px rgba(0, 0, 0, 0.3)',
    '0 0 0 1px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(99, 102, 241, 0.1), 0 0 0 1px rgba(236, 72, 153, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    '0 0 0 1px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(99, 102, 241, 0.1), 0 0 0 1px rgba(236, 72, 153, 0.1), 0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    '0 0 0 1px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(99, 102, 241, 0.1), 0 0 0 1px rgba(236, 72, 153, 0.1), 0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    '0 0 0 1px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(99, 102, 241, 0.1), 0 0 0 1px rgba(236, 72, 153, 0.1), 0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0 0 0 1px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(99, 102, 241, 0.1), 0 0 0 1px rgba(236, 72, 153, 0.1), 0 35px 60px -12px rgba(0, 0, 0, 0.3)',
    '0 0 0 1px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(99, 102, 241, 0.1), 0 0 0 1px rgba(236, 72, 153, 0.1), 0 0 0 1px rgba(16, 185, 129, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    '0 0 0 1px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(99, 102, 241, 0.1), 0 0 0 1px rgba(236, 72, 153, 0.1), 0 0 0 1px rgba(16, 185, 129, 0.1), 0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  ],
  transitions: {
    easing: {
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      easeOut: 'cubic-bezier(0.0, 0.2, 1)',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      sharp: 'cubic-bezier(0.4, 0, 0.6, 1)'},
    duration: {
      shortest: 150,
      shorter: 200,
      short: 250,
      standard: 300,
      complex: 375,
      enteringScreen: 225,
      leavingScreen: 195}},
  components: {
    Button: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '0.938rem',
          padding: '12px 24px',
          boxShadow: 'none',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'}},
        contained: {
          background: '#3b82f6',
          '&:hover': {
            background: '#2563eb',
            boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.25), 0 10px 10px -5px rgba(59, 130, 246, 0.04)'}},
        outlined: {
          borderWidth: 2,
          fontWeight: 600,
          '&:hover': {
            borderWidth: 2,
            backgroundColor: alpha('#3b82f6', 0.04),
            transform: 'translateY(-2px)'}}}},
    Card: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          border: '1px solid rgba(226, 232, 240, 0.8)',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            borderColor: alpha('#3b82f6', 0.15)}}}},
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: '1px solid rgba(226, 232, 240, 0.5)'},
        elevation1: {
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'},
        elevation2: {
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'},
        elevation3: {
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'}}},
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            backgroundColor: '#ffffff',
            transition: 'all 0.2s ease-in-out',
            '&:hover fieldset': {
              borderColor: '#3b82f6',
              borderWidth: 2},
            '&.Mui-focused fieldset': {
              borderColor: '#3b82f6',
              borderWidth: 2,
              boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)'}}}}},
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 600,
          fontSize: '0.875rem',
          height: 32,
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            transform: 'scale(1.05)'}}},
    MuiAvatar: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          border: '2px solid rgba(255, 255, 255, 0.8)',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}}},
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          borderRadius: 8,
          fontSize: '0.875rem',
          padding: '8px 16px',
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.1)'}}},
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRadius: 0,
          borderRight: '1px solid rgba(226, 232, 240, 0.8)',
          backdropFilter: 'blur(10px)',
          backgroundColor: 'rgba(255, 255, 255, 0.95)'}}},
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(226, 232, 240, 0.8)',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'}}},
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          margin: '4px 8px',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateX(2px)',
            backgroundColor: alpha('#3b82f6', 0.06)},
          '&.Mui-selected': {
            backgroundColor: alpha('#3b82f6', 0.08),
            '&:hover': {
              backgroundColor: alpha('#3b82f6', 0.12)}}}}},
    Alert: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: '1px solid rgba(226, 232, 240, 0.8)',
          '&.MuiAlert-standardSuccess': {
            backgroundColor: alpha('#059669', 0.08),
            color: '#047857',
            borderColor: alpha('#059669', 0.15)},
          '&.MuiAlert-standardError': {
            backgroundColor: alpha('#dc2626', 0.08),
            color: '#b91c1c',
            borderColor: alpha('#dc2626', 0.15)},
          '&.MuiAlert-standardWarning': {
            backgroundColor: alpha('#d97706', 0.08),
            color: '#b45309',
            borderColor: alpha('#d97706', 0.15)},
          '&.MuiAlert-standardInfo': {
            backgroundColor: alpha('#0891b2', 0.08),
            color: '#0e7490',
            borderColor: alpha('#0891b2', 0.15)}}}}}}});

export default theme; 