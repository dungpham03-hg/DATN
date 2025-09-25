import React from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button as MuiButton,
  Typography,
  Box,
  Stack,
  Chip,
  Alert,
  CircularProgress,
  useTheme,
  alpha,
  Badge
} from '@mui/material';

// Container wrapper để thay thế Bootstrap Container
export const MaterialContainer = ({ 
  children, 
  maxWidth = 'lg', 
  sx = {},
  ...props 
}) => {
  return (
    <Container maxWidth={maxWidth} sx={sx} {...props}>
      {children}
    </Container>
  );
};

// Grid wrapper để thay thế Bootstrap Row/Col
export const MaterialGrid = ({ 
  children, 
  container = false,
  item = false,
  xs,
  sm,
  md,
  lg,
  xl,
  spacing = 0,
  sx = {},
  ...props 
}) => {
  return (
    <Grid 
      container={container}
      item={item}
      xs={xs}
      sm={sm}
      md={md}
      lg={lg}
      xl={xl}
      spacing={spacing}
      sx={sx}
      {...props}
    >
      {children}
    </Grid>
  );
};

// Card wrapper để thay thế Bootstrap Card
export const MaterialCard = ({ 
  children, 
  elevation = 1,
  variant = 'elevation',
  sx = {},
  ...props 
}) => {
  return (
    <Card elevation={elevation} variant={variant} sx={sx} {...props}>
      {children}
    </Card>
  );
};

// CardContent wrapper
export const MaterialCardContent = ({ children, sx = {}, ...props }) => {
  return (
    <CardContent sx={sx} {...props}>
      {children}
    </CardContent>
  );
};

// Badge/Chip wrapper để thay thế Bootstrap Badge
export const MaterialBadge = ({ 
  children, 
  variant = 'filled',
  color = 'primary',
  size = 'medium',
  sx = {},
  ...props 
}) => {
  return (
    <Chip 
      label={children}
      variant={variant}
      color={color}
      size={size}
      sx={sx}
      {...props}
    />
  );
};

// Button wrapper để thay thế Bootstrap Button
export const MaterialButton = ({ 
  children, 
  variant = 'contained',
  color = 'primary',
  size = 'medium',
  loading = false,
  loadingText = 'Đang xử lý...',
  sx = {},
  ...props 
}) => {
  return (
    <MuiButton 
      variant={variant}
      color={color}
      size={size}
      disabled={loading}
      startIcon={loading ? <CircularProgress size={16} /> : undefined}
      sx={sx}
      {...props}
    >
      {loading ? loadingText : children}
    </MuiButton>
  );
};

// Alert wrapper để thay thế Bootstrap Alert
export const MaterialAlert = ({ 
  children, 
  severity = 'info',
  variant = 'filled',
  sx = {},
  ...props 
}) => {
  return (
    <Alert severity={severity} variant={variant} sx={{ mb: 2, ...sx }} {...props}>
      {children}
    </Alert>
  );
};

// Loading wrapper
export const MaterialLoading = ({ 
  size = 40,
  color = 'primary',
  text,
  sx = {},
  ...props 
}) => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', ...sx }}>
      <CircularProgress size={size} color={color} {...props} />
      {text && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          {text}
        </Typography>
      )}
    </Box>
  );
};

// Typography wrapper
export const MaterialText = ({ 
  children,
  variant = 'body1',
  color = 'inherit',
  align = 'inherit',
  sx = {},
  ...props 
}) => {
  return (
    <Typography variant={variant} color={color} align={align} sx={sx} {...props}>
      {children}
    </Typography>
  );
};

// Stack wrapper để thay thế Flexbox layouts
export const MaterialStack = ({ 
  children,
  direction = 'column',
  spacing = 1,
  divider,
  sx = {},
  ...props 
}) => {
  return (
    <Stack 
      direction={direction} 
      spacing={spacing} 
      divider={divider} 
      sx={sx} 
      {...props}
    >
      {children}
    </Stack>
  );
};

// Box wrapper để thay thế div với styling
export const MaterialBox = ({ 
  children,
  component = 'div',
  sx = {},
  ...props 
}) => {
  return (
    <Box component={component} sx={sx} {...props}>
      {children}
    </Box>
  );
};

export default {
  MaterialContainer,
  MaterialGrid,
  MaterialCard,
  MaterialCardContent,
  MaterialBadge,
  MaterialButton,
  MaterialAlert,
  MaterialLoading,
  MaterialText,
  MaterialStack,
  MaterialBox
};
