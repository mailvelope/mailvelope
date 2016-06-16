'use strict';

define(function(require) {

  var sub = require('common/lib/controller/sub.controller');
  var EditorController = require('common/lib/controller/editor.controller').EditorController;

  describe('Editor controller unit tests', function() {
    var ctrl, port;
    var testRecipients;

    beforeEach(function() {
      testRecipients = [{email:'test@example.com'}];
      port = {name: 'foo', postMessage: function(opt) { ctrl.handlePortMessage(opt); }};
      ctrl = new EditorController(port);

      sinon.stub(ctrl, 'emit');
      sinon.stub(ctrl.prefs, 'data');
    });

    afterEach(function() {
      ctrl.emit.restore();
      ctrl.prefs.data.restore();
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
          getKeyUserIDs: function() { return [{keyid:'0'}]; }
        };
        importKeysStub = sinon.stub(keyRingMock, 'importKeys');
        sinon.stub(ctrl.keyring, 'getById').returns(keyRingMock);
      });

      afterEach(function() {
        ctrl.keyserver.lookup.restore();
        ctrl.keyring.getById.restore();
      });

      it('should find a key', function() {
        ctrl.keyserver.lookup.returns(resolves({publicKeyArmored:'KEY BLOCK'}));

        return ctrl.lookupKeyOnServer({recipient:{email:'a@b.co'}})
        .then(function() {
          expect(importKeysStub.calledOnce).to.be.true;
          expect(ctrl.emit.calledOnce).to.be.true;
        });
      });

      it('should not find a key', function() {
        ctrl.keyserver.lookup.returns(resolves());

        return ctrl.lookupKeyOnServer({recipient:{email:'a@b.co'}})
        .then(function() {
          expect(importKeysStub.calledOnce).to.be.false;
          expect(ctrl.emit.calledOnce).to.be.true;
        });
      });
    });

    describe('displayRecipientProposal', function() {
      beforeEach(function() {
        sinon.stub(ctrl.keyring, 'getById').returns({
          getKeyUserIDs: function() { return [{keyid:'0'}]; }
        });
      });

      afterEach(function() {
        ctrl.keyring.getById.restore();
      });

      it('should handle empty recipients', function() {
        ctrl.displayRecipientProposal([]);
        expect(ctrl.emit.withArgs('public-key-userids', {keys:[{keyid:'0'}], recipients:[]}).calledOnce).to.be.true;
      });

      it('should handle undefined recipients', function() {
        ctrl.displayRecipientProposal();
        expect(ctrl.emit.withArgs('public-key-userids', {keys:[{keyid:'0'}], recipients:[]}).calledOnce).to.be.true;
      });

      it('should handle recipients', function() {
        ctrl.displayRecipientProposal(testRecipients);
        expect(ctrl.emit.withArgs('public-key-userids', {keys:[{keyid:'0'}], recipients:testRecipients}).calledOnce).to.be.true;
      });
    });

    describe('transferEncrypted', function() {

      beforeEach(function() {
        ctrl.encryptCallback = function() {};
        sinon.stub(ctrl, 'encryptCallback');
      });

      it('should not transfer private key material', function() {
        ctrl.transferEncrypted({
          armored:'a',
          keys:[{name:'n', email:'e', private:'p'}]
        });
        expect(ctrl.encryptCallback.withArgs(null, 'a', [{name:'n', email:'e'}]).calledOnce).to.be.true;
      });

      it('should emit message to encrypt container', function() {
        ctrl.ports = { editorCont: {}};
        ctrl.transferEncrypted({
          armored:'a',
          keys:[{name:'n', email:'e', private:'p'}]
        });
        expect(ctrl.encryptCallback.called).to.be.false;
        expect(ctrl.emit.withArgs('encrypted-message', {message: 'a'}, {}).calledOnce).to.be.true;
      });

    });

    describe('signAndEncrypt', function() {
      var keys;

      beforeEach(function() {
        keys = [{name:'n', email:'e', private:'p'}];
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
        ctrl.encryptMessage.returns(resolves('a'));
        return ctrl.signAndEncrypt({
          action: 'encrypt',
          message:'m',
          keys: keys
        })
        .then(function(res) {
          expect(res).to.equal('a');
        });
      });

      it('should sign and encrypt', function() {
        ctrl.signMsg = true;
        ctrl.signAndEncryptMessage.returns(resolves('a'));
        return ctrl.signAndEncrypt({
          action: 'encrypt',
          message:'m',
          keys: keys
        })
        .then(function(res) {
          expect(res).to.equal('a');
        });
      });

      it('should sign', function() {
        ctrl.signMessage.returns(resolves('a'));
        return ctrl.signAndEncrypt({
          action: 'sign',
          message:'m'
        })
        .then(function(res) {
          expect(res).to.equal('a');
        });
      });

      it('should handle build MIME error', function(done) {
        ctrl.buildMail.returns(null);
        ctrl.signAndEncrypt({
          action: 'encrypt',
          message:'m'
        })
        .catch(function(err) {
          expect(err.message).to.be.equal('MIME building failed.');
          done();
        });
      });
    });

    describe('getPublicKeyIds', function() {
      var keys = [{keyid:'b'}, {keyid:'b'}];

      beforeEach(function() {
        sinon.stub(ctrl.keyring, 'getById').returns({
          getAttributes: function() { return {primary_key:'p'}; }
        });
        ctrl.prefs.data.returns({
          general: {
            auto_add_primary: false
          }
        });
      });

      afterEach(function() {
        ctrl.keyring.getById.restore();
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
        ctrl.prefs.data.returns({
          general: {
            auto_add_primary: true
          }
        });
        ctrl.keyidBuffer = undefined;

        expect(ctrl.getPublicKeyIds(keys)).to.deep.equal(['b', 'p']);
      });
    });

  });
});
