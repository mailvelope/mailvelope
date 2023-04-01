import {expect, sinon} from 'test';
import {prefs} from 'modules/prefs';
import PwdController from 'controller/pwd.controller';

describe('Password controller unit tests', () => {
  const sandbox = sinon.createSandbox();
  let ctrl;

  beforeEach(() => {
    ctrl = new PwdController();
  });

  afterEach(() => {
    sandbox.restore();
    /* eslint-disable-next-line no-undef */
    __rewire_reset_all__();
  });

  describe('Check event handlers', () => {
    it('should handle password dialog init', () => {
      expect(ctrl._handlers.get('pwd-dialog-init')).to.exist;
    });
    it('should handle password dialog ok', () => {
      expect(ctrl._handlers.get('pwd-dialog-ok')).to.exist;
    });
  });

  describe('onPwdDialogInit', () => {
    it('should pass over keyId and userId to dialog', async () => {
      prefs.security = {
        password_cache: '123'
      };
      ctrl.options = {
        key: {
          getKeyID() { return {toHex() { return 'asdf'; }}; }
        },
        reason: 'test'
      };
      const emitStub = sandbox.stub();
      ctrl.ports = {
        pwdDialog: {
          emit: emitStub
        }
      };
      PwdController.__Rewire__('getUserInfo', () => Promise.resolve({userId: '123'}));
      await ctrl.onPwdDialogInit();
      expect(emitStub.withArgs('set-init-data', {userId: '123', keyId: 'ASDF', cache: '123', reason: 'test'}).calledOnce).to.be.true;
    });
  });
});
