import {expect, sinon} from 'test';
import {LocalStorageStub} from 'utils';
import * as prefs from 'modules/prefs';
import * as autocryptWrapper from 'modules/autocryptWrapper';
import Autocrypt from 'autocrypt';
import testKeys from 'Fixtures/keys';
import * as keyRegistry from 'modules/keyRegistry';

describe('Looking up keys from different services', () => {
  describe('with all services disabled', () => {
    it('should return an empty result', async () => {
      prefs.prefs.keyserver = {
        wkd_lookup: false,
        mvelo_tofu_lookup: false,
        autocrypt_lookup: false
      };
      const result = await keyRegistry.lookup('email@domain.example');
      expect(result).to.be.undefined;
    });
  });

  describe('with Mailvelope Keyserver returning an result', () => {
    beforeEach(() => {
      sinon.stub(window, 'fetch');
      window.fetch.returns(Promise.resolve({
        status: 200,
        json() { return {publicKeyArmored: testKeys.api_test_pub}; }
      }));
    });

    afterEach(() => {
      window.fetch.restore();
    });

    it('should return that result', async () => {
      prefs.prefs.keyserver = {
        wkd_lookup: true,
        mvelo_tofu_lookup: true,
        autocrypt_lookup: true
      };
      const result = await keyRegistry.lookup('test@mailvelope.com', 'id');
      expect(result.content).to.include('PGP PUBLIC KEY BLOCK');
      expect(result.source).to.be.equal('MKS');
    });
  });

  describe('after processing an autocrypt header', () => {
    let storage;

    beforeEach(() => {
      storage = new LocalStorageStub();
      autocryptWrapper.default.__Rewire__('mvelo', {storage});
    });

    afterEach(() => {
      /* eslint-disable-next-line no-undef */
      __rewire_reset_all__();
    });

    it('should return the key from that header', async () => {
      prefs.prefs.keyserver = {
        wkd_lookup: false,
        mvelo_tofu_lookup: false,
        autocrypt_lookup: true
      };
      const addr = 'test@mailvelope.com';
      const keydata = 'base64';
      const headers = {
        from: addr,
        autocrypt: Autocrypt.stringify({keydata, addr})
      };
      await autocryptWrapper.processHeader(headers, 'id');

      const result = await keyRegistry.lookup(addr, 'id');
      expect(result.content).to.include('base64');
      expect(result.source).to.be.equal('AC');
    });
  });
});
