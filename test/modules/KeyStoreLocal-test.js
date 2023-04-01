import {expect} from 'test';
import {readKey} from 'openpgp';
import {LocalStorageStub} from 'utils';
import {init as initKeyringAttrMap, getById as getKeryingById, __RewireAPI__ as keyringRewireAPI} from 'modules/keyring';
import {mapKeys} from 'modules/key.js';
import KeyStoreLocal from 'modules/KeyStoreLocal';
import testKeys from 'Fixtures/keys';

describe('KeyStoreLocal unit tests', () => {
  const keyringId = 'test123';
  let storage;
  let keyStore;

  beforeEach(async () => {
    const keyringAttributes = {
      default_key: '771f9119b823e06c0de306d466663688a83e9763'
    };
    storage = new LocalStorageStub();
    await storage.importKeys(keyringId, {public: [testKeys.api_test_pub, testKeys.maditab_pub], private: [testKeys.api_test_prv, testKeys.maditab_prv]});
    await storage.importAttributes(keyringId, keyringAttributes);
    KeyStoreLocal.__Rewire__('mvelo', {
      storage
    });
    keyringRewireAPI.__Rewire__('mvelo', {
      storage
    });
    await initKeyringAttrMap();
    const keyRing = getKeryingById(keyringId);
    keyRing.keystore.clear();
    keyStore = keyRing.keystore;
  });

  afterEach(() => {
    /* eslint-disable-next-line no-undef */
    __rewire_reset_all__();
  });

  describe('load', () => {
    it('should load public and private keys from storage ', async () => {
      await keyStore.load();
      expect(keyStore.publicKeys).not.to.be.undefined;
      expect(keyStore.publicKeys.keys.length).to.be.at.least(2);
      expect(keyStore.publicKeys.keys[1].users[0].userID.userID).to.equal('Madita Bernstein <madita.bernstein@gmail.com>');
      expect(keyStore.privateKeys).not.to.be.undefined;
      expect(keyStore.privateKeys.keys.length).to.be.at.least(2);
      expect(keyStore.privateKeys.keys[1].users[0].userID.userID).to.equal('Madita Bernstein <madita.bernstein@gmail.com>');
    });
  });

  describe('getForAddress (super)', () => {
    it('should get keys matching given email address', async () => {
      await keyStore.load();
      const result = keyStore.getForAddress('madita.bernstein@gmail.com');
      expect(result.length).to.equal(2);
    });
  });

  describe('loadKeys', () => {
    it('should return array with keys ', async () => {
      const keys = await keyStore.loadKeys([testKeys.johnd_prv, testKeys.johnd_pub, testKeys.gordonf_pub]);
      expect(keys.length).to.equal(3);
      expect(keys[0].getFingerprint()).to.equal('2cf63f4b3b4a51e446252247db187eb58a88aa05');
    });
  });

  describe('store', () => {
    it('should store keys', async () => {
      const key = await readKey({armoredKey: testKeys.gordonf_pub});
      keyStore.publicKeys.push(key);
      await keyStore.store();
      const storedKeys = storage.storage.get('mvelo.keyring.test123.publicKeys');
      expect(storedKeys).to.include(key.armor());
    });
  });

  describe('getDefaultKeyFpr', () => {
    it('should get deault key fingerprint', () =>
      expect(keyStore.getDefaultKeyFpr()).to.eventually.equal('771f9119b823e06c0de306d466663688a83e9763')
    );
  });

  describe('generateKey', function() {
    this.timeout(5000);
    it('should Generate a new PGP keypair', async () => {
      const {publicKey: key} = await keyStore.generateKey({keyAlgo: 'rsa', numBits: 2048, userIds: [{name: 'Gordon Freeman', email: 'g.freeman@blackmesa.org'}, {email: 'freeman@mailvelope.com'}], passphrase: 'blackmesa', keyExpirationTime: 31536000});
      const mappedKeys = await mapKeys([key]);
      expect(mappedKeys[0].validity).to.equal(true);
      expect(mappedKeys[0].name).to.equal('Gordon Freeman');
      expect(mappedKeys[0].email).to.equal('g.freeman@blackmesa.org');
      expect(mappedKeys[0].userId).to.equal('Gordon Freeman <g.freeman@blackmesa.org>');
      const crDate = new Date(mappedKeys[0].crDate);
      const expDate = new Date(mappedKeys[0].exDate);
      expect(Math.round(expDate.getTime() - crDate.getTime()) / 1000).to.equal(31536000);
      expect(mappedKeys[0].algorithm).to.equal('RSA (Encrypt or Sign)');
      expect(mappedKeys[0].bitLength).to.equal(2048);
    });
  });
});
