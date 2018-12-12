import {expect, sinon} from 'test';
import * as mveloKeyServer from 'modules/mveloKeyServer';
import testKeys from 'Fixtures/keys';

describe('Talking to the Mailvelope Key Server', () => {
  beforeEach(() => {
    sinon.stub(window, 'fetch');
  });

  afterEach(() => {
    window.fetch.restore();
  });

  describe('lookup', () => {
    it('should query for the key by email', async () => {
      window.fetch.returns(Promise.resolve({
        status: 404,
        json() { return {}; }
      }));
      await mveloKeyServer.lookup('test@mailvelope.com');
      expect(window.fetch.args[0][0]).to.equal('https://keys.mailvelope.com/api/v1/key?email=test%40mailvelope.com');
    });

    it('should return key on success', async () => {
      window.fetch.returns(Promise.resolve({
        status: 200,
        json() { return {publicKeyArmored: testKeys.api_test_pub}; }
      }));

      const result = await mveloKeyServer.lookup('test@mailvelope.com');
      expect(Object.keys(result)).to.include('armored');
      expect(result.armored).to.include('PGP PUBLIC KEY BLOCK');
    });

    it('should not return key on 404', async () => {
      window.fetch.returns(Promise.resolve({
        status: 404,
        json() { return {}; }
      }));

      const result = await mveloKeyServer.lookup('asdf@asdf.de');
      expect(result).to.not.exist;
    });
  });

  describe('fetch', () => {
    it('should query for the key by keyId', async () => {
      window.fetch.returns(Promise.resolve({
        status: 404,
        json() { return {}; }
      }));
      await mveloKeyServer.fetch({keyId: '0123456789ABCDFE'});
      expect(window.fetch.args[0][0]).to.include('/api/v1/key?keyId=0123456789ABCDFE');
    });

    it('should query for the key by fingerprint', async () => {
      window.fetch.returns(Promise.resolve({
        status: 404,
        json() { return {}; }
      }));

      await mveloKeyServer.fetch({fingerprint: '0123456789ABCDFE0123456789ABCDFE01234567'});
      expect(window.fetch.args[0][0]).to.include('/api/v1/key?fingerprint=0123456789ABCDFE0123456789ABCDFE01234567');
    });
  });

  describe('upload', () => {
    it('should POST to the key url', async () => {
      window.fetch.returns(Promise.resolve({
        status: 201
      }));

      await mveloKeyServer.upload({publicKeyArmored: 'KEY BLOCK'});
      expect(window.fetch.args[0][1]).to.include({method: 'POST'});
      expect(window.fetch.args[0][0]).to.equal('https://keys.mailvelope.com/api/v1/key');
    });

    it('should raise exception on conflicting key', () => {
      window.fetch.returns(Promise.resolve({
        status: 304,
        statusText: 'Key already exists'
      }));

      return expect(mveloKeyServer.upload({publicKeyArmored: 'KEY BLOCK'})).to.eventually.be.rejectedWith(/exists/);
    });
  });

  describe('remove', () => {
    it('should trigger DELETE request', async () => {
      window.fetch.returns(Promise.resolve({
        status: 200
      }));

      await mveloKeyServer.remove({email: 'test@mailvelope.com'});
      expect(window.fetch.args[0][1]).to.include({method: 'DELETE'});
      expect(window.fetch.args[0][0]).to.equal('https://keys.mailvelope.com/api/v1/key?email=test%40mailvelope.com');
    });

    it('should raise exception on 404', () => {
      window.fetch.returns(Promise.resolve({
        status: 404,
        statusText: 'Key not found'
      }));

      return expect(mveloKeyServer.remove({email: 'asdf@asdf.de'})).to.eventually.be.rejectedWith(/not found/);
    });
  });
});
