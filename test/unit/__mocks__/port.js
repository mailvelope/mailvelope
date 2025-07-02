export const createMockPort = (name = 'mock-port') => ({
  onMessage: {addListener: jest.fn()},
  onDisconnect: {addListener: jest.fn()},
  postMessage: jest.fn(),
  disconnect: jest.fn(),
  name
});
