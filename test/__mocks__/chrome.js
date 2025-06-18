// Mock Chrome extension APIs for testing

const chrome = {
  i18n: {
    getMessage: jest.fn(key =>
      // Return the key itself as a fallback for missing translations
      key
    )
  },
  runtime: {
    sendMessage: jest.fn(),
    connect: jest.fn(),
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    },
    onConnect: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    },
    getURL: jest.fn(path => `chrome-extension://mock-id/${path}`)
  },
  storage: {
    local: {
      get: jest.fn().mockResolvedValue({}),
      set: jest.fn().mockResolvedValue(),
      remove: jest.fn().mockResolvedValue(),
      clear: jest.fn().mockResolvedValue()
    },
    sync: {
      get: jest.fn().mockResolvedValue({}),
      set: jest.fn().mockResolvedValue(),
      remove: jest.fn().mockResolvedValue(),
      clear: jest.fn().mockResolvedValue()
    }
  },
  tabs: {
    query: jest.fn().mockResolvedValue([]),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    sendMessage: jest.fn(),
    onUpdated: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    }
  },
  windows: {
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn()
  }
};

export default chrome;
