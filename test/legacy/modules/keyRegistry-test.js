import {expect, sinon} from 'test';
import {LocalStorageStub} from 'utils';
import * as prefs from 'modules/prefs';
import * as autocrypt from 'modules/autocryptWrapper';
import testKeys from 'Fixtures/keys';
import {testAutocryptHeaders} from 'Fixtures/headers';
import * as keyRegistry from 'modules/keyRegistry';

describe('Looking up keys from different services', () => {
  describe('with all services disabled', () => {
    it('should return an empty result', async () => {
      prefs.prefs.keyserver = {
        wkd_lookup: false,
        mvelo_tofu_lookup: false,
        autocrypt_lookup: false,
        oks_lookup: false
      };
      const result = await keyRegistry.lookup({email: 'email@domain.example'});
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
        autocrypt_lookup: true,
        oks_lookup: true
      };
      const result = await keyRegistry.lookup({query: {email: 'test@mailvelope.com'}, identity: 'id'});
      expect(result.armored).to.include('PGP PUBLIC KEY BLOCK');
      expect(result.source).to.equal('MKS');
      expect(result.fingerprint).to.equal('add0c44ae80a572f3805729cf47328454fa3ab54');
    });
  });

  describe('after processing an autocrypt header', () => {
    let storage;

    beforeEach(() => {
      storage = new LocalStorageStub();
      autocrypt.default.__Rewire__('mvelo', {storage});
    });

    afterEach(() => {
      /* eslint-disable-next-line no-undef */
      __rewire_reset_all__();
    });

    it('should return the key from that header', async () => {
      prefs.prefs.keyserver = {
        wkd_lookup: false,
        mvelo_tofu_lookup: false,
        autocrypt_lookup: true,
        oks_lookup: false
      };
      await autocrypt.processHeader(testAutocryptHeaders, 'id');
      const result = await keyRegistry.lookup({query: {email: testAutocryptHeaders.from}, identity: 'id'});
      expect(result.armored).to.include('-----BEGIN PGP PUBLIC KEY BLOCK-----');
      expect(result.source).to.be.equal('AC');
      expect(result.fingerprint).to.equal('add0c44ae80a572f3805729cf47328454fa3ab54');
    });
  });

  describe('with one strategy returning an invalid result', () => {
    let storage;

    beforeEach(() => {
      storage = new LocalStorageStub();
      autocrypt.default.__Rewire__('mvelo', {storage});
    });

    afterEach(() => {
      /* eslint-disable-next-line no-undef */
      __rewire_reset_all__();
    });

    beforeEach(() => {
      sinon.stub(window, 'fetch');
      window.fetch.returns(Promise.resolve({
        status: 200,
        json() { return {publicKeyArmored: 'invalid'}; }
      }));
    });

    afterEach(() => {
      window.fetch.restore();
    });

    it('should continue with other strategies', async () => {
      prefs.prefs.keyserver = {
        wkd_lookup: false,
        mvelo_tofu_lookup: true,
        autocrypt_lookup: true,
        oks_lookup: true
      };
      await autocrypt.processHeader(testAutocryptHeaders, 'id');
      const result = await keyRegistry.lookup({query: {email: testAutocryptHeaders.from}, identity: 'id'});
      expect(result.armored).to.include('-----BEGIN PGP PUBLIC KEY BLOCK-----');
      expect(result.source).to.be.equal('AC');
      expect(result.fingerprint).to.equal('add0c44ae80a572f3805729cf47328454fa3ab54');
    });
  });
});
