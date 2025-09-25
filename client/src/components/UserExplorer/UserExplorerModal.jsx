import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  Chip,
  Stack
} from '@mui/material';
import {
  Close as CloseIcon,
  People as PeopleIcon
} from '@mui/icons-material';
import UserExplorer from './UserExplorer';

const UserExplorerModal = ({
  open,
  onClose,
  onConfirm,
  title = "Chọn người dùng",
  initialSelected = [],
  multiSelect = true,
  filterRoles = null,
  maxWidth = 'md'
}) => {
  const [selectedUsers, setSelectedUsers] = useState(initialSelected);

  const handleClose = () => {
    setSelectedUsers(initialSelected); // Reset to initial state
    onClose();
  };

  const handleConfirm = () => {
    onConfirm(selectedUsers);
    onClose();
  };

  const handleSelectionChange = (users) => {
    setSelectedUsers(users);
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth={maxWidth}
      fullWidth
      PaperProps={{
        sx: { 
          minHeight: 600,
          maxHeight: '90vh'
        }
      }}
    >
      <DialogTitle>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PeopleIcon color="primary" />
            <Typography variant="h6" component="span">
              {title}
            </Typography>
          </Box>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        <UserExplorer
          selectedUsers={selectedUsers}
          onSelectionChange={handleSelectionChange}
          title=""
          multiSelect={multiSelect}
          filterRoles={filterRoles}
          maxHeight={400}
        />
      </DialogContent>

      <DialogActions sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ width: '100%' }}>
          <Box sx={{ flex: 1 }}>
            {selectedUsers.length > 0 && (
              <Typography variant="body2" color="text.secondary">
                Đã chọn {selectedUsers.length} người
              </Typography>
            )}
          </Box>
          <Button onClick={handleClose} variant="outlined">
            Hủy
          </Button>
          <Button 
            onClick={handleConfirm} 
            variant="contained"
            disabled={!multiSelect && selectedUsers.length === 0}
          >
            Xác nhận
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
};

export default UserExplorerModal;
