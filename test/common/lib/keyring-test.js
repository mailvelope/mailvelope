'use strict';

define(function(require) {

  var mvelo = require('mvelo');
  var openpgp = require('openpgp');
  var Keyring = require('common/lib/keyring').Keyring;
  var keyring, pgpKeyring, krSync;
  var keys = [];

  function keyMock(keyid) {
    return {
      verifyPrimaryKey: sinon.stub().returns(openpgp.enums.keyStatus.valid),
      primaryKey: {
        getKeyId: function() {
          return {
            toHex: sinon.stub().returns(keyid)
          };
        },
      },
      users: [],
      getPrimaryUser: function() {
        return {
          user: this.users[0]
        };
      }
    };
  }

  function userMock(userid) {
    return {
      userId: {
        userid: userid
      },
      verify: sinon.stub().returns(openpgp.enums.keyStatus.valid)
    };
  }

  describe('Keyring unit tests', function() {

    beforeEach(function() {
      pgpKeyring = {
        getAllKeys: function() {
          return keys;
        }
      };
      krSync = {};
      keyring = new Keyring(mvelo.LOCAL_KEYRING_ID, pgpKeyring, krSync);
    });

    afterEach(function() {
      keys = [];
    });

    describe('getKeyUserIDs', function() {

      beforeEach(function() {
        var key = keyMock('db9ccdf0d5f3a387');
        key.users.push(userMock('Alice <alice@world.org>'));
        key.users.push(userMock('Alice Liddell <alice@mars.org>'));
        keys.push(key);
        key = keyMock('712ec1bd873b7e58');
        key.users.push(userMock('Bob M. <bob@moon.org>'));
        keys.push(key);
      });

      it('should return all keys', function() {
        expect(keyring.getKeyUserIDs()).to.deep.equal([
          { keyid: 'db9ccdf0d5f3a387', userid: 'Alice <alice@world.org>', name: 'Alice', email: 'alice@world.org' },
          { keyid: '712ec1bd873b7e58', userid: 'Bob M. <bob@moon.org>', name: 'Bob M.', email: 'bob@moon.org' }
        ]);
      });

      it('should return only valid keys', function() {
        keys[0].verifyPrimaryKey = sinon.stub().returns(openpgp.enums.keyStatus.invalid);
        expect(keyring.getKeyUserIDs()).to.deep.equal([
          { keyid: '712ec1bd873b7e58', userid: 'Bob M. <bob@moon.org>', name: 'Bob M.', email: 'bob@moon.org' }
        ]);
      });

      it('should return all users - option allUsers', function() {
        expect(keyring.getKeyUserIDs({ allUsers: true })).to.deep.equal([
          { keyid: 'db9ccdf0d5f3a387', userid: 'Alice <alice@world.org>', name: 'Alice', email: 'alice@world.org' },
          { keyid: 'db9ccdf0d5f3a387', userid: 'Alice Liddell <alice@mars.org>', name: 'Alice Liddell', email: 'alice@mars.org' },
          { keyid: '712ec1bd873b7e58', userid: 'Bob M. <bob@moon.org>', name: 'Bob M.', email: 'bob@moon.org' }
        ]);
      });

      it('should return only valid users - option allUsers', function() {
        keys[0].users[0].verify = sinon.stub().returns(openpgp.enums.keyStatus.invalid);
        expect(keyring.getKeyUserIDs({ allUsers: true })).to.deep.equal([
          { keyid: 'db9ccdf0d5f3a387', userid: 'Alice Liddell <alice@mars.org>', name: 'Alice Liddell', email: 'alice@mars.org' },
          { keyid: '712ec1bd873b7e58', userid: 'Bob M. <bob@moon.org>', name: 'Bob M.', email: 'bob@moon.org' }
        ]);
      });

      it('should check for duplicate users - option allUsers', function() {
        keys[0].users[0] = userMock('Alice Liddell <alice@mars.org>');
        expect(keyring.getKeyUserIDs({ allUsers: true })).to.deep.equal([
          { keyid: 'db9ccdf0d5f3a387', userid: 'Alice Liddell <alice@mars.org>', name: 'Alice Liddell', email: 'alice@mars.org' },
          { keyid: '712ec1bd873b7e58', userid: 'Bob M. <bob@moon.org>', name: 'Bob M.', email: 'bob@moon.org' }
        ]);
      });

      it('should filter out invalid email - option allUsers', function() {
        keys[0].users[0] = userMock('Alice Liddell <alice!>');
        expect(keyring.getKeyUserIDs({ allUsers: true })).to.deep.equal([
          { keyid: 'db9ccdf0d5f3a387', userid: 'Alice Liddell <alice@mars.org>', name: 'Alice Liddell', email: 'alice@mars.org' },
          { keyid: '712ec1bd873b7e58', userid: 'Bob M. <bob@moon.org>', name: 'Bob M.', email: 'bob@moon.org' }
        ]);
      });

    });

    describe('_mapKeyUserIds', function() {

      it('should map user id', function() {
        var user = { userid: 'Bob M. <bob@moon.institute>' };
        keyring._mapKeyUserIds(user);
        expect(user).to.deep.equal({ userid: 'Bob M. <bob@moon.institute>', name: 'Bob M.', email: 'bob@moon.institute' });
      });

      it('should map user id without email', function() {
        var user = { userid: 'Bob M.' };
        keyring._mapKeyUserIds(user);
        expect(user).to.deep.equal({ userid: 'Bob M.', name: 'Bob M.', email: '' });
      });

      it('should map user id without name', function() {
        var user = { userid: '<bob@moon.org>' };
        keyring._mapKeyUserIds(user);
        expect(user).to.deep.equal({ userid: '<bob@moon.org>', name: '', email: 'bob@moon.org' });
        user = { userid: 'bob@moon.org' };
        keyring._mapKeyUserIds(user);
        expect(user).to.deep.equal({ userid: 'bob@moon.org', name: '', email: 'bob@moon.org' });
      });

      it('should not map invalid email', function() {
        var user = { userid: 'Bob M. <img src=x onerror=alert(location)>' };
        keyring._mapKeyUserIds(user);
        expect(user).to.deep.equal({ userid: 'Bob M. <img src=x onerror=alert(location)>', name: 'Bob M.', email: '' });
      });

    });

  });
});
