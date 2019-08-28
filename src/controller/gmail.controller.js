/**
 * Copyright (C) 2015-2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from '../lib/lib-mvelo';
// import * as l10n from '../lib/l10n';
import {getHash, mapError} from '../lib/util';
// import {DISPLAY_INLINE} from '../lib/constants';
// import {prefs} from '../modules/prefs';
// import {getKeyringWithPrivKey} from '../modules/keyring';
// import * as model from '../modules/pgpModel';
import * as gmail from '../modules/gmail';

// import * as uiLog from '../modules/uiLog';
// import {isCached} from '../modules/pwdCache';
import * as sub from './sub.controller';
// import {triggerSync} from './sync.controller';
import {getPreferredKeyringId} from '../modules/keyring';

export default class GmailController extends sub.SubController {
  constructor(port) {
    super(port);
    if (!port) {
      this.mainType = 'gmailInt';
      this.id = getHash();
    }
    this.editorControl = null;
    this.keyringId = getPreferredKeyringId();
    // register event handlers
    this.on('gmail-unauthorize', this.unauthorize);
    this.on('open-editor', this.onOpenEditor);
    this.on('secure-reply', this.onSecureReply);
    this.on('secure-forward', this.onSecureForward);
    this.on('set-encrypted-attachments', this.setEncAttachments);
  }

  activateComponent() {
    mvelo.tabs.activate({id: this.tabId});
  }

  unauthorize() {
    gmail.unauthorize();
  }

  /**
   * Opens a new editor control and gets the recipients to encrypt plaintext
   * input to their public keys.
   * @param  {String} options.text   The plaintext input to encrypt
   */

  openEditor(options) {
    if (this.editorControl) {
      this.editorControl.activateComponent();
      return;
    }
    this.editorControl = sub.factory.get('editor');
    return this.editorControl.encrypt({
      integration: true,
      predefinedText: options.text,
      quotedMail: options.quotedMail,
      quotedMailIndent: options.quotedMailIndent === undefined ? true : options.quotedMailIndent,
      quotedMailHeader: options.quotedMailHeader,
      subject: options.subject,
      getRecipients: () => options.recipients ? options.recipients.map(email => ({email})) : [],
      userEmail: options.userEmail,
      attachments: options.attachments
    });
  }

  async onOpenEditor(options) {
    try {
      const {armored, encFiles, subject, recipients} = await this.openEditor(options);
      // send email via gapi
      const userEmail = options.userEmail;
      const mail = gmail.buildMail({message: armored, attachments: encFiles, subject, sender: userEmail, to: recipients.map(({email}) => email)});
      console.log(mail);
      const accessToken = await gmail.getAccessToken(userEmail, gmail.GMAIL_SCOPE_SEND);
      if (!accessToken) {
        this.editorControl.openAuthorizeDialog(gmail.GMAIL_SCOPE_SEND);
      } else {
        const result = await gmail.sendMessage({email: userEmail, message: mail, accessToken});
        console.log(result);
        this.editorControl = null;
      }
    } catch (err) {
      if (err.code == 'EDITOR_DIALOG_CANCEL') {
        this.editorControl = null;
        // this.emit('mail-editor-close');
        return;
      }
      this.editorControl.ports.editor.emit('error-message', {error: mapError(err)});
    }
  }

  async onSecureReply({msgId, all, userEmail}) {
    console.log(all);
    const accessToken = await gmail.getAccessToken(userEmail, gmail.GMAIL_SCOPE_SEND);
    if (!accessToken) {
      if (!this.tabId) {
        const {id} = await mvelo.tabs.getActive();
        this.tabId = id;
      }
      gmail.openAuthorizeDialog({email: userEmail, scope: gmail.GMAIL_SCOPE_SEND, ctrlId: this.id});
      return;
    }
    const {threadId, payload} = await gmail.getMessage({msgId, email: userEmail, accessToken});
    const messageText = await gmail.extractMailBody({payload, userEmail, msgId, accessToken});
    const subject = gmail.extractMailHeader(payload, 'Subject');
    // const messageId = this.extractMailHeader(payload, 'Message-Id');
    const recipientsTo = [];
    const recipientsCc = [];
    const sender = gmail.extractMailFromAddress(gmail.extractMailHeader(payload, 'From'));
    recipientsTo.push(sender);
    if (all) {
      const to = gmail.extractMailHeader(payload, 'To').split(',');
      to.map(address => gmail.extractMailFromAddress(address)).filter(email => email !== '').forEach(email => recipientsTo.push(email));
      const cc = gmail.extractMailHeader(payload, 'Cc').split(',');
      if (cc) {
        cc.map(address => gmail.extractMailFromAddress(address)).filter(email => email !== '').forEach(email => recipientsCc.push(email));
      }
    }
    const options = {
      userEmail,
      subject,
      recipients: [...recipientsTo, ...recipientsCc],
      quotedMail: messageText || '',
    };
    try {
      const {armored, encFiles, subject, recipients} = await this.openEditor(options);
      const mail = gmail.buildMail({message: armored, attachments: encFiles, subject, to: recipients.filter(({email}) => recipientsTo.includes(email)).map(({email}) => email), cc: recipients.filter(({email}) => recipientsCc.includes(email)).map(({email}) => email)});
      console.log(mail);
      const result = await gmail.sendMessageMeta({email: userEmail, message: mail, threadId, accessToken});
      console.log(result);
      this.editorControl = null;
    } catch (err) {
      if (err.code == 'EDITOR_DIALOG_CANCEL') {
        this.editorControl = null;
        // this.emit('mail-editor-close');
        return;
      }
      this.editorControl.ports.editor.emit('error-message', {error: mapError(err)});
    }
  }

  async onSecureForward({msgId, userEmail}) {
    const accessToken = await gmail.getAccessToken(userEmail, gmail.GMAIL_SCOPE_SEND);
    if (!accessToken) {
      if (!this.tabId) {
        const {id} = await mvelo.tabs.getActive();
        this.tabId = id;
      }
      gmail.openAuthorizeDialog({email: userEmail, scope: gmail.GMAIL_SCOPE_SEND, ctrlId: this.id});
      return;
    }
    const {threadId, internalDate, payload} = await gmail.getMessage({msgId, email: userEmail, accessToken});
    const messageText = await gmail.extractMailBody({payload, userEmail, msgId, accessToken});
    const subject = gmail.extractMailHeader(payload, 'Subject');
    // const sentDate = this.extractMailHeader(payload, 'Date');
    const sender = gmail.extractMailHeader(payload, 'From');
    const to = gmail.extractMailHeader(payload, 'To');
    const cc = gmail.extractMailHeader(payload, 'Cc');
    const quotedMailHeader = `---------- Forwarded message ---------
From: <${gmail.extractMailFromAddress(sender)}>
Date: ${new Date(parseInt(internalDate, 10)).toUTCString()}
Subject: ${subject}
To: ${to.split(',').map(address => `<${gmail.extractMailFromAddress(address)}>`).join(', ')}
${cc && `Cc: ${to.split(',').map(address => `<${gmail.extractMailFromAddress(address)}>`).join(', ')}`}
`;
    const attachments = await gmail.getMailAttachments({payload, userEmail, msgId, accessToken});
    console.log(attachments);
    const options = {
      userEmail,
      subject,
      quotedMail: messageText || '',
      quotedMailIndent: false,
      quotedMailHeader,
      attachments
    };
    try {
      const {armored, encFiles, subject, recipients} = await this.openEditor(options);
      const mail = gmail.buildMail({message: armored, attachments: encFiles, subject, to: recipients.map(({email}) => email)});
      console.log(mail);
      const result = await gmail.sendMessageMeta({email: userEmail, message: mail, threadId, accessToken});
      console.log(result);
      this.editorControl = null;
    } catch (err) {
      if (err.code == 'EDITOR_DIALOG_CANCEL') {
        this.editorControl = null;
        // this.emit('mail-editor-close');
        return;
      }
      this.editorControl.ports.editor.emit('error-message', {error: mapError(err)});
    }
  }

  async onAuthorize({email, scope}) {
    try {
      await gmail.authorize(email, scope);
    } catch (e) {
      console.log(e);
    }
    this.activateComponent();
    return Promise.resolve();
  }

  setEncAttachments({controllerId, userEmail, msgId, encAttFileNames}) {
    const normalizedControllerId = controllerId.split('-')[1];
    const decryptContr = sub.getById(normalizedControllerId);
    decryptContr.onSetEncAttachements({userEmail, msgId, encAttFileNames});
  }
}
