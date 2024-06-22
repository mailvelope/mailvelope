/**
 * Copyright (C) 2015-2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from '../lib/lib-mvelo';
import {getUUID, MvError} from '../lib/util';
import * as sub from './sub.controller';
import {getById as getKeyringById} from '../modules/keyring';
import {mapKeys, parseUserId, sanitizeKey, verifyPrimaryKey, verifyUser} from '../modules/key';
import {readKey} from 'openpgp';
import * as uiLog from '../modules/uiLog';
import {getLastModifiedDate} from '../modules/key';
import * as keyRegistry from '../modules/keyRegistry';
import {KEY_STATUS} from '../lib/constants';

export default class ImportController extends sub.SubController {
  constructor(port) {
    super(port);
    if (!port) {
      this.mainType = 'importKeyDialog';
      this.id = getUUID();
    }
    this.armored = '';
    this.popupPromise = null;
    this.importPopup = null;
    this.keyringId = '';
    this.keyring = null;
    this.key = null;
    this.keyDetails = null;
    this.importError = false;
    this.invalidated = false;
    // register event handlers
    this.on('imframe-armored-key', this.onArmoredKey);
    this.on('key-import-dialog-init', () => this.emit('key-details', {key: this.keyDetails, invalidated: this.invalidated, rotation: this.rotation}));
    this.on('key-import-dialog-ok', this.onImportOk);
    this.on('key-import-dialog-cancel', this.handleCancel);
    this.on('key-import-user-input', msg => uiLog.push(msg.source, msg.type));
  }

  onArmoredKey({data}) {
    const slotId = getUUID();
    this.keyringId = sub.getActiveKeyringId();
    sub.setAppDataSlot(slotId, data);
    mvelo.tabs.loadAppTab(`?krid=${encodeURIComponent(this.keyringId)}&slotId=${slotId}#/keyring/import/push`);
  }

  async onImportOk() {
    const [importResult] = await this.keyring.importKeys([{type: 'public', armored: this.armored}]);
    if (importResult.type === 'error') {
      this.emit('import-error', {message: importResult.message});
      this.importError = true;
    } else {
      this.closePopup();
      this.popupPromise.resolve('IMPORTED');
    }
  }

  handleCancel() {
    this.closePopup();
    if (this.invalidated) {
      this.popupPromise.resolve('INVALIDATED');
    } else if (this.importError) {
      this.popupPromise.reject({message: 'An error occured during key import', code: 'IMPORT_ERROR'});
    } else {
      this.popupPromise.resolve('REJECTED');
    }
  }

  closePopup() {
    if (this.importPopup) {
      this.importPopup.close();
      this.importPopup = null;
    }
  }

  async importKey(keyringId, armored, rotation) {
    try {
      this.keyringId = keyringId;
      // check keyringId
      this.keyring = getKeyringById(keyringId);
      this.armored = armored;
      this.rotation = rotation;
      this.key = await readKey({armoredKey: this.armored});
      this.key = await sanitizeKey(this.key);
      if (!this.key || await verifyPrimaryKey(this.key) === KEY_STATUS.invalid) {
        throw new Error('Key is invalid.');
      }
      this.armored = this.key.armor();
      // collect key details
      [this.keyDetails] = await mapKeys([this.key]);
      if (this.keyDetails.type === 'private') {
        throw new Error('Import of private keys not allowed.');
      }
      const users = [];
      for (const [index, user] of this.key.users.entries()) {
        if (!user.userID) {
          // filter out user attribute packages
          continue;
        }
        const userStatus = await verifyUser(user);
        const uiUser = {id: index, userId: user.userID.userID, name: user.userID.name, email: user.userID.email, status: userStatus};
        parseUserId(uiUser);
        users.push(uiUser);
      }
      this.keyDetails.users = users;
      // check if key already in keyring
      const fingerprint = this.key.getFingerprint();
      let stockKey = this.keyring.keystore.getKeysForId(fingerprint);
      if (stockKey) {
        stockKey = stockKey[0];
        return this.updateKey(fingerprint, stockKey, this.key);
      } else {
        return this.openPopup();
      }
    } catch (err) {
      throw new MvError(err.message, 'IMPORT_ERROR');
    }
  }

  async updateKey(fingerprint, stockKey, newKey) {
    const statusBefore = await verifyPrimaryKey(stockKey);
    const updatedKey = await stockKey.update(newKey);
    const statusAfter = await verifyPrimaryKey(updatedKey);
    if (statusBefore !== statusAfter) {
      // key validity changes -> User confirmation required
      if (statusAfter !== KEY_STATUS.valid) {
        this.invalidated = true;
      }
      return this.openPopup();
    }
    const beforeLastModified = getLastModifiedDate(stockKey);
    const afterLastModified = getLastModifiedDate(updatedKey);
    if (beforeLastModified.valueOf() !== afterLastModified.valueOf()) {
      // update is non-critical, no user confirmation required
      const [importResult] = await this.keyring.importKeys([{type: 'public', armored: this.armored}]);
      if (importResult.type === 'error') {
        throw new Error(importResult.message);
      }
    }
    // even if key does not change, we still reply with status UPDATED -> User will not be notified
    return 'UPDATED';
  }

  openPopup() {
    return new Promise((resolve, reject) => {
      this.popupPromise = {resolve, reject};
      mvelo.windows.openPopup(`components/import-key/importKey.html?id=${this.id}`, {width: 910, height: 554})
      .then(popup => {
        this.importPopup = popup;
        popup.addRemoveListener(() => {
          this.importPopup = null;
          this.handleCancel();
        });
      });
    });
  }
}

/**
 * Lookup key in key registry
 * @param  {String} options.keyringId
 * @param  {String} options.email - email address of key user ID
 * @param  {Boolean} options.rotation - set true if we have already a key in the local keyring
 *                                      and therefore newly discovered key could possibly be a key rotation event
 */
export async function lookupKey({keyringId, email, rotation}) {
  const result = await keyRegistry.lookup({query: {email}, identity: keyringId});
  if (result) {
    try {
      await sub.factory.get('importKeyDialog').importKey(keyringId, result.armored, rotation);
    } catch (e) {
      console.log('Key import after auto locate failed', e);
    }
  }
}
