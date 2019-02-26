import {expect} from 'test';
import {LocalStorageStub} from 'utils';
import * as autocryptWrapper from 'modules/autocryptWrapper';
import Autocrypt from 'autocrypt';
import testKeys from 'Fixtures/keys';

describe('Test basic autocrypt wrapper functionality', () => {
  describe('receiving header', () => {
    let storage;
    const base64 = testKeys.api_test_pub.split('\n').slice(2, 17).join();

    beforeEach(() => {
      storage = new LocalStorageStub();
      autocryptWrapper.default.__Rewire__('mvelo', {storage});
    });

    afterEach(() => {
      /* eslint-disable-next-line no-undef */
      __rewire_reset_all__();
    });

    it('parses and stores the key', async () => {
      const addr = 'test@mailvelope.com';
      const keydata = base64;
      const headers = {
        autocrypt: Autocrypt.stringify({keydata, addr}),
        from: addr,
        date: Date.now().toString()
      };
      await autocryptWrapper.processHeader(headers, 'id');
      const result = await autocryptWrapper.lookup(addr, 'id');
      // fixture keys have checksum which autocrypt keys do not.
      expect(result.armored.slice(0, 17)).to.equal(testKeys.api_test_pub.slice(0, 17));
    });

    it('rejects headers larger than 8k', async () => {
      const addr = 'test@mailvelope.com';
      const keydata = '1234567890'.repeat(1025);
      const headers = {
        autocrypt: Autocrypt.stringify({keydata, addr}),
        from: addr,
        date: Date.now().toString()
      };
      return expect(autocryptWrapper.processHeader(headers, 'id')).to.eventually.be.rejected;
    });

    it('handles from headers with names', async () => {
      const addr = 'test@mailvelope.com';
      const keydata = base64;
      const headers = {
        autocrypt: Autocrypt.stringify({keydata, addr}),
        from: `name goes here <${addr}>`,
        date: Date.now().toString()
      };
      await autocryptWrapper.processHeader(headers, 'id2');
      const result = await autocryptWrapper.lookup(addr, 'id2');
      // fixture keys have checksum which autocrypt keys do not.
      expect(result.armored.slice(0, 17)).to.equal(testKeys.api_test_pub.slice(0, 17));
    });

    it('stores the keys separately per identity', async () => {
      const addr = 'test@mailvelope.com';
      const keydata = base64;
      const headers = {
        autocrypt: Autocrypt.stringify({keydata, addr}),
        from: addr,
        date: Date.now().toString()
      };
      await autocryptWrapper.processHeader(headers, 'other id');
      const result = await autocryptWrapper.lookup(addr, 'yet another id');
      expect(result).to.be.undefined;
    });
  });
});
