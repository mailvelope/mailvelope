/**
 * Mock mime module for integration tests
 */

export function createMockMime(config = {}) {
  const mock = {
    // Mock buildMail function
    buildMail: options => config.builtMail || `Subject: ${options.subject || 'Test Subject'}\n\n${options.message || 'Test message'}`,

    // Mock parseMessage function
    parseMessage: data => Promise.resolve({
      message: config.parsedMessage || data,
      attachments: config.parsedAttachments || []
    }),

    // Reset function
    reset: () => {
      // Reset any mock state if needed
    },

    // Utility to configure mock behavior
    configure: newConfig => {
      Object.assign(config, newConfig);
    }
  };

  return mock;
}
