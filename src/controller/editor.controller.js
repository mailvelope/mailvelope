/**
 * Copyright (C) 2015-2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

/**
 * @fileOverview This controller implements handling of state and events
 * for the encryption editor like handling message data and recipients.
 */

import mvelo from '../lib/lib-mvelo';
import {getHash, deDup, sortAndDeDup, mapError, MvError} from '../lib/util';
import {prefs} from '../modules/prefs';
import * as model from '../modules/pgpModel';
import * as sub from './sub.controller';
import * as uiLog from '../modules/uiLog';
import {parseMessage, buildMail} from '../modules/mime';
import {triggerSync} from './sync.controller';
import * as keyRegistry from '../modules/keyRegistry';
import {getById as getKeyringById, getPreferredKeyringId, getKeyData, getKeyByAddress, syncPublicKeys, getDefaultKeyFpr} from '../modules/keyring';
import {mapAddressKeyMapToFpr} from '../modules/key';

export default class EditorController extends sub.SubController {
  constructor(port) {
    super(port);
    if (!port) {
      this.mainType = 'editor';
      this.id = getHash();
    }
    this.encryptPromise = null;
    this.encryptTimer = null;
    this.keyringId = null;
    this.editorPopup = null;
    this.signKey = null;
    this.pwdControl = null;
    this.pgpMIME = false;
    this.options = {};

    // register event handlers
    this.on('editor-init', this.onEditorInit);
    this.on('editor-plaintext', this.onEditorPlaintext);
    this.on('editor-user-input', this.onEditorUserInput);
    this.on('auto-locate', this.onAutoLocate);
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
        keyringId: getPreferredKeyringId(),
        options: this.options,
      });
      // transfer recipient proposal and public key info to the editor
      let recipients;
      if (this.options.getRecipients) {
        recipients = await this.options.getRecipients();
      }
      await this.setRecipientData(recipients);
    }
  }

  /**
   * Set the recipient data in the editor.
   * @param  {Array} recipients - a list of potential recipient from the webmail ui
   */
  async setRecipientData(recipients) {
    // deduplicate email addresses
    let emails = (recipients || []).map(recipient => recipient.email);
    emails = deDup(emails); // just dedup, dont change order of user input
    recipients = emails.map(e => ({email: e}));
    // get all public keys from required keyrings
    const keys = await getKeyData({keyringId: this.keyringId});
    this.emit('public-key-userids', {keys, recipients});
  }

  async onEditorOptions(msg) {
    this.keyringId = msg.keyringId;
    this.options = msg.options;
    const keyring = getKeyringById(this.keyringId);
    const defaultKeyFpr = await keyring.getDefaultKeyFpr();
    const data = {
      signMsg: this.options.signMsg,
      defaultKeyFpr
    };
    if (msg.options.privKeys) {
      data.privKeys = await keyring.getValidSigningKeys();
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
      this.encryptPromise.reject(new MvError('Editor dialog canceled.', 'EDITOR_DIALOG_CANCEL'));
    }
  }

  async onEditorContainerEncrypt(msg) {
    this.pgpMIME = true;
    this.keyringId = msg.keyringId;
    const keyMap = await getKeyByAddress(this.keyringId, msg.recipients);
    const keyFprMap = mapAddressKeyMapToFpr(keyMap);
    if (Object.keys(keyFprMap).some(keyFpr => keyFprMap[keyFpr] === false)) {
      const error = {
        message: 'No valid encryption key for recipient address',
        code: 'NO_KEY_FOR_RECIPIENT'
      };
      this.ports.editorCont.emit('error-message', {error});
      return;
    }
    let keyFprs = [];
    msg.recipients.forEach(recipient => {
      keyFprs = keyFprs.concat(keyFprMap[recipient]);
    });
    if (prefs.general.auto_add_primary) {
      const defaultKeyFpr = await getKeyringById(this.keyringId).getDefaultKeyFpr();
      if (defaultKeyFpr) {
        keyFprs.push(defaultKeyFpr);
      }
    }
    this.keyFprBuffer = sortAndDeDup(keyFprs);
    // ensure that all keys are available in the API keyring
    syncPublicKeys({keyringId: this.keyringId, keyIds: this.keyFprBuffer});
    this.ports.editor.emit('get-plaintext', {action: 'encrypt'});
  }

  async onEditorContainerCreateDraft(msg) {
    this.pgpMIME = true;
    this.keyringId = msg.keyringId;
    this.options.reason = 'PWD_DIALOG_REASON_CREATE_DRAFT';
    const defaultKeyFpr = await getKeyringById(this.keyringId).getDefaultKeyFpr();
    if (defaultKeyFpr) {
      this.keyFprBuffer = [defaultKeyFpr];
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

  onSignOnly(msg) {
    this.signKeyFpr = msg.signKeyFpr;
    this.emit('get-plaintext', {action: 'sign'});
  }

  onEditorUserInput(msg) {
    uiLog.push(msg.source, msg.type);
  }

  /**
   * Lookup a recipient's public key with the auto-locate sources and
   * store it locally using a TOFU like (trust on first use) mechanic.
   * @param  {Object} msg   The event message object
   * @return {undefined}
   */
  async onAutoLocate(msg) {
    const options = msg.recipient;
    options.keyringId = this.keyringId;
    const armored = await keyRegistry.lookup(options.email, this.keyringId);
    if (armored) {
      await getKeyringById(this.keyringId).importKeys([{type: 'public', armored}]);
    }
    await this.sendKeyUpdate();
  }

  async sendKeyUpdate() {
    // send updated key cache to editor
    const keys = await getKeyData({keyringId: this.keyringId});
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
      this.encryptPromise = {resolve, reject};
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
      this.encryptPromise = {resolve, reject};
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
        selfSigned: Boolean(this.options.armoredDraft)
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
      this.ports.editor.emit('decrypt-failed', {error: mapError(error)});
    }
    clearTimeout(this.encryptTimer);
  }

  /**
   * Receive plaintext from editor, initiate encryption
   * @param {String} options.action - 'sign' or 'encrypt'
   * @param {String} options.message - body of the message
   * @param {String} options.keys - key data object (user id, key id, fingerprint, email and name)
   * @param {Array} options.attachments - file attachments
   * @param {Boolen} options.signMsg - indicator if (encrypted) message should be signed
   * @param {Array<String>} options.signKeyFpr - fingerprint of key to sign the message
   * @param {Boolean} options.noCache - do not use password cache, user interaction required
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
      const error = mapError(err);
      this.ports.editor.emit('error-message', {error});
      if (this.ports.editorCont) {
        this.ports.editorCont.emit('error-message', {error});
      }
      this.ports.editor.emit('encrypt-failed');
    }
    clearTimeout(this.encryptTimer);
  }

  /**
   * Encrypt, sign & encrypt, or sign only operation
   * @param {String} options.action - 'sign' or 'encrypt'
   * @param {String} options.message - body of the message
   * @param {String} options.keys - key data object (user id, key id, fingerprint, email and name)
   * @param {Array} options.attachments - file attachments
   * @param {Boolen} options.signMsg - indicator if (encrypted) message should be signed
   * @param {Array<String>} options.signKeyFpr - fingerprint of key to sign the message
   * @param {Boolean} options.noCache - do not use password cache, user interaction required
   * @return {Promise<String>} - message as armored block
   */
  async signAndEncrypt(options) {
    if (options.action === 'encrypt') {
      let data = null;
      options.pgpMIME = this.pgpMIME;
      try {
        data = buildMail(options);
      } catch (error) {
        if (this.ports.editorCont) {
          this.ports.editorCont.emit('error-message', {error: mapError(error)});
        }
      }
      if (data === null) {
        throw new MvError('MIME building failed.');
      }
      const keyFprs = await this.getPublicKeyFprs(options.keys);
      if (options.signMsg) {
        return this.signAndEncryptMessage({
          data,
          keyFprs,
          signKeyFpr: options.signKeyFpr,
          noCache: options.noCache
        });
      } else {
        return this.encryptMessage({
          data,
          keyFprs
        });
      }
    } else if (options.action === 'sign') {
      return this.signMessage({
        data: options.message,
        signKeyFpr: this.signKeyFpr
      });
    }
  }

  /**
   * Sign and encrypt message
   * @param {String} data - message content
   * @param {Array<String>} keyFprs - encryption keys fingerprint
   * @param {String} signKeyFpr - signing key fingerprint
   * @param {Boolean} noCache - do not use password cache, user interaction required
   * @return {Promise<String>} - message as armored block
   */
  async signAndEncryptMessage({data, signKeyFpr, keyFprs, noCache}) {
    if (!signKeyFpr) {
      const defaultKeyFpr = await getDefaultKeyFpr(this.keyringId);
      signKeyFpr = defaultKeyFpr;
    }
    if (!signKeyFpr) {
      throw new MvError('No private key found to sign this message.', 'NO_DEFAULT_KEY_FOUND');
    }
    const unlockKey = async options => {
      options.noCache = noCache;
      options.reason = this.options.reason || 'PWD_DIALOG_REASON_SIGN';
      options.sync = !prefs.security.password_cache;
      return this.unlockKey(options);
    };
    return model.encryptMessage({
      data,
      keyringId: this.keyringId,
      unlockKey,
      encryptionKeyFprs: keyFprs,
      signingKeyFpr: signKeyFpr,
      uiLogSource: 'security_log_editor',
      noCache
    });
  }

  /**
   * Encrypt only message
   * @param {String} data - message content
   * @param {Array<String>} keyFprs - encryption keys fingerprint
   * @return {Promise<String>} - message as armored block
   */
  encryptMessage({data, keyFprs}) {
    this.encryptTimer = setTimeout(() => {
      this.ports.editor.emit('encrypt-in-progress');
    }, 800);
    return model.encryptMessage({
      data,
      keyringId: this.keyringId,
      encryptionKeyFprs: keyFprs,
      uiLogSource: 'security_log_editor'
    });
  }

  /**
   * Create a cleartext signature
   * @param {String} data
   * @return {Promise<String>}
   */
  signMessage({data, signKeyFpr}) {
    const unlockKey = async options => {
      options.reason = 'PWD_DIALOG_REASON_SIGN';
      return this.unlockKey(options);
    };
    return model.signMessage({
      data,
      keyringId: this.keyringId,
      unlockKey,
      signingKeyFpr: signKeyFpr
    });
  }

  /**
   * Transfer the encrypted/signed armored message and recipients back to the webmail interface or editor container
   * @param  {String} options.armored   The encrypted/signed message
   * @param  {Array}  options.keys      The keys used to encrypt the message
   */
  transferEncrypted({armored, keys = []}) {
    if (this.ports.editorCont) {
      this.ports.editorCont.emit('encrypted-message', {message: armored});
    } else {
      const recipients = keys.map(key => ({name: key.name, email: key.email}));
      this.encryptPromise.resolve({armored, recipients});
    }
  }

  async unlockKey({key, noCache, reason = 'PWD_DIALOG_REASON_DECRYPT', sync = true}) {
    const pwdControl = sub.factory.get('pwdDialog');
    const openPopup = !this.editorPopup;
    const beforePasswordRequest = id => this.editorPopup && this.ports.editor.emit('show-pwd-dialog', {id});
    const unlockedKey = await pwdControl.unlockKey({key, reason, openPopup, noCache, beforePasswordRequest});
    this.encryptTimer = setTimeout(() => {
      this.ports.editor.emit('encrypt-in-progress');
    }, 800);
    if (sync) {
      triggerSync({keyringId: this.keyringId, key: unlockedKey.key, password: unlockedKey.password});
    }
    return unlockedKey.key;
  }

  /**
   * Collect all the key fingerprints to encrypto to, including the sender's key.
   * @param  {Array<Object>} keys - the public key objects containing the key fingerprint
   * @return {Array<String>} - A collection of all key fingerprints to encrypt to
   */
  async getPublicKeyFprs(keys) {
    let keyFprs;
    // prefer keyFprBuffer
    if (this.keyFprBuffer) {
      keyFprs = this.keyFprBuffer;
    } else {
      keyFprs = keys.map(key => key.fingerprint);
      // get the sender key fingerprint
      if (prefs.general.auto_add_primary) {
        const localKeyring = getKeyringById(this.keyringId);
        const defaultKeyFpr = await localKeyring.getDefaultKeyFpr();
        if (defaultKeyFpr) {
          keyFprs.push(defaultKeyFpr);
        }
      }
    }
    // deduplicate
    return sortAndDeDup(keyFprs);
  }
}
