import {expect} from 'test';
import {MAIN_KEYRING_ID} from 'lib/constants';
import {LocalStorageStub} from 'utils';
import {__RewireAPI__ as prefsRewireAPI} from 'modules/prefs';
import {init as initKeyring, getById as getKeryingById, __RewireAPI__ as keyringRewireAPI} from 'modules/keyring';
import KeyStoreLocal from 'modules/KeyStoreLocal';
import {unlock} from 'modules/pwdCache';
import {init as pgpModelInit, encryptMessage, decryptMessage, signMessage, verifyMessage, verifyDetachedSignature, createPrivateKeyBackup, restorePrivateKeyBackup, encryptSyncMessage, decryptSyncMessage, readMessage, encryptFile, decryptFile} from 'modules/pgpModel';
import testKeys from 'Fixtures/keys';

describe('pgpModel unit tests', () => {
  const keyringIds = [MAIN_KEYRING_ID, 'test123'];
  let storage;

  beforeEach(async () => {
    let keyringAttributes;
    storage = new LocalStorageStub();
    for (const keyringId of keyringIds) {
      let storedTestKeys;
      if (keyringId === MAIN_KEYRING_ID) {
        storedTestKeys = {public: [testKeys.johnd_pub, testKeys.gordonf_pub], private: [testKeys.maditab_prv]};
        keyringAttributes = {
          default_key: '771f9119b823e06c0de306d466663688a83e9763'
        };
      } else {
        storedTestKeys = {public: [testKeys.maditab_pub, testKeys.maxp_pub], private: [testKeys.johnd_prv]};
        keyringAttributes = {};
      }
      await storage.importKeys(keyringId, storedTestKeys);
      await storage.importAttributes(keyringId, keyringAttributes);
    }
    KeyStoreLocal.__Rewire__('mvelo', {
      storage
    });
    prefsRewireAPI.__Rewire__('mvelo', {
      storage
    });
    keyringRewireAPI.__Rewire__('mvelo', {
      storage
    });
    await initKeyring();
    await pgpModelInit();
  });

  afterEach(() => {
    /* eslint-disable-next-line no-undef */
    __rewire_reset_all__();
  });

  describe('encryptMessage/decryptMessage', function() {
    this.timeout(10000);
    it('should encrypt message and decrypt PGP message', async () => {
      const data = 'This is a test message!';
      const armored = await encryptMessage({
        data,
        keyringId: MAIN_KEYRING_ID,
        unlockKey({key}) {
          return unlock({key, password: '1234'});
        },
        encryptionKeyFprs: ['771f9119b823e06c0de306d466663688a83e9763', '8f96b0094087a3499ed870ebe1ec3869e40bfe51'],
        signingKeyFpr: '771f9119b823e06c0de306d466663688a83e9763',
        uiLogSource: 'unit_test',
        noCache: false
      });
      const decryptResult = await decryptMessage({
        armored,
        keyringId: 'test123',
        unlockKey({key}) {
          return unlock({key, password: '1234'});
        },
        senderAddress: 'madita.bernstein@gmail.com',
        selfSigned: false
      });
      expect(decryptResult.data).to.equal(data);
      expect(decryptResult.signatures[0].keyId).to.equal('66663688a83e9763');
      expect(decryptResult.signatures[0].valid).to.be.true;
    });
  });

  describe('signMessage/verifyMessage', function() {
    this.timeout(5000);
    it('should sign message and verfify signed message', async () => {
      const data = 'This is a test message!';
      const armored = await signMessage({
        data,
        keyringId: MAIN_KEYRING_ID,
        unlockKey({key}) {
          return unlock({key, password: '1234'});
        },
        signingKeyFpr: '771f9119b823e06c0de306d466663688a83e9763'
      });
      const verifyResult = await verifyMessage({
        armored,
        keyringId: 'test123',
      });
      expect(verifyResult.data).to.equal(data);
      expect(verifyResult.signatures[0].keyId).to.equal('66663688a83e9763');
      expect(verifyResult.signatures[0].valid).to.be.true;
    });
  });

  describe('verifyDetachedSignature', function() {
    this.timeout(5000);
    it('verfify signed message with detached signature', async () => {
      const data = 'This is a test message!';
      const detachedSignature = `-----BEGIN PGP SIGNATURE-----
Version: Mailvelope v@@mvelo_version
Comment: https://mailvelope.com

wsFzBAEBCgAnBYJkJvqjCZBmZjaIqD6XYxYhBHcfkRm4I+BsDeMG1GZmNoio
PpdjAAB5hg/+Kqg6cCd1EYAJlTrcmZ32G05BUIRtMfxtdmGJx1YoNXJUVurH
7pR3A6ZW0pIeZo/UwMSoyTLwCDWmwRTl+o8vsAMO2cxXUONxlUVUsG0mj6GW
FLxodn2QCrXt4Zzbwck5cQwkjY5r8hEoT8AGjnsJY3xYuPGQ+Zun6lDCO5dj
ZQlhB5NSY092XvEJlRNaqWLk9piLRkQPNNSPUPbSzIkuK7HSrgK8f5HHwqHz
8a3Akqu5hmY22Zi7uybr1VsBITHq+oqm/3pSCLfnhHN9iJPtRkS9UniR6Hy5
2Ig1yXUrAVyooaUWJcGnQ6+EslLhBPcxfOuVzPAkACe5fGG4I78RyQg3nmRB
DKlgc0J2zyxqhM3AD/oqTfN+onR4Do0pmAtOclImB9QY6LV5Z74X4eGjWOBT
6ikq3WgoHGKSjqAT6J4MkWkyDFhqcqz0cmsg2crkhZ0E2pqph2Q5MVhm+wSD
zzsZ9Bt8Yv+vqab65p2eUvT2i3c+ozVny08gMcmxt0kSgnYAWVJh6szoQlBE
rwp9NbU8oADs/dYHYPlvGb6BoiZxXmUagdP9FmLaRenbqVipPTltFwhd5EHX
45aev4chRIBZj7dD0kD4o5QtW7Nn7cwzXaEv0mJueDwrFmgOfBFaRmRZjpRu
NqoPTk9p1pmbCsuZ4cQcFDDJrIeQcaE/uAU=
=eESS
-----END PGP SIGNATURE-----
`;
      const result = await verifyDetachedSignature({
        plaintext: data,
        senderAddress: 'madita.bernstein@gmail.com',
        detachedSignature,
        keyringId: 'test123',
        lookupKey() {}
      });
      expect(result.signatures[0].keyId).to.equal('66663688a83e9763');
      expect(result.signatures[0].valid).to.be.true;
    });
  });

  describe('createPrivateKeyBackup/restorePrivateKeyBackup', function() {
    this.timeout(5000);
    it('should create private key backup', async () => {
      const keyring = getKeryingById(MAIN_KEYRING_ID);
      const defaultKey = await keyring.getDefaultKey();
      const backup = await createPrivateKeyBackup(defaultKey, '1234');
      const restored = await restorePrivateKeyBackup(backup.message, backup.backupCode);
      expect(restored.password).to.equal('1234');
      expect(restored.key.getFingerprint()).to.equal(defaultKey.getFingerprint());
    });

    it('should store empty password if password is undefined', async () => {
      const keyring = getKeryingById(MAIN_KEYRING_ID);
      const defaultKey = await keyring.getDefaultKey();
      const backup = await createPrivateKeyBackup(defaultKey);
      const restored = await restorePrivateKeyBackup(backup.message, backup.backupCode);
      expect(restored.password).to.equal('');
      expect(restored.key.getFingerprint()).to.equal(defaultKey.getFingerprint());
    });
  });

  describe('encryptSyncMessage/decryptSyncMessage', function() {
    this.timeout(10000);
    it('should encrypt sync message and decrypt encrypted syn message', async () => {
      const keyring = getKeryingById(MAIN_KEYRING_ID);
      const defaultKey = await keyring.getDefaultKey();
      const unlockedKey = await unlock({key: defaultKey, password: '1234'});
      const changeLog = {
        '771f9119b823e06c0de306d466663688a83e9763': {
          type: 'INSERT',
          time: 1544138583808
        },
        '2cf63f4b3b4a51e446252247db187eb58a88aa05': {
          type: 'INSERT',
          time: 1544138447643
        },
        '8f96b0094087a3499ed870ebe1ec3869e40bfe51': {
          type: 'INSERT',
          time: 1544138445434
        }
      };
      const encrypted = await encryptSyncMessage(unlockedKey, changeLog, MAIN_KEYRING_ID);
      const message = await readMessage({armoredMessage: encrypted});
      const decrypted = await decryptSyncMessage(unlockedKey, message);
      expect(decrypted.changeLog).to.deep.equal(changeLog);
    });
  });

  describe('encryptFile/decryptFile', function() {
    this.timeout(5000);
    it('should encrypt file and decrypt encrypted file', async () => {
      const data = 'This is a sample file content!';
      const file = {
        content: `data:text/plain;base64,${window.btoa(data)}`,
        name: 'sampleFile.txt'
      };

      const armored = await encryptFile({
        plainFile: file,
        keyringId: MAIN_KEYRING_ID,
        encryptionKeyFprs: ['771f9119b823e06c0de306d466663688a83e9763', '8f96b0094087a3499ed870ebe1ec3869e40bfe51'],
        armor: true
      });
      const decrypted = await decryptFile(
        {
          encryptedFile: {
            content: `data:text/plain;base64,${window.btoa(armored)}`,
            name: 'sampleFile.txt'
          },
          unlockKey: ({key}) => unlock({key, password: '1234'})
        }
      );
      expect(decrypted.data).to.equal(data);
    });
  });
});
