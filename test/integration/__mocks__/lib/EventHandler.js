/**
 * Pure JavaScript EventHandler mock for integration tests
 * Works in browser context without Jest dependencies
 */

export const createMockEventHandler = (config = {}) => {
  const mockHandler = {
    // Call tracking
    _calls: {
      emit: [],
      on: [],
      send: [],
      disconnect: []
    },

    // Configuration
    _responses: config.responses || {},
    _options: config.options || {},

    // Mock methods
    emit(event, data) {
      mockHandler._calls.emit.push([event, data]);
      return Promise.resolve();
    },

    on(event, handler) {
      mockHandler._calls.on.push([event, handler]);
    },

    send(event, data) {
      mockHandler._calls.send.push([event, data]);
      const {shouldFail = false, failingEvents = []} = mockHandler._options;
      if (shouldFail || failingEvents.includes(event)) {
        return Promise.reject(new Error('Port communication failed'));
      }
      const response = mockHandler._responses[event];
      if (response === null) {
        return Promise.resolve({});
      }
      return Promise.resolve(response !== undefined ? response : event);
    },

    disconnect() {
      mockHandler._calls.disconnect.push([]);
    },

    // Port-like properties
    onConnect: {
      addListener() {
        // Track listener additions if needed
      }
    },
    onDisconnect: {
      addListener() {
        // Track listener additions if needed
      }
    },
    onMessage: {
      addListener() {
        // Track listener additions if needed
      }
    },
    onUninstall: {
      addListener() {
        // Track listener additions if needed
      }
    },

    name: config.name || 'mock-port',

    // Configuration methods
    setResponses(responses) {
      mockHandler._responses = {...mockHandler._responses, ...responses};
    },

    setOptions(options) {
      mockHandler._options = {...mockHandler._options, ...options};
    },

    // Reset method
    reset() {
      mockHandler._calls = {
        emit: [],
        on: [],
        send: [],
        disconnect: []
      };
      mockHandler._responses = {};
      mockHandler._options = {};
    },

    // Verification helpers
    expectCalled(method, times) {
      const calls = mockHandler._calls[method] || [];
      if (calls.length !== times) {
        throw new Error(`Expected ${method} to be called ${times} times, but was called ${calls.length} times`);
      }
    },

    expectCalledWith(method, ...expectedArgs) {
      const calls = mockHandler._calls[method] || [];
      const found = calls.some(call => JSON.stringify(call) === JSON.stringify(expectedArgs));
      if (!found) {
        throw new Error(`Expected ${method} to be called with ${JSON.stringify(expectedArgs)}, but it wasn't`);
      }
    },

    expectEmitted(event, data) {
      mockHandler.expectCalledWith('emit', event, data);
    },

    expectListenerAdded(event) {
      const calls = mockHandler._calls.on || [];
      const found = calls.some(([callEvent]) => callEvent === event);
      if (!found) {
        throw new Error(`Expected listener to be added for event ${event}, but it wasn't`);
      }
    },

    getCalls(method) {
      return mockHandler._calls[method] || [];
    },

    getEmitCalls() {
      return mockHandler._calls.emit.map(([event, data]) => ({event, data}));
    },

    getCallCount(method) {
      return (mockHandler._calls[method] || []).length;
    }
  };

  return mockHandler;
};
