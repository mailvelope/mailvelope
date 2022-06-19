import {expect, sinon} from 'test';
import KeyServer from 'app/settings/keyserver';

describe('Key server settings unit tests', () => {
  let keyserver;
  let props;

  beforeEach(() => {
    props = {
      prefs: {
        keyserver: {
          mvelo_tofu_lookup: true,
          wkd_lookup: true,
          autocrypt_lookup: false,
          key_binding: true,
          oks_lookup: true
        }
      }
    };
    keyserver = new KeyServer(props);
  });

  describe('constructor', () => {
    it('should set state', () => {
      expect(keyserver.state).to.eql({
        mvelo_tofu_lookup: true,
        wkd_lookup: true,
        autocrypt_lookup: false,
        key_binding: true,
        oks_lookup: true,
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
});
