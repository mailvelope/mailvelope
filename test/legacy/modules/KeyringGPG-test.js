import {expect, sinon} from 'test';
import {GNUPG_KEYRING_ID} from 'lib/constants';
/* eslint-disable-next-line no-unused-vars */
import {init} from 'modules/keyring'; // imported to circumvent circular dependency
import KeyringGPG from 'modules/KeyringGPG';
import KeyStoreGPG from 'modules/KeyStoreGPG';
import testKeys from 'Fixtures/keys/madita_bernstein_john_doe_gordon_freeman_pub.asc';

describe('KeyringGPG unit tests', () => {
  const sandbox = sinon.createSandbox();
  const keyringId = GNUPG_KEYRING_ID;
  let keyRing;
  let keyStore;

  beforeEach(async () => {
    KeyStoreGPG.__Rewire__('gpgme', {
      Keyring: {
        getKeysArmored() {
          return {
            secret_fprs: ['771f9119b823e06c0de306d466663688a83e9763', '2cf63f4b3b4a51e446252247db187eb58a88aa05'],
            armored: testKeys
          };
        },
        getDefaultKey() {
          return {fingerprint: '771f9119b823e06c0de306d466663688a83e9763'};
        }
      }
    });
    keyStore = new KeyStoreGPG(keyringId);
    await keyStore.load();
    keyRing = new KeyringGPG(keyringId, keyStore);
  });

  afterEach(() => {
    sandbox.restore();
    /* eslint-disable-next-line no-undef */
    __rewire_reset_all__();
  });

  describe('getDefaultKey', () => {
    it('should get default key', async () => {
      const defaultKey = await keyRing.getDefaultKey();
      expect(defaultKey.getFingerprint()).to.equal('771f9119b823e06c0de306d466663688a83e9763');
    });
  });

  describe('importKeys', () => {
    let addPublicKeysSpy;
    let considered;

    beforeEach(() => {
      considered = 1;
      keyStore.importKeys = () => {
        const keyStub = {
          fingerprint: 'test123',
          get() {
            return [{get() {
              return 'uid321';
            }}];
          }
        };
        return {Keys: [{key: keyStub, status: 'newkey'}], summary: {considered}};
      };
      addPublicKeysSpy = sandbox.stub(keyStore, 'addPublicKeys').returns(Promise.resolve());
    });

    it('should import key from armored', async () => {
      const result = await keyRing.importKeys([{armored: 'test321', type: ''}]);
      expect(result[0]).to.deep.equal({type: 'success', message: 'key_import_public_success'});
      expect(addPublicKeysSpy.withArgs(['test123']).calledOnce).to.be.true;
    });
    it('should show error in result', async () => {
      considered = 2;
      const result = await keyRing.importKeys([{armored: 'test321', type: ''}]);
      expect(result[0]).to.deep.equal({type: 'success', message: 'key_import_public_success'});
      expect(result[1]).to.deep.equal({type: 'error', message: 'key_import_number_of_failed'});
      expect(addPublicKeysSpy.withArgs(['test123']).calledOnce).to.be.true;
    });
    it('should throw error', () => {
      considered = 0;
      return expect(keyRing.importKeys([{armored: 'test321', type: ''}])).to.eventually.be.rejectedWith('GnuPG aborted key import, possible parsing error.');
    });
  });
});
