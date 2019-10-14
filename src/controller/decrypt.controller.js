/**
 * Copyright (C) 2015-2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from '../lib/lib-mvelo';
import * as l10n from '../lib/l10n';
import {getHash, mapError, dataURL2str, normalizeArmored} from '../lib/util';
import {extractFileExtension} from '../lib/file';
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
import {lookupKey} from './import.controller';

export default class DecryptController extends sub.SubController {
  constructor(port) {
    super(port);
    if (!port) {
      this.mainType = 'decryptCont';
      this.id = getHash();
    }
    this.armored = null;
    this.message = null;
    this.actionQueue = [];
    this.popup = null;
    this.options = {};
    this.keyringId = getPreferredKeyringId();
    // register event handlers
    this.on('decrypt-dialog-cancel', this.dialogCancel);
    this.on('decrypt-message-init', this.onDecryptMessageInit);
    this.on('decrypt-message', this.onDecrypt);
    this.on('dframe-display-popup', this.onDframeDisplayPopup);
    this.on('set-armored', this.onSetArmored);
    this.on('set-data', this.onSetData);
    this.on('decrypt-inline-user-input', msg => uiLog.push(msg.source, msg.type));
    this.on('download-enc-attachment', this.onDownloadEncAttachment);
  }

  async onDecryptMessageInit() {
    if (!this.popup) {
      const tab = await mvelo.tabs.getActive();
      if (tab) {
        this.tabId = tab.id;
      }
    }
    if ((this.mainType === 'dFrame' || this.mainType === 'dAttFrame') && (!this.popup && prefs.security.display_decrypted !== DISPLAY_INLINE)) {
      this.ports.dDialog.emit('error-message', {error: l10n.get('decrypt_no_popup_error')});
    } else {
      const port = this.ports.dFrame || this.ports.decryptCont;
      // get armored message
      port && port.emit('get-armored');
      if (this.ports.dAttFrame) {
        this.ports.dAttFrame.emit('get-data');
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

  onDecrypt() {
    if (this.armored) {
      this.decrypt(this.armored, this.keyringId);
    } else {
      this.executeActionQueue();
    }
  }

  async onSetArmored(msg, preventUnlock = false) {
    this.options = msg.options;
    if (msg.keyringId) {
      this.keyringId = msg.keyringId;
    }
    this.armored = msg.data;
    if (!preventUnlock && (!this.ports.dFrame || this.popup || await this.canUnlockKey(this.armored, this.keyringId))) {
      await this.decrypt(this.armored, this.keyringId);
    } else {
      this.ports.dDialog.emit('lock');
    }
  }

  async onAuthorize() {
    try {
      const accessToken = await gmail.authorize(this.userEmail, [gmail.GMAIL_SCOPE_READONLY, gmail.GMAIL_SCOPE_SEND]);
      this.ports.dDialog.emit('hide-error-message');
      this.executeActionQueue(accessToken);
    } catch (e) {
      this.ports.dDialog.emit('error-message', {error: e.messageText});
    }
    this.activateComponent();
  }

  async executeActionQueue(accessToken) {
    const scopes = [gmail.GMAIL_SCOPE_READONLY, gmail.GMAIL_SCOPE_SEND];
    if (!accessToken) {
      accessToken = await gmail.getAccessToken(this.userEmail, scopes);
    }
    if (!accessToken) {
      this.openAuthorizeDialog(scopes);
    } else {
      if (this.actionQueue.length) {
        for (const action of this.actionQueue) {
          if (action.type === 'clipped') {
            this.onClippedArmored(this.msgId, this.userEmail, accessToken, true);
          }
          if (action.type === 'attachment') {
            this.onDownloadEncAttachment({fileName: action.options.fileName, accessToken});
          }
          if (action.type === 'ascAttachments') {
            const ascFileNames = this.encAttFileNames.filter(fileName => extractFileExtension(fileName) === 'asc');
            this.onAscAttachments(ascFileNames, accessToken, true);
          }
          this.actionQueue.splice(this.actionQueue.findIndex(({type}) => type === action.type), 1);
        }
      }
    }
  }

  async registerAction(action, options) {
    const inQeue = this.actionQueue.some(({type}) => type === action);
    if (!inQeue) {
      this.actionQueue.push({type: action, options});
    }
    if (!this.tabId) {
      const {id} = await mvelo.tabs.getActive();
      this.tabId = id;
    }
  }

  activateComponent() {
    if (this.popup) {
      this.popup.activate();
    } else {
      mvelo.tabs.activate({id: this.tabId});
    }
  }

  async onSetData({userEmail, msgId, sender, armored, clearText, clipped, encAttFileNames}) {
    this.userEmail = userEmail;
    this.msgId = msgId;
    if (armored) {
      await this.onSetArmored({data: armored, options: {senderAddress: sender[0]}});
    }
    if (clearText) {
      this.ports.dDialog.emit('decrypted-message', {message: clearText, clearText: true});
    }
    this.encAttFileNames = encAttFileNames;
    const encFileNames = encAttFileNames.filter(fileName => extractFileExtension(fileName) !== 'asc');
    this.ports.dDialog.emit('set-enc-attachments', {encAtts: encFileNames});
    const scopes = [gmail.GMAIL_SCOPE_READONLY, gmail.GMAIL_SCOPE_SEND];
    const accessToken = await gmail.getAccessToken(userEmail, scopes);
    if (clipped) {
      if (!accessToken) {
        this.registerAction('clipped');
        this.ports.dDialog.emit('lock');
      } else {
        await this.onClippedArmored(msgId, userEmail, accessToken);
      }
    }
    const ascFileNames = encAttFileNames.filter(fileName => extractFileExtension(fileName) === 'asc');
    if (ascFileNames.length) {
      if (!accessToken) {
        this.registerAction('ascAttachments');
        this.ports.dDialog.emit('lock');
      } else {
        await this.onAscAttachments(ascFileNames, accessToken);
      }
    }
    this.ports.dDialog.emit('waiting', {waiting: false});
  }

  async onAscAttachments(fileNames, accessToken, forceUnlock = false) {
    const {mimeType} = await gmail.getMessageMimeType({msgId: this.msgId, email: this.userEmail, accessToken});
    let ascFileName;
    if (mimeType === 'multipart/encrypted' || mimeType === 'multipart/signed') {
      const {payload} = await gmail.getMessage({email: this.userEmail, msgId: this.msgId, accessToken, format: 'metadata', metaHeaders: ['from']});
      const {email: senderAddress} = gmail.parseEmailAddress(gmail.extractMailHeader(payload, 'From'));
      const options = {
        senderAddress
      };
      if (mimeType === 'multipart/encrypted') {
        ascFileName = fileNames.find(fileName => fileName === 'encrypted.asc') || fileNames[0];
      } else {
        ascFileName = fileNames.find(fileName => fileName === 'signature.asc') || fileNames[0];
        const {raw} = await gmail.getMessage({msgId: this.msgId, email: this.userEmail, accessToken, format: 'raw'});
        const {signedMessage, message} = await gmail.extractSignedClearTextMultipart(raw);
        options.signedText = signedMessage;
        options.plainText = message;
      }
      const {data} = await gmail.getAttachment({fileName: ascFileName, email: this.userEmail, msgId: this.msgId, accessToken});
      const armored = dataURL2str(data);
      let preventUnlock = false;
      if (mimeType === 'multipart/encrypted' && !forceUnlock) {
        preventUnlock = !await this.canUnlockKey(armored, this.keyringId);
      }
      await this.onSetArmored({data: armored, options}, preventUnlock);
    }
    if (ascFileName) {
      this.encAttFileNames.splice(this.encAttFileNames.findIndex(fileName => fileName === ascFileName), 1);
    }
    this.ports.dDialog.emit('set-enc-attachments', {encAtts: this.encAttFileNames});
  }

  async onClippedArmored(msgId, userEmail, accessToken, forceUnlock = false) {
    let armored = '';
    let sender = '';
    const {payload} = await gmail.getMessage({msgId, email: userEmail, accessToken});
    const messageText = await gmail.extractMailBody({payload, userEmail, msgId, accessToken});
    if (/BEGIN\sPGP\sMESSAGE/.test(messageText)) {
      armored = normalizeArmored(messageText, /-----BEGIN PGP MESSAGE-----[\s\S]+?-----END PGP MESSAGE-----/);
      ({email: sender} = gmail.parseEmailAddress(gmail.extractMailHeader(payload, 'From')));
    }
    let preventUnlock = false;
    if (!forceUnlock) {
      preventUnlock = !await this.canUnlockKey(armored, this.keyringId);
    }
    await this.onSetArmored({data: armored, options: {senderAddress: sender}}, preventUnlock);
  }

  async onDownloadEncAttachment({fileName, accessToken}) {
    const scopes = [gmail.GMAIL_SCOPE_READONLY, gmail.GMAIL_SCOPE_SEND];
    if (!accessToken) {
      accessToken = await gmail.getAccessToken(this.userEmail, scopes);
    }
    if (!accessToken) {
      this.registerAction('attachment', {fileName});
      this.openAuthorizeDialog(scopes);
    } else {
      const {data} = await gmail.getAttachment({fileName, email: this.userEmail, msgId: this.msgId, accessToken});
      const armored = dataURL2str(data);
      try {
        if (/-----BEGIN\sPGP\sPUBLIC\sKEY\sBLOCK/.test(armored)) {
          await this.importKey(armored);
        } else {
          const attachment = await model.decryptFile({
            encryptedFile: {content: data, name: fileName},
            unlockKey: this.unlockKey.bind(this),
            uiLogSource: 'security_log_viewer'
          });
          this.ports.dDialog.emit('add-decrypted-attachment', {attachment: {...attachment, encFileName: fileName}});
        }
      } catch (error) {
        this.ports.dDialog.emit('error-message', {error: error.message});
      }
    }
  }

  openAuthorizeDialog(scopes) {
    this.ports.dDialog.emit('error-message', {error: l10n.get('gmail_integration_auth_error_download')});
    gmail.openAuthorizeDialog({email: this.userEmail, scopes, ctrlId: this.id});
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
      this.ports.dDialog.emit('lock');
    }
  }

  async decrypt(armored, keyringId) {
    this.ports.dDialog.emit('waiting', {waiting: true});
    try {
      if (/-----BEGIN\sPGP\sSIGNATURE/.test(armored)) {
        const {signatures} = await model.verifyDetachedSignature({
          plaintext: this.options.signedText,
          signerEmail: this.options.senderAddress,
          detachedSignature: armored,
          keyringId,
          lookupKey: () => lookupKey({keyringId, email: this.options.senderAddress})
        });
        this.ports.dDialog.emit('verified-message', {
          message: this.options.plainText,
          signers: signatures
        });
      } else {
        const {data, signatures} = await model.decryptMessage({
          message: this.message,
          armored,
          keyringId,
          unlockKey: this.unlockKey.bind(this),
          senderAddress: this.options.senderAddress,
          uiLogSource: 'security_log_viewer',
          lookupKey: () => lookupKey({keyringId, email: this.options.senderAddress})
        });
        const ports = this.ports;
        const handlers = {
          noEvent: true,
          onMessage(msg) {
            this.noEvent = false;
            ports.dDialog.emit('decrypted-message', {message: msg, clearText: false});
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
    this.ports.dDialog.emit('waiting', {waiting: false});
  }

  async importKey(armored) {
    const importControl = sub.factory.get('importKeyDialog');
    const result = await importControl.importKey(this.keyringId, armored);
    if (result === 'IMPORTED' || result === 'UPDATED') {
      this.ports.dDialog.emit('show-notification', {
        message: 'key_import_bulk_success',
        type: 'success',
        autoHide: true,
        hideDelay: 2000,
        dismissable: false
      });
    }
    this.ports.dDialog.emit('waiting', {waiting: false});
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
