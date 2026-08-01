/**
 * Copyright (C) 2025 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from '../lib/lib-mvelo';
import {MvError, getUUID, mapError} from '../lib/util';
import * as l10n from '../lib/l10n';
import {ERROR_OUTLOOK_ACCOUNT_MISMATCH, ERROR_OUTLOOK_AUTH_CANCELLED} from '../lib/constants';
import * as outlook from '../modules/outlook';
import {SubController} from './sub.controller';
import {setAppDataSlot} from './sub.controller';
import {formatAddress} from '../lib/email';

export default class OutlookController extends SubController {
  constructor(port) {
    super(port);
    this.state = {
      userInfo: null,
      messageId: null
    };
    this.peerType = 'outlookController';
    // pending waiters for a deferred authorization; multiple components
    // (decrypt frames, editor) can request a token while no authorization exists
    this.authorizationRequests = [];
    // whether the active authorization flow is a silent renewal
    this.silentRenewal = false;
    this.authTabListener = null;
    // register event handlers
    this.on('open-editor', this.onOpenEditor);
    this.on('secure-button', this.onSecureBtn);
  }

  async activateComponent() {
    await mvelo.tabs.activate({id: this.tabId});
  }

  async onOpenEditor(options) {
    // Establish authorization before the editor opens: the editor is a popup
    // window that would cover the settings tab of a deferred authorization
    // (never raised above it on Firefox). Once authorized, onAuthorize returns
    // to the webmail tab and the editor popup opens on top of it.
    try {
      await this.getAccessToken({email: options.userInfo.email});
    } catch (e) {
      if (e.code === ERROR_OUTLOOK_AUTH_CANCELLED) {
        // user declined the authorization, no editor
        return;
      }
      if (isTerminalAuthError(e)) {
        // no editor and no settings dialog open that could display the error,
        // and 'open-editor' has no reply channel: surface it on the settings page
        await this.openAuthErrorDialog(e);
        return;
      }
      throw e;
    }
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
      provider: this.peerType,
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
    const toFormatted = to.map(({name, email}) => formatAddress(email, name));
    const ccFormatted = cc.map(({name, email}) => formatAddress(email, name));
    const accessToken = await this.peers.editorController.getAccessToken();
    try {
      const mail = outlook.buildMail({
        message: armored,
        attachments: encFiles,
        subject,
        sender: userEmail,
        to: toFormatted,
        cc: ccFormatted
      });
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
        error: {...mapError(error), autoHide: false, dismissable: true}
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
      error: {...mapError(error), autoHide: false, dismissable: false}
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
   * @param  {Function} beforeAuth - called with {reauth} before a new authorization request is started
   * @param  {Function} afterAuth - called after successful authorization request
   * @return {String}
   */
  async getAccessToken({email, scopes = [outlook.OUTLOOK_SCOPE_MAIL_READ, outlook.OUTLOOK_SCOPE_MAIL_SEND], beforeAuth, afterAuth} = {}) {
    const {accessToken, storedCredentials} = await outlook.getAccessToken({email, scopes});
    if (accessToken) {
      // License check deferred to Phase 4/5
      return accessToken;
    }
    const {promise, resolve, reject} = Promise.withResolvers();
    this.authorizationRequests.push({resolve, reject, beforeAuth, afterAuth});
    // one authorization flow serves all concurrent waiters; joiners mirror the
    // mode of the flow in progress, not the storage state
    if (this.authorizationRequests.length === 1) {
      this.silentRenewal = storedCredentials;
    }
    beforeAuth?.({reauth: this.silentRenewal});
    if (this.authorizationRequests.length === 1) {
      if (this.silentRenewal) {
        this.reauthorize({email, scopes});
      } else {
        this.openAuthorizeDialog({email, scopes});
      }
    }
    return promise;
  }

  /**
   * Renew an expired authorization directly via launchWebAuthFlow: with a live
   * Microsoft session this completes without user interaction. Falls back to
   * the settings-UI authorization dialog if the flow fails.
   */
  async reauthorize({email, scopes}) {
    try {
      const accessToken = await outlook.authorize(email, scopes);
      this.resolveAuthorizationRequests(accessToken);
    } catch (e) {
      console.log(`Outlook silent renewal failed: ${e.code} ${e.message}`);
      const error = mapAuthError(e);
      if (isTerminalAuthError(error)) {
        // the user has to act outside of Mailvelope, another sign-in attempt
        // from the settings dialog would fail the same way
        this.rejectAuthorizationRequests(error);
        return;
      }
      // swap the reconnect notification of the waiters for the authorization error
      this.silentRenewal = false;
      for (const request of this.authorizationRequests) {
        request.beforeAuth?.({reauth: false});
      }
      this.openAuthorizeDialog({email, scopes});
    }
  }

  async onAuthorize({email, scopes, forcePicker = false}) {
    try {
      const accessToken = await outlook.authorize(email, scopes, {forcePicker});
      // License check deferred to Phase 4/5
      this.clearAuthTabWatch();
      // return to the webmail tab before resolving the waiters, so a deferred
      // editor opens on top of the webmail, not the settings tab
      await this.activateComponent().catch(() => { /* tab closed meanwhile */ });
      this.resolveAuthorizationRequests(accessToken);
    } catch (e) {
      if (e.code === ERROR_OUTLOOK_ACCOUNT_MISMATCH) {
        // recoverable via the in-modal retry with the account picker: keep the
        // pending waiters and the tab watch
        throw e;
      }
      const error = mapAuthError(e);
      this.clearAuthTabWatch();
      this.rejectAuthorizationRequests(error);
      throw error;
    }
  }

  resolveAuthorizationRequests(accessToken) {
    for (const request of this.authorizationRequests.splice(0)) {
      request.afterAuth?.();
      request.resolve(accessToken);
    }
  }

  rejectAuthorizationRequests(error) {
    for (const request of this.authorizationRequests.splice(0)) {
      request.reject(error);
    }
  }

  cancelAuthorization() {
    this.clearAuthTabWatch();
    this.rejectAuthorizationRequests(new MvError('Authorization cancelled by user.', ERROR_OUTLOOK_AUTH_CANCELLED));
  }

  async checkAuthorization({email, scopes = [outlook.OUTLOOK_SCOPE_MAIL_READ, outlook.OUTLOOK_SCOPE_MAIL_SEND]}) {
    const {accessToken} = await outlook.getAccessToken({email, scopes});
    return accessToken;
  }

  // Show a terminal authorization error on the settings page: used when no
  // component is open that could display it
  async openAuthErrorDialog(error) {
    const slotId = getUUID();
    setAppDataSlot(slotId, {authError: {message: error.message}});
    await mvelo.tabs.loadAppTab(`?slotId=${slotId}#/settings/outlook-api/auth`);
  }

  async openAuthorizeDialog({email, scopes}) {
    const activeTab = await mvelo.tabs.getActive();
    if (activeTab) {
      this.tabId = activeTab.id;
    }
    const slotId = getUUID();
    setAppDataSlot(slotId, {email, scopes, outlookCtrlId: this.id});
    const appTab = await mvelo.tabs.loadAppTab(`?slotId=${slotId}#/settings/outlook-api/auth`);
    if (appTab?.id) {
      this.watchAuthTab(appTab.id);
    }
  }

  // Cancel a pending authorization request when the settings tab is closed,
  // so waiting components (e.g. the editor) don't hang forever
  watchAuthTab(tabId) {
    this.clearAuthTabWatch();
    this.authTabListener = removedTabId => {
      if (removedTabId === tabId) {
        this.cancelAuthorization();
      }
    };
    chrome.tabs.onRemoved.addListener(this.authTabListener);
  }

  clearAuthTabWatch() {
    if (this.authTabListener) {
      chrome.tabs.onRemoved.removeListener(this.authTabListener);
      this.authTabListener = null;
    }
  }
}

// Error classes the user can only resolve outside of Mailvelope: shown with a
// localized message instead of the Microsoft error description, and terminal
// for any sign-in attempt from Mailvelope
const TERMINAL_AUTH_ERRORS = new Map([
  ['OUTLOOK_OAUTH_ADMIN_CONSENT', 'outlook_oauth_error_admin_consent'],
  ['OUTLOOK_OAUTH_CONDITIONAL_ACCESS', 'outlook_oauth_error_conditional_access']
]);

function mapAuthError(error) {
  const l10nKey = TERMINAL_AUTH_ERRORS.get(error.code);
  return l10nKey ? new MvError(l10n.get(l10nKey), error.code) : error;
}

function isTerminalAuthError(error) {
  return TERMINAL_AUTH_ERRORS.has(error.code);
}
