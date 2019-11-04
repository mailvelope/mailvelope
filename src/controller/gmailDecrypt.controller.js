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
    this.gmailCtrl = null;
    this.signedText = null;
    this.plainText = null;
    this.clipped = false;
    this.attachments = [];
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
    this.gmailCtrl.ports.gmailInt.emit('update-message-data', {msgId: this.msgId, data: {secureAction: true}});
    this.executeActionQueue();
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
          if (action.type === 'attachment') {
            this.onDownloadEncAttachment({fileName: action.options.fileName, accessToken});
          }
        }
        this.actionQueue = [];
      } else {
        await this.processData(accessToken, true);
      }
    }
  }

  async registerAction(action, options) {
    const inQeue = this.actionQueue.some(({type}) => type === action);
    if (!inQeue) {
      this.actionQueue.push({type: action, options});
    }
    if (!this.tabId) {
      const activeTab = await mvelo.tabs.getActive();
      if (activeTab) {
        this.tabId = activeTab.id;
      }
    }
  }

  activateComponent() {
    if (this.popup) {
      this.popup.activate();
    } else {
      mvelo.tabs.activate({id: this.tabId});
    }
  }

  /**
   * Receive DOM parsed message data from Gmail integration content script and display it in decrypt message component
   */
  async onSetData({userEmail, msgId, sender, armored, clearText, clipped, encAttFileNames, gmailCtrlId}) {
    let lock = false;
    this.gmailCtrl = sub.getById(gmailCtrlId);
    this.userEmail = userEmail;
    this.msgId = msgId;
    if (armored) {
      this.armored = armored;
      this.sender = sender[0];
      if (!await this.canUnlockKey(this.armored, this.keyringId)) {
        lock = true;
      }
    }
    if (clearText) {
      this.ports.dDialog.emit('decrypted-message', {message: clearText, clearText: true});
    }
    this.attachments = encAttFileNames;
    const encAttachments = encAttFileNames.filter(fileName => extractFileExtension(fileName) !== 'asc');
    if (encAttachments.length) {
      this.ports.dDialog.emit('set-enc-attachments', {encAtts: encAttachments});
    }
    const ascAttachments = encAttFileNames.filter(fileName => extractFileExtension(fileName) === 'asc');
    this.clipped = clipped;
    let accessToken;
    if (clipped || ascAttachments.length) {
      const scopes = [gmail.GMAIL_SCOPE_READONLY, gmail.GMAIL_SCOPE_SEND];
      accessToken = await this.gmailCtrl.checkAuthorization(this.userEmail, scopes);
      if (!accessToken) {
        lock = true;
      }
    }
    if (lock) {
      this.ports.dDialog.emit('lock');
    } else {
      await this.processData(accessToken);
    }
  }

  async processData(accessToken, forceUnlock = false) {
    if (this.armored) {
      if (!/-----BEGIN\sPGP\sSIGNATURE/.test(this.armored)) {
        this.gmailCtrl.ports.gmailInt.emit('update-message-data', {msgId: this.msgId, data: {secureAction: true}});
        await super.decrypt(this.armored, this.keyringId);
      } else {
        await this.verify(this.armored, this.keyringId);
      }
    } else {
      if (this.clipped) {
        await this.onClippedArmored(this.msgId, this.userEmail, accessToken, forceUnlock);
      }
    }
    const ascFileNames = this.attachments.filter(fileName => extractFileExtension(fileName) === 'asc');
    if (ascFileNames.length) {
      await this.onAscAttachments(ascFileNames, accessToken, forceUnlock);
    }
  }

  async onClippedArmored(msgId, userEmail, accessToken, forceUnlock = false) {
    this.ports.dDialog.emit('waiting', {waiting: true});
    try {
      const {payload} = await gmail.getMessage({msgId, email: userEmail, accessToken});
      const messageText = await gmail.extractMailBody({payload, userEmail, msgId, accessToken});
      this.armored = normalizeArmored(messageText, /-----BEGIN PGP MESSAGE-----[\s\S]+?-----END PGP MESSAGE-----/);
      const {email: sender} = gmail.parseEmailAddress(gmail.extractMailHeader(payload, 'From'));
      this.sender = sender;
      if (!await this.canUnlockKey(this.armored, this.keyringId) && !forceUnlock) {
        this.ports.dDialog.emit('lock');
      } else {
        await super.decrypt(this.armored, this.keyringId);
      }
      this.ports.dDialog.emit('waiting', {waiting: false});
    } catch (error) {
      this.ports.dDialog.emit('lock');
      this.ports.dDialog.emit('error-message', {error: error.message});
    }
  }

  async onAscAttachments(fileNames, accessToken, forceUnlock = false) {
    this.ports.dDialog.emit('waiting', {waiting: true});
    try {
      const {mimeType} = await gmail.getMessageMimeType({msgId: this.msgId, email: this.userEmail, accessToken});
      let ascMimeFileName;
      if (mimeType === 'multipart/encrypted' || mimeType === 'multipart/signed') {
        const {payload} = await gmail.getMessage({email: this.userEmail, msgId: this.msgId, accessToken, format: 'metadata', metaHeaders: ['from']});
        const {email: sender} = gmail.parseEmailAddress(gmail.extractMailHeader(payload, 'From'));
        this.sender = sender;
        if (mimeType === 'multipart/encrypted') {
          ascMimeFileName = fileNames.find(fileName => fileName === 'encrypted.asc') || fileNames[0];
        } else {
          ascMimeFileName = fileNames.find(fileName => fileName === 'signature.asc') || fileNames[0];
          const {raw} = await gmail.getMessage({msgId: this.msgId, email: this.userEmail, accessToken, format: 'raw'});
          const {signedMessage, message} = await gmail.extractSignedClearTextMultipart(raw);
          this.signedText = signedMessage;
          this.plainText = message;
        }
        const {data} = await gmail.getAttachment({fileName: ascMimeFileName, email: this.userEmail, msgId: this.msgId, accessToken});
        this.armored = dataURL2str(data);
        if (mimeType === 'multipart/encrypted') {
          if (!await this.canUnlockKey(this.armored, this.keyringId) && !forceUnlock) {
            this.ports.dDialog.emit('lock');
          } else {
            await super.decrypt(this.armored, this.keyringId);
          }
        } else {
          await this.verify(this.armored, this.keyringId);
        }
      }
      let attachments;
      let unlock = false;
      if (ascMimeFileName) {
        attachments = this.attachments.filter(fileName => fileName !== ascMimeFileName);
      } else {
        attachments = this.attachments;
        if (!this.armored) {
          unlock = true;
        }
      }
      this.ports.dDialog.emit('set-enc-attachments', {encAtts: attachments});
      this.ports.dDialog.emit('waiting', {waiting: false, unlock});
    } catch (error) {
      this.ports.dDialog.emit('lock');
      this.ports.dDialog.emit('error-message', {error: error.message});
    }
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
        plaintext: this.signedText,
        signerEmail: this.sender,
        detachedSignature: armored,
        keyringId,
        lookupKey: () => lookupKey({keyringId, email: this.sender})
      });
      this.ports.dDialog.emit('verified-message', {
        message: this.plainText,
        signers: signatures
      });
      this.ports.dDialog.emit('waiting', {waiting: false, unlock: true});
    } catch (error) {
      if (error.code === 'PWD_DIALOG_CANCEL') {
        if (this.ports.dFrame) {
          return this.dialogCancel();
        }
      }
      if (this.ports.dDialog) {
        this.ports.dDialog.emit('error-message', {error: error.message});
      }
      this.ports.dDialog.emit('waiting', {waiting: false});
    }
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
