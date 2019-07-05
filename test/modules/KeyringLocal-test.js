import {expect} from 'test';
import {LocalStorageStub} from 'utils';
import {init as initKeyringAttrMap, getById as getKeryingById, setKeyringAttr, __RewireAPI__ as keyringRewireAPI} from 'modules/keyring';
import KeyStoreLocal from 'modules/KeyStoreLocal';
import {mapKeys} from 'modules/key';
import testKeys from 'Fixtures/keys';

describe('KeyringLocal unit tests', () => {
  const keyringId = 'test123';
  let storage;
  let keyRing;

  beforeEach(async () => {
    const keyringAttributes = {
      default_key: '771f9119b823e06c0de306d466663688a83e9763'
    };
    storage = new LocalStorageStub();
    await storage.importKeys(keyringId, {public: [testKeys.api_test_pub, testKeys.maxp_pub], private: [testKeys.api_test_prv, testKeys.maditab_prv]});
    await storage.importAttributes(keyringId, keyringAttributes);
    KeyStoreLocal.__Rewire__('mvelo', {
      storage
    });
    keyringRewireAPI.__Rewire__('mvelo', {
      storage
    });
    await initKeyringAttrMap();
    keyRing = getKeryingById(keyringId);
  });

  afterEach(() => {
    /* eslint-disable-next-line no-undef */
    __rewire_reset_all__();
  });

  describe('getKeys', () => {
    it('should get all public and private keys', async () => {
      const keys = await keyRing.getKeys();
      expect(keys.length).to.equal(4);
      expect(keys.some(({name}) => name === 'Madita Bernstein')).to.be.true;
    });
  });

  describe('hasPrivateKey', () => {
    it('should check if keyring has any private key or specific private keys by keyId', () => {
      expect(keyRing.hasPrivateKey(['771f9119b823e06c0de306d466663688a83e9763'])).to.be.true;
    });
  });

  describe('getValidSigningKeys', () => {
    it('should get all valid signing keys', async () => {
      const signingKeys = await keyRing.getValidSigningKeys();
      expect(signingKeys.length).to.be.at.least(2);
      expect(signingKeys.some(({fingerprint}) => fingerprint === '771f9119b823e06c0de306d466663688a83e9763')).to.be.true;
    });
  });

  describe('getKeyDetails', () => {
    it('should get key details for given key', async () => {
      const keyDetails = await keyRing.getKeyDetails('771f9119b823e06c0de306d466663688a83e9763');
      expect(keyDetails.subkeys.length).to.equal(4);
      expect(keyDetails.users[0].userId).to.equal('Madita Bernstein <madita.bernstein@gmail.com>');
      expect(keyDetails.validDefaultKey).to.be.true;
    });
  });

  describe('getKeyData', () => {
    it('should get kuser id, key id, fingerprint, email and name for all keys', async () => {
      const keyData = await keyRing.getKeyData();
      const maditabKeyData = keyData.filter(({fingerprint}) => fingerprint === '771f9119b823e06c0de306d466663688a83e9763');
      expect(maditabKeyData[0].keyId).to.equal('66663688A83E9763');
      expect(maditabKeyData[0].fingerprint).to.equal('771f9119b823e06c0de306d466663688a83e9763');
      expect(maditabKeyData[0].users[0].userId).to.equal('Madita Bernstein <madita.bernstein@gmail.com>');
      expect(maditabKeyData[0].users[0].email).to.equal('madita.bernstein@gmail.com');
      expect(maditabKeyData[0].users[0].name).to.equal('Madita Bernstein');
    });
    it('should get user id, key id, fingerprint, email and name for all keys', async () => {
      const keyData = await keyRing.getKeyData({allUsers: true});
      expect(keyData.length).to.equal(4);
    });
  });

  describe('getKeyByAddress', () => {
    it('should get keys by email address', async () => {
      const keys = await keyRing.getKeyByAddress(['test@mailvelope.com']);
      expect(keys['test@mailvelope.com'].length).to.equal(2);
    });
    it('should get keys by email address', async () => {
      const keys = await keyRing.getKeyByAddress(['madita@mailvelope.com'], {pub: false});
      expect(keys['madita@mailvelope.com'].length).to.equal(1);
    });
    it('should get keys by email address', async () => {
      const keys = await keyRing.getKeyByAddress(['madita.bernstein@gmail.com', 'test@mailvelope.com']);
      expect(keys['madita.bernstein@gmail.com'].length).to.equal(1);
      expect(keys['test@mailvelope.com'].length).to.equal(2);
    });
  });

  describe('getArmoredKeys', () => {
    it('should get armored keys by fingerprints', async () => {
      const PUBLIC_KEY_REGEX = /-----BEGIN PGP PUBLIC KEY BLOCK-----[\s\S]+?-----END PGP PUBLIC KEY BLOCK-----/g;
      const armoredKeys = await keyRing.getArmoredKeys(['771f9119b823e06c0de306d466663688a83e9763'], {pub: true});
      expect(armoredKeys[0].armoredPublic.match(PUBLIC_KEY_REGEX).length).to.equal(1);
    });
  });

  describe('getArmoredKeys', () => {
    it('should get armored keys by fingerprints', async () => {
      const PUBLIC_KEY_REGEX = /-----BEGIN PGP PUBLIC KEY BLOCK-----[\s\S]+?-----END PGP PUBLIC KEY BLOCK-----/g;
      const armoredKeys = await keyRing.getArmoredKeys(['771f9119b823e06c0de306d466663688a83e9763'], {pub: true});
      expect(armoredKeys[0].armoredPublic.match(PUBLIC_KEY_REGEX).length).to.equal(1);
    });
  });

  describe('getPrivateKeyByIds', () => {
    it('should return first private key that matches keyIds', async () => {
      const privateKey = await keyRing.getPrivateKeyByIds(['f11db1250c3c3f1b', '66663688A83E9763'], {pub: true});
      expect(privateKey.users[0].userId.email).to.equal('test@mailvelope.com');
    });
  });

  describe('getKeysByFprs', () => {
    it('should get keys by fingerprints', () => {
      const key = keyRing.getKeysByFprs(['771f9119b823e06c0de306d466663688a83e9763']);
      expect(key[0].users[0].userId.email).to.equal('madita.bernstein@gmail.com');
    });
  });

  describe('getFprForKeyId', () => {
    it('should get key or sub key packet by keyId and return fingerprint', () => {
      const fingerprint = keyRing.getFprForKeyId('a9c26ff01f6f59e2');
      expect(fingerprint).to.equal('ef4d0286504c2a77e6e05d0da9c26ff01f6f59e2');
    });
  });

  describe('getAttributes', () => {
    it('should get attributes for keyring', () => {
      const attributes = keyRing.getAttributes();
      expect(attributes.default_key).to.equal('771f9119b823e06c0de306d466663688a83e9763');
    });
  });

  describe('getDefaultKey', () => {
    it('should retrieve default key. If no default key set then take newest private key available.', async () => {
      setKeyringAttr(keyringId, {default_key: 'aa1e01774bdf7d76a45bdc2df11db1250c3c3f1b'});
      const defaultKey = await keyRing.getDefaultKey();
      expect(defaultKey.keyPacket.getFingerprint()).to.equal('aa1e01774bdf7d76a45bdc2df11db1250c3c3f1b');
    });
    it('should retrieve default key. If no default key set then take newest private key available.', async () => {
      setKeyringAttr(keyringId, {default_key: ''});
      const defaultKey = await keyRing.getDefaultKey();
      expect(defaultKey.keyPacket.getFingerprint()).to.equal('771f9119b823e06c0de306d466663688a83e9763');
    });
  });

  describe('getDefaultKeyFpr', () => {
    it('should retrieve fingerprint of default key', async () => {
      const default_key = 'aa1e01774bdf7d76a45bdc2df11db1250c3c3f1b';
      setKeyringAttr(keyringId, {default_key});
      const defaultKeyFpr = await keyRing.getDefaultKeyFpr();
      expect(defaultKeyFpr).to.equal(default_key);
    });
  });

  describe('importKeys', () => {
    it('should import armored keys into the keyring', async () => {
      setKeyringAttr(keyringId, {default_key: ''});
      const results = await keyRing.importKeys([{type: 'public', armored: testKeys.johnd_pub}, {type: 'private', armored: testKeys.johnd_prv}]);
      for (const {type} of results) {
        expect(type).to.equal('success');
      }
      const newDefaultKey = await keyRing.getDefaultKeyFpr();
      expect(newDefaultKey).to.equal('aa1e01774bdf7d76a45bdc2df11db1250c3c3f1b');
    });
  });

  describe('removeKey', () => {
    it('should remove key by fingerprint', async () => {
      await keyRing.removeKey('771f9119b823e06c0de306d466663688a83e9763', 'private');
      const newDefaultKey = await keyRing.getDefaultKeyFpr();
      expect(newDefaultKey).to.equal('aa1e01774bdf7d76a45bdc2df11db1250c3c3f1b');
    });
  });

  describe('generateKey', function() {
    this.timeout(5000);
    it('should Generate a new PGP keypair and optionally upload to the publickey server', async () => {
      await keyRing.generateKey({keyAlgo: 'RSA', numBits: 2048, userIds: [{email: 'g.freeman@blackmesa.org', fullName: 'Gordon Freeman'}, {email: 'freeman@mailvelope.com', fullName: 'G. Freeman'}], passphrase: 'blackmesa', uploadPublicKey: false, keyExpirationTime: 31536000});
      const compareKeys = await keyRing.getKeyByAddress(['freeman@mailvelope.com']);
      expect(compareKeys['freeman@mailvelope.com']).not.to.be.false;
      const mappedKeys = await mapKeys(compareKeys['freeman@mailvelope.com']);
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

  describe('isRFC2822UserId', () => {
    it('valid user Id', () => {
      const user = {userId: {userid: 'Demo <demo@mailvelope.com>'}};
      expect(keyRing.isRFC2822UserId(user)).to.be.true;
    });
    it.skip('invalid user Id', () => {
      const user = {userId: {userid: '<demo@mailvelope.com>'}};
      expect(keyRing.isRFC2822UserId(user)).to.be.false;
    });
  });
});
