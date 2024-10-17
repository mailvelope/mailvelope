/**
 * Copyright (C) 2015-2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from '../lib/lib-mvelo';
import {createController} from './main.controller';
import {SubController, setActiveKeyringId} from './sub.controller';
import {MvError} from '../lib/util';
import {MAIN_KEYRING_ID, KEY_STATUS} from '../lib/constants';
import {getById as keyringById, createKeyring, setKeyringAttr, getKeyByAddress} from '../modules/keyring';
import {minifyKey, verifyPrimaryKey} from '../modules/key';
import {getLastModifiedDate, mapAddressKeyMapToFpr} from '../modules/key';
import * as autocrypt from '../modules/autocryptWrapper';
import * as keyRegistry from '../modules/keyRegistry';

export default class ApiController extends SubController {
  constructor(port) {
    super(port);
    // register event handlers
    this.on('get-keyring', this.getKeyring);
    this.on('create-keyring', this.createKeyring);
    this.on('query-valid-key', this.queryValidKey);
    this.on('export-own-pub-key', this.exportOwnPubKey);
    this.on('additional-headers-for-outgoing', this.additionalHeadersForOutgoing);
    this.on('import-pub-key', this.importPubKey);
    this.on('process-autocrypt-header', this.processAutocryptHeader);
    this.on('set-logo', this.setLogo);
    this.on('has-private-key', this.hasPrivateKey);
    this.on('open-settings', this.openSettings);
  }

  async getKeyring({keyringId}) {
    const keyring = await keyringById(keyringId);
    if (keyring) {
      const attr = await keyring.getAttributes();
      setActiveKeyringId(keyringId);
      return {revision: attr.logo_revision};
    }
  }

  async createKeyring({keyringId}) {
    const keyring = await createKeyring(keyringId);
    await keyring.sync.activate();
    setActiveKeyringId(keyringId);
    return {};
  }

  async queryValidKey({keyringId, recipients}) {
    const keyMap = await getKeyByAddress(keyringId, recipients);
    for (const email in keyMap) {
      if (keyMap[email]) {
        keyMap[email] = {
          keys: keyMap[email].map(key => ({
            fingerprint: key.getFingerprint(),
            lastModified: getLastModifiedDate(key).toISOString(),
            source: 'LOC' // local keyring
          }))
        };
      } else {
        const found = await keyRegistry.lookup({query: {email}, identity: keyringId});
        if (found) {
          keyMap[email] = {
            keys: [found]
          };
        }
      }
    }
    return keyMap;
  }

  async exportOwnPubKey({keyringId, emailAddr}) {
    const keyring = await keyringById(keyringId);
    const keyMap = await keyring.getKeyByAddress(emailAddr, {pub: false, priv: true, sort: true});
    const keyFprMap = mapAddressKeyMapToFpr(keyMap);
    const pubKeyFprs = keyFprMap[emailAddr];
    if (!pubKeyFprs) {
      throw new MvError('No key pair found for this email address.', 'NO_KEY_FOR_ADDRESS');
    }
    // only take first valid key
    const pubKeyFpr = pubKeyFprs[0];
    const armored = keyring.getArmoredKeys(pubKeyFpr, {pub: true});
    return armored[0].armoredPublic;
  }

  async additionalHeadersForOutgoing({headers, keyringId}) {
    const emailAddr = headers.from;
    const keyring = await keyringById(keyringId);
    if (autocrypt.isEnabled()) {
      const keyMap = await keyring.getKeyByAddress(emailAddr, {pub: false, priv: true, sort: true});
      const keys = keyMap[emailAddr];
      if (!keys) {
        throw new MvError('No key pair found for this email address.', 'NO_KEY_FOR_ADDRESS');
      }
      const key = keys[0];
      const minimal = await minifyKey(key, {email: emailAddr});
      const armored = minimal.armor();
      return {autocrypt: autocrypt.stringify({keydata: armored, addr: emailAddr})};
    } else {
      return {};
    }
  }

  async importPubKey({keyringId, armored}) {
    const importCtrl = await createController('importKeyDialog');
    return importCtrl.importKey(keyringId, armored);
  }

  processAutocryptHeader({headers, keyringId}) {
    if (autocrypt.isEnabled()) {
      return autocrypt.processHeader(headers, keyringId);
    }
  }

  async setLogo({keyringId, dataURL, revision}) {
    const keyring = await keyringById(keyringId);
    const attr = await keyring.getAttributes();
    if (attr.logo_revision && attr.logo_revision > revision) {
      throw new MvError('New logo revision < existing revision.', 'REVISION_INVALID');
    }
    await setKeyringAttr(keyringId, {logo_revision: revision, logo_data_url: dataURL});
  }

  async hasPrivateKey({keyringId, fingerprint, email}) {
    const keyring = await keyringById(keyringId);
    if (fingerprint && email) {
      throw new MvError('Use either fingerprint or email parameter.', 'INVALID_OPTIONS');
    }
    if (email) {
      const keyMap = await keyring.getKeyByAddress(email, {pub: false, priv: true, sort: true});
      return Boolean(keyMap[email]);
    } else if (fingerprint) {
      const fpr = fingerprint.toLowerCase().replace(/\s/g, '');
      const key = keyring.keystore.privateKeys.getForId(fpr);
      if (!key) {
        return false;
      }
      const status = await verifyPrimaryKey(key);
      return status === KEY_STATUS.valid;
    } else {
      const hasPrivateKey = keyring.hasPrivateKey();
      return hasPrivateKey;
    }
  }

  async openSettings({keyringId = MAIN_KEYRING_ID, options = {}}) {
    let fragment;
    const krid = `?krid=${encodeURIComponent(keyringId)}`;
    if (options.showDefaultKey) {
      const keyring = await keyringById(keyringId);
      const defaultKeyFpr = await keyring.getDefaultKeyFpr();
      fragment = `#/keyring/key/${defaultKeyFpr}`;
    } else {
      fragment = '#/settings';
    }
    mvelo.tabs.loadAppTab(`${krid}${fragment}`);
  }
}
