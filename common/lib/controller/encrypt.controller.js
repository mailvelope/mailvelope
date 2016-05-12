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
  }

  EncryptController.prototype = Object.create(sub.SubController.prototype);

  EncryptController.prototype.handlePortMessage = function(msg) {
    switch (msg.event) {
      case 'eframe-recipients':
        this.displayRecipientProposal(msg.data);
        break;
      case 'eframe-display-editor':
        if (this.mvelo.windows.modalActive) {
          // modal dialog already open
          // TODO show error, fix modalActive on FF
        } else {
          this.openEditor(msg.text);
        }
        break;
      default:
        console.log('unknown event', msg);
    }
  };

  /**
   * Opens a new editor control and gets the recipients to encrypt plaintext
   * input to their public keys.
   * @param  {String} text   The plaintext input to encrypt
   */
  EncryptController.prototype.openEditor = function(text) {
    var that = this;
    this.editorControl = sub.factory.get('editor');
    this.editorControl.encrypt({
      initText: text,
      getRecipientProposal: this.getRecipientProposal.bind(this)
    }, function(err, armored, recipients) {
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
   * @param  {Array} recipients   The recipient objects in the form: [{ email: 'jon@example.com' }]
   */
  EncryptController.prototype.displayRecipientProposal = function(recipients) {
    if (this.recipientsCallback) {
      this.recipientsCallback(recipients);
      this.recipientsCallback = null;
    }
  };

  /**
   * Helper to send events via postMessage.
   * @param  {String} event     The event descriptor
   * @param  {Object} options   Data to be sent in the event
   */
  EncryptController.prototype.emit = function(event, options) {
    options = options || {};
    options.event = event;
    this.ports.eFrame.postMessage(options);
  };

  exports.EncryptController = EncryptController;

});
