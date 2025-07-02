/**
 * Mock keyRegistry module for integration tests
 */

export function createMockKeyRegistry(config = {}) {
  const mock = {
    // Mock key lookup function
    lookup: ({query, identity}) => {
      // Use identity to determine lookup behavior if configured
      const lookupKey = identity ? `${query.email}:${identity.userIds?.[0]?.email || 'default'}` : query.email;
      if (config.lookupResults && config.lookupResults[lookupKey]) {
        return Promise.resolve(config.lookupResults[lookupKey]);
      }

      // Default behavior - return a mock key
      if (config.returnNull) {
        return Promise.resolve(null);
      }

      return Promise.resolve({
        armored: config.defaultKey || '-----BEGIN PGP PUBLIC KEY BLOCK-----\nmock key content\n-----END PGP PUBLIC KEY BLOCK-----'
      });
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
