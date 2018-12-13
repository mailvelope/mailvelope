import {expect, sinon} from 'test';
import KeyServer from 'app/settings/keyserver';

describe('Key server settings unit tests', () => {
  let keyserver;
  let props;

  beforeEach(() => {
    props = {
      prefs: {
        keyserver: {
          hkp_base_url: 'https://keyserver.ubuntu.com',
          hkp_server_list: [
            'https://keyserver.ubuntu.com',
            'https://keys.mailvelope.com'
          ],
          mvelo_tofu_lookup: true,
          wkd_lookup: true,
          autocrypt_lookup: true,
        }
      }
    };
    keyserver = new KeyServer(props);
  });

  describe('constructor', () => {
    it('should set state', () => {
      expect(keyserver.state).to.eql({
        hkp_base_url: 'https://keyserver.ubuntu.com',
        valid_base_url: true,
        hkp_server_list: [
          {value: 'https://keyserver.ubuntu.com', label: 'https://keyserver.ubuntu.com'},
          {value: 'https://keys.mailvelope.com', label: 'https://keys.mailvelope.com'}
        ],
        mvelo_tofu_lookup: true,
        wkd_lookup: true,
        autocrypt_lookup: true,
        alert: null,
        modified: false,
        previousPrefs: props.prefs
      });
    });
  });

  describe('handleCheck', () => {
    it('should set state', () => {
      sinon.stub(keyserver, 'setState');
      keyserver.handleCheck({target: {name: 'test', checked: true}});
      expect(keyserver.setState.withArgs({test: true, modified: true}).calledOnce).to.be.true;
    });
  });

  describe('handleServerChange', () => {
    it('should set state', () => {
      sinon.stub(keyserver, 'setState');
      keyserver.handleServerChange({value: 'https://keyserver.ubuntu.com'});
      expect(keyserver.setState.withArgs({
        hkp_base_url: 'https://keyserver.ubuntu.com',
        modified: true,
        valid_base_url: true,
        alert: null
      }).calledOnce).to.be.true;
    });
  });

  describe('validateUrl', () => {
    it('should fail for empty string', () => {
      expect(keyserver.validateUrl('')).to.be.false;
    });

    it('should fail for undefined', () => {
      expect(keyserver.validateUrl()).to.be.false;
    });

    it('should fail for hkp://', () => {
      expect(keyserver.validateUrl('hkp://keyserver.ubuntu.com')).to.be.false;
    });

    it('should fail for url with trailing slash', () => {
      expect(keyserver.validateUrl('http://keyserver.ubuntu.com/')).to.be.false;
    });

    it('should fail for url with not just hostname', () => {
      expect(keyserver.validateUrl('http://keyserver.ubuntu.com/asdf/')).to.be.false;
    });

    it('should work for http://', () => {
      expect(keyserver.validateUrl('http://keyserver.ubuntu.com')).to.be.true;
    });

    it('should work for https://', () => {
      expect(keyserver.validateUrl('https://keyserver.ubuntu.com')).to.be.true;
    });

    it('should work for ports', () => {
      expect(keyserver.validateUrl('https://keyserver.ubuntu.com:1711')).to.be.true;
    });
  });

  describe('testUrl', () => {
    const hkpUrl = 'https://keyserver.ubuntu.com';

    beforeEach(() => {
      sinon.stub(window, 'fetch');
    });

    afterEach(() => {
      window.fetch.restore();
    });

    it('should fail for 404', () => {
      window.fetch.returns(Promise.resolve({ok: false}));
      return expect(keyserver.testUrl(hkpUrl)).to.eventually.be.rejectedWith(/not reachable/);
    });

    it('should work for 200', () => {
      window.fetch.returns(Promise.resolve({ok: true}));

      return keyserver.testUrl(hkpUrl);
    });
  });
});
