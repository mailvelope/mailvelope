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
    it('should pass over keyId and userId to dialog', () => {
      prefs.security = {
        password_cache: '123'
      };
      ctrl.options = {
        key: {
          primaryKey: {
            getKeyId() { return {toHex() { return 'asdf'; }}; }
          }
        },
        reason: 'test'
      };
      const emitStub = sandbox.stub();
      ctrl.ports = {
        pwdDialog: {
          emit: emitStub
        }
      };
      PwdController.__Rewire__('getUserId', () => Promise.resolve('123'));
      return ctrl.onPwdDialogInit().then(() => {
        expect(emitStub.withArgs('set-init-data', {userId: '123', keyId: 'ASDF', cache: '123', reason: 'test'}).calledOnce).to.be.true;
      });
    });
  });

  describe.skip('onOk', () => {
    it('should unlock key password', () => {
      const msg = {password: '123', cache: '123'};
      prefs.security = {
        password_cache: '123'
      };
      const unlock = sandbox.stub().returns(Promise.resolve(
        [
          {
            closePopup() { console.log('closing'); },
            resolve() { console.log('resolving'); }
          }
        ]
      ));
      PwdController.__Rewire__('pwdCache', {
        unlock
      });
      ctrl.onOk(msg);
    });
  });
});
