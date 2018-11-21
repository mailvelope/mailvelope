
import {expect, sinon} from 'test';
import {Port} from 'utils';
import MenuController from 'controller/menu.controller';

describe('Menu controller unit tests', () => {
  const sandbox = sinon.createSandbox();
  let ctrl;
  let port;

  beforeEach(() => {
    port = new Port('dummy-1');
    ctrl = new MenuController(port);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('Check event handlers', () => {
    it('should handle browser action', () => {
      expect(ctrl._handlers.get('browser-action')).to.exist;
    });
  });

  describe('onBrowserAction', () => {
    it('should open key management app', () => {
      const openAppStub = sandbox.stub(ctrl, 'openApp');
      ctrl.onBrowserAction({action: 'manage-keys'});
      expect(openAppStub.withArgs('/keyring').calledOnce).to.be.true;
    });
  });
});
