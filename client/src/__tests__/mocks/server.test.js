// Test file for MSW server
import { server } from './server';

describe('MSW Server', () => {
  it('should have server object defined', () => {
    expect(server).toBeDefined();
  });

  it('should have listen method', () => {
    expect(typeof server.listen).toBe('function');
  });

  it('should have resetHandlers method', () => {
    expect(typeof server.resetHandlers).toBe('function');
  });

  it('should have close method', () => {
    expect(typeof server.close).toBe('function');
  });
});
