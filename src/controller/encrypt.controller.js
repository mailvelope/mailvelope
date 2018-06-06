/**
 * Copyright (C) 2015-2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

/**
 * @fileOverview This controller handles events from the encryptFrame and
 * create an editor controller to encrypt plaintext to a list of recipients.
 */

import * as sub from './sub.controller';
import {prefs} from '../modules/prefs';

export default class EncryptController extends sub.SubController {
  constructor(port) {
    super(port);
    this.editorControl = null;
    this.recipientsCallback = null;
    this.editorContentModified = false;
    // register event handlers
    this.on('eframe-recipients', this.displayRecipientProposal);
    this.on('eframe-display-editor', this.openEditor);
  }

  /**
   * Opens a new editor control and gets the recipients to encrypt plaintext
   * input to their public keys.
   * @param  {String} options.text   The plaintext input to encrypt
   */
  openEditor(options) {
    if (this.editorControl) {
      this.editorControl.activate();
      return;
    }
    this.editorControl = sub.factory.get('editor');
    return this.editorControl.encrypt({
      signMsg: prefs.general.auto_sign_msg,
      predefinedText: options.text,
      quotedMail: options.quotedMail,
      quotedMailIndent: !this.editorContentModified,
      getRecipientProposal: this.getRecipientProposal.bind(this),
      privKeys: true
    })
    .then(({armored, recipients}) => {
      this.emit('set-editor-output', {text: armored, recipients});
      this.editorContentModified = true;
      this.editorControl = null;
    })
    .catch(err => {
      if (err.code == 'EDITOR_DIALOG_CANCEL') {
        this.editorControl = null;
        this.emit('mail-editor-close');
        return;
      }
      console.error(err);
    });
  }

  /**
   * Signal the encrypt frame to  call currentProvider.getRecipients().
   * @param  {Function} callback   Will be called once recipients are set later
   */
  getRecipientProposal(callback) {
    if (this.recipientsCallback) {
      throw new Error('Waiting for recipients result.');
    }
    this.emit('get-recipients');
    this.recipientsCallback = callback;
  }

  /**
   * Handles gotten recipients after calling currentProvider.getRecipients() in
   * the encrypt frame.
   * @param  {Array} options.recipients   The recipient objects in the form: [{ email: 'jon@example.com' }]
   */
  displayRecipientProposal(options) {
    if (this.recipientsCallback) {
      this.recipientsCallback(options.recipients);
      this.recipientsCallback = null;
    }
  }
}
