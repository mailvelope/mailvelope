import {expect} from 'test';
import {LocalStorageStub} from 'utils';
import mvelo from 'lib/lib-mvelo';
import * as main from 'controller/main.controller';
import * as api from 'content-scripts/clientAPI';
import * as keyring from 'modules/keyring';

/* global mailvelope */
describe('Mailvelope Client API', async () => {
  api.init();
  await main.initController();

  beforeEach(() => {
    mvelo.storage = new LocalStorageStub();
    keyring.init();
  });

  it('reports its version', () => {
    api.default.__Rewire__('prefs', {version: '1.2.3-dev'});
    return expect(mailvelope.getVersion()).to.eventually.equal('1.2.3');
  });

  it('can create a keyring', async () => {
    const keyring = await mailvelope.createKeyring('email@test.example');
    expect(keyring).to.be.ok;
  });

  it('rejects creating duplicate keyring', async () => {
    const keyring = await mailvelope.createKeyring('email@test.example');
    return expect(mailvelope.createKeyring('email@test.example')).to.be.rejected;
  });

  it('can get a keyring', async () => {
    const keyring = await mailvelope.createKeyring('email@test.example');
    return expect(mailvelope.getKeyring('email@test.example')).to.become(keyring);
  });

  it('rejects getting missing keyring', async () => {
    return expect(mailvelope.getKeyring('email@test.example')).to.be.rejected;
  });

});
