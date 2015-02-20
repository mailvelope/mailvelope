/**
 * Mailvelope - secure email with OpenPGP encryption for Webmail
 * Copyright (C) 2014  Thomas Oberndörfer
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
    this.pwdCache = require('../pwdCache');
    this.keyidBuffer = null;
    this.signBuffer = null;
    this.editorControl = null;
    this.recipientsCallback = null;
    this.keyring = require('../keyring');
  }

  EncryptController.prototype = Object.create(sub.SubController.prototype);

  EncryptController.prototype.handlePortMessage = function(msg) {
    var that = this;
    switch (msg.event) {
      case 'encrypt-dialog-cancel':
      case 'sign-dialog-cancel':
        // forward event to encrypt frame
        this.ports.eFrame.postMessage(msg);
        break;
      case 'sign-dialog-init':
        var localKeyring = this.keyring.getById(this.mvelo.LOCAL_KEYRING_ID);
        var keys = localKeyring.getPrivateKeys();
        var primary = localKeyring.getAttributes().primary_key;
        this.mvelo.data.load('common/ui/inline/dialogs/templates/sign.html', function(content) {
          var port = that.ports.sDialog;
          port.postMessage({event: 'sign-dialog-content', data: content});
          port.postMessage({event: 'signing-key-userids', keys: keys, primary: primary});
        });
        break;
      case 'encrypt-dialog-init':
        // send content
        this.mvelo.data.load('common/ui/inline/dialogs/templates/encrypt.html', function(content) {
          //console.log('content rendered', content);
          that.ports.eDialog.postMessage({event: 'encrypt-dialog-content', data: content});
          // get potential recipients from eFrame
          // if editor is active get recipients from parent eFrame
          that.ports.eFrame.postMessage({event: 'recipient-proposal'});
        });
        break;
      case 'eframe-recipient-proposal':
        var emails = this.mvelo.util.sortAndDeDup(msg.data);
        var localKeyring = this.keyring.getById(this.mvelo.LOCAL_KEYRING_ID);
        var keys = localKeyring.getKeyUserIDs(emails);
        var primary = this.prefs.data().general.auto_add_primary && localKeyring.getAttributes().primary_key.toLowerCase();
        if (this.recipientsCallback) {
          this.recipientsCallback({ keys: keys, primary: primary });
          this.recipientsCallback = null;
        } else {
          this.ports.eDialog.postMessage({event: 'public-key-userids', keys: keys, primary: primary});
        }
        break;
      case 'encrypt-dialog-ok':
        // add recipients to buffer
        this.keyidBuffer = msg.recipient;
        // get email text from eFrame
        this.ports.eFrame.postMessage({event: 'email-text', type: msg.type, action: 'encrypt'});
        break;
      case 'sign-dialog-ok':
        this.signBuffer = {};
        var cacheEntry = this.pwdCache.get(msg.signKeyId, msg.signKeyId);
        if (cacheEntry && cacheEntry.key) {
          this.signBuffer.key = cacheEntry.key;
          this.ports.eFrame.postMessage({event: 'email-text', type: msg.type, action: 'sign'});
        } else {
          var key = this.keyring.getById(this.mvelo.LOCAL_KEYRING_ID).getKeyForSigning(msg.signKeyId);
          // add key in buffer
          this.signBuffer.key = key.signKey;
          this.signBuffer.keyid = msg.signKeyId;
          this.signBuffer.userid = key.userId;
          if (cacheEntry) {
            this.pwdCache.unlock(cacheEntry, this.signBuffer, function() {
              that.ports.eFrame.postMessage({event: 'email-text', type: msg.type, action: 'sign'});
            });
          } else {
            // open password dialog
            sub.factory.get('pwdDialog').unlockKey({message: this.signBuffer}).then(function() {
              // success
              that.ports.eFrame.postMessage({event: 'email-text', type: msg.type, action: 'sign'});
            }).catch(function(err) {
              if (err === 'pwd-dialog-cancel') {
                that.ports.eFrame.postMessage({event: 'dialog-cancel'});
                return;
              }
              if (err) {
                // TODO: propagate error to sign dialog
              }
            });
          }
        }
        break;
      case 'eframe-email-text':
        if (msg.action === 'encrypt') {
          this.model.encryptMessage(msg.data, this.mvelo.LOCAL_KEYRING_ID, this.keyidBuffer, function(err, msg) {
            that.ports.eFrame.postMessage({event: 'encrypted-message', message: msg});
          });
        } else if (msg.action === 'sign') {
          this.model.signMessage(msg.data, this.signBuffer.key, function(err, msg) {
            that.ports.eFrame.postMessage({event: 'signed-message', message: msg});
          });
        } else {
          throw new Error('Unknown eframe action:', msg.action);
        }
        break;
      case 'eframe-textarea-element':
        var defaultEncoding = {};
        if (msg.isTextElement || this.prefs.data().general.editor_type == this.mvelo.PLAIN_TEXT) {
          defaultEncoding.type = 'text';
          defaultEncoding.editable = false;
        } else {
          defaultEncoding.type = 'html';
          defaultEncoding.editable = true;
        }
        // if eDialog is active in inline mode
        this.ports.eDialog && this.ports.eDialog.postMessage({event: 'encoding-defaults', defaults: defaultEncoding});
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
    this.ports.eFrame.postMessage({event: 'recipient-proposal'});
    this.recipientsCallback = callback;
  };

  exports.EncryptController = EncryptController;

});
