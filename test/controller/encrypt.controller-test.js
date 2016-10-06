'use strict';


var sub = require('../../src/controller/sub.controller');
var EncryptController = require('../../src/controller/encrypt.controller').EncryptController;
var ctrl, editorCtrlMock;

var testRecipients = [{email: 'test@example.com'}];

describe('Encrypt controller unit tests', function() {

  beforeEach(function() {
    ctrl = new EncryptController();

    editorCtrlMock = {
      encrypt: sinon.stub()
    };
    sinon.stub(sub.factory, 'get').returns(editorCtrlMock);
    sinon.stub(ctrl.prefs, 'data');
    sinon.stub(ctrl.mvelo.util, 'parseHTML').yields('parsed');
    sinon.stub(ctrl, 'emit');
  });

  afterEach(function() {
    sub.factory.get.restore();
    ctrl.prefs.data.restore();
    ctrl.mvelo.util.parseHTML.restore();
    ctrl.emit.restore();
  });

  describe('Check event handlers', function() {
    it('should handle recipients', function() {
      expect(ctrl._handlers.get('eframe-recipients')).to.equal(ctrl.displayRecipientProposal);
      expect(ctrl._handlers.get('eframe-display-editor')).to.equal(ctrl.openEditor);
    });
  });

  describe('openEditor', function() {
    var modalActiveVal;

    beforeEach(function() {
      modalActiveVal = ctrl.mvelo.windows.modalActive;
    });

    afterEach(function() {
      ctrl.mvelo.windows.modalActive = modalActiveVal;
    });

    it('should not open editor a second time', function() {
      ctrl.mvelo.windows.modalActive = true;

      ctrl.openEditor({text: 'foo'});

      expect(ctrl.editorControl).to.be.null;
    });

    it('should work for editor type plain', function() {
      editorCtrlMock.encrypt.yields(null, 'armored', testRecipients);
      ctrl.prefs.data.returns({
        general: {
          editor_type: 'plain'
        }
      });

      ctrl.openEditor({text: 'foo'});

      expect(ctrl.emit.withArgs('set-editor-output', {text: 'parsed', recipients: testRecipients}).calledOnce).to.be.true;
    });

    it('should work for other editor type', function() {
      editorCtrlMock.encrypt.yields(null, 'armored', testRecipients);
      ctrl.prefs.data.returns({
        general: {
          editor_type: 'other'
        }
      });

      ctrl.openEditor({text: 'foo'});

      expect(ctrl.emit.withArgs('set-editor-output', {text: 'armored', recipients: testRecipients}).calledOnce).to.be.true;
    });

    it('should stop on error', function() {
      editorCtrlMock.encrypt.yields(new Error('foo'));
      ctrl.openEditor({text: 'foo'});
      expect(ctrl.emit.called).to.be.false;
    });
  });

  describe('getRecipientProposal', function() {
    var callback = function() {};

    it('should work', function() {
      ctrl.getRecipientProposal(callback);
      expect(ctrl.emit.withArgs('get-recipients').calledOnce).to.be.true;
      expect(ctrl.recipientsCallback).to.equal(callback);
    });

    it('should fail', function() {
      ctrl.recipientsCallback = function() {};
      expect(ctrl.getRecipientProposal.bind(ctrl, callback)).to.throw(/Waiting/);
      expect(ctrl.emit.called).to.be.false;
      expect(ctrl.recipientsCallback).to.not.equal(callback);
    });
  });

  describe('displayRecipientProposal', function() {
    var recipientsCallbackStub;

    beforeEach(function() {
      recipientsCallbackStub = ctrl.recipientsCallback = sinon.stub();
    });

    it('should callback', function() {
      ctrl.displayRecipientProposal({recipients: testRecipients});

      expect(ctrl.recipientsCallback).to.be.null;
      expect(recipientsCallbackStub.withArgs(testRecipients).calledOnce).to.be.true;
    });

    it('should not callback', function() {
      ctrl.recipientsCallback = null;

      ctrl.displayRecipientProposal({recipients: testRecipients});

      expect(ctrl.recipientsCallback).to.be.null;
      expect(recipientsCallbackStub.called).to.be.false;
    });
  });

});
