import {expect, sinon} from 'test';
import * as prefs from 'modules/prefs';
import * as autocryptWrapper from 'modules/autocryptWrapper';
import Autocrypt from 'autocrypt';
import testKeys from 'Fixtures/keys';
import * as autoLocate from 'modules/autoLocate';

describe('Looking up keys from different services', () => {
  describe('with all services disabled', () => {
    it('should return an empty result', async () => {
      prefs.prefs.keyserver = {
        wkd_lookup: false,
        mvelo_tofu_lookup: false
      };
      expect(autoLocate.isWKDEnabled()).to.be.false;
      expect(autoLocate.isMveloKeyServerEnabled()).to.be.false;
      const key = await autoLocate.locate({});
      expect(key).to.be.undefined;
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

    it('should not try the other services', async () => {
      prefs.prefs.keyserver = {
        wkd_lookup: true,
        mvelo_tofu_lookup: true
      };
      expect(autoLocate.isWKDEnabled()).to.be.true;
      expect(autoLocate.isMveloKeyServerEnabled()).to.be.true;
      const key = await autoLocate.locate({email: 'test@mailvelope.com'});
      expect(key).to.include('PGP PUBLIC KEY BLOCK');
    });
  });

  describe('after processing an autocrypt header', () => {
    it('should return the key from that header', async () => {
      prefs.prefs.keyserver = {
        wkd_lookup: false,
        mvelo_tofu_lookup: false
      };
      const addr = 'test@mailvelope.com';
      const keydata = 'base64';
      const header = Autocrypt.stringify({keydata, addr});
      await autocryptWrapper.processHeader(header, addr, new Date());

      expect(autoLocate.isWKDEnabled()).to.be.false;
      expect(autoLocate.isMveloKeyServerEnabled()).to.be.false;
      const key = await autoLocate.locate({email: addr});
      expect(key).to.include('base64');
    });
  });
});