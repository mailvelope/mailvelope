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
 * opens an editor to encrypt plaintext to a list of recipients.
 */

'use strict';

define(function(require, exports, module) {

  var sub = require('./sub.controller');

  function EncryptController(port) {
    sub.SubController.call(this, port);
    this.editorControl = null;
    this.recipientsCallback = null;
    this.keyring = require('../keyring');
  }

  EncryptController.prototype = Object.create(sub.SubController.prototype);

  EncryptController.prototype.handlePortMessage = function(msg) {
    var that = this;
    switch (msg.event) {
      case 'eframe-recipients':
        that.handleRecipients(msg.data);
        break;
      case 'eframe-display-editor':
        if (this.mvelo.windows.modalActive) {
          // modal dialog already open
          // TODO show error, fix modalActive on FF
        } else {
          this.openEditor(msg.text, function(err) {
            // TODO: error handling
          });
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
  EncryptController.prototype.openEditor = function(text, callback) {
    var that = this;
    this.editorControl = sub.factory.get('editor');
    this.editorControl.encrypt({
      initText: text,
      getRecipients: this.getRecipients.bind(this)
    }, function(err, armored) {
      if (err) {
        callback(err);
        return;
      }

      // sanitize if content from plain text, rich text already sanitized by editor
      if (that.prefs.data().general.editor_type == that.mvelo.PLAIN_TEXT) {
        that.mvelo.util.parseHTML(armored, function(parsed) {
          that._sendEvent('set-editor-output', {text: parsed});
          callback();
        });
      } else {
        that._sendEvent('set-editor-output', {text: armored});
        callback();
      }
    });
  };

  /**
   * Signal the encrypt frame to  call currentProvider.getRecipients().
   * @param  {Function} callback   Will be called once recipients are set later
   */
  EncryptController.prototype.getRecipients = function(callback) {
    if (this.recipientsCallback) {
      throw new Error('Waiting for recipients result.');
    }
    this._sendEvent('get-recipients');
    this.recipientsCallback = callback;
  };

  /**
   * Handles gotten recipients after calling currentProvider.getRecipients() in
   * the encrypt frame.
   * @param  {Array} recipients   The recipient objects in the form: [{ address: 'jon@example.com' }]
   */
  EncryptController.prototype.handleRecipients = function(recipients) {
    var emails = recipients.map(function(recipient) { return recipient.address; });
    emails = this.mvelo.util.sortAndDeDup(emails);
    var localKeyring = this.keyring.getById(this.mvelo.LOCAL_KEYRING_ID);
    var keys = localKeyring.getKeyUserIDs(emails);
    var primary;
    if (this.prefs.data().general.auto_add_primary) {
      primary = localKeyring.getAttributes().primary_key;
      primary = primary && primary.toLowerCase();
    }
    if (this.recipientsCallback) {
      this.recipientsCallback({keys: keys, primary: primary});
      this.recipientsCallback = null;
    }
  };

  /**
   * Helper to send events via postMessage.
   * @param  {String} event     The event descriptor
   * @param  {Object} options   Data to be sent in the event
   */
  EncryptController.prototype._sendEvent = function(event, options) {
    options = options || {};
    options.event = event;
    this.ports.eFrame.postMessage(options);
  };

  exports.EncryptController = EncryptController;

});
