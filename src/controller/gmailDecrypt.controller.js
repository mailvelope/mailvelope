/**
 * Copyright (C) 2015-2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from '../lib/lib-mvelo';
import * as l10n from '../lib/l10n';
import {dataURL2str, normalizeArmored} from '../lib/util';
import {extractFileExtension} from '../lib/file';
import * as model from '../modules/pgpModel';
import * as gmail from '../modules/gmail';
import * as sub from './sub.controller';
import DecryptController from './decrypt.controller';
import {lookupKey} from './import.controller';

export default class gmailDecryptController extends DecryptController {
  constructor(port) {
    super(port);
    this.actionQueue = [];
    this.gmailCtrl = sub.getByMainType('gmailInt')[0];
    // register event handlers
    this.on('set-data', this.onSetData);
    this.on('download-enc-attachment', this.onDownloadEncAttachment);
  }

  async onDecryptMessageInit() {
    super.onDecryptMessageInit();
    if (this.ports.aFrameGmail) {
      this.ports.aFrameGmail.emit('get-data');
    }
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
    if (!preventUnlock && (!this.ports.dFrameGmail || this.popup || await this.canUnlockKey(this.armored, this.keyringId))) {
      if (!/-----BEGIN\sPGP\sSIGNATURE/.test(this.armored)) {
        await super.decrypt(this.armored, this.keyringId);
      } else {
        await this.verify(this.armored, this.keyringId);
      }
    } else {
      this.ports.dDialog.emit('lock');
    }
  }

  authorize(scopes) {
    this.ports.dDialog.emit('error-message', {error: l10n.get('gmail_integration_auth_error_download')});
    this.gmailCtrl.openAuthorizeDialog({email: this.userEmail, scopes, ctrlId: this.id});
  }

  onAuthorized({error, accessToken}) {
    if (!error) {
      this.ports.dDialog.emit('hide-error-message');
      this.executeActionQueue(accessToken);
    } else {
      this.ports.dDialog.emit('error-message', {error: error.messageText});
    }
    this.activateComponent();
  }

  async executeActionQueue(accessToken) {
    const scopes = [gmail.GMAIL_SCOPE_READONLY, gmail.GMAIL_SCOPE_SEND];
    if (!accessToken) {
      accessToken = await this.gmailCtrl.checkAuthorization(this.userEmail, scopes);
    }
    if (!accessToken) {
      this.authorize(scopes);
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
    if (encFileNames.length) {
      this.ports.dDialog.emit('set-enc-attachments', {encAtts: encFileNames});
    }
    const scopes = [gmail.GMAIL_SCOPE_READONLY, gmail.GMAIL_SCOPE_SEND];
    const accessToken = await this.gmailCtrl.checkAuthorization(this.userEmail, scopes);
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
    this.ports.dDialog.emit('waiting', {waiting: false, unlock: accessToken ? true : false});
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
      accessToken = await this.gmailCtrl.checkAuthorization(this.userEmail, scopes);
    }
    if (!accessToken) {
      this.registerAction('attachment', {fileName});
      this.authorize(scopes);
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

  async verify(armored, keyringId) {
    this.ports.dDialog.emit('waiting', {waiting: true});
    try {
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
    } catch (error) {
      if (error.code === 'PWD_DIALOG_CANCEL') {
        if (this.ports.dFrame) {
          return this.dialogCancel();
        }
      }
      if (this.ports.dDialog) {
        this.ports.dDialog.emit('error-message', {error: error.message});
      }
    }
    this.ports.dDialog.emit('waiting', {waiting: false, unlock: true});
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
}
