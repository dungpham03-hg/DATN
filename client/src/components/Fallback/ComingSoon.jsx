import React from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Stack,
  Card,
  CardContent,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Construction as ConstructionIcon,
  ArrowBack as ArrowBackIcon,
  Dashboard as DashboardIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const ComingSoon = ({ 
  title = "Trang đang phát triển", 
  description = "Chúng tôi đang nâng cấp trang này với Material UI. Vui lòng quay lại sau!",
  showBackButton = true 
}) => {
  const theme = useTheme();
  const navigate = useNavigate();

  return (
    <Container maxWidth="md">
      <Box sx={{ py: 8, textAlign: 'center' }}>
        <Paper
          elevation={3}
          sx={{
            p: 6,
            borderRadius: 3,
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
          }}
        >
          <Stack spacing={4} alignItems="center">
            {/* Icon */}
            <Box
              sx={{
                width: 120,
                height: 120,
                borderRadius: '50%',
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'pulse 2s infinite',
                '@keyframes pulse': {
                  '0%': {
                    transform: 'scale(1)',
                    opacity: 1,
                  },
                  '50%': {
                    transform: 'scale(1.05)',
                    opacity: 0.8,
                  },
                  '100%': {
                    transform: 'scale(1)',
                    opacity: 1,
                  },
                },
              }}
            >
              <ConstructionIcon sx={{ fontSize: 60, color: 'primary.main' }} />
            </Box>

            {/* Content */}
            <Box>
              <Typography variant="h4" fontWeight={600} gutterBottom color="primary">
                {title}
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 400, mx: 'auto' }}>
                {description}
              </Typography>
            </Box>

            {/* Features Card */}
            <Card sx={{ maxWidth: 500, width: '100%' }}>
              <CardContent>
                <Typography variant="h6" fontWeight={500} gutterBottom>
                  ✨ Tính năng mới với Material UI
                </Typography>
                <Stack spacing={1} sx={{ textAlign: 'left' }}>
                  <Typography variant="body2" color="text.secondary">
                    • Giao diện hiện đại và responsive
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    • Typography tối ưu cho tiếng Việt
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    • Theme system nhất quán
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    • Performance và accessibility tốt hơn
                  </Typography>
                </Stack>
              </CardContent>
            </Card>

            {/* Actions */}
            <Stack direction="row" spacing={2}>
              {showBackButton && (
                <Button
                  variant="outlined"
                  startIcon={<ArrowBackIcon />}
                  onClick={() => navigate(-1)}
                >
                  Quay lại
                </Button>
              )}
              <Button
                variant="contained"
                startIcon={<DashboardIcon />}
                onClick={() => navigate('/dashboard')}
              >
                Về trang chủ
              </Button>
            </Stack>
          </Stack>
        </Paper>
      </Box>
    </Container>
  );
};

export default ComingSoon;
