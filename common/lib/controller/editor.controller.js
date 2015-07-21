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
  var DecryptController = require('./decrypt.controller').DecryptController;
  var uiLog = require('../uiLog');
  var syncCtrl = require('./sync.controller');

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
    this.pgpMIME = false;
    this.signMsg = null;
  }

  EditorController.prototype = Object.create(sub.SubController.prototype);

  EditorController.prototype.handlePortMessage = function(msg) {
    var that = this;
    //console.log('EditorController.handlePortMessage', msg);
    switch (msg.event) {
      case 'editor-init':
        this.ports.editor.postMessage({event: 'set-text', text: this.initText});
        if (this.ports.editorCont) {
          this.ports.editorCont.postMessage({event: 'editor-ready'});
        }
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
        this.mvelo.data.load('common/ui/inline/dialogs/templates/encrypt.html').then(function(content) {
          //console.log('content rendered', content);
          that.ports.eDialog.postMessage({event: 'encrypt-dialog-content', data: content});
          // get potential recipients
          that.getRecipients(function(result) {
            that.ports.eDialog.postMessage({event: 'public-key-userids', keys: result.keys, primary: result.primary});
          });
        });
        break;
      case 'sign-dialog-init':
        var localKeyring = this.keyring.getById(this.mvelo.LOCAL_KEYRING_ID);
        var keys = localKeyring.getPrivateKeys();
        var primary = localKeyring.getAttributes().primary_key;
        this.mvelo.data.load('common/ui/inline/dialogs/templates/sign.html').then(function(content) {
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
        this.pgpMIME = true;
        this.keyringId = msg.keyringId;
        var keyIdMap = this.keyring.getById(this.keyringId).getKeyIdByAddress(msg.recipients, {validity: true});
        if (Object.keys(keyIdMap).some(function(keyId) {
          return keyIdMap[keyId] === false;
        })) {
          var error = {
            message: 'No valid encryption key for recipient address',
            code: 'NO_KEY_FOR_RECIPIENT'
          };
          this.ports.editorCont.postMessage({event: 'error-message', error: error});
          return;
        }
        var keyIds = [];
        msg.recipients.forEach(function(recipient) {
          keyIds = keyIds.concat(keyIdMap[recipient]);
        });
        var primary = this.prefs.data().general.auto_add_primary &&
                      this.keyring.getById(this.keyringId).getAttributes().primary_key;
        if (primary) {
          keyIds.push(primary.toLowerCase());
        }
        this.keyidBuffer = this.mvelo.util.sortAndDeDup(keyIds);
        this.ports.editor.postMessage({event: 'get-plaintext', action: 'encrypt'});
        break;
      case 'editor-options':
        this.keyringId = msg.keyringId;
        this.options = msg.options;
        this.signMsg = msg.options.signMsg;
        var data = {
          signMsg: this.signMsg,
          primary: this.keyring.getById(this.keyringId).getPrimaryKey() || false
        };

        if (this.options.quotedMail) {
          this.decryptQuoted(this.options.quotedMail);
        } else if (this.options.predefinedText) {
          data.text = this.options.predefinedText;
        }
        console.log('editor.controller triggerSync', this.id);
        syncCtrl.triggerSync({keyringId: this.keyringId, force: true});
        this.ports.editor.postMessage({event: 'set-init-data', data: data});
        break;
      case 'sign-dialog-ok':
        this.signBuffer = {};
        var key = this.keyring.getById(this.mvelo.LOCAL_KEYRING_ID).getKeyForSigning(msg.signKeyId);
        // add key in buffer
        this.signBuffer.key = key.signKey;
        this.signBuffer.keyid = msg.signKeyId;
        this.signBuffer.userid = key.userId;
        this.signBuffer.openPopup = false;
        this.signBuffer.reason = 'PWD_DIALOG_REASON_SIGN';
        this.signBuffer.beforePasswordRequest = function() {
          that.ports.editor.postMessage({event: 'show-pwd-dialog', id: that.pwdControl.id});
        };
        this.signBuffer.keyringId = this.keyringId;
        this.pwdControl = sub.factory.get('pwdDialog');
        this.pwdControl.unlockCachedKey(this.signBuffer)
          .then(function() {
            that.ports.editor.postMessage({event: 'get-plaintext', action: 'sign'});
          })
          .catch(function(err) {
            if (err.code = 'PWD_DIALOG_CANCEL') {
              that.ports.editor.postMessage({event: 'hide-pwd-dialog'});
              return;
            }
            if (err) {
              // TODO: propagate error to sign dialog
            }
          });
        break;
      case 'editor-plaintext':
        this.signAndEncrypt(msg);
        break;
      case 'editor-user-input':
        uiLog.push(msg.source, msg.type);
        break;
      case 'open-security-settings':
        this.openSecuritySettings();
        break;
      default:
        console.log('unknown event', msg);
    }
  };

  /**
   * @param {Object} options
   * @param {String} options.initText
   * @param {String} options.keyringId
   * @param {Function} options.getRecipients
   * @param {Function} callback
   */
  EditorController.prototype.encrypt = function(options, callback) {
    var that = this;
    this.initText = options.initText;
    this.getRecipients = options.getRecipients;
    this.keyringId = options.keyringId || this.mvelo.LOCAL_KEYRING_ID;
    this.encryptCallback = callback;
    this.mvelo.windows.openPopup('common/ui/editor/editor.html?id=' + this.id + '&editor_type=' + this.prefs.data().general.editor_type, {width: 820, height: 550, modal: false}, function(window) {
      that.editorPopup = window;
    });
  };

  /**
   * @param {String} message
   * @param {Map} attachments
   * @param {String} attachments.filename
   * @param {String} attachments.content
   * @param {Integer} attachments.size
   * @param {String} attachments.type
   * @returns {String | null}
   */
  EditorController.prototype.buildMail = function(message, attachments) {
    //var t0 = Date.now();
    var mainMessage = new this.mailbuild("multipart/mixed");
    var composedMessage = null;
    var hasAttachment;
    var quotaSize = 0;

    if (message) {
      quotaSize += this.mvelo.util.byteCount(message);
      var textMime = new this.mailbuild("text/plain")
        .setHeader("Content-Type", "text/plain; charset=utf-8")
        .addHeader("Content-Transfer-Encoding", "quoted-printable")
        .setContent(message);
      mainMessage.appendChild(textMime);
    }
    if (attachments && Object.keys(attachments).length > 0) {
      hasAttachment = true;
      for (var attachment in attachments) {
        quotaSize += attachments[attachment].size;
        var attachmentMime = new this.mailbuild("text/plain")
          .createChild(false, {filename: attachments[attachment].filename})
          //.setHeader("Content-Type", msg.attachments[attachment].type+"; charset=utf-8")
          .addHeader("Content-Transfer-Encoding", "base64")
          .addHeader("Content-Disposition", "attachment") // ; filename="+msg.attachments[attachment].filename
          .setContent(attachments[attachment].content);
        mainMessage.appendChild(attachmentMime);
      }
    }

    if ((Math.ceil(quotaSize / 3) * 4) > this.options.quota) {
      var error = {
        type: 'error',
        code: 'ENCRYPT_QUOTA_SIZE',
        message: 'ENCRYPT_QUOTA_SIZE'
      };

      if (this.ports.editorCont) {
        this.ports.editorCont.postMessage({event: 'error-message', error: error});
      }
      return composedMessage;
    }

    if (hasAttachment || this.pgpMIME) {
      composedMessage = mainMessage.build();
    } else {
      composedMessage = message;
    }
    //var t1 = Date.now();
    //console.log("Building mime message took " + (t1 - t0) + " milliseconds. Current time: " + t1);
    return composedMessage;
  };

  /**
   * @param {String} armored
   * @returns {undefined}
   */
  EditorController.prototype.decryptQuoted = function(armored) {
    var that = this;
    var decryptTimer = null;

    var decryptCtrl = new DecryptController();
    this.model.readMessage(armored, this.keyringId)
      .then(function(message) {
        return decryptCtrl.prepareKey(message, !that.editorPopup);
      })
      .then(function(message) {
        decryptTimer = that.mvelo.util.setTimeout(function() {
          that.ports.editor.postMessage({event: 'decrypt-in-progress'});
        }, 800);
        return decryptCtrl.decryptMessage(message);
      })
      .then(function(content) {
        var handlers = {
          onMessage: function(msg) {
            if (that.options.quotedMailIndent) {
              msg = msg.replace(/^(.|\n)/gm, '> $&');
            }
            if (that.options.quotedMailHeader) {
              msg = '> ' + that.options.quotedMailHeader + '\n' + msg;
            }
            if (that.options.quotedMailIndent || that.options.quotedMailHeader) {
              msg = '\n\n' + msg;
            }
            if (that.options.predefinedText) {
              msg = msg + '\n\n' + that.options.predefinedText;
            }
            that.ports.editor.postMessage({event: 'set-text', text: msg});
          },
          onAttachment: function(part) {
            // only reply scenario at the moment
          }
        };
        decryptCtrl.parseMessage(content.text, handlers, 'text');
      })
      .then(function() {
        that.mvelo.util.clearTimeout(decryptTimer);
        that.ports.editor.postMessage({event: 'decrypt-end'});
      })
      .catch(function(error) {
        that.ports.editor.postMessage({event: 'decrypt-failed', error: error});
      });
  };

  /**
   * @param {Object} options
   * @param {String} options.message
   * @param {Array} options.keyIdsHex
   * @return {undefined}
   */
  EditorController.prototype.signAndEncryptMessage = function(options) {
    var that = this;
    var port = this.ports.editorCont || this.ports.editor;
    var primaryKey = this.keyring.getById(this.keyringId).getPrimaryKey();
    var encryptTimer = null;

    if (!primaryKey) {
      this.ports.editor.postMessage({
        event: 'error-message',
        error: {
          type: 'error',
          code: 'NO_PRIMARY_KEY_FOUND',
          message: 'No primary key found'
        }
      });
      return;
    }

    var signKeyPacket = primaryKey.key.getSigningKeyPacket();
    var signKeyid = signKeyPacket && signKeyPacket.getKeyId().toHex();
    if (!signKeyid) {
      this.ports.editor.postMessage({
        event: 'error-message',
        error: {
          type: 'error',
          code: 'NO_SIGN_KEY_FOUND',
          message: 'No valid signing key packet found'
        }
      });
      return;
    }

    primaryKey.keyid = signKeyid;
    primaryKey.keyringId = this.keyringId;
    primaryKey.reason = 'PWD_DIALOG_REASON_DECRYPT';
    primaryKey.openPopup = true;
    primaryKey.beforePasswordRequest = function() {
      if (that.port && that.prefs.data().security.display_decrypted == that.mvelo.DISPLAY_POPUP) {
        that.port.editor.postMessage({event: 'show-pwd-dialog', id: that.pwdControl.id});
      }
    };

    that.pwdControl = sub.factory.get('pwdDialog');
    that.pwdControl.unlockCachedKey(primaryKey)
      .then(function() {
        encryptTimer = that.mvelo.util.setTimeout(function() {
          that.ports.editor.postMessage({event: 'encrypt-in-progress'});
        }, 800);

        return that.model.signAndEncryptMessage({
          keyIdsHex: options.keyIdsHex,
          keyringId: that.keyringId,
          primaryKey: primaryKey,
          message: options.message
        });
      })
      .then(function(msg) {
        port.postMessage({event: 'encrypted-message', message: msg});
        that.mvelo.util.clearTimeout(encryptTimer);
        that.ports.editor.postMessage({event: 'encrypt-end'});
      })
      .catch(function(error) {
        console.log('signAndEncryptMessage() error', error);

        if (error.message === 'pwd-dialog-cancel') {
          error = {
            type: 'error',
            code: 'PWD_DIALOG_CANCEL',
            message: error.message
          };
        }
        that.ports.editor.postMessage({event: 'error-message', error: error});
        if (that.ports.editorCont) {
          port.postMessage({event: 'error-message', error: error});
        }
        that.mvelo.util.clearTimeout(encryptTimer);
        that.ports.editor.postMessage({event: 'encrypt-failed'});
      });
  };

  /**
   * @param {Object} options
   * @param {String} options.message
   * @param {String} options.keyringId
   * @param {Array} options.keyIdsHex
   * @return {undefined}
   */
  EditorController.prototype.encryptMessage = function(options) {
    var that = this;
    var port = this.ports.editorCont || this.ports.editor;

    var encryptTimer = this.mvelo.util.setTimeout(function() {
      that.ports.editor.postMessage({event: 'encrypt-in-progress'});
    }, 800);

    this.model.encryptMessage(options)
      .then(function(msg) {
        port.postMessage({event: 'encrypted-message', message: msg});
        that.mvelo.util.clearTimeout(encryptTimer);
        that.ports.editor.postMessage({event: 'encrypt-end'});
      })
      .catch(function(error) {
        console.log('model.encryptMessage() error', error);
        that.ports.editor.postMessage({event: 'error-message', error: error});
        if (that.ports.editorCont) {
          port.postMessage({event: 'error-message', error: error});
        }
        that.mvelo.util.clearTimeout(encryptTimer);
        that.ports.editor.postMessage({event: 'encrypt-failed'});
      });
  };

  /**
   * @param {String} message
   * @return {undefined}
   */
  EditorController.prototype.signMessage = function(message) {
    var that = this;

    var encryptTimer = this.mvelo.util.setTimeout(function() {
      that.ports.editor.postMessage({event: 'encrypt-in-progress'});
    }, 800);

    this.model.signMessage(message, this.signBuffer.key)
      .then(function(msg) {
        that.ports.editor.postMessage({event: 'signed-message', message: msg});
        that.mvelo.util.clearTimeout(encryptTimer);
        that.ports.editor.postMessage({event: 'encrypt-end'});
      })
      .catch(function(error) {
        console.log('model.signMessage() error', error);
        that.mvelo.util.clearTimeout(encryptTimer);
        that.ports.editor.postMessage({event: 'encrypt-failed'});
      });
  };

  /**
   * @param {Object} options
   * @param {String} options.action
   * @param {String} options.message
   * @param {Array} options.attachment
   * @return {undefined}
   * @error {Error}
   */
  EditorController.prototype.signAndEncrypt = function(options) {
    if (options.action === 'encrypt') {
      var data = this.buildMail(options.message, options.attachments);

      if (data === null) {
        return;
      }

      if (this.signMsg) {
        this.signAndEncryptMessage({
          message: data,
          keyIdsHex: this.keyidBuffer
        });
      } else {
        this.encryptMessage({
          message: data,
          keyringId: this.keyringId,
          keyIdsHex: this.keyidBuffer
        });
      }
    } else if (options.action === 'sign') {
      this.signMessage(options.message);
    } else {
      throw new Error('Unknown eframe action:', options.action);
    }
  };

  exports.EditorController = EditorController;

});
