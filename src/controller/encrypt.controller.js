/**
 * Copyright (C) 2015-2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

/**
 * @fileOverview This controller handles events from the encryptFrame and
 * create an editor controller to encrypt plaintext to a list of recipients.
 */

import mvelo from '../lib/lib-mvelo';
import * as sub from './sub.controller';

export default class EncryptController extends sub.SubController {
  constructor(port) {
    super(port);
    this.editorControl = null;
    this.recipientsCallback = null;
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
    this.editorControl.encrypt({
      initText: options.text,
      getRecipientProposal: this.getRecipientProposal.bind(this)
    })
    .then(({armored, recipients}) => {
      // sanitize if content from plain text
      const parsed = mvelo.util.parseHTML(armored);
      this.emit('set-editor-output', {text: parsed, recipients});
      this.editorControl = null;
    })
    .catch(err => {
      if (err.code == 'EDITOR_DIALOG_CANCEL') {
        this.editorControl = null;
        this.emit('mail-editor-close');
      }
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
