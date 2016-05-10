'use strict';

define(function(require) {

  var sub = require('common/lib/controller/sub.controller');
  var EncryptController = require('common/lib/controller/encrypt.controller').EncryptController;
  var ctrl, editorCtrlMock, keyRingMock;

  describe('Encrypt controller unit tests', function() {

    beforeEach(function() {
      ctrl = new EncryptController();

      editorCtrlMock = {
        encrypt: sinon.stub()
      };
      sinon.stub(sub.factory, 'get').returns(editorCtrlMock);
      sinon.stub(ctrl.prefs, 'data');
      sinon.stub(ctrl.mvelo.util, 'parseHTML').yields('parsed');
      sinon.stub(ctrl, '_sendEvent');
      keyRingMock = {
        getKeyUserIDs: sinon.stub(),
        getAttributes: sinon.stub()
      };
      sinon.stub(ctrl.keyring, 'getById').returns(keyRingMock);
    });

    afterEach(function() {
      sub.factory.get.restore();
      ctrl.prefs.data.restore();
      ctrl.mvelo.util.parseHTML.restore();
      ctrl._sendEvent.restore();
      ctrl.keyring.getById.restore();
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
        sinon.stub(ctrl, 'handleRecipients');

        var data = {};
        ctrl.handlePortMessage({
          event: 'eframe-recipients',
          data: data
        });

        expect(ctrl.handleRecipients.withArgs(data).calledOnce).to.be.true;
      });

      it('should display encrypt editor', function() {
        sinon.stub(ctrl, 'encrypt');

        var text = 'foo';
        ctrl.handlePortMessage({
          event: 'eframe-display-editor',
          text: text
        });

        expect(ctrl.encrypt.withArgs(text).calledOnce).to.be.true;
      });

      it('should not display encrypt editor a second time', function() {
        sinon.stub(ctrl, 'encrypt');
        ctrl.mvelo.windows.modalActive = true;

        var text = 'foo';
        ctrl.handlePortMessage({
          event: 'eframe-display-editor',
          text: text
        });

        expect(ctrl.encrypt.called).to.be.false;
      });
    });

    describe('encrypt', function() {
      it('should work for editor type plain', function(done) {
        editorCtrlMock.encrypt.yields(null, 'armored');
        ctrl.prefs.data.returns({
          general: {
            editor_type: 'plain'
          }
        });

        ctrl.encrypt('foo', function(err) {
          expect(ctrl._sendEvent.withArgs('set-editor-output', {text: 'parsed'}).calledOnce).to.be.true;
          expect(err).to.not.exist;
          done();
        });
      });

      it('should work for other editor type', function(done) {
        editorCtrlMock.encrypt.yields(null, 'armored');
        ctrl.prefs.data.returns({
          general: {
            editor_type: 'other'
          }
        });

        ctrl.encrypt('foo', function(err) {
          expect(ctrl._sendEvent.withArgs('set-editor-output', {text: 'armored'}).calledOnce).to.be.true;
          expect(err).to.not.exist;
          done();
        });
      });

      it('should fail for error', function(done) {
        editorCtrlMock.encrypt.yields(new Error());

        ctrl.encrypt('foo', function(err) {
          expect(ctrl._sendEvent.called).to.be.false;
          expect(err).to.exist;
          done();
        });
      });
    });

    describe('getRecipients', function() {
      var callback = function() {};

      it('should work', function() {
        ctrl.getRecipients(callback);
        expect(ctrl._sendEvent.withArgs('get-recipients').calledOnce).to.be.true;
        expect(ctrl.recipientsCallback).to.equal(callback);
      });

      it('should fail', function() {
        ctrl.recipientsCallback = function() {};
        expect(ctrl.getRecipients.bind(ctrl, callback)).to.throw(/Waiting/);
        expect(ctrl._sendEvent.called).to.be.false;
        expect(ctrl.recipientsCallback).to.not.equal(callback);
      });
    });

    describe('handleRecipients', function() {
      var keys = [],
        primary = 'primary',
        recipients = [{address: 'text@example.com'}],
        recipientsCallbackStub;

      beforeEach(function() {
        keyRingMock.getKeyUserIDs.returns(keys);
        keyRingMock.getAttributes.returns({primary_key: primary});
        recipientsCallbackStub = ctrl.recipientsCallback = sinon.stub();
      });

      it('should add primary key', function() {
        ctrl.prefs.data.returns({
          general: {
            auto_add_primary: true
          }
        });

        ctrl.handleRecipients(recipients);

        expect(keyRingMock.getAttributes.calledOnce).to.be.true;
        expect(ctrl.recipientsCallback).to.be.null;
        expect(recipientsCallbackStub.withArgs({keys:keys, primary:primary}).calledOnce).to.be.true;
      });

      it('should not add primary key', function() {
        ctrl.prefs.data.returns({
          general: {
            auto_add_primary: false
          }
        });

        ctrl.handleRecipients(recipients);

        expect(keyRingMock.getAttributes.called).to.be.false;
        expect(ctrl.recipientsCallback).to.be.null;
        expect(recipientsCallbackStub.withArgs({keys:keys, primary:undefined}).calledOnce).to.be.true;
      });
    });

    describe('_sendEvent', function() {
      var event = 'event', options = {data:'data'};

      beforeEach(function() {
        ctrl._sendEvent.restore();
        ctrl.ports.eFrame = {postMessage: sinon.stub()};
      });

      afterEach(function() {
        sinon.stub(ctrl, '_sendEvent');
      });

      it('should work for empty options', function() {
        ctrl._sendEvent(event);
        expect(ctrl.ports.eFrame.postMessage.withArgs({event:event}).calledOnce).to.be.true;
      });

      it('should work for options', function() {
        ctrl._sendEvent(event, options);
        expect(ctrl.ports.eFrame.postMessage.withArgs({event:event, data:options.data}).calledOnce).to.be.true;
      });
    });

  });
});
