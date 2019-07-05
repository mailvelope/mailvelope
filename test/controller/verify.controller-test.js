import {expect, sinon} from 'test';
import {Port} from 'utils';
import VerifyController from 'controller/verify.controller';

describe('Verify controller unit tests', () => {
  const sandbox = sinon.createSandbox();
  let ctrl;
  let port;

  beforeEach(() => {
    port = new Port('dummy-1');
    ctrl = new VerifyController(port);
  });

  afterEach(() => {
    sandbox.restore();
    /* eslint-disable-next-line no-undef */
    __rewire_reset_all__();
  });

  describe('Check event handlers', () => {
    it('should handle armored message', () => {
      expect(ctrl._handlers.get('vframe-armored-message')).to.exist;
    });
  });

  describe('onArmoredMessage', () => {
    it('should verify message and emit event', async () => {
      const msg = {data: 'abc'};
      ctrl.keyringId = '123';
      VerifyController.__Rewire__('verifyMessage', () => Promise.resolve({data: 'cba', signatures: ['a', 'b', 'c']}));
      const emitStub = sandbox.stub();
      ctrl.ports = {
        dDialog: {
          emit: emitStub
        }
      };
      await ctrl.onArmoredMessage(msg);
      expect(emitStub.withArgs('verified-message', {message: 'cba', signers: ['a', 'b', 'c']}).calledOnce).to.be.true;
    });
  });
});
