import {expect} from 'test';
import * as openpgp from 'openpgp';
import {getUserId, mapKeyUserIds, mapKeys, mapSubKeys, mapUsers, verifyUserCertificate, checkKeyId, getLastModifiedDate, equalKey, toPublic, filterUserIdsByEmail} from 'modules/key';
import testKeys from 'Fixtures/keys';

describe('Key unit test', () => {
  describe('getUserId', () => {
    let key;

    beforeEach(async() => {
      ({keys: [key]} = await openpgp.key.readArmored(testKeys.public.maditab));
    });

    it('should return primary or first available user id of key', () =>
      expect(getUserId(key)).to.eventually.equal('Madita Bernstein <madita.bernstein@gmail.com>')
    );
    it('should return localized error message when there is no valid user id on this key', () => {
      key.getPrimaryUser = () => null;
      return expect(getUserId(key)).to.eventually.equal('keygrid_invalid_userid');
    });
    it('should return first available user id when there is no valid user id on this key and validity check set to false', () => {
      key.getPrimaryUser = () => null;
      return expect(getUserId(key, false)).to.eventually.equal(key.users[0].userId.userid);
    });
  });

  describe('mapKeyUserIds', () => {
    it('should return email address from user id', () => {
      const user = {userId: 'Madita Bernstein <madita.bernstein@gmail.com>'};
      mapKeyUserIds(user);
      expect(user.email).to.equal('madita.bernstein@gmail.com');
      expect(user.name).to.equal('Madita Bernstein');
    });
    it('should return email address from user id', () => {
      const user = {userId: '<madita.bernstein@gmail.com>'};
      mapKeyUserIds(user);
      expect(user.email).to.equal('madita.bernstein@gmail.com');
      expect(user.name).to.equal('');
    });
    it('should return email address from user id', () => {
      const user = {userId: 'madita.bernstein@gmail.com'};
      mapKeyUserIds(user);
      expect(user.email).to.equal('madita.bernstein@gmail.com');
      expect(user.name).to.equal('');
    });
    it('should return email address from user id', () => {
      const user = {userId: 'Madita Bernstein'};
      mapKeyUserIds(user);
      expect(user.email).to.equal('');
      expect(user.name).to.equal('Madita Bernstein');
    });
    it('should return email address from user id', () => {
      const user = {userId: 'm@dita.bern$tein@gmail.com'};
      mapKeyUserIds(user);
      expect(user.email).to.equal('');
      expect(user.name).to.equal('');
    });
    it('should return email address from user id', () => {
      const user = {userId: 'Madita Bernstein madita.bernstein@gmail.com'};
      mapKeyUserIds(user);
      expect(user.email).to.equal('');
      expect(user.name).to.equal('');
    });
  });

  describe('mapKeys', () => {
    it('should map keys', async() => {
      const keys = [];
      const keyTypes = Object.keys(testKeys);
      for (const keyType of keyTypes) {
        const {keys: [key]} = await openpgp.key.readArmored(testKeys[keyType].maditab);
        keys.push(key);
      }
      return mapKeys(keys).then(result => {
        expect(result.length).to.equal(2);
        expect(result[0].type).to.equal('public');
        expect(result[1].type).to.equal('private');
        result.forEach(key => {
          expect(key.validity).to.equal(true);
          expect(key.name).to.equal('Madita Bernstein');
          expect(key.email).to.equal('madita.bernstein@gmail.com');
          expect(key.userId).to.equal('Madita Bernstein <madita.bernstein@gmail.com>');
          expect(key.exDate).to.equal('2022-11-26T13:08:45.000Z');
          expect(key.fingerprint).to.equal('771f9119b823e06c0de306d466663688a83e9763');
          expect(key.algorithm).to.equal('RSA (Encrypt or Sign)');
          expect(key.bitLength).to.equal(4096);
        });
      });
    });
  });

  describe('mapSubKeys', () => {
    it('should map subkeys', async() => {
      const {keys: [{primaryKey, subKeys}]} = await openpgp.key.readArmored(testKeys.public.maditab);
      const mapped = {};
      return mapSubKeys(subKeys, mapped, primaryKey).then(() => {
        const {subkeys} = mapped;
        expect(subkeys.length).to.equal(4);
        const subkey = subkeys.find(({keyId}) => keyId === 'A9C26FF01F6F59E2');
        expect(subkey).not.to.equal(undefined);
        if (subkey) {
          expect(subkey.algorithm).to.equal('RSA (Encrypt or Sign)');
          expect(subkey.bitLength).to.equal(3072);
          expect(subkey.fingerprint).to.equal('ef4d0286504c2a77e6e05d0da9c26ff01f6f59e2');
          expect(subkey.exDate).to.equal('2021-11-26T14:16:09.000Z');
        }
      });
    });
  });

  describe('mapUsers', () => {
    it('should map users', async() => {
      const {keys: [{primaryKey, users}]} = await openpgp.key.readArmored(testKeys.public.maditab);
      const mapped = {};
      return mapUsers(users, mapped, {}, primaryKey).then(() => {
        const {users} = mapped;
        expect(users.length).to.equal(2);
        expect(users[0].signatures[0].crDate).to.equal('2018-11-26T13:17:37.000Z');
        expect(users[1].userId).to.equal('Madita Bernstone <madita@mailvelope.com>');
        users.forEach(user => {
          expect(user).to.have.property('signatures');
          expect(user.signatures[0].keyId).to.equal('66663688A83E9763');
        });
      });
    });
  });

  describe('verifyUserCertificate', () => {
    it('should verify user certificate', async() => {
      const {keys: [{primaryKey, users}]} = await openpgp.key.readArmored(testKeys.public.maditab);
      return Promise.all([
        expect(verifyUserCertificate(users[0], primaryKey, users[0].selfCertifications[0])).to.eventually.equal(openpgp.enums.keyStatus.valid),
        expect(verifyUserCertificate(users[1], primaryKey, users[1].selfCertifications[0])).to.eventually.equal(openpgp.enums.keyStatus.valid),
        expect(verifyUserCertificate(users[2], primaryKey, users[2].selfCertifications[0])).to.eventually.equal(openpgp.enums.keyStatus.revoked)
      ]);
    });
  });

  describe('checkKeyId', () => {
    class KeyStub {
      constructor(id, primaryKey = null, subKeys = []) {
        this.id = id;
        this.primaryKey = primaryKey === null ? new KeyStub(id, this) : primaryKey;
        this.subKeys = [];
        this.createSubKeys(subKeys);
      }

      createSubKeys(keys) {
        keys.forEach(key => {
          this.subKeys.push(
            {
              keyPacket: key
            }
          );
        });
      }

      getKeyId() {
        const id = this.id;
        return {
          toHex() { return id; },
          equals(compareId) { return compareId.toHex() === id; }
        };
      }

      getSubkeys() {
        return this.subKeys;
      }
    }

    const primaryKeyA = new KeyStub('ABC');
    const primaryKeyB = new KeyStub('CBD');
    const primaryKeyC = new KeyStub('654');
    const subKeyA = new KeyStub('123', primaryKeyA);
    const subKeyB = new KeyStub('321', primaryKeyA);
    const subKeyC = new KeyStub('456', primaryKeyB);
    const subKeyD = new KeyStub('654', primaryKeyB);
    const subKeyE = new KeyStub('789', primaryKeyA);
    const subKeyF = new KeyStub('ABC', primaryKeyB);
    const subKeyG = new KeyStub('456', primaryKeyA);
    const keyRingKeys = [primaryKeyA, primaryKeyB, subKeyA, subKeyB, subKeyC, subKeyD];
    const keyring = {
      getKeysForId(keyId) { return keyRingKeys.filter(key => key.getKeyId().toHex() === keyId); }
    };

    it('should pass', () => {
      const testKey = new KeyStub('', primaryKeyA, [subKeyA, subKeyB]);
      expect(() => checkKeyId(testKey, keyring)).to.not.throw();
    });
    it('should pass', () => {
      const testKey = new KeyStub('', primaryKeyA, [subKeyA, subKeyB, subKeyE]);
      checkKeyId(testKey, keyring);
      expect(() => checkKeyId(testKey, keyring)).to.not.throw();
    });
    it('should raise error', () => {
      const testKey = new KeyStub('', primaryKeyC, [subKeyA, subKeyB]);
      expect(() => checkKeyId(testKey, keyring)).to.throw().and.have.property('message', 'Primary keyId equals existing sub keyId.');
    });
    it('should raise error', () => {
      const testKey = new KeyStub('', primaryKeyB, [subKeyC, subKeyF]);
      expect(() => checkKeyId(testKey, keyring)).to.throw().and.have.property('message', 'Sub keyId equals existing primary keyId.');
    });
    it('should raise error', () => {
      const testKey = new KeyStub('', primaryKeyA, [subKeyA, subKeyG]);
      expect(() => checkKeyId(testKey, keyring)).to.throw().and.have.property('message', 'Sub keyId equals existing sub keyId in key with different primary keyId.');
    });
  });

  describe('getLastModifiedDate', () => {
    it('should return the most recent created date field', async() => {
      const {keys: [key]} = await openpgp.key.readArmored(testKeys.public.maditab);
      const lastModDate = new Date(getLastModifiedDate(key));
      expect(lastModDate.toISOString()).to.equal('2018-11-26T13:19:55.000Z');
      const expDateString = `${lastModDate.getUTCDate()}.${(lastModDate.getUTCMonth() + 1)}.${lastModDate.getUTCFullYear()} ${lastModDate.getUTCHours()}:${lastModDate.getUTCMinutes()}:${lastModDate.getUTCSeconds()}`;
      expect(expDateString).to.equal('26.11.2018 13:19:55');
    });
  });

  describe('equalKey', () => {
    it('should return true', async() => {
      const {keys: [key1]} = await openpgp.key.readArmored(testKeys.public.maditab);
      const {keys: [key2]} = await openpgp.key.readArmored(testKeys.public.maditab);
      expect(equalKey(key1, key2)).to.be.true;
    });
  });

  describe('toPublic', () => {
    it('should return public key from private key', async() => {
      const {keys: [privateKey]} = await openpgp.key.readArmored(testKeys.private.maditab);
      expect(privateKey.isPublic()).to.be.false;
      const publicKey = toPublic(privateKey);
      expect(publicKey.isPublic()).to.be.true;
    });
  });

  describe('filterUserIdsByEmail', () => {
    it('should return public key from private key', async() => {
      const {keys: [key]} = await openpgp.key.readArmored(testKeys.public.maditab);
      const {users} = filterUserIdsByEmail(key, 'madita@mailvelope.com');
      expect(users.length).to.equal(1);
      expect(users[0].userId.name).to.equal('Madita Bernstone');
    });
  });
});
