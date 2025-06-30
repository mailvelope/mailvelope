/**
 * Pure JavaScript provider mocks for integration tests
 * Works in browser context without Jest dependencies
 */

export const createMockProvider = (config = {}) => {
  const mockProvider = {
    // Mock data
    _recipients: config.recipients || [{email: 'test@example.com'}],
    _shouldFailGetRecipients: config.shouldFailGetRecipients || false,
    _shouldFailSetRecipients: config.shouldFailSetRecipients || false,

    // Call tracking
    _calls: {
      getRecipients: [],
      setRecipients: []
    },

    // Mock functions
    async getRecipients(element) {
      mockProvider._calls.getRecipients.push([element]);
      if (mockProvider._shouldFailGetRecipients) {
        throw new Error('Failed to get recipients');
      }
      return mockProvider._recipients;
    },

    setRecipients({recipients, editElement}) {
      mockProvider._calls.setRecipients.push([{recipients, editElement}]);
      if (mockProvider._shouldFailSetRecipients) {
        throw new Error('Failed to set recipients');
      }
      // Simulate setting recipients in the UI
      return Promise.resolve();
    },

    // Configuration methods
    setRecipientsData(recipients) {
      mockProvider._recipients = recipients;
    },

    setShouldFail(getRecipients = false, setRecipients = false) {
      mockProvider._shouldFailGetRecipients = getRecipients;
      mockProvider._shouldFailSetRecipients = setRecipients;
    },

    reset() {
      mockProvider._recipients = [{email: 'test@example.com'}];
      mockProvider._shouldFailGetRecipients = false;
      mockProvider._shouldFailSetRecipients = false;
      mockProvider._calls = {
        getRecipients: [],
        setRecipients: []
      };
    },

    // Verification helpers
    expectGetRecipientsCalled(times = 1) {
      const callCount = mockProvider._calls.getRecipients.length;
      if (callCount !== times) {
        throw new Error(`Expected getRecipients to be called ${times} times, but was called ${callCount} times`);
      }
    },

    expectGetRecipientsCalledWith(element) {
      const calls = mockProvider._calls.getRecipients;
      const found = calls.some(([callElement]) => callElement === element);
      if (!found) {
        throw new Error(`Expected getRecipients to be called with ${element}, but it wasn't`);
      }
    },

    expectSetRecipientsCalled(times = 1) {
      const callCount = mockProvider._calls.setRecipients.length;
      if (callCount !== times) {
        throw new Error(`Expected setRecipients to be called ${times} times, but was called ${callCount} times`);
      }
    },

    expectSetRecipientsCalledWith(recipients, editElement) {
      const calls = mockProvider._calls.setRecipients;
      const found = calls.some(([{recipients: callRecipients, editElement: callElement}]) => JSON.stringify(callRecipients) === JSON.stringify(recipients) && callElement === editElement);
      if (!found) {
        throw new Error('Expected setRecipients to be called with specific args, but it wasn\'t');
      }
    },

    getCalls(method) {
      return mockProvider._calls[method] || [];
    },

    getCallCount(method) {
      return (mockProvider._calls[method] || []).length;
    }
  };

  return mockProvider;
};
