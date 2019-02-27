/**
 * Copyright (C) 2015-2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from '../lib/lib-mvelo';
import * as sub from './sub.controller';
import {getHash, MvError} from '../lib/util';
import {MAIN_KEYRING_ID} from '../lib/constants';
import {getById as keyringById, createKeyring, setKeyringAttr, getKeyByAddress} from '../modules/keyring';
import * as openpgp from 'openpgp';
import {getLastModifiedDate, mapAddressKeyMapToFpr} from '../modules/key';
import * as ac from '../modules/autocryptWrapper';
import * as keyRegistry from '../modules/keyRegistry';

export default class ApiController extends sub.SubController {
  constructor(port) {
    super(port);
    if (!port) {
      this.mainType = 'api';
      this.id = getHash();
    }
    // register event handlers
    this.on('get-keyring', this.getKeyring);
    this.on('create-keyring', this.createKeyring);
    this.on('query-valid-key', this.queryValidKey);
    this.on('export-own-pub-key', this.exportOwnPubKey);
    this.on('import-pub-key', this.importPubKey);
    this.on('lookup-pub-key', this.lookupPubKey);
    this.on('process-autocrypt-header', this.processAutocryptHeader);
    this.on('set-logo', this.setLogo);
    this.on('has-private-key', this.hasPrivateKey);
    this.on('open-settings', this.openSettings);
  }

  getKeyring({keyringId}) {
    const keyring = keyringById(keyringId);
    if (keyring) {
      const attr = keyring.getAttributes();
      sub.setActiveKeyringId(keyringId);
      return {revision: attr.logo_revision};
    }
  }

  async createKeyring({keyringId}) {
    const keyring = await createKeyring(keyringId);
    await keyring.sync.activate();
    sub.setActiveKeyringId(keyringId);
    return {};
  }

  async queryValidKey({keyringId, recipients}) {
    const keyMap = await getKeyByAddress(keyringId, recipients);
    Object.keys(keyMap).forEach(email => {
      if (keyMap[email]) {
        keyMap[email] = {
          keys: keyMap[email].map(key => ({
            fingerprint: key.primaryKey.getFingerprint(),
            lastModified: getLastModifiedDate(key).toISOString()
          }))
        };
      }
    });
    return keyMap;
  }

  async exportOwnPubKey({keyringId, emailAddr}) {
    const keyMap = await keyringById(keyringId).getKeyByAddress(emailAddr, {pub: false, priv: true, sort: true});
    const keyFprMap = mapAddressKeyMapToFpr(keyMap);
    const pubKeyFprs = keyFprMap[emailAddr];
    if (!pubKeyFprs) {
      throw new MvError('No key pair found for this email address.', 'NO_KEY_FOR_ADDRESS');
    }
    // only take first valid key
    const pubKeyFpr = pubKeyFprs[0];
    const armored = keyringById(keyringId).getArmoredKeys(pubKeyFpr, {pub: true});
    return armored[0].armoredPublic;
  }

  importPubKey({keyringId, armored}) {
    return sub.factory.get('importKeyDialog').importKey(keyringId, armored);
  }

  lookupPubKey({keyringId, emailAddr}) {
    return keyRegistry.lookup(emailAddr, keyringId);
  }

  processAutocryptHeader({headers, keyringId}) {
    return ac.processHeader(headers, keyringId);
  }

  async setLogo({keyringId, dataURL, revision}) {
    const attr = keyringById(keyringId).getAttributes();
    if (attr.logo_revision && attr.logo_revision > revision) {
      throw new MvError('New logo revision < existing revision.', 'REVISION_INVALID');
    }
    await setKeyringAttr(keyringId, {logo_revision: revision, logo_data_url: dataURL});
  }

  async hasPrivateKey({keyringId, fingerprint}) {
    if (fingerprint) {
      const fpr = fingerprint.toLowerCase().replace(/\s/g, '');
      const key = keyringById(keyringId).keystore.privateKeys.getForId(fpr);
      if (!key) {
        return false;
      }
      const status = await key.verifyPrimaryKey();
      return status === openpgp.enums.keyStatus.valid;
    } else {
      const hasPrivateKey = keyringById(keyringId).hasPrivateKey();
      return hasPrivateKey;
    }
  }

  openSettings({keyringId = MAIN_KEYRING_ID}) {
    const hash = `?krid=${encodeURIComponent(keyringId)}#/settings`;
    mvelo.tabs.loadAppTab(hash);
  }
}
