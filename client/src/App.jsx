import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { SnackbarProvider } from 'notistack';
import theme from './theme';
import './styles/modern-effects.css';
import { AuthProvider } from './contexts/AuthContext';
import SocketProvider from './contexts/SocketContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { GlobalLoadingProvider } from './contexts/GlobalLoadingContext';

// Working components
import PrivateRoute from './components/Auth/PrivateRoute';
import PublicOnlyRoute from './components/Auth/PublicOnlyRoute';
import RoleRoute from './components/Auth/RoleRoute';
import Layout from './components/Layout';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import Dashboard from './pages/Dashboard/Dashboard';
import Profile from './pages/Profile/Profile';
import Settings from './pages/Settings/Settings';
import Meetings from './pages/Meetings/Meetings';
import CreateMeeting from './pages/Meetings/CreateMeeting';
import RoomApprovals from './pages/Meetings/RoomApprovals';
import ComingSoon from './components/Fallback/ComingSoon';
import MinutesApprovals from './pages/Meetings/MinutesApprovals';
import MeetingRooms from './pages/Meetings/MeetingRooms';
import MeetingDetail from './pages/Meetings/MeetingDetail';
import MeetingApprovals from './pages/Meetings/MeetingApprovals';
import OAuthCallback from './components/OAuth/OAuthCallback';
import Unauthorized from './pages/Errors/Unauthorized';
import Archives from './pages/Archives/Archives';
import ArchiveDetail from './pages/Archives/ArchiveDetail';
import Invitations from './pages/Invitations/Invitations';
import UserManagement from './pages/Users/UserManagement';
import Reports from './pages/Reports/Reports';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SnackbarProvider 
        maxSnack={3}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        dense
        preventDuplicate
      >
        <GlobalLoadingProvider>
          <AuthProvider>
            <SocketProvider>
              <NotificationProvider>
                <Router>
                  <Routes>
                    {/* Root redirect */}
                    <Route path="/" element={<PrivateRoute><Navigate to="/dashboard" replace /></PrivateRoute>} />

                    {/* Public routes */}
                    <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
                    <Route path="/register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />
                    <Route path="/oauth/callback" element={<OAuthCallback />} />
                    
                    {/* Protected routes */}
                    <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/profile" element={<Profile />} />
                      <Route path="/settings" element={<Settings />} />
                      
                      {/* Meetings pages */}
                      <Route path="/meetings" element={<Meetings />} />
                      
                      <Route path="/meetings/create" element={
                        <RoleRoute allowedRoles={['admin', 'manager', 'secretary', 'assistant']}>
                          <CreateMeeting />
                        </RoleRoute>
                      } />
                      
                      <Route path="/meetings/:id" element={<MeetingDetail />} />
                      <Route path="/room-approvals" element={
                        <RoleRoute allowedRoles={['technician','assistant','admin']}>
                          <RoomApprovals />
                        </RoleRoute>
                      } />
                      
                      <Route path="/meetings/:id/edit" element={
                        <RoleRoute allowedRoles={['admin', 'manager', 'secretary', 'assistant']}>
                          <EditMeetingRedirect />
                        </RoleRoute>
                      } />
                      
                      <Route path="/archives" element={<Archives />} />
                      <Route path="/archives/:id" element={<ArchiveDetail />} />
                      
                      <Route path="/meeting-rooms" element={<MeetingRooms />} />
                      
                      <Route path="/invitations" element={<Invitations />} />
                      
                      <Route path="/meeting-approvals" element={
                        <RoleRoute allowedRoles={['admin','manager']}>
                          <MeetingApprovals />
                        </RoleRoute>
                      } />
                      
                      <Route path="/reports" element={
                        <RoleRoute allowedRoles={['admin','manager']}>
                          <Reports />
                        </RoleRoute>
                      } />
                      
                      <Route path="/protocol-approvals" element={
                        <RoleRoute allowedRoles={['admin','manager','assistant']}>
                          <MinutesApprovals />
                        </RoleRoute>
                      } />
                      
                      <Route path="/users" element={
                        <RoleRoute allowedRoles={['admin']}>
                          <UserManagement />
                        </RoleRoute>
                      } />
                    </Route>

                    {/* Error pages */}
                    <Route path="/unauthorized" element={<Unauthorized />} />
                  </Routes>
                </Router>
              </NotificationProvider>
            </SocketProvider>
          </AuthProvider>
        </GlobalLoadingProvider>
      </SnackbarProvider>
    </ThemeProvider>
  );
}

export default App;

function EditMeetingRedirect() {
  const { id } = useParams();
  const navigate = useNavigate();
  React.useEffect(() => {
    navigate('/meetings', { replace: true, state: { openEdit: true, meetingId: id } });
  }, [id, navigate]);
  return null;
}
