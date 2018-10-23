import * as mveloKeyServer from '../../src/modules/mveloKeyServer';
import keyFixtures from '../fixtures/keys';

describe('Key Server unit tests', () => {
  beforeEach(() => {
    sinon.stub(window, 'fetch');
  });

  afterEach(() => {
    window.fetch.restore();
  });

  describe('lookup', () => {
    it('should return key', () => {
      window.fetch.returns(Promise.resolve({
        status: 200,
        json() { return {publicKeyArmored: keyFixtures.public.demo}; }
      }));

      return mveloKeyServer.lookup({email: 'test@mailvelope.com'})
      .then(key => {
        expect(key.publicKeyArmored).to.include('PGP PUBLIC KEY BLOCK');
      });
    });

    it('should not return key', () => {
      window.fetch.returns(Promise.resolve({
        status: 404,
        json() { return {foo: 'bar'}; }
      }));

      return mveloKeyServer.lookup({email: 'asdf@asdf.de'})
      .then(key => {
        expect(key).to.not.exist;
      });
    });
  });

  describe('upload', () => {
    it('should upload a key', () => {
      window.fetch.returns(Promise.resolve({
        status: 201
      }));

      return mveloKeyServer.upload({publicKeyArmored: 'KEY BLOCK'});
    });

    it('should not upload a key', () => {
      window.fetch.returns(Promise.resolve({
        status: 304,
        statusText: 'Key already exists'
      }));

      return mveloKeyServer.upload({publicKeyArmored: 'KEY BLOCK'})
      .catch(error => {
        expect(error.message).to.match(/exists/);
      });
    });
  });

  describe('remove', () => {
    it('should remove a key', () => {
      window.fetch.returns(Promise.resolve({
        status: 200
      }));

      return mveloKeyServer.remove({email: 'asdf@asdf.de'});
    });

    it('should not remove a key', () => {
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

  describe('_url', () => {
    it('should work for email', () => {
      window.fetch.returns(Promise.resolve({
        status: 200
      }));

      const url = mveloKeyServer._url({email: 'asdf@asdf.de'});
      expect(url).to.equal('http://localhost:8888/api/v1/key?email=asdf%40asdf.de');
    });

    it('should work for key id', () => {
      window.fetch.returns(Promise.resolve({
        status: 200
      }));

      const url = mveloKeyServer._url({keyId: '0123456789ABCDFE'});
      expect(url).to.equal('http://localhost:8888/api/v1/key?keyId=0123456789ABCDFE');
    });

    it('should work for fingerprint', () => {
      window.fetch.returns(Promise.resolve({
        status: 200
      }));

      const url = mveloKeyServer._url({fingerprint: '0123456789ABCDFE0123456789ABCDFE01234567'});
      expect(url).to.equal('http://localhost:8888/api/v1/key?fingerprint=0123456789ABCDFE0123456789ABCDFE01234567');
    });
  });
});
