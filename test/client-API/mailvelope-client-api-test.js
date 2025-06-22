import {LocalStorageStub} from '../__mocks__/localStorage';
import mvelo from 'lib/lib-mvelo';
import {init as initModel} from 'modules/pgpModel';
import {init as initKeyring} from 'modules/keyring';
import {initController} from 'controller/main.controller';
import {setWatchList, prefs} from 'modules/prefs';
import {testAutocryptHeaders} from '../fixtures/headers';
import {init as initClientAPI} from 'client-API/client-api';
import {init as initClientAPIContentScript} from 'content-scripts/clientAPI';

/* global mailvelope */
describe('Mailvelope Client API', () => {
  beforeAll(async () => {
    mvelo.storage = new LocalStorageStub();
    await setWatchList([{
      'active': true,
      'site': 'Mailvelope Test',
      'https_only': false,
      'frames': [
        {
          'scan': true,
          'frame': 'localhost',
          'api': true
        }
      ]
    }]);
    initController();
    await initModel();
    initClientAPI();
    initClientAPIContentScript();
  });

  beforeEach(async () => {
    mvelo.storage = new LocalStorageStub();
    await initKeyring();
  });

  describe('Handling keyrings', () => {
    it('can create a keyring', async () => {
      const keyring = await mailvelope.createKeyring('email@test.example');
      expect(keyring).toBeTruthy();
    });

    it('rejects getting keyring if there is none', async () => {
      await expect(mailvelope.getKeyring('email@test.example')).rejects.toThrow();
    });

    it('rejects creating duplicate keyring', async () => {
      await mailvelope.createKeyring('existing@test.example');
      await expect(mailvelope.createKeyring('existing@test.example')).rejects.toThrow();
    });

    it('can get a keyring', async () => {
      const existing_keyring = await mailvelope.createKeyring('existing@test.example');
      const retrieved_keyring = await mailvelope.getKeyring('existing@test.example');
      expect(retrieved_keyring).toBe(existing_keyring);
    });

    it('rejects getting keyring with wrong handle', async () => {
      await mailvelope.createKeyring('existing@test.example');
      await expect(mailvelope.getKeyring('email@test.example')).rejects.toThrow();
    });
  });

  describe('Processing autocrypt', () => {
    let keyring;

    beforeEach(async () => {
      keyring = await mailvelope.createKeyring('email@test.example');
    });

    it('processes Autocrypt header, stores key, and makes it available', async () => {
      prefs.keyserver = {
        autocrypt_lookup: true
      };
      const addr = testAutocryptHeaders.from;
      await keyring.processAutocryptHeader(testAutocryptHeaders);
      const result = await keyring.validKeyForAddress([addr]);
      const {keys: [{source}]} = result[addr];
      expect(source).toBe('AC');
    });
  });
});
