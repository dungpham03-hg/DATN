import React, { useEffect, useContext, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import {
  Box,
  CircularProgress,
  Typography,
  Alert
} from '@mui/material';

const OAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login, isAuthenticated, dispatch } = useContext(AuthContext);

  const [error, setError] = useState(null);

  useEffect(() => {
    console.log('=== OAuthCallback Mounted ===');
    const params = Object.fromEntries(searchParams.entries());
    console.log('URL Search Params:', params);
    
    const processOAuthCallback = async () => {
      console.log('=== Starting OAuth Callback ===');
      const token = searchParams.get('token');
      const userParam = searchParams.get('user');
      const errorParam = searchParams.get('error');
      
      // Log the authentication state
      console.log('Current isAuthenticated:', isAuthenticated);
      console.log('Token from URL:', token ? '***' + token.slice(-8) : 'Not found');
      console.log('User param exists:', !!userParam);
      
      if (errorParam) {
        const errorMessage = `OAuth Error: ${errorParam}`;
        console.error(errorMessage);
        setError(errorMessage);
        setTimeout(() => navigate(`/login?error=${encodeURIComponent(errorMessage)}`, { replace: true }), 2000);
        return;
      }
      
      if (!token) {
        const errorMessage = 'No authentication token found';
        console.error(errorMessage);
        setError(errorMessage);
        setTimeout(() => navigate('/login?error=no_token', { replace: true }), 2000);
        return;
      }

      try {
        // If we have user data in the URL
        if (userParam) {
          try {
            console.log('Parsing user data from URL...');
            const userData = JSON.parse(decodeURIComponent(userParam));
            console.log('Parsed user data:', userData);
            
            // Validate required user fields
            if (!userData._id || !userData.email) {
              throw new Error('Invalid user data: missing required fields');
            }
            
            // Store token in localStorage
            console.log('Storing token in localStorage...');
            localStorage.setItem('token', token);
            
            // Update auth context
            console.log('Dispatching LOGIN_SUCCESS...');
            dispatch({
              type: 'LOGIN_SUCCESS',
              payload: {
                user: userData,
                token: token
              }
            });
            
            console.log('Auth context updated, navigating to dashboard...');
            navigate('/dashboard', { replace: true });
            
          } catch (parseError) {
            console.error('Error processing user data, falling back to token login:', parseError);
            // Fallback to regular login with just the token
            try {
              await login(token);
              navigate('/dashboard', { replace: true });
            } catch (loginError) {
              console.error('Fallback login failed:', loginError);
              throw new Error('Failed to authenticate with token');
            }
          }
        } else {
          console.log('No user data in URL, using token login...');
          try {
            await login(token);
            navigate('/dashboard', { replace: true });
          } catch (error) {
            console.error('Token login failed:', error);
            throw new Error('Failed to authenticate with token');
          }
        }
      } catch (error) {
        console.error('Error during OAuth callback processing:', error);
        setError(error.message || 'Authentication failed');
        setTimeout(() => {
          navigate('/login', { 
            state: { error: error.message || 'Authentication failed' },
            replace: true 
          });
        }, 2000);
      }
    };

    processOAuthCallback();
    
    // Cleanup function
    return () => {
      console.log('=== OAuthCallback Unmounted ===');
    };
  }, [searchParams, navigate, login, dispatch, isAuthenticated]);

  if (error) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="100vh"
        bgcolor="background.default"
        p={3}
      >
        <Alert severity="error" sx={{ mb: 2, width: '100%', maxWidth: 500 }}>
          {error}
        </Alert>
        <Typography variant="body1" color="textSecondary">
          Redirecting to login page...
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="100vh"
      bgcolor="background.default"
    >
      <CircularProgress size={60} thickness={4} />
      <Typography variant="h6" color="textSecondary" mt={2}>
        {error ? 'Authentication Error' : 'Processing login...'}
      </Typography>
      <Typography variant="body2" color="textSecondary" mt={2}>
        {error ? error : 'Please wait...'}
      </Typography>
    </Box>
  );
};

export default OAuthCallback; 