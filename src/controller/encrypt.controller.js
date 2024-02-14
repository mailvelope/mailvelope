/**
 * Copyright (C) 2015-2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

/**
 * @fileOverview This controller handles events from the encryptFrame and
 * create an editor controller to encrypt plaintext to a list of recipients.
 */

import * as sub from './sub.controller';

export default class EncryptController extends sub.SubController {
  constructor(port) {
    super(port);
    this.editorControl = null;
    this.editorContentModified = false;
    // register event handlers
    this.on('eframe-display-editor', this.onEncryptFrameDisplayEditor);
  }

  /**
   * Opens a new editor control and gets the recipients to encrypt plaintext
   * input to their public keys.
   * @param  {String} options.text   The plaintext input to encrypt
   */
  onEncryptFrameDisplayEditor(options) {
    if (this.editorControl) {
      this.editorControl.activateComponent();
      return;
    }
    this.editorControl = sub.factory.get('editor');
    return this.editorControl.encrypt({
      predefinedText: options.text,
      quotedMail: options.quotedMail,
      quotedMailIndent: !this.editorContentModified,
      getRecipients: this.getRecipients.bind(this)
    })
    .then(({armored, to, cc}) => {
      this.emit('set-editor-output', {text: armored, to, cc});
      this.editorContentModified = true;
      this.editorControl = null;
    })
    .catch(err => {
      if (err.code == 'EDITOR_DIALOG_CANCEL') {
        this.editorControl = null;
        this.emit('mail-editor-close');
        return;
      }
    });
  }

  /**
   * Get recipients from the encrypt frame
   * @return  {Promise<Array<Objects>>} - The recipient objects in the form: [{ email: 'jon@example.com' }]
   */
  async getRecipients() {
    const recipients = await this.send('get-recipients');
    return {to: recipients, cc: []};
  }
}
