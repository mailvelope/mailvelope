/**
 * Mailvelope - secure email with OpenPGP encryption for Webmail
 * Copyright (C) 2015  Thomas Oberndörfer
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
  var uiLog = require('../uiLog');
  var pwdCache = require('../pwdCache');

  function PrivateKeyController(port) {
    sub.SubController.call(this, port);
    this.keyring = require('../keyring');
    this.done = null;
    this.keyringId = null;
    this.options = null;
    this.backupCodePopup = null;
    this.host = null;
    this.keyBackup = null;
    this.pwdControl = null;
    this.initialSetup = true;
    this.restorePassword = false;
  }

  PrivateKeyController.prototype = Object.create(sub.SubController.prototype);

  PrivateKeyController.prototype.generateKey = function(password, options) {
    var that = this;
    if (options.keySize !== 2048 && options.keySize !== 4096) {
      this.ports.keyGenDialog.postMessage({event: 'show-password'});
      this.ports.keyGenCont.postMessage({event: 'generate-done', error: {message: 'Invalid key length', code: 'KEY_LENGTH_INVALID'}});
      return;
    }
    this.ports.keyGenDialog.postMessage({event: 'show-waiting'});
    this.keyring.getById(this.keyringId).generateKey({
      userIds: options.userIds,
      numBits: options.keySize,
      passphrase: password
    }, function(err, data) {
      pwdCache.set({keyid: data.key.primaryKey.getKeyId().toHex(), key: data.key}, password, 5);
      that.ports.keyGenCont.postMessage({event: 'generate-done', publicKey: data.publicKeyArmored, error: err});
    });
  };

  PrivateKeyController.prototype.createPrivateKeyBackup = function() {
    var that = this;
    var primaryKey = this.keyring.getById(this.keyringId).getPrimaryKey();
    if (!primaryKey) {
      throw { message: 'No private key for backup', code: 'NO_PRIVATE_KEY' };
    }
    this.pwdControl = sub.factory.get('pwdDialog');
    this.pwdControl.unlockCachedKey({
      message: primaryKey,
      reason: 'PWD_DIALOG_REASON_CREATE_BACKUP'
    })
      .then(function(primaryKey) {
        that.keyBackup = that.model.createPrivateKeyBackup(primaryKey.key, primaryKey.password);
      })
      .then(function() {
        return that.getSyncController().backup(that.keyBackup.message);
      })
      .then(function(syncResult) {
        var page = 'recoverySheet';
        switch (that.host) {
          case 'webde':
            page += '.webde.html';
            break;
          case 'gmx':
            page += '.gmxnet.html';
            break;
          default:
            page += '.html';
        }
        var path = 'common/ui/modal/recoverySheet/' + page;
        that.mvelo.windows.openPopup(path + '?id=' + that.id, {width: 1024, height: 550, modal: false}, function(window) {
          that.backupCodePopup = window;
        });
      })
      .catch(function(err) {
        that.ports.keyBackupDialog.postMessage({event: 'error-message', error: err});
      });
  };

  PrivateKeyController.prototype.restorePrivateKeyBackup = function(code) {
    //console.log('PrivateKeyController.prototype.restorePrivateKeyBackup()', code);
    var that = this;

    this.getSyncController().restore()
      .then(function(data) {
        var backup = that.model.restorePrivateKeyBackup(data.backup, code);
        if (backup.error) {
          if (backup.error.code === 'WRONG_RESTORE_CODE') {
            that.ports.restoreBackupDialog.postMessage({event: 'error-message', error: backup.error});
          } else {
            that.ports.restoreBackupCont.postMessage({event: 'restore-backup-done', error: backup.error});
          }
          return;
        }
        var result = that.keyring.getById(that.keyringId).importKeys([{armored: backup.key.armor(), type: 'private'}]);
        for (var i = 0; i < result.length; i++) {
          if (result[i].type === 'error') {
            that.ports.restoreBackupCont.postMessage({event: 'restore-backup-done', error: result[i].message});
            return;
          }
        }
        if (that.restorePassword) {
          that.ports.restoreBackupDialog.postMessage({event: 'set-password', password: backup.password});
        }
        that.ports.restoreBackupCont.postMessage({event: 'restore-backup-done', data: backup.key.toPublic().armor()});
      })
      .catch(function(err) {
        that.ports.restoreBackupDialog.postMessage({event: 'error-message', error: err});
      });
  };

  PrivateKeyController.prototype.getLogoImage = function() {
    var attr = this.keyring.getById(this.keyringId).getAttributes();
    return (attr && attr.logo_data_url) ? attr.logo_data_url : null;
  };

  PrivateKeyController.prototype.getBackupCode = function() {
    return this.keyBackup.backupCode;
  };

  PrivateKeyController.prototype.getSyncController = function() {
    var that = this;
    return sub.getByMainType('syncHandler').filter(function(obj) {
      return obj.keyringId === that.keyringId;
    })[0];
  };

  PrivateKeyController.prototype.handlePortMessage = function(msg) {
    switch (msg.event) {
      case 'set-init-data':
        var data = msg.data;
        this.keyringId = data.keyringId || this.keyringId;
        this.restorePassword = data.restorePassword || this.restorePassword;
        break;
      case 'keygen-user-input':
        uiLog.push(msg.source, msg.type);
        break;
      case 'open-security-settings':
        this.openSecuritySettings();
        break;
      case 'generate-key':
        this.keyringId = msg.keyringId;
        this.options = msg.options;
        this.ports.keyGenDialog.postMessage({event: 'check-dialog-inputs'});
        break;
      case 'set-keybackup-window-props':
        this.keyringId = msg.keyringId;
        this.host = msg.host;
        this.initialSetup = msg.initialSetup;
        break;
      case 'input-check':
        if (msg.isValid) {
          this.generateKey(msg.pwd, this.options);
        } else {
          this.ports.keyGenCont.postMessage({event: 'generate-done', error: {message: 'The inputs "password" and "confirm" are not valid', code: 'INPUT_NOT_VALID'}});
        }
        break;
      case 'keygen-dialog-init':
        this.ports.keyGenCont.postMessage({event: 'dialog-done'});
        break;
      case 'keybackup-dialog-init':
        this.ports.keyBackupDialog.postMessage({event: 'set-init-data', data: {initialSetup: this.initialSetup}});
        this.ports.keyBackupCont.postMessage({event: 'dialog-done'});
        break;
      case 'restore-backup-dialog-init':
        this.ports.restoreBackupCont.postMessage({event: 'dialog-done'});
        break;
      case 'restore-backup-code':
        this.restorePrivateKeyBackup(msg.code);
        break;
      case 'backup-code-window-init':
        this.ports.keyBackupCont.postMessage({event: 'popup-isready', backup: this.keyBackup.message});
        break;
      case 'get-logo-image':
        this.ports.backupCodeWindow.postMessage({event: 'set-logo-image', image: this.getLogoImage()});
        break;
      case 'get-backup-code':
        this.ports.backupCodeWindow.postMessage({event: 'set-backup-code', backupCode: this.getBackupCode()});
        break;
      case 'create-backup-code-window':
        try {
          this.createPrivateKeyBackup();
        } catch (err) {
          this.ports.keyBackupCont.postMessage({event: 'popup-isready', error: err});
        }
        break;
      case 'error-message':
        if (msg.sender.indexOf('keyBackupDialog') >= 0) {
          this.ports.keyBackupCont.postMessage({event: 'error-message', error: msg.err});
        }
        break;
      default:
        console.log('unknown event', msg);
    }
  };

  exports.PrivateKeyController = PrivateKeyController;

});
