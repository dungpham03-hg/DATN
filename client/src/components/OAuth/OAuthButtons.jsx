import React from 'react';
import {
  Button,
  Stack,
  Typography,
  Divider
} from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import GitHubIcon from '@mui/icons-material/GitHub';

const OAuthButtons = () => {
  const handleOAuthLogin = (provider) => {
    window.location.href = `http://localhost:5000/api/auth/${provider}`;
  };

  return (
    <Stack spacing={2} width="100%" mt={2}>
      <Divider>
        <Typography variant="body2" color="text.secondary">
          Hoặc đăng nhập với
        </Typography>
      </Divider>
      
      <Button
        variant="outlined"
        startIcon={<GoogleIcon sx={{ fontSize: 24 }} />}
        onClick={() => handleOAuthLogin('google')}
        fullWidth
        sx={{
          borderColor: '#4285f4',
          color: '#4285f4',
          height: 56,
          fontSize: '1.1rem',
          fontWeight: 500,
          py: 2,
          '&:hover': {
            borderColor: '#4285f4',
            backgroundColor: 'rgba(66, 133, 244, 0.04)'
          }
        }}
      >
        Đăng nhập bằng Google
      </Button>

      <Button
        variant="outlined"
        startIcon={<GitHubIcon />}
        onClick={() => handleOAuthLogin('github')}
        fullWidth
        sx={{
          borderColor: '#24292e',
          color: '#24292e',
          '&:hover': {
            borderColor: '#24292e',
            backgroundColor: 'rgba(36, 41, 46, 0.04)'
          }
        }}
      >
        Đăng nhập bằng GitHub
      </Button>
    </Stack>
  );
};

export default OAuthButtons; 