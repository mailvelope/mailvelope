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
    this.importError = false;
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
        if (this.keys.keys.length > 1) {
          this.ports.importKeyDialog.postMessage({event: 'import-warning', message: 'More than 1 key in armored block.'});
        }
        if (!this.key.validity) {
          this.ports.importKeyDialog.postMessage({event: 'import-error', message: 'Key is not valid.'});
        }
        this.ports.importKeyDialog.postMessage({event: 'key-details', key: this.key});
        break;
      case 'key-import-dialog-ok':
        var importResult = this.keyring.importKeys([{type: 'public', armored: this.armored}])[0];
        if (importResult.type === 'error') {
          this.ports.importKeyDialog.postMessage({event: 'import-error', message: importResult.message});
          this.importError = true;
        } else if (importResult.type === 'success') {
          this.importPopup.close();
          this.importPopup = null;
          this.done(null, 'IMPORTED');
        } else {
          this.done({message: 'An error occured during key import', code: 'IMPORT_ERROR'});
        }
        break;
      case 'key-import-dialog-cancel':
        this.importPopup.close();
        this.importPopup = null;
        if (this.importError) {
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
    this.keyringId = keyringId;
    // check keyringId
    this.keyring = keyringMod.getById(keyringId);
    this.armored = armored;
    this.done = callback;

    this.keys = keyringMod.readKey(this.armored);
    if (this.keys.err) {
      callback({message: this.keys.err[0].message, code: 'IMPORT_ERROR'});
      return;
    }
    this.key = this.keys.keys[0];
    if (this.key.type === 'private') {
      callback({message: 'Import of private keys not allowed.', code: 'IMPORT_ERROR'});
      return;
    }
    if (this.keys.keys.length > 1) {
      // only import first key in armored block
      this.armored = this.key.armor();
    }
    // check if key already in keyring
    try {
      var fingerprint = this.key.primaryKey.getFingerprint();
      var stockKey = this.keyring.getKeysForId(fingerprint);
      if (!stockKey) {
        this.mvelo.windows.openPopup('common/ui/modal/importKeyDialog.html?id=' + this.id, {width: 535, height: 425, modal: false}, function(window) {
          that.importPopup = window;
        });
      } else {
        stockKey = stockKey[0];
        var statusBefore = stockKey.verifyPrimaryKey();
        var beforeLastModified = this.model.getLastModifiedDate(stockKey);
        stockKey.update(this.key);
        var statusAfter = stockKey.verifyPrimaryKey();
        var afterLastModified = this.model.getLastModifiedDate(stockKey);
        if (beforeLastModified !== afterLastModified) {
          this.keyring.sync.add(fingerprint, keyringSync.UPDATE);
          this.keyring.store();
          this.keyring.sync.commit();
          if (statusBefore === openpgp.enums.keyStatus.valid &&
              statusAfter !== openpgp.enums.keyStatus.valid) {
            callback(null, 'INVALIDATED');
            return;
          }
        }
        callback(null, 'UPDATED');
      }
    } catch (err) {
      callback({message: err.message, code: 'IMPORT_ERROR'});
    }
  };

  exports.ImportController = ImportController;

});
