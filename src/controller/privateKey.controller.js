/**
 * Copyright (C) 2015-2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from '../lib/lib-mvelo';
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
    // register event handlers
    this.on('set-init-data', this.setInitData);
    this.on('keygen-user-input', this.onUserInput);
    this.on('key-backup-user-input', this.onUserInput);
    this.on('generate-key', this.onGenerateKey);
    this.on('generate-confirm', this.onGenerateConfirm);
    this.on('generate-reject', this.onGenerateReject);
    this.on('set-keybackup-window-props', this.setKeybackupProps);
    this.on('input-check', this.onInputCheck);
    this.on('keygen-dialog-init', () => this.ports.keyGenCont.emit('dialog-done'));
    this.on('keybackup-dialog-init', this.onKeybackDialogInit);
    this.on('restore-backup-dialog-init', () => this.ports.restoreBackupCont.emit('dialog-done'));
    this.on('restore-backup-code', msg => this.restorePrivateKeyBackup(msg.code));
    this.on('backup-code-window-init', () => this.ports.keyBackupCont.emit('popup-isready'));
    this.on('get-logo-image', () => this.ports.backupCodeWindow.emit('set-logo-image', {image: this.getLogoImage()}));
    this.on('get-backup-code', () => this.ports.backupCodeWindow.emit('set-backup-code', {backupCode: this.getBackupCode()}));
    this.on('create-backup-code-window', this.createBackupCodeWindow);
  }

  setInitData({data}) {
    this.keyringId = data.keyringId || this.keyringId;
    this.restorePassword = data.restorePassword || this.restorePassword;
  }

  onUserInput(msg) {
    uiLog.push(msg.source, msg.type);
  }

  onGenerateKey(msg) {
    this.keyringId = msg.keyringId;
    this.options = msg.options;
    this.ports.keyGenDialog.emit('check-dialog-inputs');
  }

  onGenerateConfirm() {
    if (this.rejectTimer) {
      clearTimeout(this.rejectTimer);
      this.rejectTimer = 0;
    }
  }

  onGenerateReject() {
    if (this.rejectTimer) {
      clearTimeout(this.rejectTimer);
      this.rejectTimer = 0;
      this.rejectKey(this.newKeyId);
    }
  }

  setKeybackupProps(msg) {
    this.keyringId = msg.keyringId;
    this.host = msg.host;
    this.initialSetup = msg.initialSetup;
  }

  onInputCheck(msg) {
    if (msg.isValid) {
      this.generateKey(msg.pwd, this.options);
    } else {
      this.ports.keyGenCont.emit('generate-done', {error: {message: 'The inputs "password" and "confirm" are not valid', code: 'INPUT_NOT_VALID'}});
    }
  }

  onKeybackDialogInit() {
    this.ports.keyBackupDialog.emit('set-init-data', {data: {initialSetup: this.initialSetup}});
    this.ports.keyBackupCont.emit('dialog-done');
  }

  createBackupCodeWindow() {
    try {
      this.createPrivateKeyBackup();
    } catch (err) {
      this.ports.keyBackupCont.emit('popup-isready', {error: err});
    }
  }

  generateKey(password, options) {
    if (options.keySize !== 2048 && options.keySize !== 4096) {
      this.ports.keyGenDialog.emit('show-password');
      this.ports.keyGenCont.emit('generate-done', {error: {message: 'Invalid key length', code: 'KEY_LENGTH_INVALID'}});
      return;
    }
    this.ports.keyGenDialog.emit('show-waiting');
    getKeyringById(this.keyringId).generateKey({
      userIds: options.userIds,
      numBits: options.keySize,
      passphrase: password,
      unlocked: true
    }).then(data => {
      this.ports.keyGenCont.emit('generate-done', {publicKey: data.publicKeyArmored});
      if (prefs.security.password_cache) {
        pwdCache.set({key: data.key, password});
      }
      if (options.confirmRequired) {
        this.newKeyId = data.key.primaryKey.keyid.toHex();
        this.rejectTimer = setTimeout(() => {
          this.rejectKey(this.newKeyId);
          this.rejectTimer = 0;
        }, 10000); // trigger timeout after 10s
      }
    }).catch(err => {
      this.ports.keyGenCont.emit('generate-done', {error: err});
    });
  }

  rejectKey() {
    getKeyringById(this.keyringId).removeKey(this.newKeyId, 'private');
    if (prefs.security.password_cache) {
      pwdCache.delete(this.newKeyId);
    }
  }

  createPrivateKeyBackup() {
    const primaryKey = getKeyringById(this.keyringId).getPrimaryKey();
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
      return createPrivateKeyBackup(primaryKey.key, primaryKey.password);
    })
    .then(keyBackup => this.keyBackup = keyBackup)
    .then(() => sync.getByKeyring(this.keyringId).backup({backup: this.keyBackup.message}))
    .then(() => {
      let page = 'recoverySheet';

      switch (this.host) {
        case 'web.de':
          page += `${'.1und1.html?brand=webde' + '&id='}${this.id}`;
          break;
        case 'gmx.net':
        case 'gmx.com':
        case 'gmx.co.uk':
        case 'gmx.fr':
        case 'gmx.es':
          page += `${'.1und1.html?brand=gmx' + '&id='}${this.id}`;
          break;
        default:
          page += `${'.html' + '?id='}${this.id}`;
          break;
      }

      const path = `components/recovery-sheet/${page}`;
      mvelo.windows.openPopup(path, {width: 1024, height: 550})
      .then(popup => {
        this.backupCodePopup = popup;
        popup.addRemoveListener(() => this.backupCodePopup = null);
      });
    })
    .catch(err => {
      this.ports.keyBackupDialog.emit('error-message', {error: err});
    });
  }

  restorePrivateKeyBackup(code) {
    let backup;
    sync.getByKeyring(this.keyringId).restore()
    .then(data => restorePrivateKeyBackup(data.backup, code))
    .then(keyBackup => backup = keyBackup)
    .then(() => getKeyringById(this.keyringId).importKeys([{armored: backup.key.armor(), type: 'private'}]))
    .then(result => {
      for (let i = 0; i < result.length; i++) {
        if (result[i].type === 'error') {
          throw result[i].message;
        }
      }
      if (this.restorePassword) {
        this.ports.restoreBackupDialog.emit('set-password', {password: backup.password});
      }
      this.ports.restoreBackupCont.emit('restore-backup-done', {data: backup.key.toPublic().armor()});
      sync.triggerSync({keyringId: this.keyringId, key: backup.key, password: backup.password});
    })
    .catch(err => {
      this.ports.restoreBackupDialog.emit('error-message', {error: err});
      if (err.code !== 'WRONG_RESTORE_CODE') {
        this.ports.restoreBackupCont.emit('restore-backup-done', {error: err});
      }
    });
  }

  getLogoImage() {
    const attr = getKeyringById(this.keyringId).getAttributes();
    return (attr && attr.logo_data_url) ? attr.logo_data_url : null;
  }

  getBackupCode() {
    return this.keyBackup.backupCode;
  }
}
