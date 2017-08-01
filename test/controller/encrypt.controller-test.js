'use strict';


import mvelo from '../../src/chrome/lib/lib-mvelo';
import * as sub from '../../src/controller/sub.controller';
import * as prefs from '../../src/modules/prefs';
import EncryptController from '../../src/controller/encrypt.controller';

var ctrl, editorCtrlMock, preferences = prefs.prefs;

var testRecipients = [{email: 'test@example.com'}];

describe('Encrypt controller unit tests', function() {

  beforeEach(function() {
    ctrl = new EncryptController();

    editorCtrlMock = {
      encrypt: sinon.stub()
    };
    sinon.stub(sub.factory, 'get').returns(editorCtrlMock);
    prefs.prefs = Object.assign({}, preferences);
    sinon.stub(mvelo.util, 'parseHTML').yields('parsed');
    sinon.stub(ctrl, 'emit');
  });

  afterEach(function() {
    sub.factory.get.restore();
    prefs.prefs = preferences;
    mvelo.util.parseHTML.restore();
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
      modalActiveVal = mvelo.windows.modalActive;
    });

    afterEach(function() {
      mvelo.windows.modalActive = modalActiveVal;
    });

    it('should not open editor a second time', function() {
      mvelo.windows.modalActive = true;

      ctrl.openEditor({text: 'foo'});

      expect(ctrl.editorControl).to.be.null;
    });

    it('should work for editor type plain', function() {
      editorCtrlMock.encrypt.yields(null, 'armored', testRecipients);
      prefs.prefs = {
        general: {
          editor_type: 'plain'
        }
      };

      ctrl.openEditor({text: 'foo'});

      expect(ctrl.emit.withArgs('set-editor-output', {text: 'parsed', recipients: testRecipients}).calledOnce).to.be.true;
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
