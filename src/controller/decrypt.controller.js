/**
 * Copyright (C) 2015-2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from '../lib/lib-mvelo';
import * as l10n from '../lib/l10n';
import {getHash, mapError, dataURL2str} from '../lib/util';
import {DISPLAY_INLINE} from '../lib/constants';
import {prefs} from '../modules/prefs';
import {getKeyringWithPrivKey} from '../modules/keyring';
import * as model from '../modules/pgpModel';
import {parseMessage} from '../modules/mime';
import * as uiLog from '../modules/uiLog';
import {isCached} from '../modules/pwdCache';
import * as gmail from '../modules/gmail';
import * as sub from './sub.controller';
import {triggerSync} from './sync.controller';
import {getPreferredKeyringId} from '../modules/keyring';

export default class DecryptController extends sub.SubController {
  constructor(port) {
    super(port);
    if (!port) {
      this.mainType = 'decryptCont';
      this.id = getHash();
    }
    this.armored = null;
    this.message = null;
    this.encFileDlQueue = [];
    this.popup = null;
    this.options = {};
    this.keyringId = getPreferredKeyringId();
    // register event handlers
    this.on('decrypt-dialog-cancel', this.dialogCancel);
    this.on('decrypt-message-init', this.onDecryptMessageInit);
    this.on('decrypt-message', () => this.decrypt(this.armored, this.keyringId));
    this.on('dframe-display-popup', this.onDframeDisplayPopup);
    this.on('set-armored', this.onSetArmored);
    this.on('set-encrypted-attachments', this.onSetEncAttachements);
    this.on('decrypt-inline-user-input', msg => uiLog.push(msg.source, msg.type));
    this.on('download-enc-attachment', this.onDownloadEncAttachment);
  }

  async onDecryptMessageInit() {
    if (!this.popup) {
      const {id} = await mvelo.tabs.getActive();
      this.tabId = id;
    }
    if ((this.mainType === 'dFrame' || this.mainType === 'dAttFrame') && (!this.popup && prefs.security.display_decrypted !== DISPLAY_INLINE)) {
      this.ports.dDialog.emit('error-message', {error: l10n.get('decrypt_no_popup_error')});
    } else {
      const port = this.ports.dFrame || this.ports.decryptCont;
      // get armored message
      port && port.emit('get-armored');
      if (this.ports.dAttFrame) {
        this.ports.dAttFrame.emit('get-attachments');
      }
    }
  }

  async onDframeDisplayPopup() {
    this.popup = await mvelo.windows.openPopup(`components/decrypt-message/decryptMessage.html?id=${this.id}&embedded=false`, {width: 742, height: 550});
    this.popup.addRemoveListener(() => {
      const port = this.ports.dFrame || this.ports.dAttFrame;
      port && port.emit('dialog-cancel');
      this.popup = null;
    });
  }

  async onSetArmored(msg) {
    this.options = msg.options;
    if (msg.keyringId) {
      this.keyringId = msg.keyringId;
    }
    this.armored = msg.data;
    if (!this.ports.dFrame || this.popup || await this.canUnlockKey(this.armored, this.keyringId)) {
      this.decrypt(this.armored, this.keyringId);
    } else {
      this.ports.dDialog.emit('show-password-required');
    }
  }

  async onAuthorize() {
    const accessToken = await gmail.authorize(this.userEmail, gmail.GMAIL_SCOPE_READONLY);
    if (accessToken) {
      if (this.encFileDlQueue.length) {
        for (const fileName of this.encFileDlQueue) {
          this.onDownloadEncAttachment({fileName});
        }
      }
      this.activateComponent();
      return true;
    }
  }

  activateComponent() {
    if (this.popup) {
      this.popup.activate();
    } else {
      mvelo.tabs.activate({id: this.tabId});
    }
  }

  async onSetEncAttachements({userEmail, msgId, encAttFileNames}) {
    this.userEmail = userEmail;
    this.msgId = msgId;
    // auto start encryption of PGP/MIME attachment
    if (encAttFileNames.includes('encrypted.asc')) {
      const [pgpMimeFileName] = encAttFileNames.splice(encAttFileNames.indexOf('encrypted.asc'), 1);
      await this.displayPGPMimeAttachment(userEmail, msgId, pgpMimeFileName);
    }
    this.encAttFileNames = encAttFileNames;
    this.ports.dDialog.emit('set-enc-attachments', {encAtts: encAttFileNames});
  }

  async displayPGPMimeAttachment(userEmail, msgId, fileName) {
    const scope = gmail.GMAIL_SCOPE_READONLY;
    const accessToken = await gmail.getAccessToken(userEmail, scope);
    if (!accessToken) {
      if (!this.encFileDlQueue.includes(fileName)) {
        this.encFileDlQueue.push(fileName);
      }
      this.openAuthorizeDialog(scope);
    } else {
      const {data} = await gmail.getAttachment({fileName, email: this.userEmail, msgId: this.msgId, accessToken});
      const armored = dataURL2str(data);
      this.armored = armored;
      await this.decrypt(armored, this.keyringId);
    }
  }

  async onDownloadEncAttachment({fileName}) {
    const inQeue = this.encFileDlQueue.includes(fileName);
    // remove error modal and show spinner when continuing attachment decryption
    if (inQeue) {
      this.ports.dDialog.emit('waiting');
    }
    if (fileName === 'encrypted.asc') {
      return this.displayPGPMimeAttachment(this.userEmail, this.msgId, fileName);
    }
    const scope = gmail.GMAIL_SCOPE_READONLY;
    const accessToken = await gmail.getAccessToken(this.userEmail, scope);
    if (!accessToken) {
      if (!inQeue) {
        this.encFileDlQueue.push(fileName);
      }
      this.openAuthorizeDialog(scope);
    } else {
      const {data} = await gmail.getAttachment({fileName, email: this.userEmail, msgId: this.msgId, accessToken});
      try {
        const attachment = await model.decryptFile({
          encryptedFile: {content: data, name: fileName},
          unlockKey: this.unlockKey.bind(this),
          uiLogSource: 'security_log_viewer'
        });
        if (this.encFileDlQueue.includes(fileName)) {
          this.encFileDlQueue.splice(this.encFileDlQueue.indexOf(fileName), 1);
        }
        this.ports.dDialog.emit('add-decrypted-attachment', {attachment: {...attachment, encFileName: fileName}});
      } catch (error) {
        this.ports.dDialog.emit('error-message', {error: error.message});
      }
    }
  }

  openAuthorizeDialog(scope) {
    this.ports.dDialog.emit('error-message', {error: 'Mailvelope ist zum Herunterladen von Anhängen nicht authorisiert!'});
    gmail.openAuthorizeDialog({email: this.userEmail, scope, ctrlId: this.id});
  }

  async canUnlockKey(armoredText, keyringId) {
    try {
      this.message = await model.readMessage({armoredText});
      const encryptionKeyIds = this.message.getEncryptionKeyIds();
      const keyring = getKeyringWithPrivKey(encryptionKeyIds, keyringId);
      if (!keyring) {
        throw model.noKeyFoundError(encryptionKeyIds);
      }
      const key = keyring.getPrivateKeyByIds(encryptionKeyIds);
      const isKeyCached = isCached(key.primaryKey.getFingerprint());
      return isKeyCached;
    } catch (error) {
      if (this.ports.dDialog) {
        this.ports.dDialog.emit('error-message', {error: error.message});
      }
    }
  }

  dialogCancel() {
    // forward event to decrypt frame
    const port = this.ports.dFrame || this.ports.dAttFrame;
    if (port) {
      port.emit('dialog-cancel');
    }
    if (this.popup) {
      this.popup.close();
      this.popup = null;
    } else {
      this.ports.dDialog.emit('show-password-required');
    }
  }

  async decrypt(armored, keyringId) {
    if (!armored && this.encFileDlQueue.includes('encrypted.asc')) {
      return this.displayPGPMimeAttachment(this.userEmail, this.msgId, 'encrypted.asc');
    }
    try {
      const {data, signatures} = await model.decryptMessage({
        message: this.message,
        armored,
        keyringId,
        unlockKey: this.unlockKey.bind(this),
        senderAddress: this.options.senderAddress,
        uiLogSource: 'security_log_viewer'
      });
      const ports = this.ports;
      const handlers = {
        noEvent: true,
        onMessage(msg) {
          this.noEvent = false;
          ports.dDialog.emit('decrypted-message', {message: msg});
        },
        onAttachment(attachment) {
          this.noEvent = false;
          ports.dDialog.emit('add-decrypted-attachment', {attachment});
        }
      };
      if (this.ports.dDialog && signatures) {
        this.ports.dDialog.emit('signature-verification', {signers: signatures});
      }
      await parseMessage(data, handlers, 'html');
      if (this.ports.decryptCont) {
        this.ports.decryptCont.emit('decrypt-done');
      }
    } catch (error) {
      if (error.code === 'PWD_DIALOG_CANCEL') {
        if (this.ports.dFrame) {
          return this.dialogCancel();
        }
      }
      if (this.ports.dDialog) {
        this.ports.dDialog.emit('error-message', {error: error.message});
      }
      if (this.ports.decryptCont) {
        let err = error;
        switch (error.code) {
          case 'ARMOR_PARSE_ERROR':
          case 'PWD_DIALOG_CANCEL':
          case 'NO_KEY_FOUND':
            err = mapError(err);
            break;
          default:
            err = {
              // don't expose internal errors to API
              code: 'DECRYPT_ERROR',
              message: 'Generic decrypt error'
            };
        }
        this.ports.decryptCont.emit('error-message', {error: err});
      }
    }
  }

  async unlockKey({key, message}) {
    const pwdControl = sub.factory.get('pwdDialog');
    const openPopup = this.ports.decryptCont || (!this.popup && this.ports.dDialog);
    const beforePasswordRequest = id => this.popup && this.ports.dDialog.emit('show-pwd-dialog', {id});
    const unlockedKey = await pwdControl.unlockKey({
      key,
      message,
      reason: 'PWD_DIALOG_REASON_DECRYPT',
      openPopup,
      beforePasswordRequest
    });
    if (this.popup) {
      this.ports.dDialog.emit('hide-pwd-dialog');
    }
    triggerSync({keyringId: this.keyringId, key: unlockedKey.key, password: unlockedKey.password});
    return unlockedKey.key;
  }
}
