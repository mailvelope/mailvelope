/**
 * Mailvelope - secure email with OpenPGP encryption for Webmail
 * Copyright (C) 2014-2015 Mailvelope GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License version 3
 * as published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

'use strict';


var sub = require('./sub.controller');
var keyringMod = require('../modules/keyring');
var keyringSync = require('../modules/keyringSync');
var openpgp = require('openpgp');
var uiLog = require('../modules/uiLog');

function ImportController(port) {
  sub.SubController.call(this, port);
  if (!port) {
    this.mainType = 'importKeyDialog';
    this.id = this.mvelo.util.getHash();
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

ImportController.prototype = Object.create(sub.SubController.prototype);

ImportController.prototype.handlePortMessage = function(msg) {
  var that = this;
  switch (msg.event) {
    case 'imframe-armored-key':
      this.mvelo.tabs.loadOptionsTab('#importKey', function(old, tab) {
        that.mvelo.tabs.sendMessage(tab, {
          event: 'import-key',
          armored: msg.data,
          id: that.id
        }, function(msg) {
          var resultType = {};
          for (var i = 0; i < msg.result.length; i++) {
            resultType[msg.result[i].type] = true;
          }
          that.ports.imFrame.postMessage({event: 'import-result', resultType: resultType});
        });
      });
      break;
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
      this.closePopup();
      if (this.invalidated) {
        this.popupDone.resolve('INVALIDATED');
      } else if (this.importError) {
        this.popupDone.reject({message: 'An error occured during key import', code: 'IMPORT_ERROR'});
      } else {
        this.popupDone.resolve('REJECTED');
      }
      break;
    case 'key-import-user-input':
      uiLog.push(msg.source, msg.type);
      break;
    default:
      console.log('unknown event', msg);
  }
};

ImportController.prototype.closePopup = function() {
  if (this.importPopup) {
    try {
      this.importPopup.close();
    } catch (e) {}
    this.importPopup = null;
  }
};

ImportController.prototype.importKey = function(keyringId, armored) {
  return Promise.resolve()
  .then(() => {
    this.keyringId = keyringId;
    // check keyringId
    this.keyring = keyringMod.getById(keyringId);
    this.armored = armored;

    this.keys = openpgp.key.readArmored(this.armored);
    if (this.keys.err) {
      throw new Error(this.keys.err[0].message);
    }
    this.key = this.keys.keys[0];
    this.keyDetails = keyringMod.mapKeys(this.keys.keys)[0];
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
    throw { message: err.message, code: 'IMPORT_ERROR' };
  });
};

ImportController.prototype.updateKey = function(fingerprint, stockKey, newKey) {
  let statusBefore, statusAfter;
  return Promise.resolve()
  .then(() => {
    statusBefore = stockKey.verifyPrimaryKey();
    const beforeLastModified = this.model.getLastModifiedDate(stockKey);
    const stockKeyClone = keyringMod.cloneKey(stockKey);
    stockKeyClone.update(newKey);
    statusAfter = stockKeyClone.verifyPrimaryKey();
    const afterLastModified = this.model.getLastModifiedDate(stockKeyClone);
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
};

ImportController.prototype.openPopup = function() {
  return new Promise((resolve, reject) => {
    this.popupDone = {resolve, reject};
    this.mvelo.windows.openPopup('components/import-key/importKeyDialog.html?id=' + this.id, {width: 535, height: 458, modal: false}, window => this.importPopup = window);
  });
};

exports.ImportController = ImportController;
