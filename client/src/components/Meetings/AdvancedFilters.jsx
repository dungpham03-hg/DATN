import React, { useState } from 'react';
import {
  Menu,
  MenuItem,
  FormControlLabel,
  Checkbox,
  TextField,
  Button,
  Stack,
  Typography,
  Chip,
  Divider,
  Box,
  IconButton
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { vi } from 'date-fns/locale';
import ClearIcon from '@mui/icons-material/Clear';
import FilterListIcon from '@mui/icons-material/FilterList';

const AdvancedFilters = ({ anchorEl, onClose, filters, onFilterChange, onReset }) => {
  const [localFilters, setLocalFilters] = useState(filters);

  const handleFilterChange = (key, value) => {
    setLocalFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleApply = () => {
    onFilterChange(localFilters);
    onClose();
  };

  const handleReset = () => {
    const resetFilters = {
      status: [],
      meetingType: [],
      priority: [],
      dateRange: { start: null, end: null },
      organizer: '',
      department: ''
    };
    setLocalFilters(resetFilters);
    onReset();
    onClose();
  };

  const hasActiveFilters = () => {
    return (
      localFilters.status?.length > 0 ||
      localFilters.meetingType?.length > 0 ||
      localFilters.priority?.length > 0 ||
      localFilters.dateRange?.start ||
      localFilters.dateRange?.end ||
      localFilters.organizer ||
      localFilters.department
    );
  };

  return (
    <Menu
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: 400,
          maxHeight: '70vh',
          p: 2
        }
      }}
    >
      <Stack spacing={2}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight={600}>
            Bộ lọc nâng cao
          </Typography>
          <IconButton size="small" onClick={onClose}>
            <ClearIcon />
          </IconButton>
        </Box>

        <Divider />

        {/* Status Filter */}
        <Box>
          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
            Trạng thái
          </Typography>
          <Stack direction="column" spacing={0.5}>
            {['scheduled', 'ongoing', 'completed', 'cancelled', 'postponed'].map((status) => (
              <FormControlLabel
                key={status}
                control={
                  <Checkbox
                    checked={localFilters.status?.includes(status) || false}
                    onChange={(e) => {
                      const newStatus = e.target.checked
                        ? [...(localFilters.status || []), status]
                        : (localFilters.status || []).filter(s => s !== status);
                      handleFilterChange('status', newStatus);
                    }}
                  />
                }
                label={status === 'scheduled' ? 'Đã lên lịch' :
                       status === 'ongoing' ? 'Đang diễn ra' :
                       status === 'completed' ? 'Đã kết thúc' :
                       status === 'cancelled' ? 'Đã hủy' :
                       status === 'postponed' ? 'Hoãn' : status}
              />
            ))}
          </Stack>
        </Box>

        <Divider />

        {/* Meeting Type Filter */}
        <Box>
          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
            Loại cuộc họp
          </Typography>
          <Stack direction="column" spacing={0.5}>
            {['offline', 'online', 'hybrid'].map((type) => (
              <FormControlLabel
                key={type}
                control={
                  <Checkbox
                    checked={localFilters.meetingType?.includes(type) || false}
                    onChange={(e) => {
                      const newType = e.target.checked
                        ? [...(localFilters.meetingType || []), type]
                        : (localFilters.meetingType || []).filter(t => t !== type);
                      handleFilterChange('meetingType', newType);
                    }}
                  />
                }
                label={type === 'offline' ? 'Trực tiếp' :
                       type === 'online' ? 'Trực tuyến' :
                       type === 'hybrid' ? 'Kết hợp' : type}
              />
            ))}
          </Stack>
        </Box>

        <Divider />

        {/* Priority Filter */}
        <Box>
          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
            Mức độ ưu tiên
          </Typography>
          <Stack direction="column" spacing={0.5}>
            {['low', 'medium', 'high', 'urgent'].map((priority) => (
              <FormControlLabel
                key={priority}
                control={
                  <Checkbox
                    checked={localFilters.priority?.includes(priority) || false}
                    onChange={(e) => {
                      const newPriority = e.target.checked
                        ? [...(localFilters.priority || []), priority]
                        : (localFilters.priority || []).filter(p => p !== priority);
                      handleFilterChange('priority', newPriority);
                    }}
                  />
                }
                label={priority === 'low' ? 'Thấp' :
                       priority === 'medium' ? 'Trung bình' :
                       priority === 'high' ? 'Cao' :
                       priority === 'urgent' ? 'Khẩn cấp' : priority}
              />
            ))}
          </Stack>
        </Box>

        <Divider />

        {/* Date Range */}
        <Box>
          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
            Khoảng thời gian
          </Typography>
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={vi}>
            <Stack spacing={2}>
              <DatePicker
                label="Từ ngày"
                value={localFilters.dateRange?.start}
                onChange={(date) => handleFilterChange('dateRange', {
                  ...localFilters.dateRange,
                  start: date
                })}
                renderInput={(params) => <TextField {...params} />}
              />
              <DatePicker
                label="Đến ngày"
                value={localFilters.dateRange?.end}
                onChange={(date) => handleFilterChange('dateRange', {
                  ...localFilters.dateRange,
                  end: date
                })}
                renderInput={(params) => <TextField {...params} />}
              />
            </Stack>
          </LocalizationProvider>
        </Box>

        <Divider />

        {/* Action Buttons */}
        <Stack direction="row" spacing={2}>
          <Button
            fullWidth
            variant="outlined"
            onClick={handleReset}
            startIcon={<ClearIcon />}
            disabled={!hasActiveFilters()}
          >
            Xóa bộ lọc
          </Button>
          <Button
            fullWidth
            variant="contained"
            onClick={handleApply}
            startIcon={<FilterListIcon />}
          >
            Áp dụng
          </Button>
        </Stack>
      </Stack>
    </Menu>
  );
};

export default AdvancedFilters;

