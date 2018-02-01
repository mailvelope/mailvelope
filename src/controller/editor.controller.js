/**
 * Copyright (C) 2015-2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

/**
 * @fileOverview This controller implements handling of state and events
 * for the encryption editor like handling message data and recipients.
 */

import mvelo from '../lib/lib-mvelo';
import {prefs} from '../modules/prefs';
import * as model from '../modules/pgpModel';
import * as sub from './sub.controller';
import DecryptController from './decrypt.controller';
import * as uiLog from '../modules/uiLog';
import {triggerSync} from './sync.controller';
import KeyServer from '../modules/keyserver';
import {getById as getKeyringById} from '../modules/keyring';
import mailbuild from 'emailjs-mime-builder';

export default class EditorController extends sub.SubController {
  constructor(port) {
    super(port);
    if (!port) {
      this.mainType = 'editor';
      this.id = mvelo.util.getHash();
    }
    this.encryptDone = null;
    this.encryptTimer = null;
    this.keyringId = null;
    this.editorPopup = null;
    this.keyidBuffer = null;
    this.signBuffer = null;
    this.pwdControl = null;
    this.keyserver = new KeyServer();
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
    this.on('open-app', ({fragment}) => this.openApp(fragment));
  }

  _onEditorInit() {
    if (this.ports.editorCont) {
      this.ports.editorCont.emit('editor-ready');
    } else {
      // non-container case, send options to editor
      const keyring = getKeyringById(this.keyringId);
      const primaryKey =  keyring.getPrimaryKey();
      const primaryKeyId = primaryKey && primaryKey.keyid.toUpperCase() || '';
      const data = {
        text: this.options.initText,
        signMsg: prefs.general.auto_sign_msg,
        primary: primaryKeyId,
        privKeys: keyring.getValidSigningKeys()
      };
      this.ports.editor.emit('set-init-data', {data});
    }
    // display recipient proposal in the editor
    if (this.options.getRecipientProposal) {
      this.options.getRecipientProposal(this.displayRecipientProposal.bind(this));
    }
  }

  _onEditorCancel() {
    if (this.editorPopup) {
      this.editorPopup.close();
      this.editorPopup = null;
      this.encryptDone.reject(new mvelo.Error('Editor dialog canceled.', 'EDITOR_DIALOG_CANCEL'));
    }
  }

  _onEditorContainerEncrypt(msg) {
    this.pgpMIME = true;
    this.keyringId = msg.keyringId;
    const keyIdMap = getKeyringById(this.keyringId).getKeyIdByAddress(msg.recipients, {validity: true});
    if (Object.keys(keyIdMap).some(keyId => keyIdMap[keyId] === false)) {
      const error = {
        message: 'No valid encryption key for recipient address',
        code: 'NO_KEY_FOR_RECIPIENT'
      };
      this.ports.editorCont.emit('error-message', {error});
      return;
    }
    let keyIds = [];
    msg.recipients.forEach(recipient => {
      keyIds = keyIds.concat(keyIdMap[recipient]);
    });
    if (prefs.general.auto_add_primary) {
      const primary = getKeyringById(this.keyringId).getPrimaryKey();
      if (primary) {
        keyIds.push(primary.keyid.toLowerCase());
      }
    }
    this.keyidBuffer = mvelo.util.sortAndDeDup(keyIds);
    this.ports.editor.emit('get-plaintext', {action: 'encrypt'});
  }

  _onEditorContainerCreateDraft(msg) {
    this.pgpMIME = true;
    this.signMsg = true;
    this.keyringId = msg.keyringId;
    this.options.reason = 'PWD_DIALOG_REASON_CREATE_DRAFT';
    const primary = getKeyringById(this.keyringId).getPrimaryKey();
    if (primary) {
      this.keyidBuffer = [primary.keyid.toLowerCase()];
    } else {
      const error = {
        message: 'No private key found for creating draft.',
        code: 'NO_KEY_FOR_ENCRYPTION'
      };
      this.ports.editorCont.emit('error-message', {error});
      return;
    }
    this.ports.editor.emit('get-plaintext', {action: 'encrypt', draft: true});
  }

  _onEditorOptions(msg) {
    this.keyringId = msg.keyringId;
    this.options = msg.options;
    this.signMsg = msg.options.signMsg;
    const primaryKey = getKeyringById(this.keyringId).getPrimaryKey();
    const primaryKeyId = primaryKey && primaryKey.keyid.toUpperCase() || '';
    const data = {
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
    triggerSync({keyringId: this.keyringId, force: true});
    this.ports.editor.emit('set-init-data', {data});
  }

  _onSignOnly(msg) {
    this.signBuffer = {};
    const key = getKeyringById(mvelo.LOCAL_KEYRING_ID).getKeyForSigning(msg.signKeyId);
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
      err = mvelo.util.mapError(err);
      this.emit('error-message', {error: err});
    });
  }

  _onEditorUserInput(msg) {
    uiLog.push(msg.source, msg.type);
  }

  /**
   * Lookup a recipient's public key on the Mailvelope Key Server and
   * store it locally using a TOFU (trust on first use) mechanic.
   * @param  {Object} msg   The event message object
   * @return {undefined}
   */
  lookupKeyOnServer(msg) {
    return this.keyserver.lookup(msg.recipient).then(key => {
      // persist key in local keyring
      const localKeyring = getKeyringById(mvelo.LOCAL_KEYRING_ID);
      if (key && key.publicKeyArmored) {
        return localKeyring.importKeys([{type: 'public', armored: key.publicKeyArmored}]);
      }
    })
    .then(() => {
      this.sendKeyUpdate();
    });
  }

  sendKeyUpdate() {
    // send updated key cache to editor
    const localKeyring = getKeyringById(mvelo.LOCAL_KEYRING_ID);
    const keys = localKeyring.getKeyUserIDs({allUsers: true});
    this.ports.editor.emit('key-update', {keys});
  }

  /**
   * @param {Object} options
   * @param {String} options.initText
   * @param {String} options.keyringId
   * @param {Function} options.getRecipientProposal
   * @param {Function} callback
   */
  encrypt(options) {
    this.options = options;
    this.keyringId = options.keyringId || mvelo.LOCAL_KEYRING_ID;
    return new Promise((resolve, reject) => {
      this.encryptDone = {resolve, reject};
      mvelo.windows.openPopup(`components/editor/editor.html?id=${this.id}`, {width: 820, height: 550})
      .then(popup => {
        this.editorPopup = popup;
        popup.addRemoveListener(() => this._onEditorCancel());
      });
    });
  }

  activate() {
    this.editorPopup.activate();
  }

  /**
   * Displays the recipient proposal in the editor.
   * @param  {Array} recipients   A list of potential recipient from the webmail ui
   */
  displayRecipientProposal(recipients) {
    // deduplicate email addresses
    let emails = (recipients || []).map(recipient => recipient.email);
    emails = mvelo.util.deDup(emails); // just dedup, dont change order of user input
    recipients = emails.map(e => ({email: e}));
    // get all public keys in the local keyring
    const localKeyring = getKeyringById(mvelo.LOCAL_KEYRING_ID);
    const keys = localKeyring.getKeyUserIDs({allUsers: true});
    const tofu = this.keyserver.getTOFUPreference();
    this.emit('public-key-userids', {keys, recipients, tofu});
  }

  /**
   * @param {String} message
   * @param {Map} attachments
   * @param {String} attachments.filename
   * @param {String} attachments.content
   * @param {Integer} attachments.size
   * @param {String} attachments.type
   * @returns {String | null}
   */
  buildMail(message, attachments) {
    //var t0 = Date.now();
    const mainMessage = new mailbuild("multipart/mixed");
    let composedMessage = null;
    let hasAttachment;
    let quotaSize = 0;

    if (message) {
      quotaSize += mvelo.util.byteCount(message);
      const textMime = new mailbuild("text/plain")
      .setHeader("Content-Type", "text/plain; charset=utf-8")
      .addHeader("Content-Transfer-Encoding", "quoted-printable")
      .setContent(message);
      mainMessage.appendChild(textMime);
    }
    if (attachments && attachments.length > 0) {
      hasAttachment = true;
      attachments.forEach(attachment => {
        quotaSize += attachment.size;
        const attachmentMime = new mailbuild("text/plain")
        .createChild(false, {filename: attachment.name})
          //.setHeader("Content-Type", attachment.type + "; charset=utf-8")
        .addHeader("Content-Transfer-Encoding", "base64")
        .addHeader("Content-Disposition", "attachment") // ; filename="attachment.filename
        .setContent(attachment.content);
        mainMessage.appendChild(attachmentMime);
      });
    }

    if (this.options.quota && (quotaSize > this.options.quota)) {
      const error = {
        code: 'ENCRYPT_QUOTA_SIZE',
        message: 'Mail content exceeds quota limit.'
      };

      if (this.ports.editorCont) {
        this.ports.editorCont.emit('error-message', {error});
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
  }

  scheduleDecrypt(armored) {
    if (armored.length > 400000) {
      // show spinner for large messages
      this.ports.editor.emit('decrypt-in-progress');
    }
    setTimeout(() => {
      this.decryptArmored(armored);
    }, 50);
  }

  /**
   * @param {String} armored
   * @returns {undefined}
   */
  decryptArmored(armored) {
    const decryptCtrl = new DecryptController();
    decryptCtrl.keyringId = this.keyringId;
    model.readMessage({armoredText: armored, keyringId: this.keyringId})
    .then(message => decryptCtrl.prepareKey(message, !this.editorPopup))
    .then(message => {
      message.options = {selfSigned: Boolean(this.options.armoredDraft)};
      return decryptCtrl.decryptMessage(message);
    })
    .then(content => {
      const options = this.options;
      const ports = this.ports;
      const handlers = {
        onMessage(msg) {
          if (options.quotedMailIndent) {
            msg = msg.replace(/^(.|\n)/gm, '> $&');
          }
          if (options.quotedMailHeader) {
            msg = `> ${options.quotedMailHeader}\n${msg}`;
          }
          if (options.quotedMailIndent || options.quotedMailHeader) {
            msg = `\n\n${msg}`;
          }
          if (options.predefinedText) {
            msg = `${msg}\n\n${options.predefinedText}`;
          }
          ports.editor.emit('set-text', {text: msg});
        },
        onAttachment(part) {
          if (options.keepAttachments) {
            ports.editor.emit('set-attachment', {attachment: part});
          }
        }
      };
      if (this.options.armoredDraft) {
        if (!(content.signatures && content.signatures[0].valid)) {
          throw {message: 'Restoring of the draft failed due to invalid signature.'};
        }
      }
      return decryptCtrl.parseMessage(content.data, handlers, 'text');
    })
    .then(() => {
      this.ports.editor.emit('decrypt-end');
    })
    .catch(error => {
      error = mvelo.util.mapError(error);
      this.ports.editor.emit('decrypt-failed', {error});
    });
  }

  /**
   * @param {Object} options
   * @param {String} options.message
   * @param {Array} options.keyIdsHex
   * @param {String} options.signKeyIdHex
   * @param {Boolean} options.noCache
   * @return {Promise}
   */
  signAndEncryptMessage(options) {
    let signKey;
    return Promise.resolve()
    .then(() => {
      this.encryptTimer = null;
      if (options.signKeyIdHex) {
        signKey = getKeyringById(this.keyringId).getKeyForSigning(options.signKeyIdHex);
      } else {
        signKey = getKeyringById(this.keyringId).getPrimaryKey();
      }

      if (!signKey) {
        mvelo.util.throwError('No primary key found', 'NO_PRIMARY_KEY_FOUND');
      }

      const signKeyPacket = signKey.key.getSigningKeyPacket();
      const signKeyid = signKeyPacket && signKeyPacket.getKeyId().toHex();
      if (!signKeyid) {
        mvelo.util.throwError('No valid signing key packet found', 'NO_SIGN_KEY_FOUND');
      }

      signKey.keyid = signKeyid;
      signKey.keyringId = this.keyringId;
      signKey.reason = this.options.reason || 'PWD_DIALOG_REASON_SIGN';
      signKey.noCache = options.noCache;

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
      this.encryptTimer = setTimeout(() => {
        this.ports.editor.emit('encrypt-in-progress');
      }, 800);

      if (!prefs.security.password_cache) {
        triggerSync(signKey);
      }

      return model.encryptMessage({
        keyIdsHex: options.keyIdsHex,
        keyringId: this.keyringId,
        primaryKey: signKey,
        message: options.message,
        uiLogSource: 'security_log_editor'
      });
    });
  }

  /**
   * @param {Object} options
   * @param {String} options.message
   * @param {String} options.keyringId
   * @param {Array} options.keyIdsHex
   * @return {Promise}
   */
  encryptMessage(options) {
    this.encryptTimer = setTimeout(() => {
      this.ports.editor.emit('encrypt-in-progress');
    }, 800);

    options.uiLogSource = 'security_log_editor';

    return model.encryptMessage(options);
  }

  /**
   * @param {String} message
   * @return {Promise}
   */
  signMessage(message) {
    this.encryptTimer = setTimeout(() => {
      this.emit('encrypt-in-progress');
    }, 800);

    return model.signMessage(message, this.signBuffer.key);
  }

  /**
   * Closes the editor popup and transfer the encrypted/signed armored
   * message and recipients back to the webmail interface.
   * @param  {String} options.armored   The encrypted/signed message
   * @param  {Array}  options.keys      The keys used to encrypt the message
   */
  transferEncrypted(options) {
    if (this.ports.editorCont) {
      this.ports.editorCont.emit('encrypted-message', {message: options.armored});
    } else {
      const recipients = (options.keys || []).map(k => ({name: k.name, email: k.email}));
      this.encryptDone.resolve({armored: options.armored, recipients});
    }
  }

  /**
   * @param {Object} options
   * @param {String} options.action
   * @param {String} options.message
   * @param {String} options.keys
   * @param {Array} options.attachment
   * @param {Boolean} options.noCache
   * @return {undefined}
   * @error {Error}
   */
  _onSignAndEncrypt(options) {
    options.keys = options.keys || [];
    this.signAndEncrypt(options)
    .then(armored => {
      this.ports.editor.emit('encrypt-end');
      if (this.editorPopup) {
        this.editorPopup.close();
        this.editorPopup = null;
      }
      this.transferEncrypted({armored, keys: options.keys});
    })
    .catch(error => {
      if (this.editorPopup && error.code === 'PWD_DIALOG_CANCEL') {
        // popup case
        this.emit('hide-pwd-dialog');
        return;
      }
      console.log(error);
      error = mvelo.util.mapError(error);
      this.ports.editor.emit('error-message', {error});
      if (this.ports.editorCont) {
        this.ports.editorCont.emit('error-message', {error});
      } else {
        this.encryptDone.reject(error);
      }
      this.ports.editor.emit('encrypt-failed');
    })
    .then(() => {
      clearTimeout(this.encryptTimer);
    });
  }

  /**
   * @param {Object} options
   * @param {String} options.action
   * @param {String} options.message
   * @param {String} options.keys
   * @param {Array} options.attachment
   * @param {Boolean} options.noCache
   * @return {Promise}
   */
  signAndEncrypt(options) {
    return Promise.resolve()
    .then(() => {
      if (options.action === 'encrypt') {
        const data = this.buildMail(options.message, options.attachments);

        if (data === null) {
          mvelo.util.throwError('MIME building failed.');
        }

        const keyIdsHex = this.getPublicKeyIds(options.keys);
        if (this.signMsg || options.signMsg) {
          return this.signAndEncryptMessage({
            message: data,
            keyIdsHex,
            signKeyIdHex: options.signKey,
            noCache: options.noCache
          });
        } else {
          return this.encryptMessage({
            message: data,
            keyringId: this.keyringId,
            keyIdsHex
          });
        }
      } else if (options.action === 'sign') {
        return this.signMessage(options.message);
      }
    });
  }

  /**
   * Collect all the key ids to encrypto to, including the sender's key id.
   * @param  {Array} keys   The public key objects containing the key id
   * @return {Array}        A collection of all key ids to encrypt to
   */
  getPublicKeyIds(keys) {
    let keyIdsHex;
    // prefer keyidBuffer
    if (this.keyidBuffer) {
      keyIdsHex = this.keyidBuffer;
    } else {
      keyIdsHex = keys.map(key => key.keyid);
      // get the sender key id
      if (prefs.general.auto_add_primary) {
        const localKeyring = getKeyringById(mvelo.LOCAL_KEYRING_ID);
        const primary = localKeyring.getPrimaryKey();
        if (primary) {
          keyIdsHex.push(primary.keyid.toLowerCase());
        }
      }
    }
    // deduplicate
    return mvelo.util.sortAndDeDup(keyIdsHex);
  }
}
