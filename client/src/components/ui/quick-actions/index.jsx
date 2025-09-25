import React, { useEffect, useMemo, useState } from 'react';
import { Box, Paper, Stack, Typography, alpha, Button, Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemText, IconButton, Checkbox, ListItemIcon, useTheme, Divider } from '@mui/material';
import { ArrowUpward, ArrowDownward, Save as SaveIcon, Tune as TuneIcon, RestartAlt as ResetIcon, Add as AddIcon } from '@mui/icons-material';

const storageKeyForUser = (userId) => `quick_actions_pref_${userId || 'guest'}`;

/**
 * QuickActions: Hiển thị danh sách thao tác nhanh có thể tùy chỉnh theo người dùng.
 * Props:
 * - userId: string | undefined
 * - catalog: Array<{ id, icon, text, path, color }>
 * - onNavigate: (path)=>void
 */
const QuickActions = ({ userId, catalog, onNavigate }) => {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState({ order: [], hidden: {} });

  // Load & save prefs
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKeyForUser(userId));
      if (raw) {
        setPrefs(JSON.parse(raw));
      } else {
        // default order: theo catalog hiện tại
        setPrefs({ order: catalog.map(a => a.id), hidden: {} });
      }
    } catch (_) {
      setPrefs({ order: catalog.map(a => a.id), hidden: {} });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const orderedVisibleActions = useMemo(() => {
    const idToAction = Object.fromEntries(catalog.map(a => [a.id, a]));
    const listFromOrder = prefs.order.map(id => idToAction[id]).filter(Boolean);
    const remaining = catalog.filter(a => !prefs.order.includes(a.id));
    const full = [...listFromOrder, ...remaining];
    return full.filter(a => !prefs.hidden[a.id]);
  }, [catalog, prefs]);

  const openCustomize = () => setOpen(true);
  const closeCustomize = () => setOpen(false);

  const move = (id, dir) => {
    setPrefs((prev) => {
      const order = prev.order.length ? [...prev.order] : catalog.map(a => a.id);
      const idx = order.indexOf(id);
      if (idx === -1) return prev;
      const target = dir === 'up' ? idx - 1 : idx + 1;
      if (target < 0 || target >= order.length) return prev;
      const newOrder = [...order];
      const [item] = newOrder.splice(idx, 1);
      newOrder.splice(target, 0, item);
      return { ...prev, order: newOrder };
    });
  };

  const toggleVisible = (id) => {
    setPrefs((prev) => ({
      ...prev,
      hidden: { ...prev.hidden, [id]: !prev.hidden[id] }
    }));
  };

  const savePrefs = () => {
    localStorage.setItem(storageKeyForUser(userId), JSON.stringify(prefs));
    closeCustomize();
  };

  const resetPrefs = () => {
    const defaults = { order: catalog.map(a => a.id), hidden: {} };
    setPrefs(defaults);
    localStorage.setItem(storageKeyForUser(userId), JSON.stringify(defaults));
  };

  const addItem = (id) => {
    setPrefs((prev) => {
      const exists = prev.order.includes(id);
      const order = exists ? [...prev.order] : [...prev.order, id];
      const hidden = { ...prev.hidden };
      hidden[id] = false;
      return { order, hidden };
    });
  };

  return (
    <>
      <Stack spacing={2}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight={600} gutterBottom sx={{ m: 0 }}>
            Thao tác nhanh
          </Typography>
          <Button size="small" startIcon={<TuneIcon />} onClick={openCustomize}>Tùy chỉnh</Button>
        </Box>
        {orderedVisibleActions.map((action, index) => (
          <Paper
            key={action.id}
            elevation={0}
            className="slide-in-up"
            sx={{
              p: 2.5,
              cursor: 'pointer',
              borderRadius: 3,
              border: `1px solid ${alpha(theme.palette[action.color || 'primary'].main, 0.2)}`,
              background: `linear-gradient(135deg, ${alpha(theme.palette[action.color || 'primary'].main, 0.05)} 0%, ${alpha(theme.palette[action.color || 'primary'].main, 0.02)} 100%)`,
              backdropFilter: 'blur(10px)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              animationDelay: `${index * 100}ms`,
              position: 'relative',
              overflow: 'hidden',
              '&:before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 3,
                background: `linear-gradient(90deg, ${theme.palette[action.color || 'primary'].main} 0%, ${alpha(theme.palette[action.color || 'primary'].main, 0.6)} 100%)`,
                borderRadius: '12px 12px 0 0'
              },
              '&:hover': {
                background: `linear-gradient(135deg, ${alpha(theme.palette[action.color || 'primary'].main, 0.1)} 0%, ${alpha(theme.palette[action.color || 'primary'].main, 0.05)} 100%)`,
                borderColor: theme.palette[action.color || 'primary'].main,
                transform: 'translateY(-4px) scale(1.02)',
                boxShadow: `0 12px 24px ${alpha(theme.palette[action.color || 'primary'].main, 0.3)}, 0 0 0 1px ${alpha(theme.palette[action.color || 'primary'].main, 0.1)}`,
                '& .action-icon': {
                  transform: 'scale(1.1) rotate(5deg)',
                  filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))'
                },
                '& .action-text': {
                  color: theme.palette[action.color || 'primary'].main,
                  fontWeight: 600
                }
              }
            }}
            onClick={() => onNavigate && onNavigate(action.path)}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, position: 'relative', zIndex: 1 }}>
              <Box
                className="action-icon"
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 3,
                  background: `linear-gradient(135deg, ${alpha(theme.palette[action.color || 'primary'].main, 0.1)} 0%, ${alpha(theme.palette[action.color || 'primary'].main, 0.05)} 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: `${action.color || 'primary'}.main`,
                  border: `2px solid ${alpha(theme.palette[action.color || 'primary'].main, 0.2)}`,
                  boxShadow: `0 4px 12px ${alpha(theme.palette[action.color || 'primary'].main, 0.2)}`,
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  overflow: 'hidden',
                  '&:before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: `linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 100%)`,
                    borderRadius: 'inherit'
                  }
                }}
              >
                {React.cloneElement(action.icon, { 
                  sx: { 
                    fontSize: 24,
                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
                    position: 'relative',
                    zIndex: 1
                  } 
                })}
              </Box>
              <Typography 
                className="action-text"
                variant="body1" 
                fontWeight={500} 
                sx={{ 
                  flex: 1,
                  transition: 'all 0.3s ease',
                  color: 'text.primary'
                }}
              >
                {action.text}
              </Typography>
              {action.trailing}
            </Box>
          </Paper>
        ))}
      </Stack>

      <Dialog open={open} onClose={closeCustomize} fullWidth maxWidth="sm">
        <DialogTitle>Tùy chỉnh thao tác nhanh</DialogTitle>
        <DialogContent>
          <List>
            {prefs.order.length === 0 && setPrefs((p)=>({ ...p, order: catalog.map(a=>a.id) }))}
            {prefs.order.length === 0 ? null : prefs.order.map((id, idx) => {
              const action = catalog.find(a => a.id === id);
              if (!action) return null;
              const hidden = !!prefs.hidden[id];
              return (
                <ListItem key={id} secondaryAction={
                  <Box>
                    <IconButton size="small" disabled={idx===0} onClick={() => move(id, 'up')}><ArrowUpward fontSize="small"/></IconButton>
                    <IconButton size="small" disabled={idx===prefs.order.length-1} onClick={() => move(id, 'down')}><ArrowDownward fontSize="small"/></IconButton>
                  </Box>
                }>
                  <ListItemIcon>
                    <Checkbox edge="start" checked={!hidden} tabIndex={-1} onChange={() => toggleVisible(id)} />
                  </ListItemIcon>
                  <ListItemText primary={action.text} secondary={action.path} />
                </ListItem>
              );
            })}
          </List>
          <Divider sx={{ my: 1 }} />
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Mục có sẵn khác</Typography>
          <List>
            {catalog.filter(a => !prefs.order.includes(a.id)).map((a) => (
              <ListItem key={a.id} secondaryAction={
                <Button size="small" startIcon={<AddIcon />} onClick={() => addItem(a.id)}>Thêm</Button>
              }>
                <ListItemText primary={a.text} secondary={a.path} />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button startIcon={<ResetIcon />} onClick={resetPrefs}>Mặc định</Button>
          <Button startIcon={<SaveIcon />} variant="contained" onClick={savePrefs}>Lưu</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default QuickActions;


