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
        var emails = msg.data.map(function(recipient) { return recipient.address; });
        emails = this.mvelo.util.sortAndDeDup(emails);
        var localKeyring = this.keyring.getById(this.mvelo.LOCAL_KEYRING_ID);
        var keys = localKeyring.getKeyUserIDs(emails);
        var primary;
        if (this.prefs.data().general.auto_add_primary) {
          primary = localKeyring.getAttributes().primary_key;
          primary = primary && primary.toLowerCase();
        }
        if (this.recipientsCallback) {
          this.recipientsCallback({ keys: keys, primary: primary });
          this.recipientsCallback = null;
        }
        break;
      case 'eframe-display-editor':
        if (this.mvelo.windows.modalActive) {
          // modal dialog already open
          // TODO show error, fix modalActive on FF
        } else {
          this.editorControl = sub.factory.get('editor');
          this.editorControl.encrypt({
            initText: msg.text,
            getRecipients: this.getRecipients.bind(this)
          }, function(err, armored) {
            if (!err) {
              // sanitize if content from plain text, rich text already sanitized by editor
              if (that.prefs.data().general.editor_type == that.mvelo.PLAIN_TEXT) {
                that.mvelo.util.parseHTML(armored, function(parsed) {
                  that.ports.eFrame.postMessage({event: 'set-editor-output', text: parsed});
                });
              } else {
                that.ports.eFrame.postMessage({event: 'set-editor-output', text: armored});
              }
            } else {
              // TODO: error handling
            }
          });
        }
        break;
      default:
        console.log('unknown event', msg);
    }
  };

  EncryptController.prototype.getRecipients = function(callback) {
    if (this.recipientsCallback) {
      throw new Error('Waiting for recipients result.');
    }
    this.ports.eFrame.postMessage({event: 'get-recipients'});
    this.recipientsCallback = callback;
  };

  exports.EncryptController = EncryptController;

});
