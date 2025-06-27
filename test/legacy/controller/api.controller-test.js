
import {expect, sinon} from 'test';
import {setupKeyring, teardownKeyring} from 'Fixtures/keyring';
import {MAIN_KEYRING_ID} from 'lib/constants';
import {readKey} from 'openpgp';
import * as autocrypt from 'modules/autocryptWrapper';
import {mapSubKeys, mapUsers} from 'modules/key';
import {prefs} from 'modules/prefs';
import {Port} from 'utils';
import ApiController from 'controller/api.controller';

describe('Api controller unit tests', () => {
  const sandbox = sinon.createSandbox();
  let ctrl;
  let port;

  beforeEach(() => {
    port = new Port('dummy-1');
    ctrl = new ApiController(port);
  });

  afterEach(() => {
    sandbox.restore();
    /* eslint-disable-next-line no-undef */
    __rewire_reset_all__();
  });

  describe('Check event handlers', () => {
    it('should handle process-autocrypt-header', () => {
      expect(ctrl._handlers.get('process-autocrypt-header')).to.exist;
    });

    it('should handle additional-headers-for-outgoing', () => {
      expect(ctrl._handlers.get('additional-headers-for-outgoing')).to.exist;
    });
  });

  describe('Delegation to autocrypt', function() {
    this.timeout(5000);
    beforeEach(setupKeyring);
    afterEach(teardownKeyring);
    const keyringId = MAIN_KEYRING_ID;

    it('should process headers if enabled', async () => {
      const headers = { };
      const isEnabled = sandbox.stub().returns(true);
      const processHeader = sandbox.stub();
      ApiController.__Rewire__('autocrypt', {
        isEnabled,
        processHeader
      });

      ctrl.processAutocryptHeader({headers, keyringId});
      expect(processHeader.withArgs(headers, keyringId).calledOnce).to.be.true;
    });

    it('should not process headers if disabled', async () => {
      const headers = { };
      const isEnabled = sandbox.stub().returns(false);
      const processHeader = sandbox.stub();
      ApiController.__Rewire__('autocrypt', {
        isEnabled,
        processHeader
      });

      ctrl.processAutocryptHeader({headers, keyringId});
      expect(processHeader.called).to.be.false;
    });

    it('should propose autocrypt header if enabled', async () => {
      prefs.keyserver = {
        autocrypt_lookup: true
      };

      const headers = {from: 'madita@mailvelope.com'};
      const additional = await ctrl.additionalHeadersForOutgoing({keyringId, headers});
      const keydata = autocrypt.parse(additional.autocrypt).keydata;
      const armored = autocrypt.armor(keydata);
      const key = await readKey({armoredKey: armored});
      expect(key).to.be.ok;
      const keyMap = {};
      await mapSubKeys(key.subkeys, keyMap, key);
      const {subkeys: mappedSubkeys} = keyMap;
      expect(mappedSubkeys.length).to.equal(1);
      const userMap = {};
      await mapUsers(key.users, userMap, {}, key);
      const {users: mappedUsers} = userMap;
      expect(mappedUsers.length).to.equal(1);
      expect(mappedUsers[0].userId).to.equal('Madita Bernstone <madita@mailvelope.com>');
    });

    it('should alert if email address is unknown', async () => {
      prefs.keyserver = {
        autocrypt_lookup: true
      };

      const headers = {from: 'missing@mailvelope.com'};
      return expect(ctrl.additionalHeadersForOutgoing({keyringId, headers})).
      to.eventually.be.rejectedWith('No key pair found for this email address.');
    });

    it('should not propose additional headers if disabled', async () => {
      prefs.keyserver = {
        autocrypt_lookup: false
      };

      const headers = {from: 'madita@mailvelope.com'};
      return expect(ctrl.additionalHeadersForOutgoing({keyringId, headers})).
      to.eventually.eql({});
    });
  });
});
