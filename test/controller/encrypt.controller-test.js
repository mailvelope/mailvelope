import {expect, sinon} from 'test';
import mvelo from 'lib/lib-mvelo';
import * as sub from 'controller/sub.controller';
import {prefs} from 'modules/prefs';
import EncryptController from 'controller/encrypt.controller';

describe('Encrypt controller unit tests', () => {
  const sandbox = sinon.createSandbox();
  let ctrl;
  let editorCtrlMock;
  const testRecipients = [{email: 'test@example.com'}];

  beforeEach(() => {
    ctrl = new EncryptController();

    editorCtrlMock = {
      encrypt: sandbox.stub()
    };
    sandbox.stub(sub.factory, 'get').returns(editorCtrlMock);
    sandbox.stub(mvelo.util, 'sanitizeHTML').returns('parsed');
    sandbox.stub(ctrl, 'emit');
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('Check event handlers', () => {
    it('should handle display editor', () => {
      expect(ctrl._handlers.get('eframe-display-editor')).to.exist;
    });
  });

  describe('openEditor', () => {
    it('should work for editor type plain', () => {
      editorCtrlMock.encrypt.returns(Promise.resolve({armored: 'armored', recipients: testRecipients}));
      prefs.general = {
        editor_type: 'plain'
      };
      return ctrl.onEncryptFrameDisplayEditor({text: 'foo'})
      .then(() => {
        expect(ctrl.emit.withArgs('set-editor-output', {text: 'armored', recipients: testRecipients}).calledOnce).to.be.true;
      });
    });

    it('should stop on error', () => {
      editorCtrlMock.encrypt.returns(Promise.reject(new Error('foo')));
      return ctrl.onEncryptFrameDisplayEditor({text: 'foo'})
      .catch(() => {
        expect(ctrl.emit.withArgs('mail-editor-close').calledOnce).to.be.true;
      });
    });
  });

  describe('getRecipients', () => {
    beforeEach(() => {
      sandbox.stub(ctrl, 'send');
    });

    it('should work', () => {
      ctrl.getRecipients();
      expect(ctrl.send.withArgs('get-recipients').calledOnce).to.be.true;
    });
  });

  /* displayRecipientProposal does not exist anymore */
  describe.skip('displayRecipientProposal', () => {
    let recipientsCallbackStub;

    beforeEach(() => {
      recipientsCallbackStub = ctrl.recipientsCallback = sandbox.stub();
    });

    it('should callback', () => {
      ctrl.displayRecipientProposal({recipients: testRecipients});

      expect(ctrl.recipientsCallback).to.be.null;
      expect(recipientsCallbackStub.withArgs(testRecipients).calledOnce).to.be.true;
    });

    it('should not callback', () => {
      ctrl.recipientsCallback = null;

      ctrl.displayRecipientProposal({recipients: testRecipients});

      expect(ctrl.recipientsCallback).to.be.null;
      expect(recipientsCallbackStub.called).to.be.false;
    });
  });
});
