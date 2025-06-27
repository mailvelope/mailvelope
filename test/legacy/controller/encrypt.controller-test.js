import {expect, sinon} from 'test';
import mvelo from 'lib/lib-mvelo';
import * as main from 'controller/main.controller';
import EncryptController from 'controller/encrypt.controller';

describe('Encrypt controller unit tests', () => {
  const sandbox = sinon.createSandbox();
  let ctrl;
  let editorCtrlMock;

  beforeEach(() => {
    ctrl = new EncryptController();

    editorCtrlMock = {
      encrypt: sandbox.stub()
    };
    sandbox.stub(main, 'createController').returns(editorCtrlMock);
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
});
