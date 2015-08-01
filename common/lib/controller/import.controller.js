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

define(function(require, exports, module) {

  var sub = require('./sub.controller');
  var keyringMod = require('../keyring');
  var keyringSync = require('../keyringSync');
  var openpgp = require('openpgp');

  function ImportController(port) {
    sub.SubController.call(this, port);
    if (!port) {
      this.mainType = 'importKeyDialog';
      this.id = this.mvelo.util.getHash();
    }
    this.armored = '';
    this.done = null;
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
        var importResult = this.keyring.importKeys([{type: 'public', armored: this.armored}])[0];
        if (importResult.type === 'error') {
          this.ports.importKeyDialog.postMessage({event: 'import-error', message: importResult.message});
          this.importError = true;
        } else {
          this.importPopup.close();
          this.importPopup = null;
          this.done(null, 'IMPORTED');
        }
        break;
      case 'key-import-dialog-cancel':
        this.importPopup.close();
        this.importPopup = null;
        if (this.invalidated) {
          this.done(null, 'INVALIDATED');
        } else if (this.importError) {
          this.done({message: 'An error occured during key import', code: 'IMPORT_ERROR'});
        } else {
          this.done(null, 'REJECTED');
        }
        break;
      default:
        console.log('unknown event', msg);
    }
  };

  ImportController.prototype.importKey = function(keyringId, armored, callback) {
    var that = this;
    try {
      this.keyringId = keyringId;
      // check keyringId
      this.keyring = keyringMod.getById(keyringId);
      this.armored = armored;
      this.done = callback;

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
      var fingerprint = this.key.primaryKey.getFingerprint();
      var stockKey = this.keyring.keyring.getKeysForId(fingerprint);
      if (stockKey) {
        stockKey = stockKey[0];
        this.updateKey(fingerprint, stockKey, this.key, callback);
      } else {
        this.openPopup();
      }
    } catch (err) {
      callback({message: err.message, code: 'IMPORT_ERROR'});
    }
  };

  ImportController.prototype.updateKey = function(fingerprint, stockKey, newKey, callback) {
    var that = this;
    var statusBefore = stockKey.verifyPrimaryKey();
    var beforeLastModified = this.model.getLastModifiedDate(stockKey);
    var stockKeyClone = keyringMod.cloneKey(stockKey);
    stockKeyClone.update(newKey);
    var statusAfter = stockKeyClone.verifyPrimaryKey();
    var afterLastModified = this.model.getLastModifiedDate(stockKeyClone);
    if (beforeLastModified.valueOf() === afterLastModified.valueOf()) {
      // key does not change, we still reply with status UPDATED
      // -> User will no be notified
      callback(null, 'UPDATED');
      return;
    }
    if (statusBefore !== openpgp.enums.keyStatus.valid &&
        statusAfter === openpgp.enums.keyStatus.valid) {
      // an invalid key gets status valid due to this key import
      // -> User confirmation required
      this.openPopup();
      return;
    }
    stockKey.update(newKey);
    this.keyring.sync.add(fingerprint, keyringSync.UPDATE);
    this.keyring.keyring.store();
    this.keyring.sync.commit();
    if (statusBefore === openpgp.enums.keyStatus.valid &&
        statusAfter !== openpgp.enums.keyStatus.valid) {
      // the key import changes the status of the key to not valid
      // -> User will be notified
      this.invalidated = true;
      this.openPopup();
    } else {
      // update is non-critical, no user confirmation required
      callback(null, 'UPDATED');
    }
  };

  ImportController.prototype.openPopup = function() {
    var that = this;
    this.mvelo.windows.openPopup('common/ui/modal/importKeyDialog.html?id=' + this.id, {width: 535, height: 458, modal: false}, function(window) {
      that.importPopup = window;
    });
  };

  exports.ImportController = ImportController;

});
