const util = {
  getUUID: jest.fn(() => 'test-uuid-123'),
  normalizeArmored: jest.fn(msg => msg),
  parseHTML: jest.fn(() => []),
  sequential: jest.fn((fn, items) => Promise.resolve(items.map(item => fn(item)))),
  isVisible: jest.fn(element => element && element.style.display !== 'none'),
  mapError: jest.fn(error => error)
};

export default util;
