import {expect, sinon} from 'test';
import mvelo from 'lib/lib-mvelo';
import {MvError} from 'lib/util';
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
    it('should work for editor type plain', async () => {
      editorCtrlMock.encrypt.returns(Promise.resolve({armored: 'armored', to: testRecipients, cc: []}));
      prefs.general = {
        editor_type: 'plain'
      };
      await ctrl.onEncryptFrameDisplayEditor({text: 'foo'});
      expect(ctrl.emit.withArgs('set-editor-output', {text: 'armored', to: testRecipients, cc: []}).calledOnce).to.be.true;
    });

    it('should stop on error', async () => {
      editorCtrlMock.encrypt.returns(Promise.reject(new MvError('foo', 'EDITOR_DIALOG_CANCEL')));
      await ctrl.onEncryptFrameDisplayEditor({text: 'foo'});
      expect(ctrl.emit.withArgs('mail-editor-close').calledOnce).to.be.true;
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
});
