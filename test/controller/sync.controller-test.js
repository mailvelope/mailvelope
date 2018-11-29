
import {expect} from 'test';
import {Port} from 'utils';
import {SyncController, __RewireAPI__ as SyncRewireAPI} from 'controller/sync.controller';

describe('Sync controller unit tests', () => {
  let ctrl;
  let port;

  beforeEach(() => {
    port = new Port('dummy-1');
    ctrl = new SyncController(port);
  });

  afterEach(() => {
    /* eslint-disable-next-line no-undef */
    __rewire_reset_all__();
  });

  describe('Check event handlers', () => {
    it('should handle init', () => {
      expect(ctrl._handlers.get('init')).to.exist;
    });
  });

  describe('init', () => {
    it('should set keyring ID and get keyring', () => {
      SyncRewireAPI.__Rewire__('getKeyringById', () => 'keyring');
      ctrl.init('123');
      expect(ctrl.keyringId).to.equal('123');
      expect(ctrl.keyring).to.equal('keyring');
    });
  });
});
