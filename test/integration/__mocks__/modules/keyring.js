/**
 * Mock keyring module for integration tests
 */

export function createMockKeyring(config = {}) {
  const mockKeyData = config.mockKeyData || [
    {
      email: 'test@example.com',
      name: 'Test User',
      fingerprint: '1234567890ABCDEF1234567890ABCDEF12345678',
      keyId: '90ABCDEF12345678',
      type: 'public'
    },
    {
      email: 'other@example.com',
      name: 'Other User',
      fingerprint: 'ABCDEF1234567890ABCDEF1234567890ABCDEF12',
      keyId: 'EF1234567890ABCD',
      type: 'public'
    }
  ];

  const mockKeyring = {
    getDefaultKeyFpr: () => Promise.resolve(mockKeyData[0].fingerprint),
    getValidSigningKeys: () => Promise.resolve([mockKeyData[0]]),
    importKeys: () => Promise.resolve(),
    getKeyData: () => Promise.resolve(mockKeyData),
    ...config.keyringMethods
  };

  const mock = {
    // Mock functions
    getKeyData: () => Promise.resolve(mockKeyData),
    getPreferredKeyringId: () => Promise.resolve('test-keyring-id'),
    getById: () => Promise.resolve(mockKeyring),
    getDefaultKeyFpr: () => Promise.resolve(mockKeyData[0].fingerprint),
    syncPublicKeys: () => Promise.resolve(),
    getKeyByAddress: (keyringId, addresses) => {
      const result = {};
      const addressArray = Array.isArray(addresses) ? addresses : [addresses];
      addressArray.forEach(addr => {
        const key = mockKeyData.find(k => k.email === addr);
        result[addr] = key ? [key] : config.missingKeys?.[addr] ? null : [key];
      });
      return Promise.resolve(result);
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
