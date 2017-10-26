/**
 * Copyright (C) 2015-2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from '../lib/lib-mvelo';
import * as sub from './sub.controller';
import {getById as getKeyringById, mapKeys, cloneKey} from '../modules/keyring';
import * as keyringSync from '../modules/keyringSync';
import * as openpgp from 'openpgp';
import * as uiLog from '../modules/uiLog';
import {getLastModifiedDate} from '../modules/pgpModel';

export default class ImportController extends sub.SubController {
  constructor(port) {
    super(port);
    if (!port) {
      this.mainType = 'importKeyDialog';
      this.id = mvelo.util.getHash();
    }
    this.armored = '';
    this.popupDone = null;
    this.importPopup = null;
    this.keyringId = '';
    this.keyring = null;
    this.key = null;
    this.keyDetails = null;
    this.importError = false;
    this.invalidated = false;
  }

  handlePortMessage(msg) {
    switch (msg.event) {
      case 'imframe-armored-key': {
        const slotId = mvelo.util.getHash();
        this.keyringId = sub.getActiveKeyringId();
        sub.setAppDataSlot(slotId, msg.data);
        mvelo.tabs.loadOptionsTab(`?krid=${encodeURIComponent(this.keyringId)}&slotId=${slotId}#/keyring/import/push`);
        break;
      }
      case 'key-import-dialog-init':
        this.ports.importKeyDialog.postMessage({event: 'key-details', key: this.keyDetails, invalidated: this.invalidated});
        break;
      case 'key-import-dialog-ok':
        this.keyring.importKeys([{type: 'public', armored: this.armored}])
        .then(([importResult]) => {
          if (importResult.type === 'error') {
            this.ports.importKeyDialog.postMessage({event: 'import-error', message: importResult.message});
            this.importError = true;
          } else {
            this.closePopup();
            this.popupDone.resolve('IMPORTED');
          }
        });
        break;
      case 'key-import-dialog-cancel':
        this.handleCancel();
        break;
      case 'key-import-user-input':
        uiLog.push(msg.source, msg.type);
        break;
      default:
        console.log('unknown event', msg);
    }
  }

  handleCancel() {
    this.closePopup();
    if (this.invalidated) {
      this.popupDone.resolve('INVALIDATED');
    } else if (this.importError) {
      this.popupDone.reject({message: 'An error occured during key import', code: 'IMPORT_ERROR'});
    } else {
      this.popupDone.resolve('REJECTED');
    }
  }

  closePopup() {
    if (this.importPopup) {
      this.importPopup.close();
      this.importPopup = null;
    }
  }

  importKey(keyringId, armored) {
    return Promise.resolve()
    .then(() => {
      this.keyringId = keyringId;
      // check keyringId
      this.keyring = getKeyringById(keyringId);
      this.armored = armored;

      this.keys = openpgp.key.readArmored(this.armored);
      if (this.keys.err) {
        throw new Error(this.keys.err[0].message);
      }
      this.key = this.keys.keys[0];
      this.keyDetails = mapKeys(this.keys.keys)[0];
      if (this.keyDetails.type === 'private') {
        throw new Error('Import of private keys not allowed.');
      }
      if (this.keys.keys.length > 1) {
        console.log('Multiple keys detected during key import, only first key is imported.');
        // only import first key in armored block
        this.armored = this.key.armor();
      }
      if (this.key.verifyPrimaryKey() === openpgp.enums.keyStatus.invalid) {
        throw new Error('Key is invalid.');
      }
      // check if key already in keyring
      const fingerprint = this.key.primaryKey.getFingerprint();
      let stockKey = this.keyring.keyring.getKeysForId(fingerprint);
      if (stockKey) {
        stockKey = stockKey[0];
        return this.updateKey(fingerprint, stockKey, this.key);
      } else {
        return this.openPopup();
      }
    })
    .catch(err => {
      throw {message: err.message, code: 'IMPORT_ERROR'};
    });
  }

  updateKey(fingerprint, stockKey, newKey) {
    let statusBefore;
    let statusAfter;
    return Promise.resolve()
    .then(() => {
      statusBefore = stockKey.verifyPrimaryKey();
      const beforeLastModified = getLastModifiedDate(stockKey);
      const stockKeyClone = cloneKey(stockKey);
      stockKeyClone.update(newKey);
      statusAfter = stockKeyClone.verifyPrimaryKey();
      const afterLastModified = getLastModifiedDate(stockKeyClone);
      if (beforeLastModified.valueOf() === afterLastModified.valueOf()) {
        // key does not change, we still reply with status UPDATED
        // -> User will no be notified
        return 'UPDATED';
      }
      if (statusBefore !== openpgp.enums.keyStatus.valid &&
          statusAfter === openpgp.enums.keyStatus.valid) {
        // an invalid key gets status valid due to this key import
        // -> User confirmation required
        return this.openPopup();
      }
      stockKey.update(newKey);
      this.keyring.sync.add(fingerprint, keyringSync.UPDATE);
    })
    .then(() => this.keyring.keyring.store())
    .then(() => this.keyring.sync.commit())
    .then(() => {
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
    });
  }

  openPopup() {
    return new Promise((resolve, reject) => {
      this.popupDone = {resolve, reject};
      mvelo.windows.openPopup(`components/import-key/importKeyDialog.html?id=${this.id}`, {width: 535, height: 458, modal: false})
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
