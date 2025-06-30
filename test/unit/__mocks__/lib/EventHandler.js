// EventHandler mock for Jest tests
class MockEventHandler {
  constructor(port) {
    this._events = {
      emit: [],
      on: [],
      send: []
    };
    this._responses = {};
    this._options = {};

    // Initialize with a mock port structure
    this._port = port || {
      onMessage: {
        addListener: jest.fn()
      },
      onDisconnect: {
        addListener: jest.fn()
      },
      postMessage: jest.fn(),
      disconnect: jest.fn(),
      name: 'mock-port'
    };

    this._handlers = new Map();
    this._handlerObject = null;
  }

  // Configure the mock with specific responses and options
  configure(responses = {}, options = {}) {
    this._responses = {...this._responses, ...responses};
    this._options = {...this._options, ...options};
  }

  // Reset the mock state
  reset() {
    this._events = {
      emit: [],
      on: [],
      send: []
    };
    this._responses = {};
    this._options = {};
    this.on.mockClear();
    this.emit.mockClear();
    this.send.mockClear();
    this.disconnect.mockClear();
  }

  on = jest.fn(event => {
    this._events.on.push(event);
  });
  emit = jest.fn(event => {
    this._events.emit.push(event);
  });
  send = jest.fn(event => {
    this._events.send.push(event);

    const {shouldFail = false, failingEvents = []} = this._options;

    if (shouldFail || failingEvents.includes(event)) {
      return Promise.reject(new Error('Port communication failed'));
    }

    const response = this._responses[event];
    // Handle null responses by returning empty object to avoid destructuring errors
    if (response === null) {
      return Promise.resolve({});
    }
    return Promise.resolve(response !== undefined ? response : event);
  });
  disconnect = jest.fn();
  onConnect = {
    addListener: jest.fn()
  };
  onDisconnect = {
    addListener: jest.fn()
  };
  onMessage = {
    addListener: jest.fn()
  };
  onUninstall = {
    addListener: jest.fn()
  };
  name = 'mock-port';
  // Mock EventHandler methods that components might use
  initPort = jest.fn(port => {
    if (port) {
      this._port = port;
    }
  });
  activatePortMessages = jest.fn();
  deactivatePortMessages = jest.fn();
  handleRuntimeMessage = jest.fn();
  handlePortMessage = jest.fn();
  triggerConnectListener = jest.fn();
  clearPort = jest.fn();
  // Mock trigger method
  trigger = jest.fn((event, options = {}) => {
    options.event = event;
    if (this._handlers.has(event)) {
      const handler = this._handlers.get(event);
      handler.call(this, options);
    }
  });
}

// Global state for the mock
let globalResponses = {};
let globalOptions = {};

// Mock the EventHandler class
class EventHandler {
  constructor(port, handlers) {
    // Return a mock instance when constructor is called
    const mockInstance = new MockEventHandler(port);
    mockInstance._handlers = handlers || new Map();
    mockInstance.configure(globalResponses, globalOptions);
    return mockInstance;
  }

  static connect = jest.fn((sender, handlerObject) => {
    // Create new instance for each connect call
    const mockPort = {
      onMessage: {
        addListener: jest.fn()
      },
      onDisconnect: {
        addListener: jest.fn()
      },
      postMessage: jest.fn(),
      disconnect: jest.fn(),
      name: sender || 'mock-port'
    };

    const mockInstance = new MockEventHandler(mockPort);
    mockInstance._handlerObject = handlerObject;
    mockInstance.configure(globalResponses, globalOptions);
    return mockInstance;
  });
  // Static method to configure responses before component renders
  static setMockResponses = (responses = {}, options = {}) => {
    globalResponses = responses;
    globalOptions = options;
  };
  static clearMockResponses = () => {
    globalResponses = {};
    globalOptions = {};
  };
}

// Export as default
export default EventHandler;

// Export the MockEventHandler class for type information if needed
export {MockEventHandler};
