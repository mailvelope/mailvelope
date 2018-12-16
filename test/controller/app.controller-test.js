
import {expect, sinon} from 'test';
import {Port} from 'utils';
import AppController from 'controller/app.controller';

describe('App controller unit tests', () => {
  const sandbox = sinon.createSandbox();
  let ctrl;
  let port;

  beforeEach(() => {
    port = new Port('dummy-1');
    ctrl = new AppController(port);
  });

  afterEach(() => {
    sandbox.restore();
    /* eslint-disable-next-line no-undef */
    __rewire_reset_all__();
  });

  describe('Check event handlers', () => {
    it('should handle set preferences', () => {
      expect(ctrl._handlers.get('set-prefs')).to.exist;
    });
  });

  describe('updatePreferences', () => {
    it('should update preferences', async () => {
      const prefUpdate = {
        general: {
          auto_sign_msg: false
        }
      };
      const update = sandbox.stub().returns(Promise.resolve());
      AppController.__Rewire__('prefs', {
        update
      });

      await ctrl.updatePreferences({prefs: prefUpdate});
      expect(update.withArgs(prefUpdate).calledOnce).to.be.true;
    });
  });
});
