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


var sub = require('./sub.controller');
var DecryptController = require('./decrypt.controller').DecryptController;
var uiLog = require('../modules/uiLog');
var syncCtrl = require('./sync.controller');
var KeyServer = require('../modules/keyserver');

function EditorController(port) {
  sub.SubController.call(this, port);
  if (!port) {
    this.mainType = 'editor';
    this.id = this.mvelo.util.getHash();
  }
  this.encryptCallback = null;
  this.encryptTimer = null;
  this.keyringId = null;
  this.editorPopup = null;
  this.keyidBuffer = null;
  this.signBuffer = null;
  this.pwdControl = null;
  this.keyring = require('../modules/keyring');
  this.keyserver = new KeyServer(this.mvelo);
  this.mailbuild = require('emailjs-mime-builder');
  this.pgpMIME = false;
  this.signMsg = null;
  this.options = {};

  // register event handlers
  this.on('editor-init', this._onEditorInit);
  this.on('editor-plaintext', this._onSignAndEncrypt);
  this.on('editor-user-input', this._onEditorUserInput);
  this.on('keyserver-lookup', this.lookupKeyOnServer);
  // standalone editor only
  this.on('editor-cancel', this._onEditorCancel);
  this.on('sign-only', this._onSignOnly);
  // API only
  this.on('editor-container-encrypt', this._onEditorContainerEncrypt);
  this.on('editor-container-create-draft', this._onEditorContainerCreateDraft);
  this.on('editor-options', this._onEditorOptions);
  this.on('open-security-settings', this.openSecuritySettings);
  this.on('open-app', this.openApp);
}

EditorController.prototype = Object.create(sub.SubController.prototype);

EditorController.prototype._onEditorInit = function() {
  if (this.ports.editorCont) {
    this.emit('editor-ready', undefined, this.ports.editorCont);
  } else {
    // non-container case, send options to editor
    let keyring = this.keyring.getById(this.keyringId);
    let primaryKey =  keyring.getPrimaryKey();
    let primaryKeyId = primaryKey && primaryKey.keyid.toUpperCase() || '';
    let data = {
      text: this.options.initText,
      signMsg: this.prefs.data().general.auto_sign_msg,
      primary: primaryKeyId,
      privKeys: keyring.getValidSigningKeys()
    };
    this.emit('set-init-data', {data: data}, this.ports.editor);
  }
  // display recipient proposal in the editor
  if (this.options.getRecipientProposal) {
    this.options.getRecipientProposal(this.displayRecipientProposal.bind(this));
  }
};

EditorController.prototype._onEditorCancel = function() {
  this.editorPopup.close();
  this.editorPopup = null;
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
  if (this.prefs.data().general.auto_add_primary) {
    let primary = this.keyring.getById(this.keyringId).getPrimaryKey();
    if (primary) {
      keyIds.push(primary.keyid.toLowerCase());
    }
  }
  this.keyidBuffer = this.mvelo.util.sortAndDeDup(keyIds);
  this.emit('get-plaintext', {action: 'encrypt'}, this.ports.editor);
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
  this.emit('get-plaintext', {action: 'encrypt'}, this.ports.editor);
};

EditorController.prototype._onEditorOptions = function(msg) {
  this.keyringId = msg.keyringId;
  this.options = msg.options;
  this.signMsg = msg.options.signMsg;
  let primaryKey = this.keyring.getById(this.keyringId).getPrimaryKey();
  let primaryKeyId = primaryKey && primaryKey.keyid.toUpperCase() || '';
  var data = {
    signMsg: this.signMsg,
    primary: primaryKeyId
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
  this.emit('set-init-data', {data: data}, this.ports.editor);
};

EditorController.prototype._onSignOnly = function(msg) {
  this.signBuffer = {};
  var key = this.keyring.getById(this.mvelo.LOCAL_KEYRING_ID).getKeyForSigning(msg.signKeyId);
  // add key in buffer
  this.signBuffer.key = key.key;
  this.signBuffer.keyid = msg.signKeyId;
  this.signBuffer.userid = key.userid;
  this.signBuffer.openPopup = false;
  this.signBuffer.reason = 'PWD_DIALOG_REASON_SIGN';
  this.signBuffer.beforePasswordRequest = () => this.emit('show-pwd-dialog', {id: this.pwdControl.id});
  this.signBuffer.keyringId = this.keyringId;
  this.pwdControl = sub.factory.get('pwdDialog');
  this.pwdControl.unlockKey(this.signBuffer)
  .then(() => this.emit('get-plaintext', {action: 'sign'}))
  .catch(err => {
    if (err.code === 'PWD_DIALOG_CANCEL') {
      this.emit('hide-pwd-dialog');
      return;
    }
    err = this.mvelo.util.mapError(err);
    this.emit('error-message', {error: err});
  });
};

EditorController.prototype._onEditorUserInput = function(msg) {
  uiLog.push(msg.source, msg.type);
};

/**
 * Lookup a recipient's public key on the Mailvelope Key Server and
 * store it locally using a TOFU (trust on first use) mechanic.
 * @param  {Object} msg   The event message object
 * @return {undefined}
 */
EditorController.prototype.lookupKeyOnServer = function(msg) {
  return this.keyserver.lookup(msg.recipient).then(key => {
    // persist key in local keyring
    let localKeyring = this.keyring.getById(this.mvelo.LOCAL_KEYRING_ID);
    if (key && key.publicKeyArmored) {
      localKeyring.importKeys([{type: 'public', armored: key.publicKeyArmored}]);
    }
    this.sendKeyUpdate();
  });
};

EditorController.prototype.sendKeyUpdate = function() {
  // send updated key cache to editor
  let localKeyring = this.keyring.getById(this.mvelo.LOCAL_KEYRING_ID);
  let keys = localKeyring.getKeyUserIDs({allUsers: true});
  this.emit('key-update', {keys: keys}, this.ports.editor);
};

/**
 * @param {Object} options
 * @param {String} options.initText
 * @param {String} options.keyringId
 * @param {Function} options.getRecipientProposal
 * @param {Function} callback
 */
EditorController.prototype.encrypt = function(options, callback) {
  this.options = options;
  this.keyringId = options.keyringId || this.mvelo.LOCAL_KEYRING_ID;
  this.encryptCallback = callback;
  this.mvelo.windows.openPopup('components/editor/editor.html?id=' + this.id + '&editor_type=' + this.prefs.data().general.editor_type, {width: 820, height: 550, modal: false}, (window) => {
    this.editorPopup = window;
  });
};

/**
 * Displays the recipient proposal in the editor.
 * @param  {Array} recipients   A list of potential recipient from the webmail ui
 */
EditorController.prototype.displayRecipientProposal = function(recipients) {
  // deduplicate email addresses
  var emails = (recipients || []).map(function(recipient) { return recipient.email; });
  emails = this.mvelo.util.deDup(emails); // just dedup, dont change order of user input
  recipients = emails.map(function(e) { return {email: e}; });
  // get all public keys in the local keyring
  var localKeyring = this.keyring.getById(this.mvelo.LOCAL_KEYRING_ID);
  var keys = localKeyring.getKeyUserIDs({allUsers: true});
  var tofu = this.keyserver.getTOFUPreference();
  this.emit('public-key-userids', {keys: keys, recipients: recipients, tofu: tofu});
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
    this.emit('decrypt-in-progress', null, this.ports.editor);
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
          that.emit('set-text', {text: msg}, that.ports.editor);
        },
        onAttachment: function(part) {
          if (that.options.keepAttachments) {
            that.emit('set-attachment', {attachment: part}, that.ports.editor);
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
      that.emit('decrypt-end', null, that.ports.editor);
    })
    .catch(function(error) {
      error = that.mvelo.util.mapError(error);
      that.emit('decrypt-failed', {error: error}, that.ports.editor);
    });
};

/**
 * @param {Object} options
 * @param {String} options.message
 * @param {Array} options.keyIdsHex
 * @param {String} options.signKeyIdHex
 * @return {Promise}
 */
EditorController.prototype.signAndEncryptMessage = function(options) {
  let signKey;
  return Promise.resolve()
  .then(() => {
    this.encryptTimer = null;
    if (options.signKeyIdHex) {
      signKey = this.keyring.getById(this.keyringId).getKeyForSigning(options.signKeyIdHex);
    } else {
      signKey = this.keyring.getById(this.keyringId).getPrimaryKey();
    }

    if (!signKey) {
      this.mvelo.util.throwError('No primary key found', 'NO_PRIMARY_KEY_FOUND');
    }

    let signKeyPacket = signKey.key.getSigningKeyPacket();
    let signKeyid = signKeyPacket && signKeyPacket.getKeyId().toHex();
    if (!signKeyid) {
      this.mvelo.util.throwError('No valid signing key packet found', 'NO_SIGN_KEY_FOUND');
    }

    signKey.keyid = signKeyid;
    signKey.keyringId = this.keyringId;
    signKey.reason = this.options.reason || 'PWD_DIALOG_REASON_SIGN';

    if (this.editorPopup) {
      signKey.openPopup = false;
      signKey.beforePasswordRequest = () => this.emit('show-pwd-dialog', {id: this.pwdControl.id});
    }
  })
  .then(() => {
    this.pwdControl = sub.factory.get('pwdDialog');
    return this.pwdControl.unlockKey(signKey);
  })
  .then(() => {
    this.encryptTimer = this.mvelo.util.setTimeout(() => {
      this.emit('encrypt-in-progress', null, this.ports.editor);
    }, 800);

    if (!this.prefs.data().security.password_cache) {
      syncCtrl.triggerSync(signKey);
    }

    return this.model.signAndEncryptMessage({
      keyIdsHex: options.keyIdsHex,
      keyringId: this.keyringId,
      primaryKey: signKey,
      message: options.message,
      uiLogSource: 'security_log_editor'
    });
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
  this.encryptTimer = this.mvelo.util.setTimeout(function() {
    this.emit('encrypt-in-progress', null, this.ports.editor);
  }.bind(this), 800);

  options.uiLogSource = 'security_log_editor';

  return this.model.encryptMessage(options);
};

/**
 * @param {String} message
 * @return {Promise}
 */
EditorController.prototype.signMessage = function(message) {
  this.encryptTimer = this.mvelo.util.setTimeout(function() {
    this.emit('encrypt-in-progress');
  }.bind(this), 800);

  return this.model.signMessage(message, this.signBuffer.key);
};

/**
 * Closes the editor popup and transfer the encrypted/signed armored
 * message and recipients back to the webmail interface.
 * @param  {String} options.armored   The encrypted/signed message
 * @param  {Array}  options.keys      The keys used to encrypt the message
 */
EditorController.prototype.transferEncrypted = function(options) {
  if (this.ports.editorCont) {
    this.emit('encrypted-message', { message: options.armored }, this.ports.editorCont);
  } else {
    var recipients = (options.keys || []).map(function(k) {
      return {name: k.name, email: k.email};
    });
    this.encryptCallback(null, options.armored, recipients);
  }
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
EditorController.prototype._onSignAndEncrypt = function(options) {
  options.keys = options.keys || [];
  this.signAndEncrypt(options)
  .then(function(armored) {
    this.emit('encrypt-end', null, this.ports.editor);
    if (this.editorPopup) {
      this.editorPopup.close();
      this.editorPopup = null;
    }
    this.transferEncrypted({armored: armored, keys: options.keys});
  }.bind(this))
  .catch(function(error) {
    if (this.editorPopup && error.code === 'PWD_DIALOG_CANCEL') {
      // popup case
      this.emit('hide-pwd-dialog');
      return;
    }
    console.log(error);
    error = this.mvelo.util.mapError(error);
    this.emit('error-message', {error: error}, this.ports.editor);
    if (this.ports.editorCont) {
      this.emit('error-message', {error: error}, this.ports.editorCont);
    } else {
      this.encryptCallback(error);
    }
    this.emit('encrypt-failed', null, this.ports.editor);
  }.bind(this))
  .then(function() {
    this.mvelo.util.clearTimeout(this.encryptTimer);
  }.bind(this));
};

/**
 * @param {Object} options
 * @param {String} options.action
 * @param {String} options.message
 * @param {String} options.keys
 * @param {Array} options.attachment
 * @return {Promise}
 */
EditorController.prototype.signAndEncrypt = function(options) {
  return Promise.resolve()
  .then(function() {
    if (options.action === 'encrypt') {
      var data = this.buildMail(options.message, options.attachments);

      if (data === null) {
        this.mvelo.util.throwError('MIME building failed.');
      }

      var keyIdsHex = this.getPublicKeyIds(options.keys);
      if (this.signMsg || options.signMsg) {
        return this.signAndEncryptMessage({
          message: data,
          keyIdsHex: keyIdsHex,
          signKeyIdHex: options.signKey
        });
      } else {
        return this.encryptMessage({
          message: data,
          keyringId: this.keyringId,
          keyIdsHex: keyIdsHex
        });
      }

    } else if (options.action === 'sign') {
      return this.signMessage(options.message);
    }
  }.bind(this));
};

/**
 * Collect all the key ids to encrypto to, including the sender's key id.
 * @param  {Array} keys   The public key objects containing the key id
 * @return {Array}        A collection of all key ids to encrypt to
 */
EditorController.prototype.getPublicKeyIds = function(keys) {
  var keyIdsHex;
  // prefer keyidBuffer
  if (this.keyidBuffer) {
    keyIdsHex = this.keyidBuffer;
  } else {
    keyIdsHex = keys.map(function(key) { return key.keyid; });
    // get the sender key id
    if (this.prefs.data().general.auto_add_primary) {
      var localKeyring = this.keyring.getById(this.mvelo.LOCAL_KEYRING_ID);
      var primary = localKeyring.getPrimaryKey();
      if (primary) {
        keyIdsHex.push(primary.keyid.toLowerCase());
      }
    }
  }
  // deduplicate
  return this.mvelo.util.sortAndDeDup(keyIdsHex);
};

exports.EditorController = EditorController;
