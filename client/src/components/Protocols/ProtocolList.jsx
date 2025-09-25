import React from 'react';
import {
  Box,
  Typography,
  Stack,
  Avatar,
  Chip,
  useTheme,
  alpha,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Description as DescriptionIcon,
  Visibility as VisibilityIcon,
  CheckCircle as CheckCircleIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import dayjs from 'dayjs';

const ProtocolList = ({ 
  protocols = [], 
  onView, 
  onApprove, 
  onReject, 
  canApprove = false,
  maxItems = 5 
}) => {
  const theme = useTheme();

  const getStatusConfig = (status) => {
    const configs = {
      pending: { color: 'warning', label: 'Chờ duyệt' },
      approved: { color: 'success', label: 'Đã duyệt' },
      rejected: { color: 'error', label: 'Từ chối' },
      draft: { color: 'default', label: 'Bản nháp' }
    };
    return configs[status] || configs.pending;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return dayjs(dateString).format('DD/MM/YYYY');
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const displayProtocols = protocols.slice(0, maxItems);

  if (displayProtocols.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 3 }}>
        <DescriptionIcon sx={{ fontSize: 32, color: 'text.disabled', mb: 1 }} />
        <Typography variant="body2" color="text.secondary">
          Không có biên bản nào
        </Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={1.5}>
      {displayProtocols.map((protocol, index) => {
        const statusConfig = getStatusConfig(protocol.status);
        
        return (
          <Box
            key={protocol._id || index}
            sx={{
              p: 2,
              borderRadius: 2,
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              bgcolor: alpha(theme.palette.background.paper, 0.5),
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                bgcolor: alpha(theme.palette.primary.main, 0.04),
                borderColor: alpha(theme.palette.primary.main, 0.2)
              }
            }}
          >
            {/* Header với tiêu đề và status */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography 
                  variant="subtitle2" 
                  fontWeight={600}
                  sx={{ 
                    mb: 0.5,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    lineHeight: 1.3
                  }}
                >
                  {protocol.title || 'Biên bản cuộc họp'}
                </Typography>
                {protocol.meeting && (
                  <Typography 
                    variant="caption" 
                    color="text.secondary"
                    sx={{ 
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      display: 'block'
                    }}
                  >
                    📅 {protocol.meeting.title}
                  </Typography>
                )}
              </Box>
              
              <Chip
                label={statusConfig.label}
                color={statusConfig.color}
                size="small"
                sx={{ ml: 1, minWidth: 'auto' }}
              />
            </Box>

            {/* Thông tin người tạo và thời gian */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
                <Avatar 
                  sx={{ 
                    width: 28, 
                    height: 28, 
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    color: 'primary.main',
                    fontSize: '0.7rem',
                    fontWeight: 600
                  }}
                  src={protocol.secretary?.avatar}
                  alt={protocol.secretary?.fullName}
                >
                  {protocol.secretary?.avatar ? null : getInitials(protocol.secretary?.fullName)}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography 
                    variant="caption" 
                    color="text.secondary"
                    sx={{ display: 'block', lineHeight: 1.2 }}
                  >
                    Tạo bởi:
                  </Typography>
                  <Typography 
                    variant="body2" 
                    fontWeight={600}
                    sx={{ 
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {protocol.secretary?.fullName || '—'}
                  </Typography>
                </Box>
              </Box>
              
              <Typography 
                variant="caption" 
                color="text.secondary"
                sx={{ 
                  textAlign: 'right',
                  minWidth: 'fit-content',
                  ml: 1
                }}
              >
                {formatDate(protocol.createdAt)}
              </Typography>
            </Box>

            {/* Actions */}
            <Stack direction="row" spacing={1} sx={{ mt: 1.5, justifyContent: 'flex-end' }}>
              <Tooltip title="Xem chi tiết">
                <IconButton 
                  size="small" 
                  onClick={() => onView && onView(protocol)}
                  sx={{
                    color: 'text.secondary',
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      color: 'primary.main'
                    }
                  }}
                >
                  <VisibilityIcon fontSize="small" />
                </IconButton>
              </Tooltip>

              {canApprove && protocol.status === 'pending' && (
                <>
                  <Tooltip title="Phê duyệt">
                    <IconButton 
                      size="small" 
                      color="success"
                      onClick={() => onApprove && onApprove(protocol)}
                      sx={{
                        '&:hover': {
                          bgcolor: alpha(theme.palette.success.main, 0.1)
                        }
                      }}
                    >
                      <CheckCircleIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  
                  <Tooltip title="Từ chối">
                    <IconButton 
                      size="small" 
                      color="error"
                      onClick={() => onReject && onReject(protocol)}
                      sx={{
                        '&:hover': {
                          bgcolor: alpha(theme.palette.error.main, 0.1)
                        }
                      }}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </>
              )}
            </Stack>
          </Box>
        );
      })}

      {protocols.length > maxItems && (
        <Box sx={{ textAlign: 'center', pt: 1 }}>
          <Typography variant="caption" color="text.secondary">
            +{protocols.length - maxItems} biên bản khác
          </Typography>
        </Box>
      )}
    </Stack>
  );
};

export default ProtocolList;
