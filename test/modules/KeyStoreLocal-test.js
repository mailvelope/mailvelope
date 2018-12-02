import {expect} from 'test';
import {LocalStorageStub} from 'utils';
import KeyStoreLocal from 'modules/KeyStoreLocal';
import testKeys from 'Fixtures/keys';

describe('KeyStoreLocal unit tests', () => {
  let keyStore;

  beforeEach(() => {
    const id = 'test123';
    const storage = new LocalStorageStub();
    storage.importKeys(id, testKeys);
    keyStore = new KeyStoreLocal(id);
    KeyStoreLocal.__Rewire__('mvelo', {
      storage
    });
  });

  afterEach(() => {
    /* eslint-disable-next-line no-undef */
    __rewire_reset_all__();
  });

  describe('load', () => {
    it('should load public and private keys from storage ', () =>
      keyStore.load().then(() => {
        expect(keyStore.publicKeys).not.to.be.undefined;
        expect(keyStore.publicKeys.keys.length).to.be.at.least(2);
        expect(keyStore.publicKeys.keys[1].users[0].userId.userid).to.equal('Madita Bernstein <madita.bernstein@gmail.com>');
        expect(keyStore.privateKeys).not.to.be.undefined;
        expect(keyStore.privateKeys.keys.length).to.be.at.least(2);
        expect(keyStore.privateKeys.keys[1].users[0].userId.userid).to.equal('Madita Bernstein <madita.bernstein@gmail.com>');
      })
    );
  });

  describe('getForAddress (super)', () => {
    it('should get keys matching given email address', () =>
      keyStore.load().then(async() => {
        const result = keyStore.getForAddress('madita.bernstein@gmail.com');
        expect(result.length).to.equal(2);
      })
    );
  });
});
