import {expect} from 'test';
import Autocrypt from 'autocrypt';

describe('Test basic autocrypt functionality', () => {
  describe('receiving header', () => {
    it('parses and stores the key', () => {
      const addr = 'test@mailvelope.com';
      const keydata = 'base64';
      const header = Autocrypt.stringify({keydata, addr});
      const storage = {};
      storage.put = function(key, val, cb) {
        storage[key] = val;
        if (cb) {
          cb();
        }
      };
      storage.get = function(key, cb) {
        if (cb) {
          cb(undefined, storage[key]);
        }
      };
      const autocrypt = new Autocrypt({storage});
      autocrypt.processAutocryptHeader(header, addr, new Date(), () => {
        autocrypt.storage.get(addr, (_err, record) => {
          expect(record.keydata).to.equal(keydata);
        });
      });
    });
  });
});
