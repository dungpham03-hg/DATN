// Test file for MSW handlers
import { rest } from 'msw';
import { handlers } from './handlers';

describe('MSW Handlers', () => {
  it('should export handlers array', () => {
    expect(Array.isArray(handlers)).toBe(true);
  });

  it('should have at least one handler', () => {
    expect(handlers.length).toBeGreaterThan(0);
  });
});
