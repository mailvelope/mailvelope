// emailjs-mime-builder is ESM-only and only used by mime.js's build helpers.
// pgpModel.js doesn't depend on it directly but is loaded transitively in some configs;
// guard against it the same way as in mime.test.js.
jest.mock('emailjs-mime-builder', () => ({__esModule: true, default: jest.fn()}));

// Mock the openpgp library — pgpModel only uses it for cleartext / signature reads and
// for the private-key backup flow we don't touch here.
jest.mock('openpgp', () => ({
  config: {},
  readMessage: jest.fn(),
  createMessage: jest.fn(),
  readCleartextMessage: jest.fn(),
  readSignature: jest.fn(),
  enums: {packet: {}, symmetric: {}},
  decrypt: jest.fn(),
  encrypt: jest.fn(),
  PrivateKey: class {},
  SecretKeyPacket: class {},
  UserIDPacket: class {},
  SignaturePacket: class {},
  SecretSubkeyPacket: class {}
}));

jest.mock('@openpgp/web-stream-tools', () => ({readToEnd: jest.fn()}), {virtual: true});

jest.mock('../../../src/modules/keyring', () => require('../__mocks__/modules/keyring').default);
jest.mock('../../../src/modules/keyringSync', () => ({}));
jest.mock('../../../src/modules/trustKey', () => ({init: jest.fn()}));
jest.mock('../../../src/modules/defaults', () => ({init: jest.fn(), getVersion: () => 'test'}));
jest.mock('../../../src/modules/prefs', () => ({
  init: jest.fn(),
  prefs: {security: {hide_armored_header: false}}
}));
jest.mock('../../../src/modules/pwdCache', () => ({init: jest.fn(), initSession: jest.fn()}));
jest.mock('../../../src/modules/crypto', () => ({randomString: jest.fn(), symEncrypt: jest.fn()}));
jest.mock('../../../src/modules/uiLog', () => ({push: jest.fn()}));
jest.mock('../../../src/modules/key', () => ({
  getUserInfo: jest.fn().mockResolvedValue({userId: 'Test'}),
  mapKeys: jest.fn().mockResolvedValue([]),
  keyIDfromHex: jest.fn()
}));
jest.mock('../../../src/modules/keyBinding', () => ({
  updateKeyBinding: jest.fn(),
  init: jest.fn()
}));

import * as l10n from '../../../src/lib/l10n';
import {Uint8Array2str} from '../../../src/lib/util';
import {decryptMessage, verifyMessage} from '../../../src/modules/pgpModel';
import {parseMessage} from '../../../src/modules/mime';

const utf8Binary = str => Uint8Array2str(new TextEncoder().encode(str));

function makeFakeKeyring({decryptImpl, verifyImpl}) {
  return {
    getPgpBackend: () => ({
      decrypt: decryptImpl,
      verify: verifyImpl
    }),
    getPrivateKeyByIds: jest.fn(),
    keystore: {
      getAllKeys: jest.fn().mockReturnValue([]),
      getKeysForId: jest.fn().mockReturnValue([])
    },
    getFprForKeyId: jest.fn(),
    getKeyByAddress: jest.fn().mockResolvedValue({})
  };
}

beforeAll(() => {
  l10n.mapToLocal();
});

beforeEach(() => {
  jest.clearAllMocks();
  const openpgp = require('openpgp');
  openpgp.readMessage.mockImplementation(async () => ({
    getEncryptionKeyIDs: () => ['id1']
  }));
  openpgp.readCleartextMessage.mockImplementation(async () => ({
    getSigningKeyIDs: () => ['id1']
  }));
});

describe('decryptMessage', () => {
  it('passes format: "binary" to the backend (issue #893 contract)', async () => {
    const decryptImpl = jest.fn().mockResolvedValue({data: 'plain', signatures: []});
    const keyring = makeFakeKeyring({decryptImpl});
    const keyringModule = require('../../../src/modules/keyring');
    keyringModule.getKeyringWithPrivKey.mockResolvedValue(keyring);

    await decryptMessage({
      armored: '-----BEGIN PGP MESSAGE-----\nblah\n-----END PGP MESSAGE-----',
      keyringId: 'test',
      unlockKey: jest.fn()
    });

    expect(decryptImpl).toHaveBeenCalledTimes(1);
    expect(decryptImpl.mock.calls[0][0].format).toBe('binary');
  });

  it('returns data as a binary string that parseMessage can decode to UTF-8 multibyte chars', async () => {
    // The backend now returns a binary string (one byte per char code) — simulate the
    // shape openpgpjs.decrypt produces with format: 'binary'.
    const utf8Body = 'Hallo ÄÖÜ 한국어';
    const mimeText = `Content-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\n\r\n${utf8Body}`;
    const binaryData = utf8Binary(mimeText);
    const decryptImpl = jest.fn().mockResolvedValue({data: binaryData, signatures: []});
    const keyring = makeFakeKeyring({decryptImpl});
    const keyringModule = require('../../../src/modules/keyring');
    keyringModule.getKeyringWithPrivKey.mockResolvedValue(keyring);

    const {data} = await decryptMessage({
      armored: '-----BEGIN PGP MESSAGE-----\nblah\n-----END PGP MESSAGE-----',
      keyringId: 'test',
      unlockKey: jest.fn()
    });

    expect(typeof data).toBe('string');
    expect(data).toBe(binaryData);

    // Pipe through parseMessage — this is the integration point that previously corrupted bytes.
    const {message} = await parseMessage(data, 'text');
    expect(message).toBe(utf8Body);
  });

  it('propagates inline (non-MIME) plain-text binary data verbatim via parseMessage', async () => {
    const body = 'plain ÄÖÜ';
    const binaryData = utf8Binary(body);
    const decryptImpl = jest.fn().mockResolvedValue({data: binaryData, signatures: []});
    const keyring = makeFakeKeyring({decryptImpl});
    const keyringModule = require('../../../src/modules/keyring');
    keyringModule.getKeyringWithPrivKey.mockResolvedValue(keyring);

    const {data} = await decryptMessage({
      armored: '-----BEGIN PGP MESSAGE-----\nblah\n-----END PGP MESSAGE-----',
      keyringId: 'test',
      unlockKey: jest.fn()
    });
    const {message} = await parseMessage(data, 'text');
    expect(message).toBe(body);
  });
});

describe('verifyMessage', () => {
  it('returns data as a binary string that parseMessage can decode (no escape/unescape hop needed)', async () => {
    const utf8Body = 'Signed ÄÖÜ 한국어';
    const mimeText = `Content-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\n\r\n${utf8Body}`;
    const binaryData = utf8Binary(mimeText);
    const verifyImpl = jest.fn().mockResolvedValue({data: binaryData, signatures: []});
    const keyring = makeFakeKeyring({verifyImpl});
    keyring.getKeyByAddress = jest.fn();

    const keyringModule = require('../../../src/modules/keyring');
    keyringModule.getPreferredKeyring.mockResolvedValue(keyring);

    const {data} = await verifyMessage({
      armored: '-----BEGIN PGP SIGNED MESSAGE-----\nblah\n-----END PGP SIGNATURE-----',
      keyringId: 'test'
    });

    expect(data).toBe(binaryData);

    const {message} = await parseMessage(data, 'text');
    expect(message).toBe(utf8Body);
  });
});
