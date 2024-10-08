/**
 * Copyright (C) 2015-2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

/**
 * @fileOverview This controller handles events from the encryptFrame and
 * create an editor controller to encrypt plaintext to a list of recipients.
 */

import {SubController} from './sub.controller';

export default class EncryptController extends SubController {
  constructor(port) {
    super(port);
    this.state = {
      editorContentModified: false
    };
    this.peerType = 'encryptController';
    // register event handlers
    this.on('eframe-display-editor', this.onEncryptFrameDisplayEditor);
  }

  /**
   * Opens a new editor control and gets the recipients to encrypt plaintext
   * input to their public keys.
   * @param  {String} options.text   The plaintext input to encrypt
   */
  async onEncryptFrameDisplayEditor(options) {
    await this.createPeer('editorController');
    if (await this.peers.editorController.getPopup()) {
      await this.peers.editorController.activateComponent();
      return;
    }
    this.peers.editorController.openEditor({
      predefinedText: options.text,
      quotedMail: options.quotedMail,
      quotedMailIndent: !this.state.editorContentModified,
      recipients: {to: options.recipients, cc: []}
    });
  }

  async encryptedMessage({armored, to, cc}) {
    this.emit('set-editor-output', {text: armored, to, cc});
    this.setState({editorContentModified: true});
    await this.removePeer('editorController');
  }

  async encryptError(err) {
    if (err.code == 'EDITOR_DIALOG_CANCEL') {
      await this.removePeer('editorController');
      this.emit('mail-editor-close');
      return;
    }
    console.log('Error calling editor in encrypt controller', err);
  }
}
