import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Alert,
  Stack
} from '@mui/material';

const ForgotPasswordDialog = ({ open, onClose, defaultEmail = '' }) => {
  const [email, setEmail] = React.useState(defaultEmail || '');
  const [submitting, setSubmitting] = React.useState(false);
  const [message, setMessage] = React.useState('');
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    setEmail(defaultEmail || '');
    setMessage('');
    setError('');
  }, [defaultEmail, open]);

  const handleSubmit = async () => {
    if (!email) {
      setError('Vui lòng nhập email');
      return;
    }
    try {
      setSubmitting(true);
      setError('');
      setMessage('');
      const apiUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';
      const res = await fetch(`${apiUrl}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Yêu cầu thất bại');
      setMessage(data.message || 'Nếu email hợp lệ, link đặt lại mật khẩu đã được gửi');
    } catch (e) {
      setError(e.message || 'Lỗi khi gửi yêu cầu');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Quên mật khẩu</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {message && <Alert severity="success">{message}</Alert>}
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label="Email"
            type="email"
            fullWidth
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>Đóng</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={submitting}>Gửi</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ForgotPasswordDialog;


