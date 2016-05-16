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
 * @fileOverview This controller implements handling of state and events
 * for the encryption editor like handling message data and recipients.
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
    this.editorPopup = null;
    this.getRecipientProposal = null;
    this.keyidBuffer = null;
    this.signBuffer = null;
    this.pwdControl = null;
    this.keyring = require('../keyring');
    this.mailbuild = require('emailjs-mime-builder');
    this.pgpMIME = false;
    this.signMsg = null;
    this.options = {};

    // register event handlers
    this.on('editor-init', this._onEditorInit);
    this.on('editor-cancel', this._onEditorCancel);
    this.on('sign-dialog-init', this._onSignDialogInit);
    this.on('sign-dialog-ok', this._onSignDialogOk);
    this.on('sign-dialog-cancel', this._onSignDialogCancel);
    this.on('editor-container-encrypt', this._onEditorContainerEncrypt);
    this.on('editor-container-create-draft', this._onEditorContainerCreateDraft);
    this.on('editor-options', this._onEditorOptions);
    this.on('editor-plaintext', this.signAndEncrypt);
    this.on('editor-user-input', this._onEditorUserInput);
    this.on('open-security-settings', this.openSecuritySettings);
  }

  EditorController.prototype = Object.create(sub.SubController.prototype);

  EditorController.prototype._onEditorInit = function() {
    if (this.initText) {
      this.emit('set-text', {text: this.initText});
    }
    if (this.ports.editorCont) {
      this.emit('editor-ready', undefined, this.ports.editorCont);
    }
    // display recipient proposal in the editor
    this.getRecipientProposal(this.displayRecipientProposal.bind(this));
  };

  EditorController.prototype._onEditorCancel = function() {
    this.editorPopup.close();
    this.editorPopup = null;
  };

  EditorController.prototype._onSignDialogInit = function() {
    var localKeyring = this.keyring.getById(this.mvelo.LOCAL_KEYRING_ID);
    var keys = localKeyring.getPrivateKeys();
    var primary = localKeyring.getAttributes().primary_key;
    this.mvelo.data.load('common/ui/inline/dialogs/templates/sign.html').then(function(content) {
      this.emit('sign-dialog-content', {data: content}, this.ports.sDialog);
      this.emit('signing-key-userids', {keys: keys, primary: primary}, this.ports.sDialog);
    }.bind(this));
  };

  EditorController.prototype._onSignDialogCancel = function(msg) {
    // forward event to encrypt frame
    this.emit(msg.event, msg);
  };

  EditorController.prototype._onEditorContainerEncrypt = function(msg) {
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
      this.emit('error-message', {error: error}, this.ports.editorCont);
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
    this.emit('get-plaintext', {action: 'encrypt'});
  };

  EditorController.prototype._onEditorContainerCreateDraft = function(msg) {
    this.pgpMIME = true;
    this.signMsg = true;
    this.keyringId = msg.keyringId;
    this.options.reason = 'PWD_DIALOG_REASON_CREATE_DRAFT';
    var primary = this.keyring.getById(this.keyringId).getPrimaryKey();
    if (primary) {
      this.keyidBuffer = [primary.keyid.toLowerCase()];
    } else {
      var error = {
        message: 'No private key found for creating draft.',
        code: 'NO_KEY_FOR_ENCRYPTION'
      };
      this.emit('error-message', {error: error}, this.ports.editorCont);
      return;
    }
    this.emit('get-plaintext', {action: 'encrypt'});
  };

  EditorController.prototype._onEditorOptions = function(msg) {
    this.keyringId = msg.keyringId;
    this.options = msg.options;
    this.signMsg = msg.options.signMsg;
    var data = {
      signMsg: this.signMsg,
      primary: this.keyring.getById(this.keyringId).getPrimaryKey() || false
    };
    if (this.options.armoredDraft) {
      this.options.keepAttachments = true;
      this.scheduleDecrypt(this.options.armoredDraft);
    } else {
      if (this.options.quotedMail) {
        this.scheduleDecrypt(this.options.quotedMail);
      } else if (this.options.predefinedText) {
        data.text = this.options.predefinedText;
      }
    }
    syncCtrl.triggerSync({keyringId: this.keyringId, force: true});
    this.emit('set-init-data', {data: data});
  };

  EditorController.prototype._onSignDialogOk = function(msg) {
    var that = this;
    this.signBuffer = {};
    var key = this.keyring.getById(this.mvelo.LOCAL_KEYRING_ID).getKeyForSigning(msg.signKeyId);
    // add key in buffer
    this.signBuffer.key = key.signKey;
    this.signBuffer.keyid = msg.signKeyId;
    this.signBuffer.userid = key.userId;
    this.signBuffer.openPopup = false;
    this.signBuffer.reason = 'PWD_DIALOG_REASON_SIGN';
    this.signBuffer.beforePasswordRequest = function() {
      that.emit('show-pwd-dialog', {id: that.pwdControl.id});
    };
    this.signBuffer.keyringId = this.keyringId;
    this.pwdControl = sub.factory.get('pwdDialog');
    this.pwdControl.unlockKey(this.signBuffer)
      .then(function() {
        that.emit('get-plaintext', {action: 'sign'});
      })
      .catch(function(err) {
        if (err.code = 'PWD_DIALOG_CANCEL') {
          that.emit('hide-pwd-dialog');
          return;
        }
        if (err) {
          // TODO: propagate error to sign dialog
        }
      });
  };

  EditorController.prototype._onEditorUserInput = function(msg) {
    uiLog.push(msg.source, msg.type);
  };

  /**
   * @param {Object} options
   * @param {String} options.initText
   * @param {String} options.keyringId
   * @param {Function} options.getRecipientProposal
   * @param {Function} callback
   */
  EditorController.prototype.encrypt = function(options, callback) {
    var that = this;
    this.initText = options.initText;
    this.getRecipientProposal = options.getRecipientProposal;
    this.keyringId = options.keyringId || this.mvelo.LOCAL_KEYRING_ID;
    this.encryptCallback = callback;
    this.mvelo.windows.openPopup('common/ui/editor/editor.html?id=' + this.id + '&editor_type=' + this.prefs.data().general.editor_type, {width: 820, height: 550, modal: false}, function(window) {
      that.editorPopup = window;
    });
  };

  /**
   * Displays the recipient proposal in the editor.
   * @param  {Array} recipients   A list of potential recipient from the webmail ui
   */
  EditorController.prototype.displayRecipientProposal = function(recipients) {
    var emails = (recipients || []).map(function(recipient) { return recipient.email; });
    emails = this.mvelo.util.sortAndDeDup(emails);
    var localKeyring = this.keyring.getById(this.mvelo.LOCAL_KEYRING_ID);
    var keys = localKeyring.getKeyUserIDs(emails);
    var primary;
    if (this.prefs.data().general.auto_add_primary) {
      primary = localKeyring.getAttributes().primary_key;
      primary = primary && primary.toLowerCase();
    }
    this.emit('public-key-userids', {keys: keys, primary: primary});
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
    var that = this;
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
    if (attachments && attachments.length > 0) {
      hasAttachment = true;
      attachments.forEach(function(attachment) {
        quotaSize += attachment.size;
        var attachmentMime = new that.mailbuild("text/plain")
          .createChild(false, {filename: attachment.name})
          //.setHeader("Content-Type", attachment.type + "; charset=utf-8")
          .addHeader("Content-Transfer-Encoding", "base64")
          .addHeader("Content-Disposition", "attachment") // ; filename="attachment.filename
          .setContent(attachment.content);
        mainMessage.appendChild(attachmentMime);
      });
    }

    if (this.options.quota && (quotaSize > this.options.quota)) {
      var error = {
        code: 'ENCRYPT_QUOTA_SIZE',
        message: 'Mail content exceeds quota limit.'
      };

      if (this.ports.editorCont) {
        this.emit('error-message', {error: error}, this.ports.editorCont);
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

  EditorController.prototype.scheduleDecrypt = function(armored) {
    var that = this;
    if (armored.length > 400000) {
      // show spinner for large messages
      this.emit('decrypt-in-progress');
    }
    this.mvelo.util.setTimeout(function() {
      that.decryptArmored(armored);
    }, 50);
  };

  /**
   * @param {String} armored
   * @returns {undefined}
   */
  EditorController.prototype.decryptArmored = function(armored) {
    var that = this;
    var decryptCtrl = new DecryptController();
    decryptCtrl.keyringId = this.keyringId;
    this.model.readMessage(armored, this.keyringId)
      .then(function(message) {
        return decryptCtrl.prepareKey(message, !that.editorPopup);
      })
      .then(function(message) {
        message.options = message.options || {};
        message.options.selfSigned = Boolean(that.options.armoredDraft);
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
            that.emit('set-text', {text: msg});
          },
          onAttachment: function(part) {
            if (that.options.keepAttachments) {
              that.emit('set-attachment', {attachment: part});
            }
          }
        };
        if (that.options.armoredDraft) {
          if (!(content.signatures && content.signatures[0].valid)) {
            throw { message: 'Restoring of the draft failed due to invalid signature.' };
          }
        }
        return decryptCtrl.parseMessage(content.text, handlers, 'text');
      })
      .then(function() {
        that.emit('decrypt-end');
      })
      .catch(function(error) {
        that.emit('decrypt-failed', {error: error});
      });
  };

  /**
   * @param {Object} options
   * @param {String} options.message
   * @param {Array} options.keyIdsHex
   * @return {Promise}
   */
  EditorController.prototype.signAndEncryptMessage = function(options) {
    var that = this;
    var port = this.ports.editorCont || this.ports.editor;
    var primaryKey = this.keyring.getById(this.keyringId).getPrimaryKey();
    var encryptTimer = null;

    if (!primaryKey) {
      this.emit('error-message', {
        error: {
          code: 'NO_PRIMARY_KEY_FOUND',
          message: 'No primary key found'
        }
      });
      return;
    }

    var signKeyPacket = primaryKey.key.getSigningKeyPacket();
    var signKeyid = signKeyPacket && signKeyPacket.getKeyId().toHex();
    if (!signKeyid) {
      this.emit('error-message', {
        error: {
          code: 'NO_SIGN_KEY_FOUND',
          message: 'No valid signing key packet found'
        }
      });
      return;
    }

    primaryKey.keyid = signKeyid;
    primaryKey.keyringId = this.keyringId;
    primaryKey.reason = this.options.reason || 'PWD_DIALOG_REASON_SIGN';

    that.pwdControl = sub.factory.get('pwdDialog');
    return that.pwdControl.unlockKey(primaryKey)
    .then(function() {
      encryptTimer = that.mvelo.util.setTimeout(function() {
        that.emit('encrypt-in-progress');
      }, 800);

      if (!that.prefs.data().security.password_cache) {
        syncCtrl.triggerSync(primaryKey);
      }

      return that.model.signAndEncryptMessage({
        keyIdsHex: options.keyIdsHex,
        keyringId: that.keyringId,
        primaryKey: primaryKey,
        message: options.message,
        uiLogSource: 'security_log_editor'
      });
    })
    .then(function(msg) {
      that.mvelo.util.clearTimeout(encryptTimer);
      that.emit('encrypt-end');
      return msg;
    })
    .catch(function(error) {
      error = that.mvelo.util.mapError(error);
      that.emit('error-message', {error: error});
      if (that.ports.editorCont) {
        that.emit('error-message', {error: error}, port);
      }
      that.mvelo.util.clearTimeout(encryptTimer);
      that.emit('encrypt-failed');
    });
  };

  /**
   * @param {Object} options
   * @param {String} options.message
   * @param {String} options.keyringId
   * @param {Array} options.keyIdsHex
   * @return {Promise}
   */
  EditorController.prototype.encryptMessage = function(options) {
    var that = this;
    var port = this.ports.editorCont || this.ports.editor;

    var encryptTimer = this.mvelo.util.setTimeout(function() {
      that.emit('encrypt-in-progress');
    }, 800);

    options.uiLogSource = 'security_log_editor';
    return this.model.encryptMessage(options)
      .then(function(msg) {
        that.mvelo.util.clearTimeout(encryptTimer);
        that.emit('encrypt-end');
        return msg;
      })
      .catch(function(error) {
        console.log('model.encryptMessage() error', error);
        that.emit('error-message', {error: error});
        if (that.ports.editorCont) {
          that.emit('error-message', {error: error}, port);
        }
        that.mvelo.util.clearTimeout(encryptTimer);
        that.emit('encrypt-failed');
      });
  };

  /**
   * @param {String} message
   * @return {Promise}
   */
  EditorController.prototype.signMessage = function(message) {
    var that = this;

    var encryptTimer = this.mvelo.util.setTimeout(function() {
      that.emit('encrypt-in-progress');
    }, 800);

    return this.model.signMessage(message, this.signBuffer.key)
      .then(function(msg) {
        that.mvelo.util.clearTimeout(encryptTimer);
        that.emit('encrypt-end');
        return msg;
      })
      .catch(function(error) {
        console.log('model.signMessage() error', error);
        that.mvelo.util.clearTimeout(encryptTimer);
        that.emit('encrypt-failed');
      });
  };

  /**
   * Closes the editor popup and transfer the encrypted/signed armored
   * message and recipients back to the webmail interface.
   * @param  {String} options.armored   The encrypted/signed message
   * @param  {String} options.keys      The keys used to encrypt the message
   */
  EditorController.prototype.transferAndCloseDialog = function(options) {
    this.editorPopup.close();
    this.editorPopup = null;
    var recipients = options.keys.map(function(k) {
      return {name: k.name, email: k.email};
    });
    this.encryptCallback(null, options.armored, recipients);
  };

  /**
   * @param {Object} options
   * @param {String} options.action
   * @param {String} options.message
   * @param {String} options.keys
   * @param {Array} options.attachment
   * @return {undefined}
   * @error {Error}
   */
  EditorController.prototype.signAndEncrypt = function(options) {
    var that = this, promise;
    options.keys = options.keys || [];

    if (options.action === 'encrypt') {
      var data = this.buildMail(options.message, options.attachments);

      if (data === null) {
        return;
      }

      var keyIdsHex = this.keyidBuffer || options.keys.map(function(key) { return key.keyid; });
      if (this.signMsg) {
        promise = this.signAndEncryptMessage({
          message: data,
          keyIdsHex: keyIdsHex
        });
      } else {
        promise = this.encryptMessage({
          message: data,
          keyringId: this.keyringId,
          keyIdsHex: keyIdsHex
        });
      }
    } else if (options.action === 'sign') {
      promise = this.signMessage(options.message);
    } else {
      throw new Error('Unknown eframe action:', options.action);
    }

    promise.then(function(armored) {
      that.transferAndCloseDialog({armored:armored, keys:options.keys});
    });
  };

  exports.EditorController = EditorController;

});
