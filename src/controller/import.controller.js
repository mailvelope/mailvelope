/**
 * Copyright (C) 2015-2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from '../lib/lib-mvelo';
import {getHash, MvError} from '../lib/util';
import * as sub from './sub.controller';
import {getById as getKeyringById} from '../modules/keyring';
import {mapKeys, cloneKey} from '../modules/key';
import * as keyringSync from '../modules/keyringSync';
import * as openpgp from 'openpgp';
import * as uiLog from '../modules/uiLog';
import {getLastModifiedDate} from '../modules/key';
import {isEnabled as isAutoLocateEnabled, locate} from '../modules/autoLocate';

export default class ImportController extends sub.SubController {
  constructor(port) {
    super(port);
    if (!port) {
      this.mainType = 'importKeyDialog';
      this.id = getHash();
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
    this.on('key-import-dialog-init', () => this.emit('key-details', {key: this.keyDetails, invalidated: this.invalidated}));
    this.on('key-import-dialog-ok', this.onImportOk);
    this.on('key-import-dialog-cancel', this.handleCancel);
    this.on('key-import-user-input', msg => uiLog.push(msg.source, msg.type));
  }

  onArmoredKey({data}) {
    const slotId = getHash();
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

  async importKey(keyringId, armored) {
    try {
      this.keyringId = keyringId;
      // check keyringId
      this.keyring = getKeyringById(keyringId);
      this.armored = armored;

      this.keys = await openpgp.key.readArmored(this.armored);
      if (this.keys.err) {
        throw new Error(this.keys.err[0].message);
      }
      this.key = this.keys.keys[0];
      [this.keyDetails] = await mapKeys(this.keys.keys);
      if (this.keyDetails.type === 'private') {
        throw new Error('Import of private keys not allowed.');
      }
      if (this.keys.keys.length > 1) {
        console.log('Multiple keys detected during key import, only first key is imported.');
        // only import first key in armored block
        this.armored = this.key.armor();
      }
      if (await this.key.verifyPrimaryKey() === openpgp.enums.keyStatus.invalid) {
        throw new Error('Key is invalid.');
      }
      // check if key already in keyring
      const fingerprint = this.key.primaryKey.getFingerprint();
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
    const statusBefore = await stockKey.verifyPrimaryKey();
    const beforeLastModified = getLastModifiedDate(stockKey);
    // clone key to check how update would affect validity of key
    const stockKeyClone = await cloneKey(stockKey);
    await stockKeyClone.update(newKey);
    const statusAfter = await stockKeyClone.verifyPrimaryKey();
    const afterLastModified = getLastModifiedDate(stockKeyClone);
    let status;
    if (beforeLastModified.valueOf() === afterLastModified.valueOf()) {
      // key does not change, we still reply with status UPDATED
      // -> User will not be notified
      return 'UPDATED';
    }
    if (statusBefore !== openpgp.enums.keyStatus.valid &&
        statusAfter === openpgp.enums.keyStatus.valid) {
      // an invalid key gets status valid due to this key import
      // -> User confirmation required
      status = await this.openPopup();
    }
    if (status === 'REJECTED') {
      return status;
    }
    await stockKey.update(newKey);
    this.keyring.sync.add(fingerprint, keyringSync.UPDATE);
    await this.keyring.keystore.store();
    await this.keyring.sync.commit();
    if (statusBefore === openpgp.enums.keyStatus.valid &&
        statusAfter !== openpgp.enums.keyStatus.valid) {
      // the key import changes the status of the key to not valid
      // -> User will be notified
      this.invalidated = true;
      return this.openPopup();
    } else {
      // update is non-critical, no user confirmation required
      return 'UPDATED';
    }
  }

  openPopup() {
    return new Promise((resolve, reject) => {
      this.popupPromise = {resolve, reject};
      mvelo.windows.openPopup(`components/import-key/importKeyDialog.html?id=${this.id}`, {width: 535, height: 458})
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

export async function lookupKey({keyringId, email}) {
  if (!isAutoLocateEnabled()) {
    return;
  }
  const armored = await locate({email});
  if (armored) {
    try {
      await sub.factory.get('importKeyDialog').importKey(keyringId, armored);
    } catch (e) {
      console.log('Key import after auto locate failed', e);
    }
  }
}
