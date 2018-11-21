
import {expect, sinon} from 'test';
import {Port} from 'utils';
import PrivateKeyController from 'controller/privateKey.controller';

describe('Private key controller unit tests', () => {
  const sandbox = sinon.createSandbox();
  let ctrl;
  let port;

  beforeEach(() => {
    port = new Port('dummy-1');
    ctrl = new PrivateKeyController(port);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('Check event handlers', () => {
    it('should handle input check', () => {
      expect(ctrl._handlers.get('input-check')).to.exist;
    });
  });

  describe('onInputCheck', () => {
    it('should generate key on valid input', () => {
      const generateKeyStub = sandbox.stub(ctrl, 'generateKey');
      ctrl.options = {test: 123};
      const msg = {isValid: true, pwd: 'abc'};
      ctrl.onInputCheck(msg);
      expect(generateKeyStub.withArgs(msg.pwd, ctrl.options).calledOnce).to.be.true;
    });
  });
});
