'use strict';


function keyMock(keyid) {
  return {
    verifyPrimaryKey: sinon.stub().returns(openpgp.enums.keyStatus.valid),
    primaryKey: {
      getKeyId() {
        return {
          toHex: sinon.stub().returns(keyid)
        };
      },
    },
    users: [],
    getPrimaryUser() {
      return {
        user: this.users[0]
      };
    }
  };
}

function userMock(userid) {
  return {
    userId: {
      userid
    },
    verify: sinon.stub().returns(openpgp.enums.keyStatus.valid)
  };
}

import mvelo from '../../src/mvelo';
import {Keyring} from '../../src/modules/keyring';
import KeyServer from '../../src/modules/keyserver';
import * as keyringSync from '../../src/modules/keyringSync';
import openpgp from 'openpgp';

describe('Keyring unit tests', () => {
  var keyring;
  var pgpKeyring;
  var krSync;
  var keys = [];

  beforeEach(() => {
    sinon.stub(KeyServer.prototype, 'upload');
    sinon.stub(openpgp, 'generateKeyPair');
    var openpgpKeyring = sinon.createStubInstance(openpgp.Keyring);
    sinon.stub(openpgp, 'Keyring');
    var sync = sinon.createStubInstance(keyringSync.KeyringSync);
    sinon.stub(keyringSync, 'KeyringSync');

    openpgpKeyring.getAllKeys = function() {
      return keys;
    };
    krSync = {};
    keyring = new Keyring(mvelo.LOCAL_KEYRING_ID, pgpKeyring, krSync);
    keyring.keyring = openpgpKeyring;
    keyring.keyring.privateKeys = [];
    keyring.sync = sync;
    sinon.stub(keyring, 'hasPrimaryKey');
  });

  afterEach(() => {
    KeyServer.prototype.upload.restore();
    openpgp.generateKeyPair.restore();
    openpgp.Keyring.restore();
    keyringSync.KeyringSync.restore();
    keys = [];
  });

  describe('generateKey', () => {
    var keygenOpt;

    beforeEach(() => {
      keygenOpt = {
        numBits: 2048,
        userIds: [{email: 'a@b.co', fullName: 'A B'}],
        passphrase: 'secret'
      };

      var keyStub = sinon.createStubInstance(openpgp.key.Key);
      keyStub.primaryKey = {
        getFingerprint() {},
        keyid: {toHex() { return 'ASDF'; }}
      };
      openpgp.generateKeyPair.returns(Promise.resolve({
        key: keyStub,
        publicKeyArmored: 'PUBLIC KEY BLOCK',
        privateKeyArmored: 'PRIVATE KEY BLOCK'
      }));
      keyring.hasPrimaryKey.returns(true);
      KeyServer.prototype.upload.returns(Promise.resolve({status: 201}));
    });

    it('should generate and upload key', () => {
      keygenOpt.uploadPublicKey = true;
      return keyring.generateKey(keygenOpt).then(key => {
        expect(key.privateKeyArmored).to.exist;
        expect(KeyServer.prototype.upload.calledOnce).to.be.true;
      });
    });

    it('should generate and not upload key', () => {
      keygenOpt.uploadPublicKey = false;
      return keyring.generateKey(keygenOpt).then(key => {
        expect(key.privateKeyArmored).to.exist;
        expect(KeyServer.prototype.upload.calledOnce).to.be.false;
      });
    });
  });

  describe('getKeyUserIDs', () => {

    beforeEach(() => {
      var key = keyMock('db9ccdf0d5f3a387');
      key.users.push(userMock('Alice <alice@world.org>'));
      key.users.push(userMock('Alice Liddell <alice@mars.org>'));
      keys.push(key);
      key = keyMock('712ec1bd873b7e58');
      key.users.push(userMock('Bob M. <bob@moon.org>'));
      keys.push(key);
    });

    it('should return all keys', () => {
      expect(keyring.getKeyUserIDs()).to.deep.equal([
        {keyid: 'db9ccdf0d5f3a387', userid: 'Alice <alice@world.org>', name: 'Alice', email: 'alice@world.org'},
        {keyid: '712ec1bd873b7e58', userid: 'Bob M. <bob@moon.org>', name: 'Bob M.', email: 'bob@moon.org'}
      ]);
    });

    it('should return only valid keys', () => {
      keys[0].verifyPrimaryKey = sinon.stub().returns(openpgp.enums.keyStatus.invalid);
      expect(keyring.getKeyUserIDs()).to.deep.equal([
        {keyid: '712ec1bd873b7e58', userid: 'Bob M. <bob@moon.org>', name: 'Bob M.', email: 'bob@moon.org'}
      ]);
    });

    it('should return all users - option allUsers', () => {
      expect(keyring.getKeyUserIDs({allUsers: true})).to.deep.equal([
        {keyid: 'db9ccdf0d5f3a387', userid: 'Alice <alice@world.org>', name: 'Alice', email: 'alice@world.org'},
        {keyid: 'db9ccdf0d5f3a387', userid: 'Alice Liddell <alice@mars.org>', name: 'Alice Liddell', email: 'alice@mars.org'},
        {keyid: '712ec1bd873b7e58', userid: 'Bob M. <bob@moon.org>', name: 'Bob M.', email: 'bob@moon.org'}
      ]);
    });

    it('should return only valid users - option allUsers', () => {
      keys[0].users[0].verify = sinon.stub().returns(openpgp.enums.keyStatus.invalid);
      expect(keyring.getKeyUserIDs({allUsers: true})).to.deep.equal([
        {keyid: 'db9ccdf0d5f3a387', userid: 'Alice Liddell <alice@mars.org>', name: 'Alice Liddell', email: 'alice@mars.org'},
        {keyid: '712ec1bd873b7e58', userid: 'Bob M. <bob@moon.org>', name: 'Bob M.', email: 'bob@moon.org'}
      ]);
    });

    it('should check for duplicate users - option allUsers', () => {
      keys[0].users[0] = userMock('Alice Liddell <alice@mars.org>');
      expect(keyring.getKeyUserIDs({allUsers: true})).to.deep.equal([
        {keyid: 'db9ccdf0d5f3a387', userid: 'Alice Liddell <alice@mars.org>', name: 'Alice Liddell', email: 'alice@mars.org'},
        {keyid: '712ec1bd873b7e58', userid: 'Bob M. <bob@moon.org>', name: 'Bob M.', email: 'bob@moon.org'}
      ]);
    });

    it('should filter out invalid email - option allUsers', () => {
      keys[0].users[0] = userMock('Alice Liddell <alice!>');
      expect(keyring.getKeyUserIDs({allUsers: true})).to.deep.equal([
        {keyid: 'db9ccdf0d5f3a387', userid: 'Alice Liddell <alice@mars.org>', name: 'Alice Liddell', email: 'alice@mars.org'},
        {keyid: '712ec1bd873b7e58', userid: 'Bob M. <bob@moon.org>', name: 'Bob M.', email: 'bob@moon.org'}
      ]);
    });

  });

  describe('_mapKeyUserIds', () => {

    it('should map user id', () => {
      var user = {userid: 'Bob M. <bob@moon.institute>'};
      keyring._mapKeyUserIds(user);
      expect(user).to.deep.equal({userid: 'Bob M. <bob@moon.institute>', name: 'Bob M.', email: 'bob@moon.institute'});
    });

    it('should map user id without email', () => {
      var user = {userid: 'Bob M.'};
      keyring._mapKeyUserIds(user);
      expect(user).to.deep.equal({userid: 'Bob M.', name: 'Bob M.', email: ''});
    });

    it('should map user id without name', () => {
      var user = {userid: '<bob@moon.org>'};
      keyring._mapKeyUserIds(user);
      expect(user).to.deep.equal({userid: '<bob@moon.org>', name: '', email: 'bob@moon.org'});
      user = {userid: 'bob@moon.org'};
      keyring._mapKeyUserIds(user);
      expect(user).to.deep.equal({userid: 'bob@moon.org', name: '', email: 'bob@moon.org'});
    });

    it('should not map invalid email', () => {
      var user = {userid: 'Bob M. <img src=x onerror=alert(location)>'};
      keyring._mapKeyUserIds(user);
      expect(user).to.deep.equal({userid: 'Bob M. <img src=x onerror=alert(location)>', name: 'Bob M.', email: ''});
    });

  });

});
