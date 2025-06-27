import {expect} from 'test';
import KeyStoreGPG from 'modules/KeyStoreGPG';
import testKeys from 'Fixtures/keys/madita_bernstein_john_doe_gordon_freeman_pub.asc';
import publicTestKey from 'Fixtures/keys/gordon_freeman_pub.asc';

describe('KeyStoreGPG unit tests', () => {
  let keyStore;

  beforeEach(() => {
    keyStore = new KeyStoreGPG();
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
        },
        generateKey() {
          return [{
            getArmor() {
              return publicTestKey;
            }
          }];
        }
      }
    });
  });

  afterEach(() => {
    /* eslint-disable-next-line no-undef */
    __rewire_reset_all__();
  });

  describe('load', () => {
    it('should load public and private keys', async () => {
      await keyStore.load();
      expect(keyStore.publicKeys.keys.length).to.equal(1);
      expect(keyStore.privateKeys.keys.length).to.equal(2);
      expect(keyStore.defaultKeyFpr).to.equal('771f9119b823e06c0de306d466663688a83e9763');
    });
  });

  describe('generateKey', () => {
    it('should Generate a new PGP keypair', async () => {
      const {privateKey} = await keyStore.generateKey({algo: '', userIds: [{name: 'Test', email: 'test@mailvelope.com'}], expires: 0});
      expect(privateKey.isPrivate()).to.be.true;
    });
  });
});
