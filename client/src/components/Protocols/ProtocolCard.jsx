import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Stack,
  Avatar,
  IconButton,
  Tooltip,
  useTheme,
  alpha,
  Divider
} from '@mui/material';
import './ProtocolCard.css';
import {
  Description as DescriptionIcon,
  Visibility as VisibilityIcon,
  CheckCircle as CheckCircleIcon,
  Close as CloseIcon,
  Download as DownloadIcon,
  AttachFile as AttachFileIcon
} from '@mui/icons-material';
import dayjs from 'dayjs';

const ProtocolCard = ({ 
  protocol, 
  onView, 
  onApprove, 
  onReject, 
  canApprove = false,
  allowReject = false,
  showActions = true 
}) => {
  const theme = useTheme();

  const getStatusConfig = (status) => {
    const configs = {
      pending: { color: 'warning', label: 'Chờ duyệt', bgColor: alpha(theme.palette.warning.main, 0.1) },
      approved: { color: 'success', label: 'Đã duyệt', bgColor: alpha(theme.palette.success.main, 0.1) },
      rejected: { color: 'error', label: 'Từ chối', bgColor: alpha(theme.palette.error.main, 0.1) },
      draft: { color: 'default', label: 'Bản nháp', bgColor: alpha(theme.palette.grey[500], 0.1) }
    };
    return configs[status] || configs.pending;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return dayjs(dateString).format('DD/MM/YYYY');
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '—';
    return dayjs(dateString).format('DD/MM/YYYY HH:mm');
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const statusConfig = getStatusConfig(protocol.status);

  return (
    <Card
      className="protocol-card"
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 2,
        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        '&:hover': {
          borderColor: alpha(theme.palette.primary.main, 0.3)
        }
      }}
    >
      <CardContent className="protocol-content" sx={{ p: 2.5, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header với Status */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography 
              variant="subtitle1" 
              fontWeight={700}
              sx={{ 
                color: 'primary.main',
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
              #{protocol._id?.slice(-6) || 'N/A'}
            </Typography>
          </Box>
          
          <Chip
            className="status-badge"
            label={statusConfig.label}
            color={statusConfig.color}
            size="small"
            sx={{
              ml: 1,
              bgcolor: statusConfig.bgColor,
              fontWeight: 600,
              minWidth: 'auto',
              height: 24,
              fontSize: '0.7rem',
              '& .MuiChip-label': {
                px: 1.5,
                py: 0.25
              }
            }}
          />
        </Box>

        {/* Thông tin cuộc họp */}
        {protocol.meeting && (
          <Box sx={{ mb: 2 }}>
            <Typography 
              variant="body2" 
              fontWeight={600}
              sx={{ 
                mb: 0.5,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {protocol.meeting.title}
            </Typography>
            {protocol.meeting.location && (
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
                📍 {protocol.meeting.location}
              </Typography>
            )}
          </Box>
        )}

        {/* File đính kèm */}
        {protocol.attachments && protocol.attachments.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <AttachFileIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                {protocol.attachments.length} file đính kèm
              </Typography>
            </Stack>
            
            <Stack spacing={0.5}>
              {protocol.attachments.slice(0, 2).map((attachment, index) => {
                const fileExtension = attachment.name?.split('.').pop()?.toLowerCase();
                const getFileIcon = (ext) => {
                  const icons = {
                    pdf: '📄',
                    doc: '📝', docx: '📝',
                    xls: '📊', xlsx: '📊',
                    ppt: '📊', pptx: '📊',
                    jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️',
                    txt: '📄',
                    zip: '📦', rar: '📦'
                  };
                  return icons[ext] || '📎';
                };

                return (
                  <Box 
                    key={index}
                    className="file-attachment"
                    sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 1,
                      py: 0.75,
                      px: 1.25,
                      borderRadius: 1.5,
                      bgcolor: alpha(theme.palette.primary.main, 0.04),
                      border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                      '&:hover': {
                        bgcolor: alpha(theme.palette.primary.main, 0.08),
                        borderColor: alpha(theme.palette.primary.main, 0.2)
                      }
                    }}
                  >
                    <Typography sx={{ fontSize: '0.9rem' }}>
                      {getFileIcon(fileExtension)}
                    </Typography>
                    <Typography 
                      variant="caption" 
                      fontWeight={500}
                      sx={{ 
                        flex: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        color: 'text.primary'
                      }}
                    >
                      {attachment.name}
                    </Typography>
                    {attachment.size && (
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                        {(attachment.size / 1024 / 1024).toFixed(1)}MB
                      </Typography>
                    )}
                  </Box>
                );
              })}
              
              {protocol.attachments.length > 2 && (
                <Box sx={{ textAlign: 'center', py: 0.5 }}>
                  <Typography 
                    variant="caption" 
                    color="text.secondary"
                    sx={{ 
                      fontSize: '0.7rem',
                      bgcolor: alpha(theme.palette.grey[500], 0.1),
                      px: 1.5,
                      py: 0.5,
                      borderRadius: 1,
                      display: 'inline-block'
                    }}
                  >
                    +{protocol.attachments.length - 2} file khác
                  </Typography>
                </Box>
              )}
            </Stack>
          </Box>
        )}

        <Divider sx={{ my: 1.5 }} />

        {/* Thông tin người tạo và người gửi */}
        <Box sx={{ mb: 2 }}>
          {/* Người tạo */}
          {protocol.secretary && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
              <Avatar 
                sx={{ 
                  width: 32, 
                  height: 32, 
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  color: 'primary.main',
                  fontSize: '0.75rem',
                  fontWeight: 600
                }}
                src={protocol.secretary.avatar}
                alt={protocol.secretary.fullName}
              >
                {protocol.secretary.avatar ? null : getInitials(protocol.secretary.fullName)}
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
                  {protocol.secretary.fullName}
                </Typography>
              </Box>
              <Typography 
                variant="caption" 
                color="text.secondary"
                sx={{ 
                  textAlign: 'right',
                  minWidth: 'fit-content'
                }}
              >
                {formatDate(protocol.createdAt)}
              </Typography>
            </Box>
          )}

          {/* Người gửi (nếu khác người tạo) */}
          {protocol.approvedBy && protocol.approvedBy._id !== protocol.secretary?._id && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar 
                sx={{ 
                  width: 32, 
                  height: 32, 
                  bgcolor: alpha(theme.palette.success.main, 0.1),
                  color: 'success.main',
                  fontSize: '0.75rem',
                  fontWeight: 600
                }}
                src={protocol.approvedBy.avatar}
                alt={protocol.approvedBy.fullName}
              >
                {protocol.approvedBy.avatar ? null : getInitials(protocol.approvedBy.fullName)}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography 
                  variant="caption" 
                  color="text.secondary"
                  sx={{ display: 'block', lineHeight: 1.2 }}
                >
                  Gửi:
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
                  {protocol.approvedBy.fullName}
                </Typography>
              </Box>
              <Typography 
                variant="caption" 
                color="text.secondary"
                sx={{ 
                  textAlign: 'right',
                  minWidth: 'fit-content'
                }}
              >
                {formatDateTime(protocol.approvedAt)}
              </Typography>
            </Box>
          )}
        </Box>

        {/* Actions */}
        {showActions && (
          <Stack direction="row" spacing={1} className="protocol-actions" sx={{ mt: 'auto', pt: 1 }}>
            <Tooltip title="Xem chi tiết">
              <IconButton 
                className="protocol-action-btn"
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

            {canApprove && (protocol.status === 'pending' || protocol.status === 'pending_approval') && (
              <>
                <Tooltip title="Phê duyệt">
                  <IconButton 
                    className="protocol-action-btn"
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
                
                {allowReject && (
                  <Tooltip title="Từ chối">
                    <IconButton 
                      className="protocol-action-btn"
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
                )}
              </>
            )}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
};

export default ProtocolCard;
