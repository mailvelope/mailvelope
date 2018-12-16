import {expect} from 'test';
import {LocalStorageStub} from 'utils';
import {init as initKeyringAttrMap, getById as getKeryingById, getKeyringAttr, __RewireAPI__ as keyringRewireAPI} from 'modules/keyring';
import KeyStoreLocal from 'modules/KeyStoreLocal';
import {INSERT, DELETE, UPDATE} from 'modules/keyringSync';
import testKeys from 'Fixtures/keys';

describe('keyringSync unit tests', () => {
  const keyringId = 'test123';
  let storage;
  let sync;

  beforeEach(async () => {
    const keyringAttributes = {
      default_key: '771f9119b823e06c0de306d466663688a83e9763'
    };
    storage = new LocalStorageStub();
    await storage.importKeys(keyringId, {public: [testKeys.api_test_pub, testKeys.maditab_pub], private: [testKeys.api_test_prv, testKeys.maditab_prv]});
    await storage.importAttributes(keyringId, keyringAttributes);
    KeyStoreLocal.__Rewire__('mvelo', {
      storage
    });
    keyringRewireAPI.__Rewire__('mvelo', {
      storage
    });
    await initKeyringAttrMap();
    const keyRing = getKeryingById(keyringId);
    sync = keyRing.sync;
  });

  afterEach(() => {
    /* eslint-disable-next-line no-undef */
    __rewire_reset_all__();
  });

  describe('activate', () => {
    it('should add sync data to keyring attributes', () => {
      expect(storage.storage.get('mvelo.keyring.attributes').test123.sync_data).to.be.undefined;
      sync.activate();
      const compareData = {
        eTag: '',
        changeLog: {},
        modified: false
      };
      expect(getKeyringAttr(keyringId).sync_data).to.deep.equal(compareData);
      expect(storage.storage.get('mvelo.keyring.attributes').test123.sync_data).to.deep.equal(compareData);
    });
  });

  describe('add', () => {
    it('should set sync data', () => {
      sync.activate();
      sync.add('1234567891234567891234567891234567891234', INSERT);
      expect(sync.data.modified).to.be.true;
      expect(sync.data.changeLog).to.have.property('1234567891234567891234567891234567891234');
      expect(sync.data.changeLog['1234567891234567891234567891234567891234']).to.have.property('type', INSERT);
    });
  });

  describe('save', () => {
    it('should set sync data', async () => {
      expect(storage.storage.get('mvelo.keyring.attributes').test123.sync_data).to.be.undefined;
      sync.data = {test: 'abc'};
      await sync.save();
      expect(storage.storage.get('mvelo.keyring.attributes').test123.sync_data).to.have.property('test', 'abc');
    });
  });

  describe('merge', () => {
    it('should merge sync data', () => {
      sync.activate();
      sync.add('1234567891234567891234567891234567891234', INSERT);
      sync.merge({
        '1234567891234567891234567891234567891234': {
          type: UPDATE,
          time: 1544047791
        },
        '9876543219876543219876543219876543219876': {
          type: INSERT,
          time: 1544048000
        }
      });
      expect(sync.data.changeLog['1234567891234567891234567891234567891234']).to.have.property('type', INSERT);
      expect(sync.data.changeLog['9876543219876543219876543219876543219876']).to.have.property('type', INSERT);
      expect(sync.data.changeLog['9876543219876543219876543219876543219876']).to.have.property('time', 1544048000);
    });
  });

  describe('getDeleteEntries', () => {
    it('should get deleted entries from sync data', () => {
      sync.activate();
      sync.add('1234567891234567891234567891234567891234', DELETE);
      sync.add('9876543219876543219876543219876543219876', DELETE);
      expect(sync.getDeleteEntries()).to.deep.equal(['1234567891234567891234567891234567891234', '9876543219876543219876543219876543219876']);
    });
  });
});
