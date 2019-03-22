import {expect} from 'test';
import {LocalStorageStub} from 'utils';
import * as autocrypt from 'modules/autocryptWrapper';
import {isValidEncryptionKey} from 'modules/key';
import * as openpgp from 'openpgp';
import testKeys from 'Fixtures/keys';

describe('Test basic autocrypt wrapper functionality', () => {
  const keydata = testKeys.api_test_pub.split('\n').slice(2, 17).join();
  const addr = 'test@mailvelope.com';
  const headers = {
    autocrypt: autocrypt.stringify({keydata, addr}),
    from: addr,
    date: Date.now().toString()
  };

  let storage;

  beforeEach(() => {
    storage = new LocalStorageStub();
    autocrypt.default.__Rewire__('mvelo', {storage});
  });

  afterEach(() => {
    /* eslint-disable-next-line no-undef */
    __rewire_reset_all__();
  });

  describe('receiving header', () => {
    it('parses and stores the key', async () => {
      await autocrypt.processHeader(headers, 'id');
      const result = await autocrypt.lookup(addr, 'id');
      const key = openpgp.key.readArmored(result.armored);
      // fixture keys have checksum which autocrypt keys do not.
      expect(result.armored.slice(0, 17)).to.equal(testKeys.api_test_pub.slice(0, 17));
      expect(isValidEncryptionKey(key)).to.eventually.be.true;
    });

    it('rejects headers larger than 10k', async () => {
      const large_keydata = '1234567890'.repeat(1025);
      const large_headers = {
        autocrypt: autocrypt.stringify({keydata: large_keydata, addr}),
        from: addr,
        date: Date.now().toString()
      };
      return expect(autocrypt.processHeader(large_headers, 'id')).to.eventually.be.rejected;
    });

    it('handles from headers with names', async () => {
      const headers_with_name = {
        autocrypt: autocrypt.stringify({keydata, addr}),
        from: `name goes here <${addr}>`,
        date: Date.now().toString()
      };
      await autocrypt.processHeader(headers_with_name, 'id2');
      const result = await autocrypt.lookup(addr, 'id2');
      // fixture keys have checksum which autocrypt keys do not.
      expect(result.armored.slice(0, 17)).to.equal(testKeys.api_test_pub.slice(0, 17));
    });

    it('stores the keys separately per identity', async () => {
      await autocrypt.processHeader(headers, 'other id');
      const result = await autocrypt.lookup(addr, 'yet another id');
      expect(result).to.be.undefined;
    });
  });

  describe('deleting storage', () => {
    it('removes keys from one storage', async () => {
      await autocrypt.processHeader(headers, 'id');
      await autocrypt.processHeader(headers, 'other');
      await autocrypt.deleteIdentities(['id']);
      const result = await autocrypt.lookup(addr, 'id');
      // fixture keys have checksum which autocrypt keys do not.
      expect(result).to.not.exist;
      const other = await autocrypt.lookup(addr, 'other');
      expect(other.armored.slice(0, 17)).to.equal(testKeys.api_test_pub.slice(0, 17));
    });

    it('removes keys from multiple storages', async () => {
      await autocrypt.processHeader(headers, 'id');
      await autocrypt.processHeader(headers, 'other');
      await autocrypt.deleteIdentities(['id', 'other']);
      const result = await autocrypt.lookup(addr, 'id');
      const other = await autocrypt.lookup(addr, 'other');
      expect(result).to.not.exist;
      expect(other).to.not.exist;
    });
  });
});
