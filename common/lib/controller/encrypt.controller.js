/**
 * Mailvelope - secure email with OpenPGP encryption for Webmail
 * Copyright (C) 2014-2015 Mailvelope GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License version 3
 * as published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

/**
 * @fileOverview This controller handles events from the encryptFrame and
 * create an editor controller to encrypt plaintext to a list of recipients.
 */

'use strict';

define(function(require, exports, module) {

  var sub = require('./sub.controller');

  function EncryptController(port) {
    sub.SubController.call(this, port);
    this.editorControl = null;
    this.recipientsCallback = null;
    // register event handlers
    this.on('eframe-recipients', this.displayRecipientProposal);
    this.on('eframe-display-editor', this.openEditor);
  }

  EncryptController.prototype = Object.create(sub.SubController.prototype);

  /**
   * Opens a new editor control and gets the recipients to encrypt plaintext
   * input to their public keys.
   * @param  {String} options.text   The plaintext input to encrypt
   */
  EncryptController.prototype.openEditor = function(options) {
    if (this.mvelo.windows.modalActive) {
      // modal dialog already open
      // TODO show error, fix modalActive on FF
      return;
    }

    var that = this;
    this.editorControl = sub.factory.get('editor');
    this.editorControl.encrypt({
      initText: options.text,
      getRecipientProposal: this.getRecipientProposal.bind(this)
    }, function(err, armored, recipients) {
      if (err) {
        // TODO: display error message
        console.error(err);
        return;
      }
      // sanitize if content from plain text, rich text already sanitized by editor
      if (that.prefs.data().general.editor_type == that.mvelo.PLAIN_TEXT) {
        that.mvelo.util.parseHTML(armored, function(parsed) {
          that.emit('set-editor-output', {text: parsed, recipients: recipients});
        });
      } else {
        that.emit('set-editor-output', {text: armored, recipients: recipients});
      }
    });
  };

  /**
   * Signal the encrypt frame to  call currentProvider.getRecipients().
   * @param  {Function} callback   Will be called once recipients are set later
   */
  EncryptController.prototype.getRecipientProposal = function(callback) {
    if (this.recipientsCallback) {
      throw new Error('Waiting for recipients result.');
    }
    this.emit('get-recipients');
    this.recipientsCallback = callback;
  };

  /**
   * Handles gotten recipients after calling currentProvider.getRecipients() in
   * the encrypt frame.
   * @param  {Array} options.recipients   The recipient objects in the form: [{ email: 'jon@example.com' }]
   */
  EncryptController.prototype.displayRecipientProposal = function(options) {
    if (this.recipientsCallback) {
      this.recipientsCallback(options.recipients);
      this.recipientsCallback = null;
    }
  };

  exports.EncryptController = EncryptController;

});
