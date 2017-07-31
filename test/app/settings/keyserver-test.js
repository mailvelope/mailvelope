
import KeyServer from '../../../src/app/settings/keyserver';


describe('Key server settings unit tests', function() {

  var keyserver;

  beforeEach(() => {
    const props = {
      prefs: {
        keyserver: {
          hkp_base_url: 'https://keyserver.ubuntu.com',
          hkp_server_list: [
            'https://keyserver.ubuntu.com',
            'https://keys.mailvelope.com'
          ],
          mvelo_tofu_lookup: true
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
        alert: null,
        modified: false
      });
    });
  });

  describe('handleCheck', () => {
    it('should set state', () => {
      sinon.stub(keyserver, 'setState')
      keyserver.handleCheck({target: {name: 'test', checked: true}});
      expect(keyserver.setState.withArgs({test: true, modified: true}).calledOnce).to.be.true
    });
  });

  describe('handleServerChange', () => {
    it('should set state', () => {
      sinon.stub(keyserver, 'setState')
      keyserver.handleServerChange({value: 'https://keyserver.ubuntu.com'});
      expect(keyserver.setState.withArgs({
        hkp_base_url: 'https://keyserver.ubuntu.com',
        modified: true,
        valid_base_url: true,
        alert: null
      }).calledOnce).to.be.true
    });
  });

  describe('validateUrl', function() {
    it('should fail for empty string', function() {
      expect(keyserver.validateUrl('')).to.be.false;
    });

    it('should fail for undefined', function() {
      expect(keyserver.validateUrl()).to.be.false;
    });

    it('should fail for hkp://', function() {
      expect(keyserver.validateUrl('hkp://keyserver.ubuntu.com')).to.be.false;
    });

    it('should fail for url with trailing slash', function() {
      expect(keyserver.validateUrl('http://keyserver.ubuntu.com/')).to.be.false;
    });

    it('should fail for url with not just hostname', function() {
      expect(keyserver.validateUrl('http://keyserver.ubuntu.com/asdf/')).to.be.false;
    });

    it('should work for http://', function() {
      expect(keyserver.validateUrl('http://keyserver.ubuntu.com')).to.be.true;
    });

    it('should work for https://', function() {
      expect(keyserver.validateUrl('https://keyserver.ubuntu.com')).to.be.true;
    });

    it('should work for ports', function() {
      expect(keyserver.validateUrl('https://keyserver.ubuntu.com:1711')).to.be.true;
    });
  });

  describe('testUrl', function() {

    const hkpUrl = 'https://keyserver.ubuntu.com';

    beforeEach(function() {
      sinon.stub(window, 'fetch');
    });

    afterEach(function() {
      window.fetch.restore();
    });

    it('should fail for 404', function() {
      window.fetch.returns(Promise.resolve({ok: false}));

      return keyserver.testUrl(hkpUrl).catch(function(err) {
        expect(err.message).match(/not reachable/);
      });
    });

    it('should work for 200', function() {
      window.fetch.returns(Promise.resolve({ok: true}));

      return keyserver.testUrl(hkpUrl);
    });
  });

});
