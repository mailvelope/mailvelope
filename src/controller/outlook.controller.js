/**
 * Copyright (C) 2025 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from '../lib/lib-mvelo';
import {getUUID, mapError} from '../lib/util';
import * as l10n from '../lib/l10n';
import * as outlook from '../modules/outlook';
import {SubController} from './sub.controller';
import {setAppDataSlot} from './sub.controller';
import {formatEmailAddress} from '../modules/key';

export default class OutlookController extends SubController {
  constructor(port) {
    super(port);
    this.state = {
      userInfo: null,
      messageId: null
    };
    this.peerType = 'outlookController';
    this.authorizationRequest = null;
    // register event handlers
    this.on('open-editor', this.onOpenEditor);
    this.on('secure-button', this.onSecureBtn);
  }

  activateComponent() {
    mvelo.tabs.activate({id: this.tabId});
  }

  async onOpenEditor(options) {
    await this.createPeer('editorController');
    if (await this.peers.editorController.getPopup()) {
      await this.peers.editorController.activateComponent();
      return;
    }
    options.recipientsTo ||= [];
    options.recipientsCc ||= [];
    this.openEditor(options);
  }

  /**
   * Opens a new editor control and gets the recipients to encrypt plaintext
   * input to their public keys.
   * @param  {String} options.text   The plaintext input to encrypt
   */
  openEditor(options) {
    this.setState({userInfo: options.userInfo, messageId: options.messageId});
    this.peers.editorController.openEditor({
      integration: true,
      predefinedText: options.text,
      quotedMail: options.quotedMail,
      quotedMailIndent: options.quotedMailIndent === undefined ? true : options.quotedMailIndent,
      quotedMailHeader: options.quotedMailHeader,
      subject: options.subject,
      recipients: {
        to: options.recipientsTo.map(email => ({email})),
        cc: options.recipientsCc.map(email => ({email}))
      },
      userInfo: options.userInfo,
      attachments: options.attachments,
      keepAttachments: options.keepAttachments
    });
  }

  /**
   * Send encrypted message via Outlook Graph API
   * @param {Object} options
   * @param {string} options.armored - Armored PGP encrypted message
   * @param {Array} options.encFiles - Encrypted file attachments (ignored for PGP/MIME)
   * @param {string} options.subject - Email subject
   * @param {Array} options.to - Recipients [{name, email}]
   * @param {Array} options.cc - CC recipients [{name, email}]
   */
  async encryptedMessage({armored, encFiles, subject, to, cc}) {
    this.peers.editorController.ports.editor.emit('send-mail-in-progress');
    const userEmail = this.state.userInfo.email;
    const toFormatted = to.map(({name, email}) => formatEmailAddress(email, name));
    const ccFormatted = cc.map(({name, email}) => formatEmailAddress(email, name));
    const mail = outlook.buildMail({
      message: armored,
      attachments: encFiles,
      subject,
      sender: userEmail,
      to: toFormatted,
      cc: ccFormatted
    });
    const accessToken = await this.peers.editorController.getAccessToken();
    try {
      await outlook.sendMessage({message: mail, accessToken});
      this.peers.editorController.ports.editor.emit('show-notification', {
        message: l10n.get('outlook_integration_sent_success'),
        type: 'success',
        autoHide: true,
        hideDelay: 2000,
        closeOnHide: true,
        dismissable: false
      });
    } catch (error) {
      this.peers.editorController.ports.editor.emit('error-message', {
        error: Object.assign(mapError(error), {
          autoHide: false,
          dismissable: true
        })
      });
    }
    await this.removePeer('editorController');
  }

  async encryptError(error) {
    if (error.code == 'EDITOR_DIALOG_CANCEL') {
      await this.removePeer('editorController');
      return;
    }
    this.peers.editorController.ports.editor.emit('error-message', {
      error: {
        ...error,
        autoHide: false,
        dismissable: false
      }
    });
  }

  // Secure button handler will be implemented in Phase 4 - Graph API Integration
  async onSecureBtn() {
    console.log('Outlook secure button not implemented yet (Phase 4)');
  }

  /**
   * Get access token
   * @param  {String} email
   * @param  {Array}  scopes
   * @param  {Function} beforeAuth - called before new authorization request is started
   * @param  {Function} afterAuth - called after successful authorization request
   * @return {String}
   */
  async getAccessToken({email, scopes = [outlook.OUTLOOK_SCOPE_MAIL_READ, outlook.OUTLOOK_SCOPE_MAIL_SEND], beforeAuth, afterAuth} = {}) {
    const accessToken = await this.checkAuthorization({email, scopes});
    if (accessToken) {
      // License check deferred to Phase 4/5
      return accessToken;
    }
    if (beforeAuth) {
      beforeAuth();
    }
    this.openAuthorizeDialog({email, scopes});
    return new Promise((resolve, reject) => this.authorizationRequest = {resolve, reject, afterAuth});
  }

  async onAuthorize({email, scopes}) {
    try {
      const accessToken = await outlook.authorize(email, scopes);
      // License check deferred to Phase 4/5
      this.activateComponent();
      if (this.authorizationRequest.afterAuth) {
        this.authorizationRequest.afterAuth();
      }
      this.authorizationRequest.resolve(accessToken);
    } catch (e) {
      this.authorizationRequest.reject(e);
      throw e;
    }
  }

  checkAuthorization({email, scopes = [outlook.OUTLOOK_SCOPE_MAIL_READ, outlook.OUTLOOK_SCOPE_MAIL_SEND]}) {
    return outlook.getAccessToken({email, scopes});
  }

  async openAuthorizeDialog({email, scopes}) {
    const activeTab = await mvelo.tabs.getActive();
    if (activeTab) {
      this.tabId = activeTab.id;
    }
    const slotId = getUUID();
    setAppDataSlot(slotId, {email, scopes, outlookCtrlId: this.id});
    await mvelo.tabs.loadAppTab(`?slotId=${slotId}#/settings/outlook-api/auth`);
  }
}
