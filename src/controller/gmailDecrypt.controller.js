/**
 * Copyright (C) 2015-2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

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
    this.gmailCtrl = null;
    this.userInfo = null;
    this.signedText = null;
    this.plainText = null;
    this.clipped = false;
    this.attachments = [];
    this.ascAttachments = [];
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
    this.processData();
  }

  async getAccessToken() {
    return this.gmailCtrl.getAccessToken({
      ...this.userInfo,
      beforeAuth: () => this.ports.dDialog.emit('error-message', {error: l10n.get('gmail_integration_auth_error_download')}),
      afterAuth: () => this.afterAuthorization()
    });
  }

  afterAuthorization() {
    this.ports.dDialog.emit('hide-error-message');
    if (this.popup) {
      this.popup.activate();
    }
  }

  /**
   * Receive DOM parsed message data from Gmail integration content script and display it in decrypt message component
   */
  async onSetData({userInfo, msgId, sender, armored, clearText, clipped, encAttFileNames, gmailCtrlId}) {
    let lock = false;
    this.gmailCtrl = sub.getById(gmailCtrlId);
    this.userInfo = userInfo;
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
    this.clipped = clipped;
    this.ascAttachments = encAttFileNames.filter(fileName => extractFileExtension(fileName) === 'asc');
    let accessToken;
    if (clipped || this.attachments.length) {
      accessToken = await this.gmailCtrl.checkAuthorization(this.userInfo);
      if (!accessToken) {
        lock = true;
      } else {
        try {
          await gmail.checkLicense(this.userInfo);
        } catch (error) {
          lock = true;
        }
      }
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
        await this.onClippedArmored(this.userInfo.email, accessToken);
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
      const {payload} = await gmail.getMessage({msgId: this.msgId, email: userEmail, accessToken});
      const messageText = await gmail.extractMailBody({payload, userEmail, msgId: this.msgId, accessToken});
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
    const {mimeType} = await gmail.getMessageMimeType({msgId: this.msgId, email: this.userInfo.email, accessToken});
    if (mimeType === 'multipart/signed' || mimeType === 'multipart/encrypted') {
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
          this.ports.dDialog.emit('set-enc-attachments', {encAtts: this.attachments});
      }
      this.ports.dDialog.emit('waiting', {waiting: false, unlock});
    } catch (error) {
      this.ports.dDialog.emit('lock');
      this.ports.dDialog.emit('error-message', {error: error.message});
    }
  }

  async retrieveSender(accessToken) {
    const {payload} = await gmail.getMessage({email: this.userInfo.email, msgId: this.msgId, accessToken, format: 'metadata', metaHeaders: ['from']});
    const {email: sender} = gmail.parseEmailAddress(gmail.extractMailHeader(payload, 'From'));
    this.sender = sender;
  }

  async onMultipartEncrypted(accessToken) {
    await this.retrieveSender(accessToken);
    const encAttData = await gmail.getPGPEncryptedAttData({msgId: this.msgId, email: this.userInfo.email, accessToken});
    let fileName;
    let attachmentId;
    if (encAttData) {
      ({attachmentId, fileName} = encAttData);
    } else {
      fileName = this.ascAttachments[0];
    }
    this.attachments = this.attachments.filter(name => name !== fileName);
    const {data} = await gmail.getAttachment({attachmentId, fileName, email: this.userInfo.email, msgId: this.msgId, accessToken});
    this.armored = dataURL2str(data);
    this.gmailCtrl.ports.gmailInt.emit('update-message-data', {msgId: this.msgId, data: {secureAction: true}});
    if (!await this.canUnlockKey(this.armored, this.keyringId)) {
      this.ports.dDialog.emit('lock');
    } else {
      await super.decrypt(this.armored, this.keyringId);
    }
  }

  async onMultipartSigned(accessToken) {
    await this.retrieveSender(accessToken);
    const detSignAttId = await gmail.getPGPSignatureAttId({msgId: this.msgId, email: this.userInfo.email, accessToken});
    let ascMimeFileName;
    if (!detSignAttId) {
      ascMimeFileName = this.ascAttachments[0];
    }
    const {raw} = await gmail.getMessage({msgId: this.msgId, email: this.userInfo.email, accessToken, format: 'raw'});
    const {signedMessage, message} = await gmail.extractSignedClearTextMultipart(raw);
    this.signedText = signedMessage;
    this.plainText = message;
    const {data} = await gmail.getAttachment({attachmentId: detSignAttId, fileName: ascMimeFileName, email: this.userInfo.email, msgId: this.msgId, accessToken});
    this.armored = dataURL2str(data);
    await this.verify(this.armored, this.keyringId);
  }

  async onDownloadEncAttachment({fileName}) {
    try {
      const accessToken = await this.getAccessToken();
      const {data} = await gmail.getAttachment({fileName, email: this.userInfo.email, msgId: this.msgId, accessToken});
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
