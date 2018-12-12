import {expect, sinon} from 'test';
import * as mveloKeyServer from 'modules/mveloKeyServer';
import keyFixtures from 'Fixtures/keys';

describe('Talking to the Mailvelope Key Server', () => {
  beforeEach(() => {
    sinon.stub(window, 'fetch');
  });

  afterEach(() => {
    window.fetch.restore();
  });

  describe('lookup', () => {
    it('should query for the key by email', () => {
      window.fetch.returns(Promise.resolve({
        status: 404,
        json() { return {}; }
      }));
      return mveloKeyServer.lookup({email: 'test@mailvelope.com'})
      .then(() => {
        expect(window.fetch.args[0][0]).to.equal('https://keys.mailvelope.com/api/v1/key?email=test%40mailvelope.com');
      });
    });

    it('should return key on success', () => {
      window.fetch.returns(Promise.resolve({
        status: 200,
        json() { return {publicKeyArmored: keyFixtures.public.demo}; }
      }));

      return mveloKeyServer.lookup({email: 'test@mailvelope.com'})
      .then(key => {
        expect(key.publicKeyArmored).to.include('PGP PUBLIC KEY BLOCK');
      });
    });

    it('should not return key on 404', () => {
      window.fetch.returns(Promise.resolve({
        status: 404,
        json() { return {}; }
      }));

      return mveloKeyServer.lookup({email: 'asdf@asdf.de'})
      .then(key => {
        expect(key).to.not.exist;
      });
    });
  });

  describe('fetch', () => {
    it('should query for the key by keyId', () => {
      window.fetch.returns(Promise.resolve({
        status: 404,
        json() { return {}; }
      }));
      return mveloKeyServer.fetch({keyId: '0123456789ABCDFE'})
      .then(() => {
        expect(window.fetch.args[0][0]).to.include('/api/v1/key?keyId=0123456789ABCDFE');
      });
    });

    it('should query for the key by fingerprint', () => {
      window.fetch.returns(Promise.resolve({
        status: 404,
        json() { return {}; }
      }));

      return mveloKeyServer.fetch({fingerprint: '0123456789ABCDFE0123456789ABCDFE01234567'})
      .then(() => {
        expect(window.fetch.args[0][0]).to.include('/api/v1/key?fingerprint=0123456789ABCDFE0123456789ABCDFE01234567');
      });
    });

  });

  describe('upload', () => {
    it('should POST to the key url', () => {
      window.fetch.returns(Promise.resolve({
        status: 201
      }));

      return mveloKeyServer.upload({publicKeyArmored: 'KEY BLOCK'})
      .then(() => {
        expect(window.fetch.args[0][1]).to.include({method: 'POST'});
        expect(window.fetch.args[0][0]).to.equal('https://keys.mailvelope.com/api/v1/key');
      });
    });

    it('should raise exception on conflicting key', () => {
      window.fetch.returns(Promise.resolve({
        status: 304,
        statusText: 'Key already exists'
      }));

      return mveloKeyServer.upload({publicKeyArmored: 'KEY BLOCK'})
      .catch(error => {
        expect(error.message).to.include('exists');
      });
    });
  });

  describe('remove', () => {
    it('should trigger DELETE request', () => {
      window.fetch.returns(Promise.resolve({
        status: 200
      }));

      return mveloKeyServer.remove({email: 'test@mailvelope.com'})
      .then(() => {
        expect(window.fetch.args[0][1]).to.include({method: 'DELETE'});
        expect(window.fetch.args[0][0]).to.equal('https://keys.mailvelope.com/api/v1/key?email=test%40mailvelope.com');
      });
    });

    it('should raise exception on 404', () => {
      window.fetch.returns(Promise.resolve({
        status: 404,
        statusText: 'Key not found'
      }));

      return mveloKeyServer.remove({email: 'asdf@asdf.de'})
      .catch(error => {
        expect(error.message).to.match(/not found/);
      });
    });
  });
});
