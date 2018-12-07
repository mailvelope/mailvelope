import {expect} from 'test';
import mvelo from 'lib/lib-mvelo';
import {LocalStorageStub} from 'utils';
import {__RewireAPI__ as prefsRewireAPI} from 'modules/prefs';
import {init as initKeyring, getById as getKeryingById, __RewireAPI__ as keyringRewireAPI} from 'modules/keyring';
import KeyStoreLocal from 'modules/KeyStoreLocal';
import {unlock} from 'modules/pwdCache';
import {init as pgpModelInit, encryptMessage, decryptMessage, signMessage, verifyMessage, verifyDetachedSignature, createPrivateKeyBackup, restorePrivateKeyBackup, encryptSyncMessage, decryptSyncMessage, readMessage, encryptFile, decryptFile} from 'modules/pgpModel';
import testKeys, {init as initTestKeys} from 'Fixtures/keys';

describe('pgpModel unit tests', () => {
  const keyringIds = [mvelo.MAIN_KEYRING_ID, 'test123'];
  let storage;

  beforeEach(async() => {
    let keyringAttributes;
    storage = new LocalStorageStub();
    for (const keyringId of keyringIds) {
      if (keyringId === mvelo.MAIN_KEYRING_ID) {
        initTestKeys(['maditab_prv', 'johnd_pub', 'gordonf_pub']);
        keyringAttributes = {
          default_key: '771f9119b823e06c0de306d466663688a83e9763'
        };
      } else {
        initTestKeys(['maditab_pub', 'johnd_prv', 'maxp_pub']);
        keyringAttributes = {};
      }
      await storage.importKeys(keyringId, testKeys);
      await storage.importAttributes(keyringId, keyringAttributes);
    }
    KeyStoreLocal.__Rewire__('mvelo', {
      storage
    });
    prefsRewireAPI.__Rewire__('mvelo', {
      storage
    });
    keyringRewireAPI.__Rewire__('mvelo', {
      MAIN_KEYRING_ID: mvelo.MAIN_KEYRING_ID,
      storage,
      util: {
        filterAsync: mvelo.util.filterAsync,
        toArray: mvelo.util.toArray
      }
    });
    await initKeyring();
    await pgpModelInit();
  });

  afterEach(() => {
    /* eslint-disable-next-line no-undef */
    __rewire_reset_all__();
  });

  describe('encryptMessage/decryptMessage', () => {
    it('should encrypt message and decrypt PGP message', function() {
      this.timeout(10000);
      const data = 'This is a test message!';
      return encryptMessage({
        data,
        keyringId: mvelo.MAIN_KEYRING_ID,
        unlockKey({key}) {
          return unlock({key, password: '1234'});
        },
        encryptionKeyFprs: ['81364f6680a600b292bec5980c02c51f4af1a165', '3bfa0e474542751cc25777842e760c1d2b6c7a8d'],
        signingKeyFpr: '771f9119b823e06c0de306d466663688a83e9763',
        uiLogSource: 'unit_test',
        noCache: false
      }).then(async armored => {
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
  });

  describe('signMessage/verifyMessage', () => {
    it('should sign message and verfify signed message', function() {
      this.timeout(5000);
      const data = 'This is a test message!';
      return signMessage({
        data,
        keyringId: mvelo.MAIN_KEYRING_ID,
        unlockKey({key}) {
          return unlock({key, password: '1234'});
        },
        signingKeyFpr: '771f9119b823e06c0de306d466663688a83e9763'
      }).then(async armored => {
        const verifyResult = await verifyMessage({
          armored,
          keyringId: 'test123',
        });
        expect(verifyResult.data).to.equal(data);
        expect(verifyResult.signatures[0].keyId).to.equal('66663688a83e9763');
        expect(verifyResult.signatures[0].valid).to.be.true;
      });
    });
  });

  describe('verifyDetachedSignature', () => {
    it('verfify signed message with detached signature', function() {
      this.timeout(5000);
      const data = 'This is a test message!';
      const detachedSignature = `-----BEGIN PGP SIGNATURE-----
Version: Mailvelope v@@mvelo_version
Comment: https://www.mailvelope.com

wsFcBAEBCgAGBQJcCZzWAAoJEGZmNoioPpdjGtIQAKdEjYGAkdrLmTDUfhqf
HsTrbjUYI9hZXsLcXRl0JzwnlHYkNHeqP5j4VoREOgsKBpO1tXHzh+7r8IH7
CgnqWCfz0/HUqj7EP3tx6E/FnSEPmjTVOwZm/t4u/Kt0bvxuFKOM9r9DEATP
mdMLl4u49m6/gS9neDEGb4+dt1L5idlLial11H58Mpc2pQLHOsrE+BT1tNZv
+TxZyQQC6T4b5/k3XBfa7oqmVQbRlcejvsBnRrjdahOPjfcywJdtca2k7/q0
PwRCZC+prVohIuDTNZoGcGZJC7/bWfon2yzIiJmF8YViRCqes4iaR1Q5XIgd
XqIAn4bG1ACNN9yFECmi1ATv3qoJUQo7uMKcffWuJt+DXE/PVwnn7EK5nQei
/UmwO82jF5VuA/so4foKDLGQpU71YfquZtwB0I2SmGnm3kyWqztp1yeW5FRb
sKkKnKlas5ghJ78Z/GQQ1VfYzGsVmprwqpB0daKep6C5gPhAXpalI3TTRiPV
lp2tMuvbQoDqXYL2NGgGH3cDNNrlLVBf84xSbTdi1ql/UHIzjB9ZLnVO5MKH
lBrg/xJOaL87HJFcttZqTsNIO1sR/7e4RblYBfy/s+YCr5wA0GOTkstUHqFy
CXmmY6KJsFRm5GV92cXlsDCF/eAgPY6tPAHN/OZmslykmhQJRAwJTCDGNX2V
S8Xz
=/Wh8
-----END PGP SIGNATURE-----
`;
      return verifyDetachedSignature({
        plaintext: data,
        signerEmail: 'madita.bernstein@gmail.com',
        detachedSignature,
        keyringId: 'test123',
        autoLocate() {}
      }).then(result => {
        expect(result.signatures[0].keyId).to.equal('66663688a83e9763');
        expect(result.signatures[0].valid).to.be.true;
      });
    });
  });

  describe('createPrivateKeyBackup/restorePrivateKeyBackup', () => {
    it('should create private key backup', async function() {
      this.timeout(5000);
      const keyring = getKeryingById(mvelo.MAIN_KEYRING_ID);
      const defaultKey = await keyring.getDefaultKey();
      return createPrivateKeyBackup(defaultKey, '1234')
      .then(async backup => {
        const restored = await restorePrivateKeyBackup(backup.message, backup.backupCode);
        expect(restored.password).to.equal('1234');
        expect(restored.key.getFingerprint()).to.equal(defaultKey.getFingerprint());
      });
    });
  });

  describe('encryptSyncMessage/decryptSyncMessage', () => {
    it('should encrypt sync message and decrypt encrypted syn message', async function() {
      this.timeout(5000);
      const keyring = getKeryingById(mvelo.MAIN_KEYRING_ID);
      const defaultKey = await keyring.getDefaultKey();
      const unlockedKey = await unlock({key: defaultKey, password: '1234'});
      const changeLog = {
        '771f9119b823e06c0de306d466663688a83e9763': {
          type: 'INSERT',
          time: 1544138583808
        },
        '81364f6680a600b292bec5980c02c51f4af1a165': {
          type: 'INSERT',
          time: 1544138447643
        },
        '3bfa0e474542751cc25777842e760c1d2b6c7a8d': {
          type: 'INSERT',
          time: 1544138445434
        }
      };
      return encryptSyncMessage(unlockedKey, changeLog, mvelo.MAIN_KEYRING_ID)
      .then(async encrypted => {
        const message = await readMessage({armoredText: encrypted});
        const decrypted = await decryptSyncMessage(unlockedKey, message);
        expect(decrypted.changeLog).to.deep.equal(changeLog);
      });
    });
  });

  describe('encryptFile/decryptFile', () => {
    it('should encrypt file and decrypt encrypted file', function() {
      this.timeout(5000);
      const data = 'This is a sample file content!';
      const file = {
        content: `data:text/plain;base64,${window.btoa(data)}`,
        name: 'sampleFile.txt'
      };

      return encryptFile({
        plainFile: file,
        encryptionKeyFprs: ['81364f6680a600b292bec5980c02c51f4af1a165', '3bfa0e474542751cc25777842e760c1d2b6c7a8d'],
        armor: true
      }).then(async armored => {
        const decrypted = await decryptFile(
          {
            content: `data:text/plain;base64,${window.btoa(armored)}`,
            name: 'sampleFile.txt'
          },
          ({key}) => unlock({key, password: '1234'})
        );
        expect(decrypted.data).to.equal(data);
      });
    });
  });
});
