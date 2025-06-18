// Port communication mock factory for Jest tests
import EventHandler from 'lib/EventHandler';

export const createMockPort = (responses = {}, options = {}) => {
  const {shouldFail = false, failingEvents = []} = options;

  const mockPort = {
    _events: {
      emit: [],
      on: [],
      send: []
    },
    on: jest.fn(event => mockPort._events.on.push(event)),
    emit: jest.fn(event => mockPort._events.emit.push(event)),
    send: jest.fn(event => {
      mockPort._events.send.push(event);

      if (shouldFail || failingEvents.includes(event)) {
        return Promise.reject(new Error('Port communication failed'));
      }

      const response = responses[event];
      // Handle null responses by returning empty object to avoid destructuring errors
      if (response === null) {
        return Promise.resolve({});
      }
      return Promise.resolve(response !== undefined ? response : event);
    }),
    disconnect: jest.fn(),
    onConnect: {
      addListener: jest.fn()
    },
    onDisconnect: {
      addListener: jest.fn()
    },
    onMessage: {
      addListener: jest.fn()
    },
    name: 'mock-port'
  };

  // Automatically setup EventHandler mock to return this port
  if (EventHandler && EventHandler.connect) {
    EventHandler.connect.mockReturnValue(mockPort);
  }

  return mockPort;
};

// Helper to setup EventHandler with mock port
export const setupMockEventHandler = port => {
  jest.doMock('lib/EventHandler', () => ({
    connect: jest.fn(() => port)
  }));
};
