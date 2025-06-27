
import {expect, sinon} from 'test';
import {Port} from 'utils';
import {prefs} from 'modules/prefs';
import MainCsController from 'controller/mainCs.controller';

describe('MainCs controller unit tests', () => {
  const sandbox = sinon.createSandbox();
  let ctrl;
  let port;

  beforeEach(() => {
    port = new Port('dummy-1');
    ctrl = new MainCsController(port);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('Check event handlers', () => {
    it('should handle content ready', () => {
      expect(ctrl._handlers.get('ready')).to.exist;
    });
  });

  describe('updatePrefs', () => {
    it('should should emit set-prefs', () => {
      prefs.general = {'test': 123};
      const emitStub = sandbox.stub(ctrl, 'emit');
      ctrl.updatePrefs();
      expect(emitStub.withArgs('set-prefs', {prefs}).calledOnce).to.be.true;
    });
  });
});
