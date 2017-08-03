'use strict';


import KeyServer from '../../src/modules/keyserver';
var keyServer, mvelo;

describe('Key Server unit tests', () => {

  beforeEach(() => {
    mvelo = {
      util: {
        fetch() {}
      }
    };
    keyServer = new KeyServer(mvelo, 'http://localhost:8888');
    expect(keyServer._baseUrl).to.equal('http://localhost:8888');

    sinon.stub(mvelo.util, 'fetch');
  });

  describe('lookup', () => {
    it('should return key', () => {
      mvelo.util.fetch.returns(Promise.resolve({
        status: 200,
        json() { return {foo: 'bar'}; }
      }));

      return keyServer.lookup({email: 'asdf@asdf.de'})
      .then(key => {
        expect(key.foo).to.equal('bar');
      });
    });

    it('should not return key', () => {
      mvelo.util.fetch.returns(Promise.resolve({
        status: 404,
        json() { return {foo: 'bar'}; }
      }));

      return keyServer.lookup({email: 'asdf@asdf.de'})
      .then(key => {
        expect(key).to.not.exist;
      });
    });
  });

  describe('upload', () => {
    it('should upload a key', () => {
      mvelo.util.fetch.returns(Promise.resolve({
        status: 201
      }));

      return keyServer.upload({publicKeyArmored: 'KEY BLOCK'});
    });

    it('should not upload a key', () => {
      mvelo.util.fetch.returns(Promise.resolve({
        status: 304,
        statusText: 'Key already exists'
      }));

      return keyServer.upload({publicKeyArmored: 'KEY BLOCK'})
      .catch(error => {
        expect(error.message).to.match(/exists/);
      });
    });
  });

  describe('remove', () => {
    it('should remove a key', () => {
      mvelo.util.fetch.returns(Promise.resolve({
        status: 200
      }));

      return keyServer.remove({email: 'asdf@asdf.de'});
    });

    it('should not remove a key', () => {
      mvelo.util.fetch.returns(Promise.resolve({
        status: 404,
        statusText: 'Key not found'
      }));

      return keyServer.remove({email: 'asdf@asdf.de'})
      .catch(error => {
        expect(error.message).to.match(/not found/);
      });
    });
  });

  describe('_url', () => {
    it('should work for email', () => {
      mvelo.util.fetch.returns(Promise.resolve({
        status: 200
      }));

      var url = keyServer._url({email: 'asdf@asdf.de'});
      expect(url).to.equal('http://localhost:8888/api/v1/key?email=asdf%40asdf.de');
    });

    it('should work for key id', () => {
      mvelo.util.fetch.returns(Promise.resolve({
        status: 200
      }));

      var url = keyServer._url({keyId: '0123456789ABCDFE'});
      expect(url).to.equal('http://localhost:8888/api/v1/key?keyId=0123456789ABCDFE');
    });

    it('should work for fingerprint', () => {
      mvelo.util.fetch.returns(Promise.resolve({
        status: 200
      }));

      var url = keyServer._url({fingerprint: '0123456789ABCDFE0123456789ABCDFE01234567'});
      expect(url).to.equal('http://localhost:8888/api/v1/key?fingerprint=0123456789ABCDFE0123456789ABCDFE01234567');
    });
  });

});
