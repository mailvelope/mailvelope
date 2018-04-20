/**
 * Copyright (C) 2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from '../lib/lib-mvelo';
import * as sub from './sub.controller';
import {decryptFile, encryptFile, getWatchList, setWatchList} from '../modules/pgpModel';
import {getById as keyringById, getAllKeyringAttr, setKeyringAttr, deleteKeyring, getAllKeyUserId} from '../modules/keyringManager';
import {initScriptInjection} from '../lib/inject';
import * as prefs from '../modules/prefs';
import * as uiLog from '../modules/uiLog';
import {getVersion} from '../modules/defaults';

export default class AppController extends sub.SubController {
  constructor(port) {
    super(port);
    if (!port) {
      this.mainType = 'app';
      this.id = mvelo.util.getHash();
    }
    // register event handlers
    this.on('get-prefs', () => prefs.prefs);
    this.on('set-prefs', this.updatePreferences);
    this.on('decryptFile', ({encryptedFile}) => decryptFile(encryptedFile));
    this.on('encryptFile', encryptFile);
    this.on('getWatchList', getWatchList);
    this.on('getKeys', ({keyringId}) => keyringById(keyringId).getKeys());
    this.on('removeKey', this.removeKey);
    this.on('getArmoredKeys', this.getArmoredKeys);
    this.on('getKeyDetails', this.getKeyDetails);
    this.on('generateKey', this.generateKey);
    this.on('importKeys', this.importKeys);
    this.on('set-watch-list', this.setWatchList);
    this.on('init-script-injection', initScriptInjection);
    this.on('get-all-keyring-attr', getAllKeyringAttr);
    this.on('set-keyring-attr', ({keyringId, keyringAttr}) => setKeyringAttr(keyringId, keyringAttr));
    this.on('get-active-keyring', sub.getActiveKeyringId);
    this.on('set-active-keyring', ({keyringId}) => sub.setActiveKeyringId(keyringId));
    this.on('delete-keyring', this.deleteKeyring);
    this.on('get-ui-log', ({securityLogLength}) => uiLog.getLatest(securityLogLength));
    this.on('get-version', getVersion);
    this.on('get-all-key-userid', getAllKeyUserId);
    this.on('open-tab', ({url}) => mvelo.tabs.create(url));
    this.on('get-app-data-slot', ({slotId}) => sub.getAppDataSlot(slotId));
    this.on('encrypt-text-init', this.initEncryptText);
    this.on('encrypt-text', this.encryptText);
    this.on('decrypt-text-init', this.initDecryptText);
    this.on('decrypt-text', this.decryptText);
  }

  updatePreferences(options) {
    return prefs.update(options.prefs)
    // update content scripts
    .then(() => sub.getByMainType('mainCS').forEach(mainCScontrl => mainCScontrl.updatePrefs()));
  }

  removeKey({fingerprint, type, keyringId}) {
    return keyringById(keyringId).removeKey(fingerprint, type)
    .then(result => {
      this.sendKeyUpdate();
      return result;
    });
  }

  getArmoredKeys({keyids, options, keyringId}) {
    return keyringById(keyringId).getArmoredKeys(keyids, options);
  }

  getKeyDetails({fingerprint, keyringId}) {
    return keyringById(keyringId).getKeyDetails(fingerprint);
  }

  generateKey({parameters, keyringId}) {
    return keyringById(keyringId).generateKey(parameters)
    .then(result => {
      this.sendKeyUpdate();
      return result;
    });
  }

  importKeys({keys, keyringId}) {
    return keyringById(keyringId).importKeys(keys)
    .then(result => {
      this.sendKeyUpdate();
      return result;
    });
  }

  sendKeyUpdate() {
    sub.getByMainType('editor').forEach(editorCntrl => editorCntrl.sendKeyUpdate());
  }

  setWatchList({data}) {
    setWatchList(data)
    .then(initScriptInjection);
  }

  deleteKeyring({keyringId}) {
    return Promise.resolve()
    .then(() => {
      if (keyringId === mvelo.LOCAL_KEYRING_ID) {
        throw new Error('Cannot delete main keyring');
      }
      return deleteKeyring(keyringId);
    })
    .then(() => sub.setActiveKeyringId(mvelo.LOCAL_KEYRING_ID));
  }

  initEncryptText() {
    this.encryptTextCtrl = sub.factory.get('editor');
    this.encryptTextCtrl.options.getRecipientProposal = callback => callback();
    return this.encryptTextCtrl.id;
  }

  encryptText() {
    return this.encryptTextCtrl.encryptText();
  }

  initDecryptText() {
    this.decryptTextCtrl = sub.factory.get('decryptCont');
    return this.decryptTextCtrl.id;
  }

  decryptText({armored}) {
    this.decryptTextCtrl.decrypt(armored, mvelo.LOCAL_KEYRING_ID);
  }
}
