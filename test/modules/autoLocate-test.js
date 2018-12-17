import {expect, sinon} from 'test';
import * as autoLocate from 'modules/autoLocate';
import * as prefs from 'modules/prefs';
import testKeys from 'Fixtures/keys';

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
});
