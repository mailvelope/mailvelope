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
      const result = await keyRegistry.locate('email@domain.example');
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
      const result = await keyRegistry.locate('test@mailvelope.com', 'id');
      expect(result.content).to.include('PGP PUBLIC KEY BLOCK');
      expect(result.source).to.be.equal('Mailvelope Key Server');
      expect(result.type).to.be.equal('OPEN_PGP');
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
        mvelo_tofu_lookup: false
      };
      const addr = 'test@mailvelope.com';
      const keydata = 'base64';
      const header = Autocrypt.stringify({keydata, addr});
      await autocryptWrapper.processHeader(header, addr, new Date(), 'id');

      const result = await keyRegistry.locate(addr, 'id');
      expect(result.content).to.include('base64');
      expect(result.source).to.be.equal('Autocrypt');
      expect(result.type).to.be.equal('OPEN_PGP');
    });
  });
});
