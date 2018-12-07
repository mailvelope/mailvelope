import {expect} from 'test';
import * as openpgp from 'openpgp';
import {LocalStorageStub} from 'utils';
import {init as initKeyringAttrMap, getById as getKeryingById, __RewireAPI__ as keyringRewireAPI} from 'modules/keyring';
import {mapKeys} from 'modules/key.js';
import KeyStoreLocal from 'modules/KeyStoreLocal';
import testKeys, {init as initTestKeys, handleKeyImport as importTestKey} from 'Fixtures/keys';

describe('KeyStoreLocal unit tests', () => {
  const keyringId = 'test123';
  let storage;
  let keyStore;

  beforeEach(async() => {
    const keyringAttributes = {
      default_key: '771f9119b823e06c0de306d466663688a83e9763'
    };
    storage = new LocalStorageStub();
    await storage.importKeys(keyringId, testKeys);
    await storage.importAttributes(keyringId, keyringAttributes);
    KeyStoreLocal.__Rewire__('mvelo', {
      storage
    });
    keyringRewireAPI.__Rewire__('mvelo', {
      storage
    });
    await initKeyringAttrMap();
    const keyRing = getKeryingById(keyringId);
    keyStore = keyRing.keystore;
  });

  afterEach(() => {
    initTestKeys(['demo_pub', 'demo_prv', 'maditab_pub', 'maditab_prv']);
    /* eslint-disable-next-line no-undef */
    __rewire_reset_all__();
  });

  describe('load', () => {
    it('should load public and private keys from storage ', () =>
      keyStore.load().then(() => {
        expect(keyStore.publicKeys).not.to.be.undefined;
        expect(keyStore.publicKeys.keys.length).to.be.at.least(2);
        expect(keyStore.publicKeys.keys[1].users[0].userId.userid).to.equal('Madita Bernstein <madita.bernstein@gmail.com>');
        expect(keyStore.privateKeys).not.to.be.undefined;
        expect(keyStore.privateKeys.keys.length).to.be.at.least(2);
        expect(keyStore.privateKeys.keys[1].users[0].userId.userid).to.equal('Madita Bernstein <madita.bernstein@gmail.com>');
      })
    );
  });

  describe('getForAddress (super)', () => {
    it('should get keys matching given email address', () =>
      keyStore.load().then(async() => {
        const result = keyStore.getForAddress('madita.bernstein@gmail.com');
        expect(result.length).to.equal(2);
      })
    );
  });

  describe('loadKeys', () => {
    it('should return array with keys ', async() => {
      importTestKey('johnd_pub');
      importTestKey('johnd_prv');
      importTestKey('gordonf_pub');
      const keys = await keyStore.loadKeys([testKeys.private.johnd, testKeys.public.johnd, testKeys.public.gordonf]);
      expect(keys.length).to.equal(3);
      expect(keys[0].getFingerprint()).to.equal('81364f6680a600b292bec5980c02c51f4af1a165');
    });
  });

  describe('store', () => {
    it('should store keys', async() => {
      importTestKey('gordonf_pub');
      const {keys: [key]} = await openpgp.key.readArmored(testKeys.public.gordonf);
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

  describe('generateKey', () => {
    it('should Generate a new PGP keypair', function() {
      this.timeout(5000);
      return keyStore.generateKey({keyAlgo: 'RSA', numBits: 2048, userIds: ['Gordon Freeman <g.freeman@blackmesa.org>', 'freeman@mailvelope.com'], passphrase: 'blackmesa', keyExpirationTime: 31536000}).then(async({key}) => {
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
});
