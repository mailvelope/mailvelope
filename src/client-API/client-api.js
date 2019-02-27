/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2014-2019 Mailvelope GmbH
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

/**
 * @type {Mailvelope}
 */
class Mailvelope {
  /**
   * Gives access to the mailvelope extension version
   * @returns {Promise.<String, Error>}
   */
  getVersion() {
    return send('get-version');
  }

  /**
   * Retrieves the Keyring for the given identifier
   * @param {String} identifier - the identifier of the keyring
   * @returns {Promise.<Keyring, Error>}
   * @throws {Error} error.code = 'NO_KEYRING_FOR_ID'
   */
  getKeyring(identifier) {
    return send('get-keyring', {identifier}).then(options => new Keyring(identifier, options));
  }

  /**
   * Creates a Keyring for the given identifier
   * @param {String} identifier - the identifier of the new keyring
   * @returns {Promise.<Keyring, Error>}
   * @throws {Error} error.code = 'KEYRING_ALREADY_EXISTS'
   * @example
   * mailvelope.createKeyring('Account-ID-4711').then(function(keyring) {
   *     // continue to display the settings container and start the setup wizard
   *     mailvelope.createSettingsContainer('#mailvelope-settings', keyring);
   * });
   */
  createKeyring(identifier) {
    return send('create-keyring', {identifier}).then(options => new Keyring(identifier, options));
  }

  /**
   * Ascii Armored PGP Text Block
   * @typedef {String} AsciiArmored
   */

  /**
   * CSS Selector String
   * @typedef {String} CssSelector
   */

  /**
   * @typedef {Object} DisplayContainerOptions
   * @property {boolean} showExternalContent - if true loads external content into the display container (default: true)
   * @property {String} senderAddress - email address of sender, used to indentify key for signature verification
   */

  /**
   * @typedef {Object} DisplayContainer
   * @property {Error} error - Error object with code and message attribute
   *                   error.code = 'DECRYPT_ERROR' - generic decrypt error
   *                   error.code = 'ARMOR_PARSE_ERROR' - error while parsing the armored message
   *                   error.code = 'PWD_DIALOG_CANCEL' - user canceled password dialog
   *                   error.code = 'NO_KEY_FOUND' - no private key found to decrypt this message
   */

  /**
   * Creates an iframe to display the decrypted content of the encrypted mail.
   * The iframe will be injected into the container identified by selector.
   * @param {CssSelector} selector - target container
   * @param {AsciiArmored} armored - the encrypted mail to display
   * @param {Keyring} keyring - the keyring to use for this operation
   * @param {DisplayContainerOptions} options
   * @returns {Promise.<DisplayContainer, Error>}
   */
  createDisplayContainer(selector, armored, keyring, options) {
    try {
      checkTypeKeyring(keyring);
    } catch (e) {
      return Promise.reject(e);
    }
    return send('display-container', {selector, armored, identifier: keyring.identifier, options}).then(display => {
      if (display && display.error) {
        display.error = mapError(display.error);
      }
      return display;
    });
  }

  /**
   * @typedef {Object} EditorContainerOptions
   * @property {number} quota - mail content (text + attachments) limit in kilobytes (default: 20480)
   * @property {boolean} signMsg - if true then the mail will be signed (default: false)
   * @property {AsciiArmored} armoredDraft - a PGP message, signed and encrypted with the default key of the user, will be used to restore a draft in the editor
   *                                         The armoredDraft parameter can't be combined with the parameters: predefinedText, quotedMail... parameters, keepAttachments
   * @property {String} predefinedText - text that will be added to the editor
   * @property {AsciiArmored} quotedMail - mail that should be quoted
   * @property {boolean} quotedMailIndent - if true the quoted mail will be indented (default: true)
   * @property {String} quotedMailHeader - header to be added before the quoted mail
   * @property {boolean} keepAttachments - add attachments of quotedMail to editor (default: false)
   */

  /**
   * Creates an iframe with an editor for a new encrypted mail.
   * The iframe will be injected into the container identified by selector.
   * @param {CssSelector} selector - target container
   * @param {Keyring} keyring - the keyring to use for this operation
   * @param {EditorContainerOptions} options
   * @returns {Promise.<Editor, Error>}
   * @throws {Error} error.code = 'WRONG_ARMORED_TYPE' - parameters of type AsciiArmored do not have the correct armor type <br>
                     error.code = 'INVALID_OPTIONS' - invalid combination of options parameter
   * @example
   * mailvelope.createEditorContainer('#editor-element', keyring).then(function(editor) {
   *     // register event handler for mail client send button
   *     $('#mailer-send').click(function() {
   *         // encrypt current content of editor for array of recipients
   *         editor.encrypt(['info@mailvelope.com', 'abc@web.de']).then(function(armored) {
   *           console.log('encrypted message', armored);
   *         });
   *     });
   * });
   */
  createEditorContainer(selector, keyring, options) {
    try {
      checkTypeKeyring(keyring);
    } catch (e) {
      return Promise.reject(e);
    }
    return send('editor-container', {selector, identifier: keyring.identifier, options}).then(editorId => new Editor(editorId));
  }

  /**
   * @typedef {Object} SettingsContainerOptions
   * @property {String} email - the email address of the current user
   * @property {String} fullName - the full name of the current user
   */

  /**
   * Creates an iframe to display the keyring settings.
   * The iframe will be injected into the container identified by selector.
   * @param {CssSelector} selector - target container
   * @param {Keyring} keyring - the keyring to use for the setup
   * @param {SettingsContainerOptions} options
   * @returns {Promise.<undefined, Error>}
   */
  createSettingsContainer(selector, keyring, options) {
    try {
      checkTypeKeyring(keyring);
    } catch (e) {
      return Promise.reject(e);
    }
    return send('settings-container', {selector, identifier: keyring.identifier, options});
  }

  /**
   * Creates an iframe to display an encrypted form
   * The iframe will be injected into the container identified by selector.
   * @param @param {String} selector - the id of target container
   * @param @param {String} formHtml - the form definition
   * @param @param {String} signature - the OpenPGP signature
   * @returns {Promise.<Object, Error>} an object that includes armoredData
   * @throws {Error} error.code = 'INVALID_FORM' the form definition is not valid
   */
  createEncryptedFormContainer(selector, formHtml, signature) {
    return send('encrypted-form-container', {selector, formHtml, signature});
  }
}

// connection to content script is alive
let connected = true;

let syncHandler = null;

function checkTypeKeyring(keyring) {
  if (!(keyring instanceof Keyring)) {
    const error = new Error('Type mismatch: keyring should be instance of Keyring.');
    error.code = 'TYPE_MISMATCH';
    throw error;
  }
}

/**
 * Not accessible, instance can be obtained using {@link Mailvelope#getKeyring}
 * or {@link Mailvelope#createKeyring}.
 * @param {String} identifier - the keyring identifier
 * @param {object} options - the options
 * @property {number} logoRev - revision number of the keyring logo, initial value: 0
 */
class Keyring {
  constructor(identifier, options) {
    this.identifier = identifier;
    this.logoRev = options.revision || 0;
  }

  /**
   * Checks for valid key in the keyring for provided email addresses
   * @param  {Array} recipients - list of email addresses for key lookup
   * @return {Promise.<Object, Error>} an object that maps email addresses to a status or key info object (false: no valid key, {}: valid key)
   * @example
   * keyring.validKeyForAddress(['abc@web.de', 'info@mailvelope.com']).then(function(result) {
   *     console.log(result);
   * // {
   * //   'abc@web.de': false,
   * //   'info@mailvelope.com': {
   * //     keys: [
   * //       {fingerprint: 'f37377c39898d05ffd39157a98bbec557ce08def', lastModified: Tue May 19 2015 10:36:53 GMT+0200 (CEST)}
   * //     ]
   * // }
   * });
   */
  validKeyForAddress(recipients) {
    return send('query-valid-key', {identifier: this.identifier, recipients}).then(keyMap => {
      for (const address in keyMap) {
        if (keyMap[address]) {
          keyMap[address].keys.forEach(key => {
            key.lastModified = new Date(key.lastModified);
          });
        }
      }
      return keyMap;
    });
  }

  /**
   * Exports the public key as an ascii armored string.
   * Only keys belonging to the user (corresponding private key exists) can be exported.
   * @param {String} emailAddr - email address to identify the public+private key
   * @returns {Promise.<AsciiArmored, Error>}
   * @throws {Error} error.code = 'NO_KEY_FOR_ADDRESS'
   * @example
   * keyring.exportOwnPublicKey('abc@web.de').then(function(armoredPublicKey) {
   *   console.log('exportOwnPublicKey', armoredPublicKey); // prints: "-----BEGIN PGP PUBLIC KEY BLOCK..."
   * });
   */
  exportOwnPublicKey(emailAddr) {
    return send('export-own-pub-key', {identifier: this.identifier, emailAddr});
  }

  /**
   * Asks the user if they want to import the public key.
   * @param {AsciiArmored} armored - public key to import
   * @returns {Promise.<String, Error>} 'IMPORTED' - key has been imported <br>
                                        'UPDATED' - key already in keyring, new key merged with existing key <br>
                                        'INVALIDATED' - key has been updated, new status of key is 'invalid' (e.g. revoked) <br>
                                        'REJECTED' - key import rejected by user
   * @throws {Error} error.code = 'IMPORT_ERROR' <br>
                     error.code = 'WRONG_ARMORED_TYPE'
   */
  importPublicKey(armored) {
    return send('import-pub-key', {identifier: this.identifier, armored});
  }

  /**
   * @typedef {Object} LookupResult
   * @property {AsciiArmored} content - Armored public key
   * @property {String} source - Source the key was found at <br>
   *                             Sources currently available are: <br>
   *                               * 'WKD' - web key directory <br>
   *                               * 'MKS' - mailvelope key server <br>
   *                               * 'AC' - autocrypt
   * TODO: @property {String} fingerprint - Fingerprint of the key
   * TODO: @property {Date} lastModified - last time the key was modified
   * TODO: @property {Date} lastSeen - last time the key was seen
   */

  /**
   * Looks up a fitting public key from different sources.
   * @param {String} emailAddr  - Email to look the public key up for
   * @returns {Promise.<LookupResult, Error>}
   */
  lookupPublicKey(emailAddr) {
    return postMessage('lookup-pub-key', {identifier: this.identifier, emailAddr});
  }

  /**
   * @typedef {Object} AutocryptMailHeaders
   * @property {String} autocrypt - the Autocrypt header to process
   * @property {String} from - the From header
   * @property {String} date - the Date header
   */

  /**
   * Process Autocrypt header from message being read.
   * @param {AutocryptMailHeaders} headers - the relevant mail headers
   * @returns {Promise.<undefined, Error>}
   * @throws {Error} error.code = 'INVALID_HEADER' <br>
                       error.code = 'STORAGE_ERROR'
                       */
  processAutocryptHeader(headers) {
    return postMessage('process-autocrypt-header', {identifier: this.identifier, headers});
  }

  /**
   * Set logo for keyring. The image is persisted in Mailvelope with a revision number,
   * therefore the method is only required after new keyring generation or if logo and revision number changes.
   * @param {String} dataURL  - data-URL representing the logo, max. file size: ~10KB, max. image size: 192x96px, content-type: image/png
   * @param {number} revision - revision number
   * @returns {Promise.<undefined, Error>}
   * @throws {Error} error.code = 'LOGO_INVALID' <br>
   *                 error.code = 'REVISION_INVALID'
   * @example
   * keyring.setLogo('data:image/png;base64,iVBORS==', 3).then(function() {
   *   // keyring.logoRev == 3
   * }).catch(function(error) {
   *   // logo update failed
   * });
   *
   */
  setLogo(dataURL, revision) {
    return send('set-logo', {identifier: this.identifier, dataURL, revision}).then(() => {
      this.logoRev = revision;
    });
  }

  /**
   * @typedef {Object} UserId
   * @property {String} email - the email address of the current user
   * @property {String} fullName - the full name of the current user
   */

  /**
   * @typedef {Object} KeyGenContainerOptions
   * @property {Array.<UserId>} userIds - array of user IDs. The first entry in the array is set as the primary user ID.
   * @property {number} keySize - key size in bit, optional, default: 2048, valid values: 2048, 4096.
   */

  /**
   * Creates an iframe to display the key generation container.
   * The iframe will be injected into the container identified by selector.
   * @param {CssSelector} selector - target container
   * @param {KeyGenContainerOptions} options
   * @returns {Promise.<Generator, Error>}
   * @throws {Error} error.code = 'INPUT_NOT_VALID'
   */
  createKeyGenContainer(selector, options) {
    return send('key-gen-container', {selector, identifier: this.identifier, options}).then(generatorId => new Generator(generatorId));
  }

  /**
   * @typedef {Object} KeyBackupContainerOptions
   * @param {Boolean} initialSetup (default: true)
   */

  /**
   * Creates an iframe to initiate the key backup process.
   * @param {CssSelector} selector - target container
   * @param {KeyBackupContainerOptions} options
   * @returns {Promise.<KeyBackupPopup, Error>}
   */
  createKeyBackupContainer(selector, options) {
    return send('key-backup-container', {selector, identifier: this.identifier, options}).then(popupId => new KeyBackupPopup(popupId));
  }

  /**
   * @typedef {Object} PrivateKeyContainerOptions
   * @property {boolean} restorePassword (default: false)
   */

  /**
   * Creates an iframe to restore the backup.
   * @param {CssSelector} selector - target container
   * @param {PrivateKeyContainerOptions} options
   * @returns {Promise.<undefined, Error>}
   */
  restoreBackupContainer(selector, options) {
    return send('restore-backup-container', {selector, identifier: this.identifier, options}).then(restoreId => new RestoreBackup(restoreId));
  }

  /**
   * Check if keyring contains valid private key with given fingerprint
   * @param {String} fingerprint
   * @returns {Promise.<boolean, Error>}
   */
  hasPrivateKey(fingerprint) {
    return send('has-private-key', {identifier: this.identifier, fingerprint}).then(result => result);
  }

  /**
   * @typedef {Object} UploadSyncReply
   * @property {String} eTag - entity tag for the uploaded encrypted keyring
   */

  /**
   * @typedef {Function} UploadSyncHandler
   * @param {Object} uploadObj - object with upload data
   * @param {String} uploadObj.eTag - entity tag for the uploaded encrypted keyring, or null if initial upload
   * @param {AsciiArmored} uploadObj.keyringMsg - encrypted keyring as PGP armored message
   * @returns {Promise.<UploadSyncReply, Error>} - if version on server has different eTag, then the promise is rejected
   *                                               if server is initial and uploadObj.eTag is not null, then the promise is rejected
   */

  /**
   * @typedef {Object} DownloadSyncReply
   * @property {AsciiArmored} keyringMsg - encrypted keyring as PGP armored message, or null if no newer version available
   * @property {String} eTag - entity tag for the current encrypted keyring message, or null if server is intial
   */

  /**
   * @typedef {Function} DownloadSyncHandler
   * @param {Object} downloadObj - meta info for download
   * @param {String} downloadObj.eTag - entity tag for the current local keyring, or null if no local eTag
   * @returns {Promise.<DownloadSyncReply, Error>} - if version on server has same eTag, then keyringMsg property of reply is empty, but eTag in reply has to be set
   *                                                 if server is initial and downloadObj.eTag is not null, then the promise is resolved with empty eTag
   */

  /**
   * @typedef {Object} BackupSyncPacket
   * @property {AsciiArmored} backup - encrypted key backup as PGP armored message
   */

  /**
   * @typedef {Function} BackupSyncHandler
   * @param {BackupSyncPacket} - object with backup data
   * @returns {Promise.<undefined, Error>}
   */

  /**
   * @typedef {Function} RestoreSyncHandler
   * @returns {Promise.<BackupSyncPacket, Error>}
   */

  /**
   * @typedef {Object} SyncHandlerObject
   * @property {UploadSyncHandler} uploadSync - function called by Mailvelope to upload the keyring (public keys), the message is encrypted with the default private key
   * @property {DownloadSyncHandler} downloadSync - function called by Mailvelope to download the encrypted keyring (public keys)
   * @property {BackupSyncHandler} backup - function called by Mailvelope to upload a symmetrically encrypted private key backup
   * @property {RestoreSyncHandler} restore - function called by Mailvelope to restore a private key backup
   */

  /**
   * Add various functions for keyring synchronization
   * @param {SyncHandlerObject} syncHandlerObj
   * @returns {Promise.<undefined, Error>}
   */
  addSyncHandler(syncHandlerObj) {
    if (typeof syncHandlerObj.uploadSync !== typeof syncHandlerObj.downloadSync) {
      return Promise.reject(new Error('uploadSync and downloadSync Handler cannot be set exclusively.'));
    }
    return send('add-sync-handler', {identifier: this.identifier}).then(syncHandlerId => {
      if (syncHandler) {
        syncHandler.update(syncHandlerObj);
      } else {
        syncHandler = new SyncHandler(syncHandlerId, syncHandlerObj);
      }
    });
  }

  /**
   * Open the extension settings in a new browser tab
   * @returns {Promise.<undefined, Error>}
   */
  openSettings() {
    return send('open-settings', {identifier: this.identifier});
  }
}

/**
 * Not accessible, instance can be obtained using {@link Keyring#createKeyBackupContainer}
 * @param {String} popupId
 */
class KeyBackupPopup {
  constructor(popupId) {
    this.popupId = popupId;
  }

  /**
   * @returns {Promise.<undefined, Error>} - key backup ready or error
   * @throws {Error}
   */
  isReady() {
    return send('keybackup-popup-isready', {popupId: this.popupId});
  }
}

/**
 * Not accessible, instance can be obtained using {@link Keyring#createKeyGenContainer}.
 * @param {String} generatorId - the internal id of the generator
 */
class Generator {
  constructor(generatorId) {
    this.generatorId = generatorId;
  }

  /**
   * Generate a private key
   * @param {Promise.<undefined, Error>} [confirm] - newly generate key is only persisted if Promise resolves,
   *                                                 in the reject or timeout case the generated key is rejected
   * @returns {Promise.<AsciiArmored, Error>} - the newly generated key (public part)
   * @throws {Error}
   */
  generate(confirm) {
    return send('generator-generate', {generatorId: this.generatorId, confirmRequired: Boolean(confirm)}).then(armored => {
      if (confirm) {
        confirm.then(() => {
          emit('generator-generate-confirm', {generatorId: this.generatorId});
        }).catch(e => {
          emit('generator-generate-reject', {generatorId: this.generatorId, error: e});
        });
      }
      return armored;
    });
  }
}

/**
 * Not accessible, instance can be obtained using {@link Keyring#restoreBackupContainer}.
 * @param {String} restoreId - the internal id of the restore backup
 */
class RestoreBackup {
  constructor(restoreId) {
    this.restoreId = restoreId;
  }

  /**
   * @returns {Promise.<undefined, Error>} - key restore ready or error
   * @throws {Error}
   */
  isReady() {
    return send('restore-backup-isready', {restoreId: this.restoreId});
  }
}

/**
 * Not accessible, instance can be obtained using {@link Mailvelope#createEditorContainer}.
 * @param {String} editorId - the internal id of the editor
 */
class Editor {
  constructor(editorId) {
    this.editorId = editorId;
  }

  /**
   * Requests the encryption of the editor content for the given recipients.
   * @param {Array.<string>} recipients - list of email addresses for public key lookup and encryption
   * @returns {Promise.<AsciiArmored, Error>}
   * @throws {Error} error.code = 'ENCRYPT_IN_PROGRESS' <br>
   *                 error.code = 'NO_KEY_FOR_RECIPIENT' <br>
   *                 error.code = 'ENCRYPT_QUOTA_SIZE'
   * @example
   * editor.encrypt(['abc@web.de', 'info@com']).then(function (armoredMessage) {
   *     console.log('encrypt', armoredMessage); // prints: "-----BEGIN PGP MESSAGE..."
   * }
   */
  encrypt(recipients) {
    return send('editor-encrypt', {recipients, editorId: this.editorId});
  }

  /**
   * Encrypt and sign the content of the editor with the default key of the user.
   * To be used to save drafts. To restore drafts use the options.armoredDraft parameter of the createEditorContainer method.
   * @returns {Promise.<AsciiArmored, Error>}
   * @throws {Error} error.code = 'ENCRYPT_IN_PROGRESS' <br>
   *                 error.code = 'NO_KEY_FOR_ENCRYPTION' <br>
   *                 error.code = 'ENCRYPT_QUOTA_SIZE'
   */
  createDraft() {
    return send('editor-create-draft', {editorId: this.editorId});
  }
}

const callbacks = Object.create(null);

class SyncHandler {
  constructor(syncHandlerId, handlers) {
    this.syncHandlerId = syncHandlerId;
    this.handlers = handlers;
  }

  update(handlers) {
    for (const handle in handlers) {
      this.handlers[handle] = handlers[handle];
    }
  }
}

function handleSyncEvent({type, id, data}) {
  let handler = null;
  switch (type) {
    case 'upload':
      handler = syncHandler.handlers.uploadSync;
      break;
    case 'download':
      handler = syncHandler.handlers.downloadSync;
      break;
    case 'backup':
      handler = syncHandler.handlers.backup;
      break;
    case 'restore':
      handler = syncHandler.handlers.restore;
      break;
    default:
      console.log('mailvelope-client-api unknown sync event', type);
  }
  if (!handler) {
    emit('sync-handler-done', {syncHandlerId: syncHandler.syncHandlerId, syncType: type, error: {message: 'Sync handler not available'}, id});
    return;
  }
  handler(data)
  .then(result => {
    emit('sync-handler-done', {syncHandlerId: syncHandler.syncHandlerId, syncType: type, syncData: result, id});
  })
  .catch(error => {
    if (!error) {
      error = new Error('Unknown Error');
    }
    if (error instanceof Error || typeof error === 'string') {
      error = {message: error.message || String(error)};
    }
    emit('sync-handler-done', {syncHandlerId: syncHandler.syncHandlerId, syncType: type, error, id});
  });
}

function eventListener(msg) {
  if (msg.origin !== window.location.origin ||
      msg.data.mvelo_client ||
      !msg.data.mvelo_extension) {
    return;
  }
  //console.log('clientAPI eventListener', event.data);
  switch (msg.data.event) {
    case 'sync-event':
      handleSyncEvent(msg.data);
      break;
    case '_reply': {
      let error;
      if (msg.data.error) {
        error = mapError(msg.data.error);
        if (!callbacks[msg.data._reply]) {
          throw error;
        }
      }
      callbacks[msg.data._reply](error, msg.data.result);
      delete callbacks[msg.data._reply];
      break;
    }
    default:
      console.log('mailvelope-client-api unknown event', msg.data.event);
  }
}

function disconnectListener() {
  window.removeEventListener('message', eventListener);
  connected = false;
}

function getHash() {
  let result = '';
  const buf = new Uint16Array(6);
  window.crypto.getRandomValues(buf);
  for (let i = 0; i < buf.length; i++) {
    result += buf[i].toString(16);
  }
  return result;
}

function mapError(obj) {
  const error = new Error(obj.message);
  error.code = obj.code;
  return error;
}

function checkConnection() {
  if (!connected) {
    const error = new Error('Connection to Mailvelope extension is no longer alive.');
    error.code = 'NO_CONNECTION';
    throw error;
  }
}

function emit(event, data) {
  checkConnection();
  const message = {...data, event, mvelo_client: true};
  window.postMessage(message, window.location.origin);
}

function send(event, data) {
  checkConnection();
  return new Promise((resolve, reject) => {
    const message = {...data, event, mvelo_client: true, _reply: getHash()};
    callbacks[message._reply] = (err, data) => err ? reject(err) : resolve(data);
    window.postMessage(message, window.location.origin);
  });
}

export function init() {
  window.mailvelope = new Mailvelope();
  window.addEventListener('message', eventListener);
  window.addEventListener('mailvelope-disconnect', disconnectListener);
  window.setTimeout(() => {
    window.dispatchEvent(new CustomEvent('mailvelope', {detail: window.mailvelope}));
  }, 1);
}
