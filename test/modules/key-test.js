import {expect} from 'test';
import {readKey} from 'openpgp';
import {getUserInfo, parseUserId, mapKeys, mapSubKeys, mapUsers, minifyKey, verifyUserCertificate, checkKeyId, getLastModifiedDate, equalKey, toPublic, filterUserIdsByEmail} from 'modules/key';
import {KEY_STATUS} from 'lib/constants';
import testKeys from 'Fixtures/keys';

describe('Key unit test', () => {
  describe('getUserInfo', () => {
    let key;

    beforeEach(async () => {
      key = await readKey({armoredKey: testKeys.maditab_pub});
    });

    it('should return primary or first available user id of key', () =>
      expect(getUserInfo(key)).to.eventually.deep.equal({userId: 'Madita Bernstein <madita.bernstein@gmail.com>', name: 'Madita Bernstein', email: 'madita.bernstein@gmail.com'})
    );
    it('should return localized error message when there is no valid user id on this key', () => {
      key.getPrimaryUser = () => null;
      return expect(getUserInfo(key)).to.eventually.deep.equal({userId: 'keygrid_invalid_userid', name: '', email: ''});
    });
    it('should return first available user id when there is no valid user id on this key and validity check set to false', async () => {
      key.getPrimaryUser = () => null;
      const {userId} = await getUserInfo(key, {allowInvalid: true});
      expect(userId).to.equal(key.users[0].userID.userID);
    });
  });

  describe('parseUserId', () => {
    it('should return email address from user id', () => {
      const user = {userId: 'Madita Bernstein <madita.bernstein@gmail.com>'};
      parseUserId(user);
      expect(user.email).to.equal('madita.bernstein@gmail.com');
      expect(user.name).to.equal('Madita Bernstein');
    });
    it('should return email address from user id', () => {
      const user = {userId: '<madita.bernstein@gmail.com>'};
      parseUserId(user);
      expect(user.email).to.equal('madita.bernstein@gmail.com');
      expect(user.name).to.equal('');
    });
    it('should return email address from user id', () => {
      const user = {userId: 'madita.bernstein@gmail.com'};
      parseUserId(user);
      expect(user.email).to.equal('madita.bernstein@gmail.com');
      expect(user.name).to.equal('');
    });
    it('should return email address from user id', () => {
      const user = {userId: 'Madita Bernstein'};
      parseUserId(user);
      expect(user.email).to.equal('');
      expect(user.name).to.equal('Madita Bernstein');
    });
    it('should return email address from user id', () => {
      const user = {userId: 'm@dita.bern$tein@gmail.com'};
      parseUserId(user);
      expect(user.email).to.equal('');
      expect(user.name).to.equal('keygrid_invalid_userid');
    });
    it('should return email address from user id', () => {
      const user = {userId: 'Madita Bernstein madita.bernstein@gmail.com'};
      parseUserId(user);
      expect(user.email).to.equal('');
      expect(user.name).to.equal('keygrid_invalid_userid');
    });
  });

  describe('mapKeys', () => {
    it('should map keys', async () => {
      const keys = [];
      const armoredKeys = [testKeys.maditab_pub, testKeys.maditab_prv];
      for (const armoredKey of armoredKeys) {
        const key = await readKey({armoredKey});
        keys.push(key);
      }
      const result = await  mapKeys(keys);
      expect(result.length).to.equal(2);
      expect(result[0].type).to.equal('public');
      expect(result[1].type).to.equal('private');
      result.forEach(key => {
        expect(key.validity).to.equal(true);
        expect(key.name).to.equal('Madita Bernstein');
        expect(key.email).to.equal('madita.bernstein@gmail.com');
        expect(key.userId).to.equal('Madita Bernstein <madita.bernstein@gmail.com>');
        expect(key.exDate).to.equal('2030-11-26T13:08:45.000Z');
        expect(key.fingerprint).to.equal('771f9119b823e06c0de306d466663688a83e9763');
        expect(key.algorithm).to.equal('RSA (Encrypt or Sign)');
        expect(key.bitLength).to.equal(4096);
      });
    });
  });

  describe('mapSubKeys', () => {
    it('should map subkeys', async () => {
      const key = await readKey({armoredKey: testKeys.maditab_pub});
      const mapped = {};
      await mapSubKeys(key.subkeys, mapped, key);
      const {subkeys: mappedSubkeys} = mapped;
      expect(mappedSubkeys.length).to.equal(4);
      const subkey = mappedSubkeys.find(({keyId}) => keyId === 'A9C26FF01F6F59E2');
      expect(subkey).not.to.equal(undefined);
      if (subkey) {
        expect(subkey.algorithm).to.equal('RSA (Encrypt or Sign)');
        expect(subkey.bitLength).to.equal(3072);
        expect(subkey.fingerprint).to.equal('ef4d0286504c2a77e6e05d0da9c26ff01f6f59e2');
        expect(subkey.exDate).to.equal('2025-11-26T14:16:09.000Z');
      }
    });
  });

  describe('mapUsers', () => {
    it('should map users', async () => {
      const key = await readKey({armoredKey: testKeys.maditab_pub});
      const mapped = {};
      await mapUsers(key.users, mapped, {}, key);
      const {users: mappedUsers} = mapped;
      expect(mappedUsers.length).to.equal(3);
      expect(mappedUsers[0].signatures[0].crDate).to.equal('2021-05-04T15:09:22.000Z');
      expect(mappedUsers[1].userId).to.equal('Madita Bernstone <madita@mailvelope.com>');
      mappedUsers.forEach(user => {
        expect(user).to.have.property('signatures');
        expect(user.signatures[0].keyId).to.equal('66663688A83E9763');
      });
    });
  });

  describe('minifyKey', () => {
    it('should return minimal key', async () => {
      const key = await readKey({armoredKey: testKeys.maditab_pub});
      const minimal = await minifyKey(key, {email: 'madita@mailvelope.com'});
      const keyMap = {};
      await mapSubKeys(minimal.subkeys, keyMap, minimal);
      const {subkeys: mappedSubkeys} = keyMap;
      expect(mappedSubkeys.length).to.equal(1);
      const subkey = mappedSubkeys[0];
      expect(subkey).not.to.equal(undefined);
      expect(subkey.fingerprint).to.equal('ef4d0286504c2a77e6e05d0da9c26ff01f6f59e2');
      const userMap = {};
      await mapUsers(minimal.users, userMap, {}, minimal);
      const {users: mappedUsers} = userMap;
      expect(mappedUsers.length).to.equal(1);
      expect(mappedUsers[0].userId).to.equal('Madita Bernstone <madita@mailvelope.com>');
    });
  });

  describe('verifyUserCertificate', () => {
    it('should verify user certificate', async () => {
      const key = await readKey({armoredKey: testKeys.maditab_pub});
      await Promise.all([
        expect(verifyUserCertificate(key.users[0], key.users[0].selfCertifications[0], key)).to.eventually.equal(KEY_STATUS.valid),
        expect(verifyUserCertificate(key.users[1], key.users[1].selfCertifications[0], key)).to.eventually.equal(KEY_STATUS.valid),
        expect(verifyUserCertificate(key.users[2], key.users[2].selfCertifications[0], key)).to.eventually.equal(KEY_STATUS.revoked)
      ]);
    });
  });

  describe('checkKeyId', () => {
    class KeyIDStub {
      constructor(id) {
        this.id = id;
      }

      toHex() {
        return this.id;
      }

      equals(compareId) {
        return compareId.toHex() === this.id;
      }
    }

    class KeyPacketStub {
      constructor(id) {
        this.keyID = new KeyIDStub(id);
      }

      getKeyID() {
        return this.keyID;
      }
    }

    class KeyStub {
      constructor(keyPacket, subkeys = []) {
        this.keyPacket = keyPacket;
        this.subkeys = subkeys;
      }

      getKeyID() {
        return this.keyPacket.keyID;
      }

      getSubkeys() {
        return this.subkeys;
      }
    }

    const keyPacketA = new KeyPacketStub('ABC');
    const keyPacketB = new KeyPacketStub('CBD');
    const keyPacketC = new KeyPacketStub('654');
    const keyPacketD = new KeyPacketStub('789');
    const keyPacketE = new KeyPacketStub('XYZ');
    const keyPacketF = new KeyPacketStub('974');
    const keyA = new KeyStub(keyPacketA, [keyPacketB]);
    const keyB = new KeyStub(keyPacketC, [keyPacketD]);
    const keyRingKeys = [keyA, keyB];
    const keyring = {
      getKeysForId(keyId) { return keyRingKeys.filter(key => key.getKeyID().toHex() === keyId || key.subkeys.some(subkey => subkey.getKeyID().toHex() === keyId)); }
    };

    it('should pass same primary key, new sub key', () => {
      const testKey = new KeyStub(keyPacketA, [keyPacketB, keyPacketE]);
      expect(() => checkKeyId(testKey, keyring)).to.not.throw();
    });
    it('should pass new primary key, new sub key', () => {
      const testKey = new KeyStub(keyPacketE, [keyPacketF]);
      checkKeyId(testKey, keyring);
      expect(() => checkKeyId(testKey, keyring)).to.not.throw();
    });
    it('should raise error', () => {
      const testKey = new KeyStub(keyPacketB, [keyPacketF]);
      expect(() => checkKeyId(testKey, keyring)).to.throw().and.have.property('message', 'Primary keyId equals existing sub keyId.');
    });
    it('should raise error', () => {
      const testKey = new KeyStub(keyPacketF, [keyPacketE, keyPacketA]);
      expect(() => checkKeyId(testKey, keyring)).to.throw().and.have.property('message', 'Sub keyId equals existing primary keyId.');
    });
    it('should raise error', () => {
      const testKey = new KeyStub(keyPacketF, [keyPacketB]);
      expect(() => checkKeyId(testKey, keyring)).to.throw().and.have.property('message', 'Sub keyId equals existing sub keyId in key with different primary keyId.');
    });
  });

  describe('getLastModifiedDate', () => {
    it('should return the most recent created date field', async () => {
      const key = await readKey({armoredKey: testKeys.maditab_pub});
      const lastModDate = new Date(getLastModifiedDate(key));
      expect(lastModDate.toISOString()).to.equal('2021-05-04T15:10:20.000Z');
      const expDateString = `${lastModDate.getUTCDate()}.${(lastModDate.getUTCMonth() + 1)}.${lastModDate.getUTCFullYear()} ${lastModDate.getUTCHours()}:${lastModDate.getUTCMinutes()}:${lastModDate.getUTCSeconds()}`;
      expect(expDateString).to.equal('4.5.2021 15:10:20');
    });
  });

  describe('equalKey', () => {
    it('should return true', async () => {
      const key1 = await readKey({armoredKey: testKeys.maditab_pub});
      const key2 = await readKey({armoredKey: testKeys.maditab_pub});
      expect(equalKey(key1, key2)).to.be.true;
    });
  });

  describe('toPublic', () => {
    it('should return public key from private key', async () => {
      const privateKey = await readKey({armoredKey: testKeys.maditab_prv});
      expect(privateKey.isPrivate()).to.be.true;
      const publicKey = toPublic(privateKey);
      expect(publicKey.isPrivate()).to.be.false;
    });
  });

  describe('filterUserIdsByEmail', () => {
    it('should filter user by e-mail', async () => {
      const key = await readKey({armoredKey: testKeys.maditab_pub});
      const {users} = filterUserIdsByEmail(key, 'madita@mailvelope.com');
      expect(users.length).to.equal(1);
      expect(users[0].userID.name).to.equal('Madita Bernstone');
    });
    it('should filter out user attributes', async () => {
      const key = await readKey({armoredKey: testKeys.wiktor_pub});
      const {users} = filterUserIdsByEmail(key, 'wiktor@metacode.biz');
      expect(users.length).to.equal(1);
      expect(users[0].userID.email).to.equal('wiktor@metacode.biz');
    });
  });
});
