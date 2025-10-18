import React from 'react';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { AuthProvider } from '../../contexts/AuthContext';
import { NotificationProvider } from '../../contexts/NotificationContext';
import { GlobalLoadingProvider } from '../../contexts/GlobalLoadingContext';
import theme from '../../theme';

// Mock user data cho testing
export const mockUser = {
  _id: '507f1f77bcf86cd799439011',
  name: 'Test User',
  email: 'test@example.com',
  role: 'admin',
  department: 'IT',
  isActive: true
};

export const mockAuthContext = {
  user: mockUser,
  token: 'mock-jwt-token',
  login: jest.fn(),
  logout: jest.fn(),
  loading: false
};

// Custom render function với providers
const AllTheProviders = ({ children, authValue = mockAuthContext }) => {
  return (
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <AuthProvider value={authValue}>
          <NotificationProvider>
            <GlobalLoadingProvider>
              {children}
            </GlobalLoadingProvider>
          </NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

const customRender = (ui, options = {}) => {
  const { authValue, ...renderOptions } = options;
  const Wrapper = ({ children }) => (
    <AllTheProviders authValue={authValue}>{children}</AllTheProviders>
  );
  
  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

// re-export everything
export * from '@testing-library/react';

// override render method
export { customRender as render };

// Helper functions cho testing
export const createMockEvent = (type, properties = {}) => ({
  type,
  preventDefault: jest.fn(),
  stopPropagation: jest.fn(),
  target: { value: '' },
  ...properties
});

export const waitForLoadingToFinish = () => 
  new Promise(resolve => setTimeout(resolve, 0));

// Mock API responses
export const mockApiResponse = (data, status = 200) => ({
  data,
  status,
  statusText: 'OK',
  headers: {},
  config: {}
});

export const mockApiError = (message = 'API Error', status = 500) => ({
  response: {
    data: { message },
    status,
    statusText: 'Internal Server Error'
  },
  message
});

// Mock different user roles
export const createMockUser = (role = 'admin', overrides = {}) => ({
  _id: '507f1f77bcf86cd799439011',
  name: `Test ${role}`,
  email: `${role}@example.com`,
  role,
  department: 'IT',
  isActive: true,
  ...overrides
});

// Mock meeting data
export const mockMeeting = {
  _id: '507f1f77bcf86cd799439012',
  title: 'Test Meeting',
  description: 'Test meeting description',
  startTime: new Date('2024-01-15T10:00:00Z'),
  endTime: new Date('2024-01-15T11:00:00Z'),
  location: 'Conference Room A',
  status: 'scheduled',
  organizer: mockUser,
  attendees: [mockUser],
  createdAt: new Date('2024-01-10T10:00:00Z'),
  updatedAt: new Date('2024-01-10T10:00:00Z')
};