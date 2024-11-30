/**
 * Copyright (C) 2015-2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import * as l10n from '../lib/l10n';
import {dataURL2str, normalizeArmored, encodeHTML} from '../lib/util';
import {extractFileExtension} from '../lib/file';
import * as model from '../modules/pgpModel';
import * as gmail from '../modules/gmail';
import {createController, controllerPool} from './main.controller';
import DecryptController from './decrypt.controller';
import {lookupKey} from './import.controller';

export default class gmailDecryptController extends DecryptController {
  constructor(port) {
    super(port);
    this.state = {
      ...this.state,
      gmailCtrlId: null,
      userInfo: null
    };
    this.gmailCtrl = null;
    this.signedText = null;
    this.plainText = null;
    this.clipped = false;
    this.attachments = [];
    this.ascAttachments = [];
    // register event handlers
    this.on('set-data', this.onSetData);
    this.on('download-enc-attachment', this.onDownloadEncAttachment);
  }

  async onDecryptMessageInit(options) {
    await super.onDecryptMessageInit(options);
    if (this.ports.aFrameGmail) {
      this.ports.aFrameGmail.emit('get-data');
    }
  }

  async onDecrypt() {
    await this.decryptReady.promise;
    this.processData();
  }

  async getAccessToken() {
    const gmailCtrl = await this.getGmailCtrl();
    return gmailCtrl.getAccessToken({
      ...this.state.userInfo,
      beforeAuth: () => this.ports.dDialog.emit('error-message', {error: l10n.get('gmail_integration_auth_error_download')}),
      afterAuth: () => this.afterAuthorization()
    });
  }

  async afterAuthorization() {
    this.ports.dDialog.emit('hide-error-message');
    (await this.getPopup())?.activate();
  }

  async getGmailCtrl() {
    this.gmailCtrl ??= await controllerPool.get(this.state.gmailCtrlId);
    return this.gmailCtrl;
  }

  /**
   * Receive DOM parsed message data from Gmail integration content script and display it in decrypt message component
   */
  async onSetData({userInfo, msgId, sender, armored, plainText, clipped, encAttFileNames, gmailCtrlId}) {
    let lock = false;
    this.setState({gmailCtrlId, userInfo, msgId});
    if (armored) {
      this.armored = armored;
      this.sender = sender[0];
      if (!await this.canUnlockKey(this.armored, this.keyringId)) {
        lock = true;
      }
    }
    this.plainText = plainText;
    this.attachments = encAttFileNames;
    this.clipped = clipped;
    this.ascAttachments = encAttFileNames.filter(fileName => extractFileExtension(fileName) === 'asc');
    let accessToken;
    if (clipped || this.attachments.length) {
      accessToken = await (await this.getGmailCtrl()).checkAuthorization(this.state.userInfo);
      if (!accessToken) {
        lock = true;
      } else {
        try {
          await gmail.checkLicense(this.state.userInfo);
        } catch (error) {
          lock = true;
        }
      }
    }
    this.decryptReady.resolve();
    if (this.reconnect) {
      return;
    }
    if (lock) {
      this.ports.dDialog.emit('lock');
    } else {
      this.processData(accessToken);
    }
  }

  async processData(accessToken) {
    if (this.armored) {
      await super.decrypt(this.armored, this.keyringId);
    }
    try {
      if (!accessToken && (this.clipped || this.attachments.length)) {
        accessToken = await this.getAccessToken();
      }
      if (this.clipped) {
        await this.onClippedArmored(this.state.userInfo.email, accessToken);
      }
      if (this.attachments.length) {
        await this.onAttachments(accessToken);
      }
    } catch (error) {
      this.ports.dDialog.emit('error-message', {error: error.message});
    }
  }

  async onClippedArmored(userEmail, accessToken) {
    this.ports.dDialog.emit('waiting', {waiting: true});
    try {
      const {payload} = await gmail.getMessage({msgId: this.state.msgId, email: userEmail, accessToken});
      const messageText = await gmail.extractMailBody({payload, userEmail, msgId: this.state.msgId, accessToken});
      this.armored = normalizeArmored(messageText, /-----BEGIN PGP MESSAGE-----[\s\S]+?-----END PGP MESSAGE-----/);
      const {email: sender} = gmail.parseEmailAddress(gmail.extractMailHeader(payload, 'From'));
      this.sender = sender;
      if (!await this.canUnlockKey(this.armored, this.keyringId)) {
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

  async getMimeType(accessToken) {
    if (this.attachments.length > 2 || !this.ascAttachments.length) {
      return;
    }
    const {mimeType, protocol} = await gmail.getMessageMimeType({msgId: this.state.msgId, email: this.state.userInfo.email, accessToken});
    if (mimeType === 'multipart/signed' && protocol === 'application/pgp-signature' || mimeType === 'multipart/encrypted') {
      return mimeType;
    }
    if (this.ascAttachments.includes('encrypted.asc')) {
      return 'multipart/encrypted';
    }
    if (mimeType !== 'multipart/mixed') {
      return;
    }
    if (this.ascAttachments.some(attachment => /.*signature\.asc$/.test(attachment))) {
      return 'multipart/signed';
    }
  }

  async onAttachments(accessToken) {
    this.ports.dDialog.emit('waiting', {waiting: true});
    let unlock = false;
    try {
      const mimeType = await this.getMimeType(accessToken);
      switch (mimeType) {
        case 'multipart/encrypted':
          await this.onMultipartEncrypted(accessToken);
          break;
        case 'multipart/signed':
          await this.onMultipartSigned(accessToken);
          break;
        default:
          unlock = true;
          if (this.plainText) {
            this.ports.dDialog.emit('decrypted-message', {message: encodeHTML(this.plainText), signOnly: true});
          }
          this.ports.dDialog.emit('set-enc-attachments', {encAtts: this.attachments});
      }
      this.ports.dDialog.emit('waiting', {waiting: false, unlock});
    } catch (error) {
      this.ports.dDialog.emit('lock');
      this.ports.dDialog.emit('error-message', {error: error.message});
    }
  }

  async retrieveSender(accessToken) {
    const {payload} = await gmail.getMessage({email: this.state.userInfo.email, msgId: this.state.msgId, accessToken, format: 'metadata', metaHeaders: ['from']});
    const {email: sender} = gmail.parseEmailAddress(gmail.extractMailHeader(payload, 'From'));
    this.sender = sender;
  }

  async onMultipartEncrypted(accessToken) {
    await this.retrieveSender(accessToken);
    const encAttData = await gmail.getPGPEncryptedAttData({msgId: this.state.msgId, email: this.state.userInfo.email, accessToken});
    let fileName;
    let attachmentId;
    if (encAttData) {
      ({attachmentId, fileName} = encAttData);
    } else {
      fileName = this.ascAttachments[0];
    }
    this.attachments = this.attachments.filter(name => name !== fileName);
    const {data} = await gmail.getAttachment({attachmentId, fileName, email: this.state.userInfo.email, msgId: this.state.msgId, accessToken});
    this.armored = dataURL2str(data);
    try {
      (await this.getGmailCtrl()).ports.gmailInt.emit('update-message-data', {msgId: this.state.msgId, data: {secureAction: true}});
    } catch (e) {
      console.log('GmailController does not have port to gmailInt content script');
    }
    if (!await this.canUnlockKey(this.armored, this.keyringId)) {
      this.ports.dDialog.emit('lock');
    } else {
      await super.decrypt(this.armored, this.keyringId);
    }
  }

  async onMultipartSigned(accessToken) {
    await this.retrieveSender(accessToken);
    const detSignAttId = await gmail.getPGPSignatureAttId({msgId: this.state.msgId, email: this.state.userInfo.email, accessToken});
    let ascMimeFileName;
    if (!detSignAttId) {
      ascMimeFileName = this.ascAttachments[0];
    }
    const {raw} = await gmail.getMessage({msgId: this.state.msgId, email: this.state.userInfo.email, accessToken, format: 'raw'});
    try {
      const {signedMessage, message, attachments} = await gmail.extractSignedMessageMultipart(raw);
      this.signedText = signedMessage;
      this.plainText = message;
      const {data} = await gmail.getAttachment({attachmentId: detSignAttId, fileName: ascMimeFileName, email: this.state.userInfo.email, msgId: this.state.msgId, accessToken});
      this.armored = dataURL2str(data);
      for (const attachment of attachments) {
        if (!this.attachments.includes(attachment.filename)) {
          this.ports.dDialog.emit('add-decrypted-attachment', {attachment});
        }
      }
      await this.verify(this.armored, this.keyringId);
    } catch (e) {
      this.ports.aFrameGmail.emit('destroy');
    }
  }

  async onDownloadEncAttachment({fileName}) {
    try {
      const accessToken = await this.getAccessToken();
      const {data} = await gmail.getAttachment({fileName, email: this.state.userInfo.email, msgId: this.state.msgId, accessToken});
      const armored = dataURL2str(data);
      if (/-----BEGIN\sPGP\sPUBLIC\sKEY\sBLOCK/.test(armored)) {
        return await this.importKey(armored);
      }
      let attachment;
      if (/-----BEGIN\sPGP\sSIGNATURE/.test(armored)) {
        attachment = {
          data: armored,
          filename: fileName
        };
      } else {
        attachment = await model.decryptFile({
          encryptedFile: {content: data, name: fileName},
          unlockKey: this.unlockKey.bind(this),
          uiLogSource: 'security_log_viewer',
        });
      }
      this.ports.dDialog.emit('add-decrypted-attachment', {attachment: {...attachment, encFileName: fileName, rootSignatures: this.signatures}});
    } catch (error) {
      this.ports.dDialog.emit('error-message', {error: error.message});
    }
  }

  async verify(armored, keyringId) {
    this.ports.dDialog.emit('waiting', {waiting: true});
    try {
      const {signatures} = await model.verifyDetachedSignature({
        plaintext: this.signedText,
        senderAddress: this.sender,
        detachedSignature: armored,
        keyringId,
        lookupKey: rotation => lookupKey({keyringId, email: this.sender, rotation})
      });
      this.ports.dDialog.emit('verified-message', {
        message: this.plainText,
        signers: signatures
      });
      this.ports.dDialog.emit('waiting', {waiting: false, unlock: true});
    } catch (error) {
      if (error.code === 'PWD_DIALOG_CANCEL') {
        if (this.hasPort('dFrame')) {
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
    const importControl = await createController('importKeyDialog');
    const result = await importControl.importKey(this.keyringId, armored);
    if (result === 'IMPORTED' || result === 'UPDATED') {
      this.ports.dDialog.emit('show-notification', {
        message: l10n.get('key_import_bulk_success'),
        type: 'success',
        autoHide: true,
        hideDelay: 2000,
        dismissable: false
      });
    }
    this.ports.dDialog.emit('waiting', {waiting: false});
  }
}
