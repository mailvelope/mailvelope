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

  function EditorController(port) {
    sub.SubController.call(this, port);
    if (!port) {
      this.mainType = 'editor';
      this.id = this.mvelo.util.getHash();
    }
    this.initText = '';
    this.encryptCallback = null;
    this.keyringId = null;
    this.pwdCache = require('../pwdCache');
    this.editorPopup = null;
    this.getRecipients = null;
    this.keyidBuffer = null;
    this.signBuffer = null;
    this.pwdControl = null;
    this.keyring = require('../keyring');
    this.mailbuild = require('../../mailbuild');
  }

  EditorController.prototype = Object.create(sub.SubController.prototype);

  EditorController.prototype.handlePortMessage = function(msg) {
    var that = this;
    //console.log('EditorController.handlePortMessage', msg);
    switch (msg.event) {
      case 'editor-init':
        this.ports.editor.postMessage({event: 'set-text', text: this.initText});
        break;
      case 'editor-cancel':
        this.editorPopup.close();
        this.editorPopup = null;
        break;
      case 'editor-transfer-output':
        this.editorPopup.close();
        this.editorPopup = null;
        this.encryptCallback(null, msg.data);
        break;
      case 'encrypt-dialog-init':
        // send content
        this.mvelo.data.load('common/ui/inline/dialogs/templates/encrypt.html', function(content) {
          //console.log('content rendered', content);
          that.ports.eDialog.postMessage({event: 'encrypt-dialog-content', data: content});
          // get potential recipients
          that.getRecipients(function(result) {
            that.ports.eDialog.postMessage({event: 'public-key-userids', keys: result.keys, primary: result.primary});
          });
        });
        break;
      case 'sign-dialog-init':
        var keys = this.keyring.getById(this.mvelo.LOCAL_KEYRING_ID).getPrivateKeys();
        var primary = this.prefs.data().general.primary_key;
        this.mvelo.data.load('common/ui/inline/dialogs/templates/sign.html', function(content) {
          var port = that.ports.sDialog;
          port.postMessage({event: 'sign-dialog-content', data: content});
          port.postMessage({event: 'signing-key-userids', keys: keys, primary: primary});
        });
        break;
      case 'encrypt-dialog-cancel':
      case 'sign-dialog-cancel':
        // forward event to encrypt frame
        this.ports.editor.postMessage(msg);
        break;
      case 'encrypt-dialog-ok':
        // add recipients to buffer
        this.keyidBuffer = msg.recipient;
        // get email text from eFrame
        this.ports.editor.postMessage({event: 'get-plaintext', action: 'encrypt'});
        break;
      case 'editor-container-encrypt':
        this.keyringId = msg.keyringId;
        var keyIdMap = this.keyring.getById(this.keyringId).getKeyIdByAddress(msg.recipients, {validity: true});
        if (Object.keys(keyIdMap).some(function(keyId) {
          return keyIdMap[keyId] === false;
        })) {
          var error = new Error('No valid encryption key for recipient address');
          error.code = 'NO_KEY_FOR_RECIPIENT';
          this.ports.editorCont.postMessage({event: 'error-message', error: error});
          return;
        }
        var keyIds = [];
        msg.recipients.forEach(function(recipient) {
          keyIds = keyIds.concat(keyIdMap[recipient]);
        });
        this.keyidBuffer = this.mvelo.util.sortAndDeDup(keyIds);
        this.ports.editor.postMessage({event: 'get-plaintext', action: 'encrypt'});
        break;
      case 'sign-dialog-ok':
        this.signBuffer = {};
        var cacheEntry = this.pwdCache.get(msg.signKeyId, msg.signKeyId);
        if (cacheEntry && cacheEntry.key) {
          this.signBuffer.key = cacheEntry.key;
          this.ports.editor.postMessage({event: 'get-plaintext', action: 'sign'});
        } else {
          var key = this.keyring.getById(this.mvelo.LOCAL_KEYRING_ID).getKeyForSigning(msg.signKeyId);
          // add key in buffer
          this.signBuffer.key = key.signKey;
          this.signBuffer.keyid = msg.signKeyId;
          this.signBuffer.userid = key.userId;
          if (cacheEntry) {
            this.pwdCache.unlock(cacheEntry, this.signBuffer, function() {
              that.ports.editor.postMessage({event: 'get-plaintext', action: 'sign'});
            });
          } else {
            // open password dialog
            this.pwdControl = sub.factory.get('pwdDialog');
            this.pwdControl.unlockKey({
              message: this.signBuffer,
              openPopup: false
            }, function(err) {
              if (err === 'pwd-dialog-cancel') {
                that.ports.editor.postMessage({event: 'hide-pwd-dialog'});
                return;
              }
              if (err) {
                // TODO: propagate error to sign dialog
              }
              // success
              that.ports.editor.postMessage({event: 'get-plaintext', action: 'sign'});
            });
            this.ports.editor.postMessage({event: 'show-pwd-dialog', id: this.pwdControl.id});
          }
        }
        break;
      case 'editor-plaintext':
        if (msg.action === 'encrypt') {
          var data = this.buildMail(msg.message, msg.attachments);
          this.model.encryptMessage(data, this.keyringId, this.keyidBuffer, function(err, msg) {
            var port = that.ports.editorCont || that.ports.editor;
            port.postMessage({event: 'encrypted-message', message: msg});
          });
        } else if (msg.action === 'sign') {
          this.model.signMessage(msg.message, this.signBuffer.key, function(err, msg) {
            that.ports.editor.postMessage({event: 'signed-message', message: msg});
          });
        } else {
          throw new Error('Unknown eframe action:', msg.action);
        }
        break;
      default:
        console.log('unknown event', msg);
    }
  };

  EditorController.prototype.encrypt = function(options, callback) {
    var that = this;
    this.initText = options.initText;
    this.getRecipients = options.getRecipients;
    this.keyringId = options.keyringId || this.mvelo.LOCAL_KEYRING_ID;
    this.encryptCallback = callback;
    this.mvelo.windows.openPopup('common/ui/editor/editor.html?id=' + this.id + '&editor_type=' + this.prefs.data().general.editor_type, {width: 820, height: 450, modal: false}, function(window) {
      that.editorPopup = window;
    });
  };

  EditorController.prototype.buildMail = function(message, attachments) {
    //var t0 = Date.now();
    var mainMessage = new this.mailbuild("multipart/mixed");
    var composedMessage;
    var hasAttachment;
    if (message) {
      var textMime = new this.mailbuild("text/plain")
        .setHeader("Content-Type", "text/plain; charset=utf-8")
        .addHeader("Content-Transfer-Encoding", "quoted-printable")
        .setContent(message);
      mainMessage.appendChild(textMime);
    }
    if (attachments && Object.keys(attachments).length > 0) {
      hasAttachment = true;
      for (var attachment in attachments) {
        var attachmentMime = new this.mailbuild("text/plain")
          .createChild(false, {filename: attachments[attachment].filename})
          //.setHeader("Content-Type", msg.attachments[attachment].type+"; charset=utf-8")
          .addHeader("Content-Transfer-Encoding", "base64")
          .addHeader("Content-Disposition", "attachment") // ; filename="+msg.attachments[attachment].filename
          .setContent(attachments[attachment].content);
        mainMessage.appendChild(attachmentMime);
      }
    }
    if (hasAttachment) {
      composedMessage = mainMessage.build();
    } else {
      composedMessage = message;
    }
    //var t1 = Date.now();
    //console.log("Building mime message took " + (t1 - t0) + " milliseconds. Current time: " + t1);
    return composedMessage;
  };

  exports.EditorController = EditorController;

});
