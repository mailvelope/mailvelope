import {expect} from 'test';
import {MAIN_KEYRING_ID} from 'lib/constants';
import {setupKeyring, teardownKeyring} from 'Fixtures/keyring';
import {createKeyring, deleteKeyring, getAll, getById, getAllKeyringAttr, getKeyringAttr, setKeyringAttr, getKeyData, getKeyByAddress, getKeyringWithPrivKey, getPreferredKeyring, syncPublicKeys} from 'modules/keyring';

describe('keyring unit tests', () => {
  beforeEach(setupKeyring);
  afterEach(teardownKeyring);

  describe('createKeyring', () => {
    it('should create a new keyring and initialize keyring attributes', async () => {
      const newKeyringId = 'testABC';
      const newKeyring = await createKeyring(newKeyringId);
      expect(newKeyring.id).to.equal(newKeyringId);
      const allKeyrings = await getAll();
      expect(allKeyrings.some(({id}) => id === newKeyringId)).to.be.true;
      const allKeyringAttrs = await getAllKeyringAttr();
      expect(Object.keys(allKeyringAttrs).includes(newKeyringId)).to.be.true;
    });
  });

  // TODO: This test does not test what it claims to do.
  describe('deleteKeyring', () => {
    it('Should delete keyring, all keys and keyring attributes', async () => {
      expect(getById('test123')).to.not.throw;
      return expect(deleteKeyring('test123')).to.eventually.throw;
    });
  });

  describe('getById', () => {
    it('Should get keyring by Id', () => {
      expect(getById('test123')).to.not.throw;
    });
  });

  describe('getAll', () => {
    it('Should get all keyrings', () => {
      expect(getAll().length).to.equal(2);
    });
  });

  describe('getAllKeyringAttr', () => {
    it('Should get all keyring attributes as an object map', () => {
      const allKeyringAttrs = getAllKeyringAttr();
      expect(allKeyringAttrs[MAIN_KEYRING_ID].default_key).to.equal('771f9119b823e06c0de306d466663688a83e9763');
    });
  });

  describe('setKeyringAttr', () => {
    it('Should set keyring attributes', async () => {
      await setKeyringAttr('test123', {
        default_key: '123456789'
      });

      expect(getKeyringAttr('test123', 'default_key')).to.equal('123456789');
    });
  });

  describe('getKeyData', () => {
    it('Should get user id, key id, fingerprint, email and name for all keys in the preferred keyring queue', async () => {
      const keyData = await getKeyData(MAIN_KEYRING_ID);
      expect(keyData.length).to.equal(4);
      expect(keyData.some(({name}) => name === 'Madita Bernstone'));
    });
  });

  describe('getKeyByAddress', () => {
    it('Should query keys in all keyrings by email address', async () => {
      const keysByAddress = await getKeyByAddress('test123', ['gordon.freeman@gmail.com', 'j.doe@gmail.com']);
      expect(keysByAddress['gordon.freeman@gmail.com']).to.not.equal(false);
      expect(keysByAddress['j.doe@gmail.com']).to.equal(false);
    });
  });

  describe('getKeyringWithPrivKey', () => {
    it('Should get keyring that includes at least one private key of the specified key Ids', () => {
      const keyRing = getKeyringWithPrivKey(['db187eb58a88aa05']);
      expect(keyRing.id).to.equal('test123');
    });
  });

  describe('getPreferredKeyring', () => {
    it('Should get preferred keyring', () => {
      const keyRing = getPreferredKeyring();
      expect(keyRing.id).to.equal('test123');
    });
  });

  describe('syncPublicKeys', () => {
    it('Should synchronize public keys across keyrings', async () => {
      await syncPublicKeys({keyringId: 'test123', keyIds: ['887839aaa7d5be4f']});
      const destKeyring = getById('test123');
      const targetKey = await destKeyring.getKeyByAddress('max@mailvelope.com');
      expect(targetKey['max@mailvelope.com']).to.not.be.false;
    });
  });
});
