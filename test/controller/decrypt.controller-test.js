
import {expect, sinon} from 'test';
import {Port} from 'utils';
import DecryptController from 'controller/decrypt.controller';

describe('Decrypt controller unit tests', () => {
  const sandbox = sinon.createSandbox();
  let ctrl;
  let port;

  beforeEach(() => {
    port = new Port('dummy-1');
    ctrl = new DecryptController(port);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('Check event handlers', () => {
    it('should handle set armored', () => {
      expect(ctrl._handlers.get('set-armored')).to.exist;
    });
  });

  describe('onSetArmored', () => {
    it('should call decrypt', () => {
      const msg = {
        options: {},
        keyringId: '123',
        data: 'a'
      };
      const decrypt = sandbox.spy(ctrl, 'decrypt');
      ctrl.onSetArmored(msg);
      expect(decrypt.withArgs(msg.data, msg.keyringId).calledOnce).to.be.true;
    });
  });
});
