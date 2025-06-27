import {expect} from 'test';
import {LocalStorageStub} from 'utils';
import {Store} from 'modules/autocryptWrapper';
import * as autocryptWrapper from 'modules/autocryptWrapper';

describe('Test basic store functionality', () => {
  let storage;

  beforeEach(() => {
    storage = new LocalStorageStub();
    autocryptWrapper.default.__Rewire__('mvelo', {storage});
  });

  afterEach(() => {
    /* eslint-disable-next-line no-undef */
    __rewire_reset_all__();
  });

  it('returns undefined for new key', () => {
    const store = new Store('id');
    store.get('key that does not exist', (err, val) => {
      expect(err).to.be.undefined;
      expect(val).to.be.undefined;
    });
  });

  it('stores and returns a value', done => {
    const store = new Store('id');
    const value = 'test me now';
    store.put('key', value, err => {
      expect(err).to.be.undefined;
      store.get('key', (err, val) => {
        expect(err).to.be.undefined;
        expect(val).to.equal(value);
        done();
      });
    });
  });

  it('stores the value in local store', async () => {
    const store = new Store('id');
    const value = 'test me now';
    await new Promise((resolve, reject) => store.put('key', value, err => {
      if (err) { reject(err); } else { resolve(); }
    }));
    expect(store.storageKey).to.equal('id');
    return expect(storage.get('id')).to.eventually.have.property('key', value);
  });

  it('fetches the value from local store', async () => {
    const value = 'test me now';
    await storage.set('id', {key: value});
    const store = new Store('id');
    await store.init();
    const query = new Promise((resolve, reject) => {
      store.get('key', (err, val) => {
        if (err) { reject(err); } else { resolve(val); }
      });
    });
    return expect(query).to.eventually.equal(value);
  });
});
