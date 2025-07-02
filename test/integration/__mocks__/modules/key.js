/**
 * Mock key module for integration tests
 */

export function createMockKey(config = {}) {
  const mock = {
    // Mock mapAddressKeyMapToFpr function
    mapAddressKeyMapToFpr: keyMap => {
      const result = {};
      Object.entries(keyMap).forEach(([email, keys]) => {
        result[email] = keys ? keys.map(k => k.fingerprint) : false;
      });
      return result;
    },

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
