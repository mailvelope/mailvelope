'use strict';


import EditorController from '../../src/controller/editor.controller';
import * as keyring from '../../src/modules/keyring';
import * as prefs from '../../src/modules/prefs';

describe('Editor controller unit tests', function() {
  var ctrl, port, preferences = prefs.prefs;
  var testRecipients;

  beforeEach(function() {
    testRecipients = [{email: 'test@example.com'}];
    port = {name: 'foo', postMessage: function(opt) { ctrl.handlePortMessage(opt); }};
    ctrl = new EditorController(port);

    sinon.stub(ctrl, 'emit');
    prefs.prefs = Object.assign({}, preferences);
  });

  afterEach(function() {
    ctrl.emit.restore();
    prefs.prefs = preferences;
  });

  describe('Check event handlers', function() {
    it('should handle recipients', function() {
      expect(ctrl._handlers.get('editor-init')).to.equal(ctrl._onEditorInit);
    });
  });

  describe('lookupKeyOnServer', function() {
    var importKeysStub;

    beforeEach(function() {
      sinon.stub(ctrl.keyserver, 'lookup');
      var keyRingMock = {
        importKeys: function() {},
        getKeyUserIDs: function() { return [{keyid: '0'}]; }
      };
      importKeysStub = sinon.stub(keyRingMock, 'importKeys');
      sinon.stub(keyring, 'getById').returns(keyRingMock);
    });

    afterEach(function() {
      ctrl.keyserver.lookup.restore();
      keyring.getById.restore();
    });

    it('should find a key', function() {
      ctrl.keyserver.lookup.returns(Promise.resolve({publicKeyArmored: 'KEY BLOCK'}));

      return ctrl.lookupKeyOnServer({recipient: {email: 'a@b.co'}})
      .then(function() {
        expect(importKeysStub.calledOnce).to.be.true;
        expect(ctrl.emit.calledOnce).to.be.true;
      });
    });

    it('should not find a key', function() {
      ctrl.keyserver.lookup.returns(Promise.resolve());

      return ctrl.lookupKeyOnServer({recipient: {email: 'a@b.co'}})
      .then(function() {
        expect(importKeysStub.calledOnce).to.be.false;
        expect(ctrl.emit.calledOnce).to.be.true;
      });
    });
  });

  describe('displayRecipientProposal', function() {
    beforeEach(function() {
      sinon.stub(keyring, 'getById').returns({
        getKeyUserIDs: function() { return [{keyid: '0'}]; }
      });
      sinon.stub(ctrl.keyserver, 'getTOFUPreference').returns(true);
    });

    afterEach(function() {
      keyring.getById.restore();
      ctrl.keyserver.getTOFUPreference.restore();
    });

    it('should handle empty recipients', function() {
      ctrl.displayRecipientProposal([]);
      expect(ctrl.emit.withArgs('public-key-userids', {keys: [{keyid: '0'}], recipients: [], tofu: true}).calledOnce).to.be.true;
    });

    it('should handle undefined recipients', function() {
      ctrl.displayRecipientProposal();
      expect(ctrl.emit.withArgs('public-key-userids', {keys: [{keyid: '0'}], recipients: [], tofu: true}).calledOnce).to.be.true;
    });

    it('should handle recipients', function() {
      ctrl.displayRecipientProposal(testRecipients);
      expect(ctrl.emit.withArgs('public-key-userids', {keys: [{keyid: '0'}], recipients: testRecipients, tofu: true}).calledOnce).to.be.true;
    });
  });

  describe('transferEncrypted', function() {

    beforeEach(function() {
      ctrl.encryptCallback = function() {};
      sinon.stub(ctrl, 'encryptCallback');
    });

    it('should not transfer private key material', function() {
      ctrl.transferEncrypted({
        armored: 'a',
        keys: [{name: 'n', email: 'e', private: 'p'}]
      });
      expect(ctrl.encryptCallback.withArgs(null, 'a', [{name: 'n', email: 'e'}]).calledOnce).to.be.true;
    });

    it('should emit message to encrypt container', function() {
      ctrl.ports = { editorCont: {}};
      ctrl.transferEncrypted({
        armored: 'a',
        keys: [{name: 'n', email: 'e', private: 'p'}]
      });
      expect(ctrl.encryptCallback.called).to.be.false;
      expect(ctrl.emit.withArgs('encrypted-message', {message: 'a'}, {}).calledOnce).to.be.true;
    });

  });

  describe('signAndEncrypt', function() {
    var keys;

    beforeEach(function() {
      keys = [{name: 'n', email: 'e', private: 'p'}];
      sinon.stub(ctrl, 'buildMail');
      sinon.stub(ctrl, 'getPublicKeyIds');
      sinon.stub(ctrl, 'signAndEncryptMessage');
      sinon.stub(ctrl, 'encryptMessage');
      sinon.stub(ctrl, 'signMessage');
    });

    afterEach(function() {
      ctrl.buildMail.restore();
      ctrl.getPublicKeyIds.restore();
      ctrl.signAndEncryptMessage.restore();
      ctrl.encryptMessage.restore();
      ctrl.signMessage.restore();
    });

    it('should encrypt', function() {
      ctrl.encryptMessage.returns(Promise.resolve('a'));
      return ctrl.signAndEncrypt({
        action: 'encrypt',
        message: 'm',
        keys: keys
      })
      .then(function(res) {
        expect(res).to.equal('a');
      });
    });

    it('should sign and encrypt', function() {
      ctrl.signMsg = true;
      ctrl.signAndEncryptMessage.returns(Promise.resolve('a'));
      return ctrl.signAndEncrypt({
        action: 'encrypt',
        message: 'm',
        keys: keys
      })
      .then(function(res) {
        expect(res).to.equal('a');
      });
    });

    it('should sign', function() {
      ctrl.signMessage.returns(Promise.resolve('a'));
      return ctrl.signAndEncrypt({
        action: 'sign',
        message: 'm'
      })
      .then(function(res) {
        expect(res).to.equal('a');
      });
    });

    it('should handle build MIME error', function(done) {
      ctrl.buildMail.returns(null);
      ctrl.signAndEncrypt({
        action: 'encrypt',
        message: 'm'
      })
      .catch(function(err) {
        expect(err.message).to.be.equal('MIME building failed.');
        done();
      });
    });
  });

  describe('getPublicKeyIds', function() {
    var keys = [{keyid: 'b'}, {keyid: 'b'}];

    beforeEach(function() {
      sinon.stub(keyring, 'getById').returns({
        getAttributes: function() { return {primary_key: 'p'}; },
        getPrimaryKey: () => ({keyid: 'P'})
      });
      prefs.prefs = {
        general: {
          auto_add_primary: false
        }
      };
    });

    afterEach(function() {
      keyring.getById.restore();
    });

    it('should return keybuffer', function() {
      ctrl.keyidBuffer = ['a', 'a'];

      expect(ctrl.getPublicKeyIds(keys)).to.deep.equal(['a']);
    });

    it('should return key ids', function() {
      ctrl.keyidBuffer = undefined;

      expect(ctrl.getPublicKeyIds(keys)).to.deep.equal(['b']);
    });

    it('should return key ids with primary', function() {
      prefs.prefs = {
        general: {
          auto_add_primary: true
        }
      };
      ctrl.keyidBuffer = undefined;

      expect(ctrl.getPublicKeyIds(keys)).to.deep.equal(['b', 'p']);
    });
  });

});
