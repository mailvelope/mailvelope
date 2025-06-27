
import {expect, sinon} from 'test';
import {Port} from 'utils';
import ImportController from 'controller/import.controller';

describe('Import controller unit tests', () => {
  const sandbox = sinon.createSandbox();
  let ctrl;
  let port;

  beforeEach(() => {
    port = new Port('dummy-1');
    ctrl = new ImportController(port);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('Check event handlers', () => {
    it('should handle key import dialog ok', () => {
      expect(ctrl._handlers.get('key-import-dialog-ok')).to.exist;
    });
  });

  describe('onImportOk', () => {
    it('should close popup window on successful key import', async () => {
      ctrl.keyring = {
        importKeys() {
          return Promise.resolve([{type: 'public'}]);
        }
      };
      ctrl.popupPromise = {
        resolve(msg) {
          expect(msg).to.equal('IMPORTED');
        }
      };
      const closePopupSpy = sandbox.spy(ctrl, 'closePopup');
      await ctrl.onImportOk();
      expect(closePopupSpy.calledOnce).to.be.true;
    });
  });
});
