import {LocalStorageStub} from 'utils';
import {MAIN_KEYRING_ID} from 'lib/constants';
import KeyStoreLocal from 'modules/KeyStoreLocal';
import testKeys from 'Fixtures/keys';
import {init, __RewireAPI__ as keyringRewireAPI} from 'modules/keyring';

export async function setupKeyring() {
  const keyringIds = [MAIN_KEYRING_ID, 'test123'];
  let keyringAttributes;
  const storage = new LocalStorageStub();
  for (const keyringId of keyringIds) {
    let storedTestKeys;
    if (keyringId === MAIN_KEYRING_ID) {
      storedTestKeys = {public: [testKeys.maxp_pub], private: [testKeys.maditab_prv]};
      keyringAttributes = {
        default_key: '771f9119b823e06c0de306d466663688a83e9763'
      };
    } else {
      storedTestKeys = {public: [testKeys.gordonf_pub], private: [testKeys.johnd_prv]};
      keyringAttributes = {};
    }
    await storage.importKeys(keyringId, storedTestKeys);
    await storage.importAttributes(keyringId, keyringAttributes);
  }
  KeyStoreLocal.__Rewire__('mvelo', {
    storage
  });
  keyringRewireAPI.__Rewire__('mvelo', {
    storage
  });
  await init();
}

export function teardownKeyring() {
  /* eslint-disable-next-line no-undef */
  __rewire_reset_all__();
}
