export default {
  util: {
    sanitizeHTML: jest.fn(text => text)
  },
  windows: {
    getPopup: jest.fn(),
    openPopup: jest.fn()
  }
};
