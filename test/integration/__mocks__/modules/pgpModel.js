/**
 * Mock pgpModel module for integration tests
 */

export function createMockPgpModel(config = {}) {
  const mock = {
    // Mock encryption function
    encryptMessage: () => Promise.resolve(config.encryptedMessage || '-----BEGIN PGP MESSAGE-----\nencrypted content\n-----END PGP MESSAGE-----'),

    // Mock decryption function
    decryptMessage: () => Promise.resolve({
      data: config.decryptedData || 'decrypted content',
      signatures: config.signatures || []
    }),

    // Mock signing function
    signMessage: () => Promise.resolve(config.signedMessage || '-----BEGIN PGP SIGNED MESSAGE-----\nsigned content\n-----END PGP SIGNATURE-----'),

    // Mock verify function
    verifyMessage: () => Promise.resolve({
      data: config.verifiedData || 'verified content',
      signatures: config.verifySignatures || []
    }),

    // Mock file encryption
    encryptFile: () => Promise.resolve(config.encryptedFile || 'encrypted file content'),

    // Mock file decryption
    decryptFile: () => Promise.resolve({
      filename: config.decryptedFilename || 'decrypted.txt',
      data: config.decryptedFileData || 'decrypted file content'
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
