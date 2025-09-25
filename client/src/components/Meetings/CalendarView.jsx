import React, { useState, Fragment } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Grid,
  Card,
  CardContent,
  Chip,
  Stack,
  useTheme,
  alpha,
  Tooltip,
  Button,
  Divider,
  TextField
} from '@mui/material';
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Today as TodayIcon,
  AccessTime as AccessTimeIcon,
  LocationOn as LocationIcon,
  ViewWeek as WeekViewIcon,
  Groups as GroupsIcon,
  DateRange as DateRangeIcon
} from '@mui/icons-material';
import { getMeetingStatus } from '../../utils/dateUtils';

const CalendarView = ({ meetings, onMeetingClick }) => {
  const theme = useTheme();
  const [currentDate, setCurrentDate] = useState(new Date());
  // Week view only - no viewMode needed

  // Debug log để kiểm tra meetings data
  React.useEffect(() => {
    console.log('📅 CalendarView received meetings:', {
      totalMeetings: meetings?.length || 0,
      sampleMeetings: meetings?.slice(0, 3).map(m => ({
        id: m._id,
        title: m.title,
        startTime: m.startTime,
        endTime: m.endTime
      })) || []
    });
  }, [meetings]);

  const monthNames = [
    'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
  ];

  const navigateWeek = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + (direction * 7));
    setCurrentDate(newDate);
  };

  const navigate = (direction) => {
    navigateWeek(direction);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };



  const isToday = (date) => {
    if (!date) return false;
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      ongoing: 'success',
      upcoming: 'info',
      completed: 'default',
      cancelled: 'error',
      unknown: 'warning'
    };
    return colors[status] || 'default';
  };

  const getStatusColorHex = (status) => {
    // All meetings use ocean blue color
    return '#0066CC'; // Ocean blue color
  };



  const getMeetingPosition = (meeting) => {
    const startTime = new Date(meeting.startTime);
    const endTime = new Date(meeting.endTime);
    
    const startHours = startTime.getHours();
    const startMinutes = startTime.getMinutes();
    const endHours = endTime.getHours();
    const endMinutes = endTime.getMinutes();
    
    // Tính position từ 6h sáng (pixel) - 40px per hour để phù hợp với grid
    const startHour = 6;
    const hourHeight = 40; // 40px per hour (matches grid)
    const startPosition = (startHours - startHour) * hourHeight + (startMinutes / 60) * hourHeight;
    const duration = ((endHours - startHours) * 60 + (endMinutes - startMinutes)) / 60; // hours
    const height = duration * hourHeight;
    
    // Đảm bảo height tối thiểu để hiển thị đầy đủ thông tin
    const minHeight = 90; // Dư chỗ cho tiêu đề + giờ + địa điểm
    
    return {
      top: Math.max(0, startPosition),
      height: Math.max(minHeight, height), // minimum 60px height
      isVisible: startHours >= startHour && startHours <= 20
    };
  };

  // Week view functions
  const getWeekDates = () => {
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day; // Chủ nhật là ngày đầu tuần (0)
    startOfWeek.setDate(diff);
    
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      weekDates.push(date);
    }
    return weekDates;
  };

  const getMeetingsForWeekDate = (date) => {
    const filteredMeetings = meetings.filter(meeting => {
      const meetingDate = new Date(meeting.startTime);
      return (
        meetingDate.getDate() === date.getDate() &&
        meetingDate.getMonth() === date.getMonth() &&
        meetingDate.getFullYear() === date.getFullYear()
      );
    });
    
    // Debug log cho một ngày cụ thể
    if (filteredMeetings.length > 0) {
      console.log(`📅 Meetings for ${date.toDateString()}:`, filteredMeetings.map(m => ({
        id: m._id,
        title: m.title,
        startTime: m.startTime,
        endTime: m.endTime
      })));
    }
    
    return filteredMeetings;
  };

  const getWeekDateRange = () => {
    const weekDates = getWeekDates();
    const start = weekDates[0];
    const end = weekDates[6];
    
    if (start.getMonth() === end.getMonth()) {
      return `${start.getDate()} - ${end.getDate()} ${monthNames[start.getMonth()]} ${start.getFullYear()}`;
    } else {
      return `${start.getDate()} ${monthNames[start.getMonth()]} - ${end.getDate()} ${monthNames[end.getMonth()]} ${start.getFullYear()}`;
    }
  };

  // Time slots từ 6h sáng đến 12h đêm (24h)
  const timeSlots = [];
  for (let hour = 6; hour <= 24; hour++) {
    timeSlots.push({
      hour: hour,
      time: `${hour.toString().padStart(2, '0')}:00`,
      label: `${hour}:00`
    });
  }


  return (
    <Paper
      elevation={0}
      sx={{
        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        borderRadius: 3,
        overflow: 'hidden'
      }}
    >
      {/* Calendar Header */}
      <Box
        sx={{
          p: 2,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.15)}`,
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.primary.main, 0.1)} 100%)`,
          flexShrink: 0
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h5" fontWeight={600}>
              {getWeekDateRange()}
            </Typography>
            {(() => {
              const weekDates = getWeekDates();
              const isCurrentWeek = weekDates.some(date => isToday(date));
              return isCurrentWeek && (
                <Typography
                  variant="caption"
                  sx={{
                    bgcolor: alpha(theme.palette.success.main, 0.1),
                    color: 'success.main',
                    px: 1,
                    py: 0.5,
                    borderRadius: 1,
                    fontWeight: 500
                  }}
                >
                  Tuần này
                </Typography>
              );
            })()}
            <IconButton
              onClick={goToToday}
              size="small"
              sx={{
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                '&:hover': {
                  bgcolor: alpha(theme.palette.primary.main, 0.2)
                }
              }}
            >
              <TodayIcon />
            </IconButton>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* Date Picker */}
            <TextField
              type="date"
              value={currentDate.toISOString().split('T')[0]}
              onChange={(e) => {
                const newDate = new Date(e.target.value);
                setCurrentDate(newDate);
              }}
              size="small"
              InputProps={{
                startAdornment: <DateRangeIcon sx={{ mr: 1, color: 'text.secondary' }} />
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'background.paper',
                  borderRadius: 2,
                  '& fieldset': {
                    borderColor: alpha(theme.palette.primary.main, 0.3)
                  },
                  '&:hover fieldset': {
                    borderColor: alpha(theme.palette.primary.main, 0.5)
                  }
                }
              }}
            />
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton
                onClick={() => navigate(-1)}
                sx={{
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.1)
                  }
                }}
              >
                <ChevronLeftIcon />
              </IconButton>
              <IconButton
                onClick={() => navigate(1)}
                sx={{
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.1)
                  }
                }}
              >
                <ChevronRightIcon />
              </IconButton>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Week View */}
        <Box sx={{ position: 'relative', bgcolor: 'background.default', border: '2px solid #e0e0e0', borderRadius: 1 }}>
          {/* Complete Grid Overlay */}
          <Box sx={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            pointerEvents: 'none',
            zIndex: 1
          }}>
            {/* Header separator line */}
            <Box
              sx={{
                position: 'absolute',
                top: 50, // Header height
                left: 0,
                right: 0,
                height: 2,
                bgcolor: '#e0e0e0',
                borderTop: '2px solid #e0e0e0',
                zIndex: 5
              }}
            />
            
            {/* Horizontal lines for hours */}
            {timeSlots.map((slot, index) => (
              <Fragment key={`hour-${slot.hour}-${index}`}>
                {/* Main hour line */}
                <Box
                  sx={{
                    position: 'absolute',
                    top: 50 + (index * 40), // Header height + hour position
                    left: 0,
                    right: 0,
                    height: 1,
                    bgcolor: '#ccc',
                    zIndex: 3
                  }}
                />
                {/* Half-hour line */}
                <Box
                  sx={{
                    position: 'absolute',
                    top: 50 + (index * 40) + 20, // Half hour position
                    left: 0,
                    right: 0,
                    height: 1,
                    bgcolor: '#e5e5e5',
                    zIndex: 3
                  }}
                />
              </Fragment>
            ))}
            
            {/* Vertical lines for days */}
            {Array.from({ length: 7 }, (_, dayIndex) => (
              <Box
                key={`day-line-${dayIndex}`}
                sx={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: `${(100/8) * (dayIndex + 1)}%`, // Each day boundary
                  width: dayIndex === 0 ? 3 : 1, // First line thicker (time separator)
                  bgcolor: dayIndex === 0 ? '#bbb' : '#ccc',
                  zIndex: 3
                }}
              />
            ))}
          </Box>
          
          <Grid container sx={{ position: 'relative', zIndex: 2 }}>
            {/* Time Labels */}
            <Grid item xs={1} sx={{ 
              borderRight: '3px solid #e0e0e0',
              bgcolor: 'background.paper',
              flexShrink: 0
            }}>
              <Box sx={{ position: 'sticky', top: 0, bgcolor: 'background.paper', zIndex: 2 }}>
                {/* Header cell */}
                <Box 
                  sx={{ 
                    height: 50, 
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'background.paper'
                  }} 
                >
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'text.secondary',
                      fontSize: '0.65rem',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: 0.5
                    }}
                  >
                    GMT+7
                  </Typography>
                </Box>
                {timeSlots.map((slot, index) => (
                  <Box
                    key={slot.hour}
                    sx={{
                      height: 40,
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'center',
                      pt: 0.3,
                      bgcolor: 'background.paper'
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{ 
                        fontWeight: 600, 
                        fontSize: '0.75rem',
                        color: 'text.secondary',
                        fontFamily: 'monospace'
                      }}
                    >
                      {slot.label}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Grid>

            {/* Week Days */}
            <Grid item xs={11}>
              <Grid container>
                {getWeekDates().map((date, dayIndex) => {
                  const dayMeetings = getMeetingsForWeekDate(date);
                  const isCurrentDay = isToday(date);
                  
                  return (
                    <Grid item key={dayIndex} xs sx={{ 
                      position: 'relative',
                      bgcolor: 'background.paper'
                    }}>
                      {/* Day Header */}
                      <Box
                        sx={{
                          height: 50,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: 'background.paper',
                          position: 'sticky',
                          top: 0,
                          zIndex: 3
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{ 
                            fontWeight: 600, 
                            textTransform: 'uppercase',
                            color: isCurrentDay ? 'primary.main' : 'text.secondary',
                            fontSize: '0.7rem',
                            letterSpacing: 0.5
                          }}
                        >
                          {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][date.getDay()]}
                        </Typography>
                        <Typography
                          variant="h6"
                          sx={{
                            fontWeight: isCurrentDay ? 700 : 500,
                            color: isCurrentDay ? '#1976D2' : 'text.primary',
                            fontSize: '1.1rem',
                            lineHeight: 1.2
                          }}
                        >
                          {date.getDate().toString().padStart(2, '0')}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ 
                            fontSize: '0.65rem',
                            color: isCurrentDay ? 'primary.main' : 'text.secondary',
                            fontWeight: 500
                          }}
                        >
                          {date.getMonth() + 1}/{date.getFullYear().toString().slice(-2)}
                        </Typography>
                      </Box>

                      {/* Time Grid */}
                      <Box sx={{ position: 'relative' }}>
                        {/* Grid Lines */}
                        {timeSlots.map((slot, index) => (
                          <Box
                            key={slot.hour}
                            sx={{
                              height: 40,
                              position: 'relative',
                              bgcolor: 'background.paper'
                            }}
                          />
                        ))}

                        {/* Meetings */}
                        <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 }}>
                          {(() => {
                            // Simple overlap handling: split overlapping items into 2 columns
                            const sorted = [...dayMeetings].sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
                            const laidOut = [];
                            const overlaps = (m1, m2) => {
                              const s1 = new Date(m1.startTime); const e1 = new Date(m1.endTime);
                              const s2 = new Date(m2.startTime); const e2 = new Date(m2.endTime);
                              return s1 < e2 && e1 > s2;
                            };

                            sorted.forEach((m, idx) => {
                              let column = 0; // 0: left/full, 1: right
                              for (let j = idx - 1; j >= 0; j--) {
                                const prev = sorted[j];
                                if (overlaps(m, prev)) {
                                  // If previous in left column, put current to right column
                                  const prevLayout = laidOut.find((x) => x.meeting._id === prev._id);
                                  if (prevLayout && prevLayout.column === 0) {
                                    column = 1;
                                    // Mark previous to half width
                                    prevLayout.halfWidth = true;
                                  } else {
                                    column = 0;
                                  }
                                  break;
                                }
                              }
                              laidOut.push({ meeting: m, column, halfWidth: column === 1 });
                            });

                            return laidOut.map(({ meeting, column, halfWidth }) => {
                            const position = getMeetingPosition(meeting);
                            const status = getMeetingStatus(meeting.startTime, meeting.endTime);
                            const statusColor = getStatusColorHex(status);
                            
                            // Debug log cho meeting position
                            console.log(`📅 Meeting "${meeting.title}" position:`, {
                              height: position.height,
                              top: position.top,
                              isVisible: position.isVisible,
                              startTime: meeting.startTime,
                              endTime: meeting.endTime,
                              hasRoom: !!meeting.room,
                              hasLocation: !!meeting.location
                            });
                            
                              if (!position.isVisible) return null;

                              const isTwoColumn = halfWidth; // when true, both items in pair use half width
                              const leftOffset = column === 0 ? 3 : '51%';
                              const rightOffset = column === 0 ? undefined : 3;
                              const widthStyle = isTwoColumn ? '48%' : undefined;

                              return (
                              <Box
                                key={meeting._id}
                                onClick={() => onMeetingClick && onMeetingClick(meeting)}
                                sx={{
                                  position: 'absolute',
                                  top: position.top + 1,
                                  left: leftOffset,
                                  right: rightOffset,
                                  width: widthStyle,
                                  height: Math.max(position.height - 2, 60),
                                  cursor: 'pointer',
                                  borderRadius: 0, // Không bo góc - hình vuông
                                  bgcolor: `linear-gradient(135deg, ${alpha(statusColor, 0.15)} 0%, ${alpha(statusColor, 0.08)} 100%)`,
                                  border: `2px solid ${statusColor}`,
                                  borderLeft: `4px solid ${statusColor}`,
                                  px: 2,
                                  py: 0.8,
                                  display: 'flex',
                                  flexDirection: 'column',
                                  overflow: 'hidden',
                                  boxShadow: `0 2px 4px ${alpha(statusColor, 0.2)}, 0 1px 2px ${alpha(statusColor, 0.1)}`,
                                  transition: 'all 0.2s ease-in-out',
                                  '&:hover': {
                                    bgcolor: `linear-gradient(135deg, ${alpha(statusColor, 0.2)} 0%, ${alpha(statusColor, 0.12)} 100%)`,
                                    borderColor: statusColor,
                                    borderLeftColor: statusColor,
                                    transform: 'translateY(-1px)',
                                    boxShadow: `0 4px 8px ${alpha(statusColor, 0.25)}, 0 2px 4px ${alpha(statusColor, 0.15)}`,
                                    zIndex: 15
                                  },
                                  '&:active': {
                                    transform: 'translateY(-1px) scale(1.01)',
                                    transition: 'all 0.1s ease'
                                  }
                                }}
                              >
                                {/* Meeting Title */}
                                {(() => {
                                  const displayTitle = (meeting.title && String(meeting.title).trim()) || meeting.room?.name || meeting.location || 'Cuộc họp';
                                  return (
                                    <Typography
                                      variant="body2"
                                      fontWeight={700}
                                      noWrap
                                      sx={{
                                        color: 'primary.main',
                                        fontSize: '0.9rem',
                                        lineHeight: 1.3,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        mb: 0.4
                                      }}
                                    >
                                      {displayTitle}
                                    </Typography>
                                  );
                                })()}

                                {/* Time and Location - Always show basic info */}
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3, mt: 0.5 }}>
                                  {/* Time - Always visible (plain style) */}
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.2 }}>
                                    <AccessTimeIcon sx={{ fontSize: 14, color: alpha(statusColor, 0.9) }} />
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        color: alpha(statusColor, 0.95),
                                        fontSize: '0.76rem',
                                        fontWeight: 600,
                                        fontFamily: 'monospace',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                      }}
                                    >
                                      {formatTime(meeting.startTime)} - {formatTime(meeting.endTime)}
                                    </Typography>
                                  </Box>
                                  
                                  {/* Location - Show if available and space allows */}
                                  {(meeting.room || meeting.location) && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                      <LocationIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                                      <Typography
                                        variant="caption"
                                        sx={{
                                          color: 'text.secondary',
                                          fontSize: '0.72rem',
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          whiteSpace: 'nowrap'
                                        }}
                                      >
                                        {meeting.room ? meeting.room.name : meeting.location}
                                      </Typography>
                                    </Box>
                                  )}

                                </Box>
                              </Box>
                              );
                            });
                          })()}
                        </Box>
                      </Box>
                    </Grid>
                  );
                })}
              </Grid>
            </Grid>
          </Grid>
        </Box>
    </Paper>
  );
};

export default CalendarView;
