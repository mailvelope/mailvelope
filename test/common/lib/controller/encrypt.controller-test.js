'use strict';

define(function(require) {

  var sub = require('common/lib/controller/sub.controller');
  var EncryptController = require('common/lib/controller/encrypt.controller').EncryptController;
  var ctrl, editorCtrlMock;

  var testRecipients = [{email:'test@example.com'}];

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

    describe('handlePortMessage', function() {
      var modalActiveVal;

      beforeEach(function() {
        modalActiveVal = ctrl.mvelo.windows.modalActive;
      });

      afterEach(function() {
        ctrl.mvelo.windows.modalActive = modalActiveVal;
      });

      it('should handle recipients', function() {
        sinon.stub(ctrl, 'displayRecipientProposal');

        var data = {};
        ctrl.handlePortMessage({
          event: 'eframe-recipients',
          data: data
        });

        expect(ctrl.displayRecipientProposal.withArgs(data).calledOnce).to.be.true;
      });

      it('should display encrypt editor', function() {
        sinon.stub(ctrl, 'openEditor');

        var text = 'foo';
        ctrl.handlePortMessage({
          event: 'eframe-display-editor',
          text: text
        });

        expect(ctrl.openEditor.withArgs(text).calledOnce).to.be.true;
      });

      it('should not display encrypt editor a second time', function() {
        sinon.stub(ctrl, 'openEditor');
        ctrl.mvelo.windows.modalActive = true;

        var text = 'foo';
        ctrl.handlePortMessage({
          event: 'eframe-display-editor',
          text: text
        });

        expect(ctrl.openEditor.called).to.be.false;
      });
    });

    describe('openEditor', function() {
      it('should work for editor type plain', function() {
        editorCtrlMock.encrypt.yields(null, 'armored', testRecipients);
        ctrl.prefs.data.returns({
          general: {
            editor_type: 'plain'
          }
        });

        ctrl.openEditor('foo');

        expect(ctrl.emit.withArgs('set-editor-output', {text: 'parsed', recipients:testRecipients}).calledOnce).to.be.true;
      });

      it('should work for other editor type', function() {
        editorCtrlMock.encrypt.yields(null, 'armored', testRecipients);
        ctrl.prefs.data.returns({
          general: {
            editor_type: 'other'
          }
        });

        ctrl.openEditor('foo');

        expect(ctrl.emit.withArgs('set-editor-output', {text: 'armored', recipients:testRecipients}).calledOnce).to.be.true;
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
        ctrl.displayRecipientProposal(testRecipients);

        expect(ctrl.recipientsCallback).to.be.null;
        expect(recipientsCallbackStub.withArgs(testRecipients).calledOnce).to.be.true;
      });

      it('should not callback', function() {
        ctrl.recipientsCallback = null;

        ctrl.displayRecipientProposal(testRecipients);

        expect(ctrl.recipientsCallback).to.be.null;
        expect(recipientsCallbackStub.called).to.be.false;
      });
    });

    describe('emit', function() {
      var event = 'event', options = {data:'data'};

      beforeEach(function() {
        ctrl.emit.restore();
        ctrl.ports.eFrame = {postMessage: sinon.stub()};
      });

      afterEach(function() {
        sinon.stub(ctrl, 'emit');
      });

      it('should work for empty options', function() {
        ctrl.emit(event);
        expect(ctrl.ports.eFrame.postMessage.withArgs({event:event}).calledOnce).to.be.true;
      });

      it('should work for options', function() {
        ctrl.emit(event, options);
        expect(ctrl.ports.eFrame.postMessage.withArgs({event:event, data:options.data}).calledOnce).to.be.true;
      });
    });

  });
});
