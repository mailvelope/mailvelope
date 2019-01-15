import {expect} from 'test';
import {LocalStorageStub} from 'utils';
import mvelo from 'lib/lib-mvelo';
import * as main from 'controller/main.controller';
import * as api from 'content-scripts/clientAPI';
import * as keyring from 'modules/keyring';

api.init();
main.initController();

/* global mailvelope */
describe('Mailvelope Client API', () => {
  describe('Versioning', () => {
    it('reports its version', () => {
      api.default.__Rewire__('prefs', {version: '1.2.3-dev'});
      return expect(mailvelope.getVersion()).to.eventually.equal('1.2.3');
    });
  });

  describe('Handling keyrings', () => {
    let existing_keyring;

    beforeEach(async () => {
      mvelo.storage = new LocalStorageStub();
      keyring.init();
      existing_keyring = await mailvelope.createKeyring('existing@test.example');
    });

    it('can create a keyring', () =>
      expect(mailvelope.createKeyring('email@test.example')).to.eventually.be.ok);

    it('rejects creating duplicate keyring', () =>
      expect(mailvelope.createKeyring('existing@test.example')).to.eventually.be.rejected);

    it('can get a keyring', () =>
      expect(mailvelope.getKeyring('existing@test.example')).to.become(existing_keyring));

    it('rejects getting missing keyring', () =>
      expect(mailvelope.getKeyring('email@test.example')).to.be.rejected);
  });
});
