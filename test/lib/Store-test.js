import {expect} from 'test';
import Store from 'lib/Store';


describe('Test basic store functionality', () => {
  it('returns undefined for new key', () => {
    const store = new Store('id');
    store.get('key that does not exist', val => {
      expect(val).to.be.undefined;
    });
  });

  it('stores and returns a value', () => {
    const store = new Store('id');
    const value = 'test me now';
    store.put('key', value, () => {
      store.get('key', (err, val) => {
        expect(val).to.equal(value);
      });
    });
  });
});
