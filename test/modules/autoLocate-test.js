import {expect, sinon} from 'test';
import * as autoLocate from 'modules/autoLocate';
import * as prefs from 'modules/prefs';
import keyFixtures from 'Fixtures/keys';

describe('Looking up keys from different services', () => {
  describe('with all services disabled', () => {
    it('should return an empty result', () => {
      prefs.prefs.keyserver = {
        wkd_lookup: false,
        mvelo_tofu_lookup: false
      };
      expect(autoLocate.isWKDEnabled()).to.be.false;
      expect(autoLocate.isMveloKeyServerEnabled()).to.be.false;
      return autoLocate.locate({}).then(ret => {
        expect(ret).to.be.undefined;
      });
    });
  });

  describe('with Mailvelope Keyserver returning an result', () => {
    beforeEach(() => {
      sinon.stub(window, 'fetch');
      window.fetch.returns(Promise.resolve({
        status: 200,
        json() { return {publicKeyArmored: keyFixtures.public.demo}; }
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
