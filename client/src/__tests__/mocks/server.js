import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// Setup MSW server với handlers
export const server = setupServer(...handlers);

// Thiết lập server cho testing environment
beforeAll(() => {
  // Enable API mocking trước khi chạy tests
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  // Reset handlers sau mỗi test
  server.resetHandlers();
});

afterAll(() => {
  // Cleanup sau khi tất cả tests hoàn thành
  server.close();
});
