import {expect} from 'test';
import {LocalStorageStub} from 'utils';
import * as autocryptWrapper from 'modules/autocryptWrapper';
import Autocrypt from 'autocrypt';

describe('Test basic autocrypt wrapper functionality', () => {
  describe('receiving header', () => {
    let storage;

    beforeEach(() => {
      storage = new LocalStorageStub();
      autocryptWrapper.default.__Rewire__('mvelo', {storage});
    });
    it('parses and stores the key', async () => {
      const addr = 'test@mailvelope.com';
      const keydata = 'base64';
      const header = Autocrypt.stringify({keydata, addr});
      const date = Date.now().toString();
      await autocryptWrapper.processHeader(header, addr, date, 'id');
      const result = await autocryptWrapper.lookup(addr, 'id');
      expect(result).to.equal(keydata.replace(/\s+/g, ''));
    });

    afterEach(() => {
      /* eslint-disable-next-line no-undef */
      __rewire_reset_all__();
    });

    it('stores the keys separately per identity', async () => {
      const addr = 'test@mailvelope.com';
      const keydata = 'base64';
      const header = Autocrypt.stringify({keydata, addr});
      const date = Date.now().toString();
      await autocryptWrapper.processHeader(header, addr, date, 'other id');
      const result = await autocryptWrapper.lookup(addr, 'yet another id');
      expect(result).to.be.undefined;
    });
  });
});
