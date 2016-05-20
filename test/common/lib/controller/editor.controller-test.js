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

    describe('transferAndCloseDialog', function() {
      var closeStub;

      beforeEach(function() {
        ctrl.encryptCallback = function() {};
        sinon.stub(ctrl, 'encryptCallback');
        ctrl.editorPopup = {close:function() {}};
        closeStub = sinon.stub(ctrl.editorPopup, 'close');
      });

      it('should not transfer private key material', function() {
        ctrl.transferAndCloseDialog({
          armored:'a',
          keys:[{name:'n', email:'e', private:'p'}]
        });

        expect(closeStub.calledOnce).to.be.true;
        expect(ctrl.editorPopup).to.be.null;
        expect(ctrl.encryptCallback.withArgs(null, 'a', [{name:'n', email:'e'}]).calledOnce).to.be.true;
      });

      it('should catch error', function() {
        var err = new Error('foo');

        ctrl.transferAndCloseDialog({error:err});

        expect(closeStub.calledOnce).to.be.false;
        expect(ctrl.encryptCallback.withArgs(err).calledOnce).to.be.true;
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
        ctrl.transferAndCloseDialog.restore();
      });

      it('should encrypt', function(done) {
        ctrl.encryptMessage.returns(resolves('a'));
        sinon.stub(ctrl, 'transferAndCloseDialog', function(res) {
          expect(res).to.deep.equal({armored:'a', keys:keys});
          done();
        });

        ctrl.signAndEncrypt({
          action: 'encrypt',
          message:'m',
          keys: keys
        });
      });

      it('should sign and encrypt', function(done) {
        ctrl.signMsg = true;
        ctrl.signAndEncryptMessage.returns(resolves('a'));
        sinon.stub(ctrl, 'transferAndCloseDialog', function(res) {
          expect(res).to.deep.equal({armored:'a', keys:keys});
          done();
        });

        ctrl.signAndEncrypt({
          action: 'encrypt',
          message:'m',
          keys: keys
        });
      });

      it('should sign', function(done) {
        ctrl.signMessage.returns(resolves('a'));
        sinon.stub(ctrl, 'transferAndCloseDialog', function(res) {
          expect(res).to.deep.equal({armored:'a', keys:[]});
          done();
        });

        ctrl.signAndEncrypt({
          action: 'sign',
          message:'m'
        });
      });

      it('should handle error', function(done) {
        ctrl.signMessage.returns(rejects(new Error('foo')));
        sinon.stub(ctrl, 'transferAndCloseDialog', function(res) {
          expect(res.error.message).to.equal('foo');
          done();
        });

        ctrl.signAndEncrypt({
          action: 'sign',
          message:'m'
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
