// OpenPGP mock with common functionality for Jest tests
const openpgp = {
  readMessage: jest.fn(),
  readPrivateKey: jest.fn(),
  readKey: jest.fn(),
  encrypt: jest.fn(),
  decrypt: jest.fn(),
  sign: jest.fn(),
  verify: jest.fn(),
  generateKey: jest.fn(),

  // Mock defaults for common use cases
  __mockDefaults: {
    generateKey: async () => ({
      privateKey: '-----BEGIN PGP PRIVATE KEY BLOCK-----\nmock-private-key\n-----END PGP PRIVATE KEY BLOCK-----',
      publicKey: '-----BEGIN PGP PUBLIC KEY BLOCK-----\nmock-public-key\n-----END PGP PUBLIC KEY BLOCK-----',
      revocationCertificate: 'mock-revocation-cert'
    }),
    encrypt: async ({message}) => ({
      toString: () => `-----BEGIN PGP MESSAGE-----\n${message}\n-----END PGP MESSAGE-----`
    }),
    readKey: async () => ({
      keyID: 'E47CCA58286FEFE6',
      userIDs: [{userID: 'Test User <test@example.com>'}],
      primaryKey: {keyId: 'E47CCA58286FEFE6'}
    })
  }
};

export default openpgp;
