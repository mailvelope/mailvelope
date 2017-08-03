/**
 * Copyright (C) 2015-2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

'use strict';


import mvelo from 'lib-mvelo';
import {prefs} from '../modules/prefs';
import * as  sub from './sub.controller';
import * as uiLog from '../modules/uiLog';
import * as pwdCache from '../modules/pwdCache';
import * as sync from './sync.controller';
import {getById as getKeyringById} from '../modules/keyring';
import {createPrivateKeyBackup, restorePrivateKeyBackup} from '../modules/pgpModel';

export default class PrivateKeyController extends sub.SubController {
  constructor(port) {
    super(port);
    this.done = null;
    this.keyringId = null;
    this.options = null;
    this.backupCodePopup = null;
    this.host = null;
    this.keyBackup = null;
    this.pwdControl = null;
    this.initialSetup = true;
    this.restorePassword = false;
    this.newKeyId = '';
    this.rejectTimer = 0;
  }

  generateKey(password, options) {
    var that = this;
    if (options.keySize !== 2048 && options.keySize !== 4096) {
      this.ports.keyGenDialog.postMessage({event: 'show-password'});
      this.ports.keyGenCont.postMessage({event: 'generate-done', error: {message: 'Invalid key length', code: 'KEY_LENGTH_INVALID'}});
      return;
    }
    this.ports.keyGenDialog.postMessage({event: 'show-waiting'});
    getKeyringById(this.keyringId).generateKey({
      userIds: options.userIds,
      numBits: options.keySize,
      passphrase: password
    }).then(data => {
      that.ports.keyGenCont.postMessage({event: 'generate-done', publicKey: data.publicKeyArmored});
      if (prefs.security.password_cache) {
        pwdCache.set({key: data.key}, password);
      }
      if (options.confirmRequired) {
        that.newKeyId = data.key.primaryKey.keyid.toHex();
        that.rejectTimer = mvelo.util.setTimeout(() => {
          that.rejectKey(that.newKeyId);
          that.rejectTimer = 0;
        }, 10000); // trigger timeout after 10s
      }
    }).catch(err => {
      that.ports.keyGenCont.postMessage({event: 'generate-done', error: err});
    });
  }

  rejectKey() {
    getKeyringById(this.keyringId).removeKey(this.newKeyId, 'private');
    if (prefs.security.password_cache) {
      pwdCache.delete(this.newKeyId);
    }
  }

  createPrivateKeyBackup() {
    var that = this;
    var primaryKey = getKeyringById(this.keyringId).getPrimaryKey();
    if (!primaryKey) {
      throw {message: 'No private key for backup', code: 'NO_PRIVATE_KEY'};
    }
    this.pwdControl = sub.factory.get('pwdDialog');
    primaryKey.reason = 'PWD_DIALOG_REASON_CREATE_BACKUP';
    primaryKey.keyringId = this.keyringId;
    // get password from cache or ask user
    this.pwdControl.unlockKey(primaryKey)
    .then(primaryKey => {
      sync.triggerSync(primaryKey);
      that.keyBackup = createPrivateKeyBackup(primaryKey.key, primaryKey.password);
    })
    .then(() => sync.getByKeyring(that.keyringId).backup({backup: that.keyBackup.message}))
    .then(() => {
      var page = 'recoverySheet';

      switch (that.host) {
        case 'web.de':
          page += '.1und1.html?brand=webde' + '&id=' + that.id;
          break;
        case 'gmx.net':
        case 'gmx.com':
        case 'gmx.co.uk':
        case 'gmx.fr':
        case 'gmx.es':
          page += '.1und1.html?brand=gmx' + '&id=' + that.id;
          break;
        default:
          page += '.html' + '?id=' + that.id;
          break;
      }

      var path = 'components/recovery-sheet/' + page;
      mvelo.windows.openPopup(path, {width: 1024, height: 550, modal: false}, window => {
        that.backupCodePopup = window;
      });
    })
    .catch(err => {
      that.ports.keyBackupDialog.postMessage({event: 'error-message', error: err});
    });
  }

  restorePrivateKeyBackup(code) {
    let backup;
    sync.getByKeyring(this.keyringId).restore()
    .then(data => {
      backup = restorePrivateKeyBackup(data.backup, code);
      if (backup.error) {
        throw backup.error;
      }
      return getKeyringById(this.keyringId).importKeys([{armored: backup.key.armor(), type: 'private'}]);
    })
    .then(result => {
      for (var i = 0; i < result.length; i++) {
        if (result[i].type === 'error') {
          throw result[i].message;
        }
      }
      if (this.restorePassword) {
        this.ports.restoreBackupDialog.postMessage({event: 'set-password', password: backup.password});
      }
      this.ports.restoreBackupCont.postMessage({event: 'restore-backup-done', data: backup.key.toPublic().armor()});
      sync.triggerSync({keyringId: this.keyringId, key: backup.key, password: backup.password});
    })
    .catch(err => {
      this.ports.restoreBackupDialog.postMessage({event: 'error-message', error: err});
      if (backup.error.code !== 'WRONG_RESTORE_CODE') {
        this.ports.restoreBackupCont.postMessage({event: 'restore-backup-done', error: err});
      }
    });
  }

  getLogoImage() {
    var attr = getKeyringById(this.keyringId).getAttributes();
    return (attr && attr.logo_data_url) ? attr.logo_data_url : null;
  }

  getBackupCode() {
    return this.keyBackup.backupCode;
  }

  handlePortMessage(msg) {
    switch (msg.event) {
      case 'set-init-data':
        var data = msg.data;
        this.keyringId = data.keyringId || this.keyringId;
        this.restorePassword = data.restorePassword || this.restorePassword;
        break;
      case 'keygen-user-input':
      case 'key-backup-user-input':
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
      case 'generate-confirm':
        if (this.rejectTimer) {
          mvelo.util.clearTimeout(this.rejectTimer);
          this.rejectTimer = 0;
        }
        break;
      case 'generate-reject':
        if (this.rejectTimer) {
          mvelo.util.clearTimeout(this.rejectTimer);
          this.rejectTimer = 0;
          this.rejectKey(this.newKeyId);
        }
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
        this.ports.keyBackupCont.postMessage({event: 'popup-isready'});
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
      default:
        console.log('unknown event', msg);
    }
  }
}
