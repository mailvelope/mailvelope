import {expect} from 'test';
import {LocalStorageStub} from 'utils';
import mvelo from 'lib/lib-mvelo';
import {init as initKeyring} from 'modules/keyring';
import {initController} from 'controller/main.controller';
import {setWatchList} from 'modules/prefs';
import {prefs} from 'modules/prefs';
import {testAutocryptHeaders} from 'Fixtures/headers';

/* global mailvelope */
describe('Mailvelope Client API', () => {
  before(async () => {
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
  });

  beforeEach(async () => {
    mvelo.storage = new LocalStorageStub();
    await initKeyring();
  });

  describe('Handling keyrings', function() {
    this.timeout(10000);
    it.skip('can create a keyring', () =>
      expect(mailvelope.createKeyring('email@test.example')).to.eventually.be.ok);

    it.skip('rejects getting keyring if there is none', () =>
      expect(mailvelope.getKeyring('email@test.example')).to.be.rejected);

    it.skip('rejects creating duplicate keyring', async () => {
      await mailvelope.createKeyring('existing@test.example');
      return expect(mailvelope.createKeyring('existing@test.example')).to.eventually.be.rejected;
    });

    it.skip('can get a keyring', async () => {
      const existing_keyring = await mailvelope.createKeyring('existing@test.example');
      return expect(mailvelope.getKeyring('existing@test.example')).to.become(existing_keyring);
    });

    it.skip('rejects getting keyring with wrong handle', async () => {
      await mailvelope.createKeyring('existing@test.example');
      return expect(mailvelope.getKeyring('email@test.example')).to.be.rejected;
    });
  });

  describe('Processing autocrypt', () => {
    let keyring;
    prefs.keyserver = {
      autocrypt_lookup: true
    };

    beforeEach(async () => {
      keyring = await mailvelope.createKeyring('email@test.example');
    });

    it.skip('processes Autocrypt header, stores key, and makes it available', async () => {
      const addr = testAutocryptHeaders.from;
      await keyring.processAutocryptHeader(testAutocryptHeaders);
      const result = await keyring.validKeyForAddress([addr]);
      const {keys: [{source}]} = result[addr];
      expect(source).to.eql('AC');
    });
  });
});
