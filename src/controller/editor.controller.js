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
import * as uiLog from '../modules/uiLog';
import {parseMessage, buildMail} from '../modules/mime';
import {triggerSync} from './sync.controller';
import KeyServer from '../modules/keyserver';
import {getById as getKeyringById} from '../modules/keyring';

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
    this.signKey = null;
    this.pwdControl = null;
    this.keyserver = new KeyServer();
    this.pgpMIME = false;
    this.options = {};

    // register event handlers
    this.on('editor-init', this.onEditorInit);
    this.on('editor-plaintext', this.onEditorPlaintext);
    this.on('editor-user-input', this.onEditorUserInput);
    this.on('keyserver-lookup', this.onKeyServerLookup);
    // standalone editor only
    this.on('editor-cancel', this.onEditorCancel);
    this.on('sign-only', this.onSignOnly);
    // API only
    this.on('editor-container-encrypt', this.onEditorContainerEncrypt);
    this.on('editor-container-create-draft', this.onEditorContainerCreateDraft);
    this.on('editor-options', this.onEditorOptions);
    this.on('open-app', ({fragment}) => this.openApp(fragment));
  }

  async onEditorInit() {
    if (this.ports.editorCont) {
      this.ports.editorCont.emit('editor-ready');
    } else {
      // non-container case, set options
      this.onEditorOptions({
        keyringId: mvelo.MAIN_KEYRING_ID,
        options: this.options,
      });
      // transfer recipient proposal and public key info to the editor
      let recipients;
      if (this.options.getRecipients) {
        recipients = await this.options.getRecipients();
      }
      this.setRecipientData(recipients);
    }
  }

  /**
   * Set the recipient data in the editor.
   * @param  {Array} recipients - a list of potential recipient from the webmail ui
   */
  setRecipientData(recipients) {
    // deduplicate email addresses
    let emails = (recipients || []).map(recipient => recipient.email);
    emails = mvelo.util.deDup(emails); // just dedup, dont change order of user input
    recipients = emails.map(e => ({email: e}));
    // get all public keys in the local keyring
    const localKeyring = getKeyringById(mvelo.MAIN_KEYRING_ID);
    const keys = localKeyring.getKeyUserIDs({allUsers: true});
    const tofu = this.keyserver.getTOFUPreference();
    this.emit('public-key-userids', {keys, recipients, tofu});
  }

  onEditorOptions(msg) {
    this.keyringId = msg.keyringId;
    this.options = msg.options;
    const keyring = getKeyringById(this.keyringId);
    const primaryKey = keyring.getPrimaryKey();
    const primaryKeyId = primaryKey && primaryKey.keyid.toUpperCase() || '';
    const data = {
      signMsg: this.options.signMsg,
      primary: primaryKeyId
    };
    if (msg.options.privKeys) {
      data.privKeys = keyring.getValidSigningKeys();
    }
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
    this.ports.editor.emit('set-init-data', data);
  }

  onEditorCancel() {
    if (this.editorPopup) {
      this.editorPopup.close();
      this.editorPopup = null;
      this.encryptDone.reject(new mvelo.Error('Editor dialog canceled.', 'EDITOR_DIALOG_CANCEL'));
    }
  }

  onEditorContainerEncrypt(msg) {
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

  onEditorContainerCreateDraft(msg) {
    this.pgpMIME = true;
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

  async onSignOnly(msg) {
    const key = getKeyringById(mvelo.MAIN_KEYRING_ID).getPrivateKeyByHexId(msg.signKeyId);
    // keep signing key
    this.signKey = key.key;
    this.pwdControl = sub.factory.get('pwdDialog');
    try {
      await this.pwdControl.unlockKey({
        key: key.key,
        keyid: key.keyid,
        reason: 'PWD_DIALOG_REASON_SIGN',
        openPopup: false,
        beforePasswordRequest: () => this.emit('show-pwd-dialog', {id: this.pwdControl.id})
      });
    } catch (err) {
      if (err.code === 'PWD_DIALOG_CANCEL') {
        this.emit('hide-pwd-dialog');
        return;
      }
      this.emit('error-message', {error: mvelo.util.mapError(err)});
    }
    this.emit('get-plaintext', {action: 'sign'});
  }

  onEditorUserInput(msg) {
    uiLog.push(msg.source, msg.type);
  }

  /**
   * Lookup a recipient's public key on the Mailvelope Key Server and
   * store it locally using a TOFU (trust on first use) mechanic.
   * @param  {Object} msg   The event message object
   * @return {undefined}
   */
  async onKeyServerLookup(msg) {
    const key = await this.keyserver.lookup(msg.recipient);
    if (key && key.publicKeyArmored) {
      // persist key in local keyring
      const localKeyring = getKeyringById(mvelo.MAIN_KEYRING_ID);
      await localKeyring.importKeys([{type: 'public', armored: key.publicKeyArmored}]);
    }
    this.sendKeyUpdate();
  }

  sendKeyUpdate() {
    // send updated key cache to editor
    const localKeyring = getKeyringById(mvelo.MAIN_KEYRING_ID);
    const keys = localKeyring.getKeyUserIDs({allUsers: true});
    this.ports.editor.emit('key-update', {keys});
  }

  /**
   * Encrypt operation called by other controllers, opens editor popup
   * @param {Boolean} options.signMsg - sign message option is active
   * @param {String} options.predefinedText - text that will be added to the editor
   * @param {String} options.predefinedText - text that will be added to the editor
   * @param {String} quotedMail - mail that should be quoted
   * @param {boolean} quotedMailIndent - if true the quoted mail will be indented
   * @param {Function} getRecipients - retrieve recipient email addresses
   * @return {Promise<Object>} - {armored, recipients}
   */
  encrypt(options) {
    this.options = options;
    this.options.privKeys = true; // send private keys for signing key selection to editor
    return new Promise((resolve, reject) => {
      this.encryptDone = {resolve, reject};
      mvelo.windows.openPopup(`components/editor/editor.html?id=${this.id}`, {width: 820, height: 550})
      .then(popup => {
        this.editorPopup = popup;
        popup.addRemoveListener(() => this.onEditorCancel());
      });
    });
  }

  /**
   * Encrypt operation called by app controller for encrypt text component
   * @return {Promise<Object>} {armored}
   */
  encryptText() {
    return new Promise((resolve, reject) => {
      this.encryptDone = {resolve, reject};
      this.ports.editor.emit('get-plaintext', {action: 'encrypt'});
    });
  }

  activate() {
    this.editorPopup.activate();
  }

  /**
   * A encrypted message will be decrypted and shown in the editor
   * @param  {String} armored
   */
  scheduleDecrypt(armored) {
    if (armored.length > 400000 && !this.editorPopup) {
      // show spinner for large messages
      this.ports.editor.emit('decrypt-in-progress');
    }
    setTimeout(() => {
      this.decryptArmored(armored);
    }, 50);
  }

  /**
   * Decrypt armored message
   * @param {String} armored
   */
  async decryptArmored(armored) {
    try {
      this.options.selfSigned = Boolean(this.options.armoredDraft);
      const unlockKey = async options => {
        const result = await this.unlockKey(options);
        if (this.editorPopup) {
          this.ports.editor.emit('hide-pwd-dialog');
        }
        return result;
      };
      const {data, signatures} = await model.decryptMessage({
        armored,
        keyringId: this.keyringId,
        unlockKey,
        options: this.options
      });
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
        if (!(signatures && signatures[0].valid)) {
          throw {message: 'Restoring of the draft failed due to invalid signature.'};
        }
      }
      await parseMessage(data, handlers, 'text');
      this.ports.editor.emit('decrypt-end');
    } catch (error) {
      this.ports.editor.emit('decrypt-failed', {error: mvelo.util.mapError(error)});
    }
  }

  /**
   * Receive plaintext from editor, initiate encryption
   * @param {String} options.action
   * @param {String} options.message
   * @param {String} options.keys
   * @param {Array} options.attachment
   * @param {Boolean} options.noCache
   */
  async onEditorPlaintext(options) {
    options.keys = options.keys || [];
    try {
      const armored = await this.signAndEncrypt(options);
      this.ports.editor.emit('encrypt-end');
      if (this.editorPopup) {
        this.editorPopup.close();
        this.editorPopup = null;
      }
      this.transferEncrypted({armored, keys: options.keys});
    } catch (err) {
      if (this.editorPopup && err.code === 'PWD_DIALOG_CANCEL') {
        // popup case
        this.emit('hide-pwd-dialog');
        return;
      }
      console.log(err);
      const error = mvelo.util.mapError(err);
      this.ports.editor.emit('error-message', {error});
      if (this.ports.editorCont) {
        this.ports.editorCont.emit('error-message', {error});
      } else {
        this.encryptDone.reject(error);
      }
      this.ports.editor.emit('encrypt-failed');
    }
    clearTimeout(this.encryptTimer);
  }

  /**
   * encrypt, sign & encrypt, or sign only operation
   * @param {Object} options
   * @param {String} options.action
   * @param {String} options.message
   * @param {String} options.keys
   * @param {Array} options.attachment
   * @param {Boolean} options.noCache
   * @return {Promise}
   */
  async signAndEncrypt(options) {
    if (options.action === 'encrypt') {
      let data = null;
      options.pgpMIME = this.pgpMIME;
      try {
        data = buildMail(options);
      } catch (error) {
        if (this.ports.editorCont) {
          this.ports.editorCont.emit('error-message', {error: mvelo.util.mapError(error)});
        }
      }
      if (data === null) {
        throw new mvelo.Error('MIME building failed.');
      }
      const keyIdsHex = this.getPublicKeyIds(options.keys);
      if (options.signMsg) {
        return this.signAndEncryptMessage({
          data,
          keyIdsHex,
          signKeyIdHex: options.signKey,
          noCache: options.noCache
        });
      } else {
        return this.encryptMessage({
          data,
          keyIdsHex
        });
      }
    } else if (options.action === 'sign') {
      return this.signMessage(options.message);
    }
  }

  /**
   * @param {String} options.data
   * @param {Array<String>} options.keyIdsHex
   * @param {String} options.signKeyIdHex
   * @param {Boolean} options.noCache
   * @return {Promise}
   */
  async signAndEncryptMessage({data, signKeyIdHex, keyIdsHex, noCache}) {
    this.encryptTimer = null;
    if (!signKeyIdHex) {
      const primaryKey = getKeyringById(this.keyringId).getPrimaryKey();
      signKeyIdHex = primaryKey && primaryKey.keyid;
    }
    if (!signKeyIdHex) {
      throw new mvelo.Error('No primary key found', 'NO_PRIMARY_KEY_FOUND');
    }
    const unlockKey = async options => {
      options.noCache = noCache;
      options.reason = this.options.reason || 'PWD_DIALOG_REASON_SIGN';
      options.sync = !prefs.security.password_cache;
      const result = await this.unlockKey(options);
      this.encryptTimer = setTimeout(() => {
        this.ports.editor.emit('encrypt-in-progress');
      }, 800);
      return result;
    };
    return model.encryptMessage({
      data,
      keyringId: this.keyringId,
      unlockKey,
      encryptionKeyFprs: keyIdsHex,
      signingKeyIdHex: signKeyIdHex,
      uiLogSource: 'security_log_editor'
    });
  }

  /**
   * @param {String} options.data
   * @param {Array<Strin>} options.keyIdsHex
   * @return {Promise}
   */
  encryptMessage({data, keyIdsHex}) {
    this.encryptTimer = setTimeout(() => {
      this.ports.editor.emit('encrypt-in-progress');
    }, 800);
    return model.encryptMessage({
      data,
      keyringId: this.keyringId,
      encryptionKeyFprs: keyIdsHex,
      uiLogSource: 'security_log_editor'
    });
  }

  /**
   * Create a cleartext signature
   * @param {String} message
   * @return {Promise}
   */
  signMessage(message) {
    this.encryptTimer = setTimeout(() => {
      this.emit('encrypt-in-progress');
    }, 800);
    return model.signMessage(message, this.signKey);
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

  async unlockKey({key, keyid, noCache, reason = 'PWD_DIALOG_REASON_DECRYPT', sync = true}) {
    const pwdControl = sub.factory.get('pwdDialog');
    const openPopup = !this.editorPopup;
    const beforePasswordRequest = id => this.editorPopup && this.ports.editor.emit('show-pwd-dialog', {id});
    const unlockedKey = await pwdControl.unlockKey({key, keyid, reason, openPopup, noCache, beforePasswordRequest});
    if (sync) {
      triggerSync({keyring: this.keyringId, key: unlockedKey.key, password: unlockedKey.password});
    }
    return unlockedKey.key;
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
        const localKeyring = getKeyringById(mvelo.MAIN_KEYRING_ID);
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
