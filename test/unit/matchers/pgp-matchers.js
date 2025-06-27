// PGP-specific matchers for Jest tests
expect.extend({
  toBeValidPGPKey(received) {
    const pass = received &&
      received.primaryKey &&
      received.primaryKey.keyId;
    return {
      message: () => `expected ${received} to be a valid PGP key`,
      pass
    };
  },

  toBeEncryptedMessage(received) {
    const pass = typeof received === 'string' &&
      received.includes('-----BEGIN PGP MESSAGE-----');
    return {
      message: () => `expected ${received} to be encrypted PGP message`,
      pass
    };
  },

  toBeValidKeyId(received) {
    const pass = typeof received === 'string' &&
      /^[a-fA-F0-9]{16}$/.test(received);
    return {
      message: () => `expected ${received} to be a valid 16-character key ID`,
      pass
    };
  },

  toBeValidFingerprint(received) {
    const pass = typeof received === 'string' &&
      /^[a-fA-F0-9\s]{40,50}$/.test(received.replace(/\s/g, ''));
    return {
      message: () => `expected ${received} to be a valid PGP fingerprint`,
      pass
    };
  }
});
