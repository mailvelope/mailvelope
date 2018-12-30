/**
 * Copyright (C) 2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from '../lib/lib-mvelo';
import {PromiseQueue, getHash} from '../lib/util';
import {MAIN_KEYRING_ID} from '../lib/constants';
import * as sub from './sub.controller';
import {key as openpgpKey} from 'openpgp';
import {getLastModifiedDate} from '../modules/key';
import {initOpenPGP, decryptFile, encryptFile} from '../modules/pgpModel';
import {getById as keyringById, getAllKeyringAttr, setKeyringAttr, deleteKeyring, getKeyData} from '../modules/keyring';
import {delete as deletePwdCache, get as getKeyPwdFromCache, unlock as unlockKey} from '../modules/pwdCache';
import {initScriptInjection} from '../lib/inject';
import * as prefs from '../modules/prefs';
import * as uiLog from '../modules/uiLog';
import {getVersion} from '../modules/defaults';
import {gpgme} from '../lib/browser.runtime';
import * as mveloKeyServer from '../modules/mveloKeyServer';

const unlockQueue = new PromiseQueue();

export default class AppController extends sub.SubController {
  constructor(port) {
    super(port);
    if (!port) {
      this.mainType = 'app';
      this.id = getHash();
    }
    // register event handlers
    this.on('get-prefs', () => prefs.prefs);
    this.on('set-prefs', this.updatePreferences);
    this.on('decryptFile', ({encryptedFile}) => decryptFile(encryptedFile, this.unlockKey));
    this.on('encryptFile', encryptFile);
    this.on('getWatchList', prefs.getWatchList);
    this.on('getKeys', ({keyringId}) => keyringById(keyringId).getKeys());
    this.on('removeKey', this.removeKey);
    this.on('revokeKey', this.revokeKey);
    this.on('get-keyserver-sync', this.getKeyServerSync);
    this.on('sync-keyserver', this.syncKeyServer);
    this.on('remove-user', this.removeUser);
    this.on('revoke-user', this.revokeUser);
    this.on('add-user', this.addUser);
    this.on('set-key-expiry-date', this.setKeyExDate);
    this.on('set-key-password', this.setKeyPwd);
    this.on('validate-key-password', this.validateKeyPassword);
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
    this.on('get-all-key-data', () => getKeyData({allUsers: false}));
    this.on('open-tab', ({url}) => mvelo.tabs.create(url));
    this.on('get-app-data-slot', ({slotId}) => sub.getAppDataSlot(slotId));
    this.on('encrypt-text-init', this.initEncryptText);
    this.on('encrypt-text', this.encryptText);
    this.on('decrypt-text-init', this.initDecryptText);
    this.on('decrypt-text', this.decryptText);
    this.on('get-gnupg-status', () => Boolean(gpgme));
    this.on('reload-keystore', ({keyringId}) => keyringById(keyringId).keystore.load());
  }

  async updatePreferences(options) {
    const updateOpenPGPFlag = typeof options.prefs.security !== 'undefined' && options.prefs.security.hide_armored_header !== prefs.prefs.security.hide_armored_header;
    await prefs.update(options.prefs);
    // update content scripts
    sub.getByMainType('mainCS').forEach(mainCScontrl => mainCScontrl.updatePrefs());
    if (updateOpenPGPFlag) {
      initOpenPGP();
    }
  }

  async removeKey({fingerprint, type, keyringId}) {
    const result = await keyringById(keyringId).removeKey(fingerprint, type);
    this.sendKeyUpdate();
    return result;
  }

  async removeUser({fingerprint, userId, keyringId}) {
    const privateKey = keyringById(keyringId).getPrivateKeyByFpr(fingerprint);
    const result = await keyringById(keyringId).removeUser(privateKey, userId);
    this.sendKeyUpdate();
    return result;
  }

  async addUser({fingerprint, user, keyringId}) {
    const privateKey = keyringById(keyringId).getPrivateKeyByFpr(fingerprint);
    const unlockedKey = await this.unlockKey({key: privateKey, reason: 'PWD_DIALOG_REASON_ADD_USER'});
    const result = await keyringById(keyringId).addUser(unlockedKey, user);
    this.sendKeyUpdate();
    deletePwdCache(fingerprint);
    return result;
  }

  async revokeUser({fingerprint, userId, keyringId}) {
    const privateKey = keyringById(keyringId).getPrivateKeyByFpr(fingerprint);
    const unlockedKey = await this.unlockKey({key: privateKey, reason: 'PWD_DIALOG_REASON_REVOKE_USER'});
    const result = await keyringById(keyringId).revokeUser(unlockedKey, userId);
    this.sendKeyUpdate();
    return result;
  }

  async revokeKey({fingerprint, keyringId}) {
    const privateKey = keyringById(keyringId).getPrivateKeyByFpr(fingerprint);
    const unlockedKey = await this.unlockKey({key: privateKey, reason: 'PWD_DIALOG_REASON_REVOKE'});
    const result = await keyringById(keyringId).revokeKey(unlockedKey);
    this.sendKeyUpdate();
    return result;
  }

  async getKeyServerSync({fingerprint, keyringId}) {
    const result = {
      status: false,
      userIds: {}
    };
    try {
      const localKey = keyringById(keyringId).getPrivateKeyByFpr(fingerprint).toPublic();
      const remote = await mveloKeyServer.fetch({fingerprint});
      if (remote) {
        /* found key on server */
        for (const userId of remote.userIds) {
          /* get remote user IDs */
          result.userIds[userId.email] = userId.verified;
        }
        const {keys: [remoteKey]} = await openpgpKey.readArmored(remote.publicKeyArmored);
        const remoteKeyModTime = new Date(getLastModifiedDate(remoteKey)).getTime();
        const localKeyModTime = new Date(getLastModifiedDate(localKey)).getTime();
        /* check for key modifications */
        if (remoteKeyModTime !== localKeyModTime) {
          result.status = 'mod';
        } else {
          result.status = 'sync';
        }
      }
    } catch (e) {}
    return result;
  }

  async syncKeyServer({fingerprint, keyringId, sync}) {
    let result;
    const privateKey = keyringById(keyringId).getPrivateKeyByFpr(fingerprint);
    if (sync) {
      result = await mveloKeyServer.upload({publicKeyArmored: privateKey.toPublic().armor()});
    } else {
      const keyId = privateKey.primaryKey.getKeyId().toHex();
      result = await mveloKeyServer.remove({keyId});
    }
    return result;
  }

  async setKeyExDate({fingerprint, keyringId, newExDateISOString}) {
    const privateKey = keyringById(keyringId).getPrivateKeyByFpr(fingerprint);
    const unlockedKey = await this.unlockKey({key: privateKey, reason: 'PWD_DIALOG_REASON_SET_EXDATE'});
    const newExDate = newExDateISOString !== false ? new Date(newExDateISOString) : false;
    const result = await keyringById(keyringId).setKeyExDate(unlockedKey, newExDate);
    this.sendKeyUpdate();
    deletePwdCache(fingerprint);
    return result;
  }

  async setKeyPwd({fingerprint, keyringId, currentPassword, password}) {
    const privateKey = keyringById(keyringId).getPrivateKeyByFpr(fingerprint);
    const unlockedKey = await unlockKey({key: privateKey, password: currentPassword});
    const result = await keyringById(keyringId).setKeyPwd(unlockedKey, password);
    this.sendKeyUpdate();
    deletePwdCache(fingerprint);
    return result;
  }

  async validateKeyPassword({fingerprint, keyringId, password}) {
    const cached = getKeyPwdFromCache(fingerprint);
    if (cached && cached.password) {
      return password === cached.password;
    } else {
      const key = keyringById(keyringId).getPrivateKeyByFpr(fingerprint);
      try {
        await unlockKey({key, password});
        return true;
      } catch (e) {
        return false;
      }
    }
  }

  getArmoredKeys({keyFprs, options, keyringId}) {
    return keyringById(keyringId).getArmoredKeys(keyFprs, options);
  }

  getKeyDetails({fingerprint, keyringId}) {
    return keyringById(keyringId).getKeyDetails(fingerprint);
  }

  async generateKey({parameters, keyringId}) {
    const result = await keyringById(keyringId).generateKey(parameters);
    this.sendKeyUpdate();
    return result;
  }

  async importKeys({keys, keyringId}) {
    const result = await keyringById(keyringId).importKeys(keys);
    this.sendKeyUpdate();
    return result;
  }

  sendKeyUpdate() {
    sub.getByMainType('editor').forEach(editorCntrl => editorCntrl.sendKeyUpdate());
  }

  async setWatchList({data}) {
    await prefs.setWatchList(data);
    initScriptInjection();
  }

  async deleteKeyring({keyringId}) {
    if (keyringId === MAIN_KEYRING_ID) {
      throw new Error('Cannot delete main keyring');
    }
    await deleteKeyring(keyringId);
    sub.setActiveKeyringId(MAIN_KEYRING_ID);
  }

  initEncryptText() {
    this.encryptTextCtrl = sub.factory.get('editor');
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
    this.decryptTextCtrl.decrypt(armored, MAIN_KEYRING_ID);
  }

  async unlockKey({key, reason = ''}) {
    const privKey = await unlockQueue.push(sub.factory.get('pwdDialog'), 'unlockKey', [{key, reason}]);
    return privKey.key;
  }
}
