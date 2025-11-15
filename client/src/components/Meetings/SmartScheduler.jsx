import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  Chip,
  Alert,
  AlertTitle,
  Stack,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
  IconButton,
  TextField,
  Grid,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  AutoFixHigh as AutoFixHighIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  EventAvailable as EventAvailableIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon,
  CalendarToday as CalendarIcon,
  Group as GroupIcon,
  MeetingRoom as MeetingRoomIcon
} from '@mui/icons-material';
import useSmartScheduler from '../../hooks/useSmartScheduler';

/**
 * SmartScheduler Component
 * Tự động tìm khung giờ tối ưu cho cuộc họp
 */
const SmartScheduler = ({ 
  attendees = [],
  duration = 60,
  capacity = 0,
  onSelectTime,
  onCancel
}) => {
  const {
    loading,
    suggestions,
    error,
    metadata,
    findOptimalSlots,
    clearSuggestions,
    formatSuggestion
  } = useSmartScheduler();

  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000));
  const [roomRequired, setRoomRequired] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    // Auto-search when component mounts if attendees are provided
    if (attendees.length > 0 && duration > 0) {
      handleFindSlots();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFindSlots = async () => {
    const result = await findOptimalSlots({
      attendees,
      duration,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      capacity,
      roomRequired,
      topN: 5
    });

    if (result.success) {
      setSelectedSuggestion(null);
    }
  };

  const handleSelectSuggestion = (suggestion) => {
    setSelectedSuggestion(suggestion);
  };

  const handleConfirmSelection = () => {
    if (selectedSuggestion && onSelectTime) {
      onSelectTime({
        startTime: selectedSuggestion.startTime,
        endTime: selectedSuggestion.endTime,
        room: selectedSuggestion.availableRooms?.[0] || null
      });
    }
  };

  const getScoreColor = (score) => {
    if (score >= 120) return 'success';
    if (score >= 100) return 'primary';
    if (score >= 80) return 'warning';
    return 'default';
  };

  const getScoreLabel = (score) => {
    if (score >= 120) return 'Xuất sắc';
    if (score >= 100) return 'Tốt';
    if (score >= 80) return 'Khá';
    return 'Trung bình';
  };

  // Helper to format date for input type="date"
  const formatDateForInput = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleStartDateChange = (event) => {
    const newDate = new Date(event.target.value);
    setStartDate(newDate);
  };

  const handleEndDateChange = (event) => {
    const newDate = new Date(event.target.value);
    setEndDate(newDate);
  };

  return (
    <Card elevation={3}>
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <AutoFixHighIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Smart Scheduler - Tìm Khung Giờ Tối Ưu
          </Typography>
          <Tooltip title="Làm mới">
            <IconButton onClick={handleFindSlots} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>

          {/* Info */}
          <Alert severity="info" sx={{ mb: 2 }}>
            <AlertTitle>Hệ thống sẽ phân tích và đề xuất khung giờ tốt nhất</AlertTitle>
            Dựa trên lịch của {attendees.length} người tham dự, thời lượng {duration} phút
          </Alert>

          {/* Advanced Options */}
          <Box sx={{ mb: 2 }}>
            <Button
              size="small"
              onClick={() => setShowAdvanced(!showAdvanced)}
              endIcon={<InfoIcon />}
            >
              {showAdvanced ? 'Ẩn' : 'Hiện'} tùy chọn nâng cao
            </Button>

            {showAdvanced && (
              <Box sx={{ mt: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Từ ngày"
                      type="date"
                      fullWidth
                      size="small"
                      value={formatDateForInput(startDate)}
                      onChange={handleStartDateChange}
                      InputLabelProps={{
                        shrink: true,
                      }}
                      inputProps={{
                        min: formatDateForInput(new Date())
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Đến ngày"
                      type="date"
                      fullWidth
                      size="small"
                      value={formatDateForInput(endDate)}
                      onChange={handleEndDateChange}
                      InputLabelProps={{
                        shrink: true,
                      }}
                      inputProps={{
                        min: formatDateForInput(startDate)
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={roomRequired}
                          onChange={(e) => setRoomRequired(e.target.checked)}
                        />
                      }
                      label="Yêu cầu phòng họp"
                    />
                  </Grid>
                </Grid>
              </Box>
            )}
          </Box>

          {/* Find Button */}
          <Button
            variant="contained"
            fullWidth
            onClick={handleFindSlots}
            disabled={loading || attendees.length === 0}
            startIcon={loading ? <CircularProgress size={20} /> : <ScheduleIcon />}
            sx={{ mb: 2 }}
          >
            {loading ? 'Đang tìm kiếm...' : 'Tìm khung giờ tối ưu'}
          </Button>

          {/* Metadata */}
          {metadata && (
            <Box sx={{ mb: 2 }}>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Chip
                  icon={<CalendarIcon />}
                  label={`Phân tích: ${metadata.totalAnalyzed} slots`}
                  size="small"
                />
                <Chip
                  icon={<EventAvailableIcon />}
                  label={`Khả dụng: ${metadata.totalFreeSlots} slots`}
                  size="small"
                  color="success"
                />
                <Chip
                  icon={<GroupIcon />}
                  label={`${metadata.attendeeCount} người`}
                  size="small"
                />
              </Stack>
            </Box>
          )}

          {/* Error */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={clearSuggestions}>
              {error}
            </Alert>
          )}

          {/* Suggestions List */}
          {suggestions.length > 0 && (
            <Box>
              <Divider sx={{ my: 2 }}>
                <Chip label={`Top ${suggestions.length} đề xuất`} color="primary" />
              </Divider>

              <List>
                {suggestions.map((suggestion, index) => {
                  const formatted = formatSuggestion(suggestion);
                  const isSelected = selectedSuggestion?.startTime === suggestion.startTime;

                  return (
                    <ListItem
                      key={index}
                      disablePadding
                      sx={{ mb: 1 }}
                    >
                      <ListItemButton
                        selected={isSelected}
                        onClick={() => handleSelectSuggestion(suggestion)}
                        sx={{
                          border: 1,
                          borderColor: isSelected ? 'primary.main' : 'divider',
                          borderRadius: 1,
                          '&:hover': {
                            borderColor: 'primary.main'
                          }
                        }}
                      >
                        <ListItemIcon>
                          {isSelected ? (
                            <CheckCircleIcon color="primary" />
                          ) : (
                            <Typography
                              variant="h6"
                              color="text.secondary"
                              sx={{ minWidth: 30 }}
                            >
                              #{index + 1}
                            </Typography>
                          )}
                        </ListItemIcon>

                        <ListItemText
                          primary={
                            <Box>
                              <Typography variant="subtitle1" component="div">
                                {formatted.dateStr}
                              </Typography>
                              <Typography variant="h6" color="primary">
                                {formatted.timeStr}
                              </Typography>
                            </Box>
                          }
                          secondary={
                            <Box sx={{ mt: 1 }}>
                              {/* Score */}
                              <Chip
                                label={`${suggestion.score} điểm - ${getScoreLabel(suggestion.score)}`}
                                color={getScoreColor(suggestion.score)}
                                size="small"
                                sx={{ mr: 1, mb: 0.5 }}
                              />

                              {/* Availability */}
                              {suggestion.availableCount !== undefined && (
                                <Chip
                                  label={`${suggestion.availableCount}/${attendees.length} người rảnh`}
                                  color={suggestion.conflicts.length === 0 ? 'success' : 'warning'}
                                  size="small"
                                  sx={{ mr: 1, mb: 0.5 }}
                                />
                              )}

                              {/* Rooms */}
                              {suggestion.availableRooms && suggestion.availableRooms.length > 0 && (
                                <Chip
                                  icon={<MeetingRoomIcon />}
                                  label={`${suggestion.availableRooms.length} phòng`}
                                  size="small"
                                  sx={{ mb: 0.5 }}
                                />
                              )}

                              {/* Reasons */}
                              <Box sx={{ mt: 1 }}>
                                {suggestion.reasons.map((reason, idx) => (
                                  <Typography
                                    key={idx}
                                    variant="caption"
                                    display="block"
                                    color="text.secondary"
                                  >
                                    {reason}
                                  </Typography>
                                ))}
                              </Box>
                            </Box>
                          }
                        />
                      </ListItemButton>
                    </ListItem>
                  );
                })}
              </List>

              {/* Action Buttons */}
              <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                <Button
                  variant="contained"
                  fullWidth
                  disabled={!selectedSuggestion}
                  onClick={handleConfirmSelection}
                  startIcon={<CheckCircleIcon />}
                >
                  Chọn khung giờ này
                </Button>
                {onCancel && (
                  <Button
                    variant="outlined"
                    onClick={onCancel}
                  >
                    Hủy
                  </Button>
                )}
              </Box>
            </Box>
          )}

          {/* No suggestions */}
          {!loading && !error && suggestions.length === 0 && metadata && (
            <Alert severity="warning">
              <AlertTitle>Không tìm thấy khung giờ phù hợp</AlertTitle>
              Vui lòng thử mở rộng khoảng thời gian tìm kiếm hoặc giảm thời lượng cuộc họp.
            </Alert>
          )}
        </CardContent>
      </Card>
  );
};

export default SmartScheduler;

