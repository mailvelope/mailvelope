import {expect} from 'test';
import * as autocryptWrapper from 'modules/autocryptWrapper';
import Autocrypt from 'autocrypt';

describe('Test basic autocrypt wrapper functionality', () => {
  describe('receiving header', () => {
    it('parses and stores the key', async () => {
      const addr = 'test@mailvelope.com';
      const keydata = 'base64';
      const header = Autocrypt.stringify({keydata, addr});
      await autocryptWrapper.processHeader(header, addr, new Date());
      const result = await autocryptWrapper.lookup(addr);
      expect(result).to.equal(keydata.replace(/\s+/g, ''));
    });
  });
});
