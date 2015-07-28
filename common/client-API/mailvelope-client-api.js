/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2014-2015 Mailvelope GmbH
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

'use strict';

(function() {

  /**
   * Not accessible, see {@tutorial Readme} instead on how to obtain access to an instance.
   * @constructor
   * @private
   * @alias Mailvelope
   */
  var Mailvelope = function() {};

  /**
   * Gives access to the mailvelope extension version
   * @returns {Promise.<String, Error>}
   */
  Mailvelope.prototype.getVersion = function() {
    return postMessage('get-version');
  };

  /**
   * Retrieves the Keyring for the given identifier
   * @param {string} identifier - the identifier of the keyring
   * @returns {Promise.<Keyring, Error>}
   * @throws {Error} error.code = 'NO_KEYRING_FOR_ID'
   */
  Mailvelope.prototype.getKeyring = function(identifier) {
    return postMessage('get-keyring', {identifier: identifier}).then(function(options) {
      return new Keyring(identifier, options);
    });
  };

  /**
   * Creates a Keyring for the given identifier
   * @param {string} identifier - the identifier of the new keyring
   * @returns {Promise.<Keyring, Error>}
   * @throws {Error} error.code = 'KEYRING_ALREADY_EXISTS'
   * @example
   * mailvelope.createKeyring('Account-ID-4711').then(function(keyring) {
   *     // continue to display the settings container and start the setup wizard
   *     mailvelope.createSettingsContainer('#mailvelope-settings', keyring);
   * });
   */
  Mailvelope.prototype.createKeyring = function(identifier) {
    return postMessage('create-keyring', {identifier: identifier}).then(function(options) {
      return new Keyring(identifier, options);
    });
  };

  var checkTypeKeyring = function(keyring) {
    if (!(keyring instanceof Keyring)) {
      var error = new Error('Type mismatch: keyring should be instance of Keyring.');
      error.code = 'TYPE_MISMATCH';
      throw error;
    }
  };

  /**
   * Ascii Armored PGP Text Block
   * @typedef {string} AsciiArmored
   */

  /**
   * CSS Selector String
   * @typedef {string} CssSelector
   */

  /**
   * @typedef {Object} DisplayContainerOptions
   * @property {boolean} showExternalContent - if true loads external content into the display container (default: true)
   * @property {string} senderAddress - email address of sender, used to indentify key for signature verification
   */

  /**
   * Creates an iframe to display the decrypted content of the encrypted mail.
   * The iframe will be injected into the container identified by selector.
   * @param {CssSelector} selector - target container
   * @param {AsciiArmored} armored - the encrypted mail to display
   * @param {Keyring} keyring - the keyring to use for this operation
   * @param {DisplayContainerOptions} options
   * @returns {Promise.<undefined, Error>}
   */
  Mailvelope.prototype.createDisplayContainer = function(selector, armored, keyring, options) {
    try {
      checkTypeKeyring(keyring);
    } catch (e) {
      return Promise.reject(e);
    }
    return postMessage('display-container', {selector: selector, armored: armored, identifier: keyring.identifier, options: options});
  };

  /**
   * @typedef {Object} EditorContainerOptions
   * @property {number} quota - mail content (text + attachments) limit in kilobytes (default: 20480)
   * @property {string} predefinedText - text that will be added to the editor
   * @property {AsciiArmored} quotedMail - mail that should be quoted
   * @property {boolean} quotedMailIndent - if true the quoted mail will be indented (default: true)
   * @property {string} quotedMailHeader - header to be added before the quoted mail
   * @property {boolean} signMsg - if true then the mail would signed automaticly (default: true)
   */

  /**
   * Creates an iframe with an editor for a new encrypted mail.
   * The iframe will be injected into the container identified by selector.
   * @param {CssSelector} selector - target container
   * @param {Keyring} keyring - the keyring to use for this operation
   * @param {EditorContainerOptions} options
   * @returns {Promise.<Editor, Error>}
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
  Mailvelope.prototype.createEditorContainer = function(selector, keyring, options) {
    try {
      checkTypeKeyring(keyring);
    } catch (e) {
      return Promise.reject(e);
    }
    return postMessage('editor-container', {selector: selector, identifier: keyring.identifier, options: options}).then(function(editorId) {
      return new Editor(editorId);
    });
  };

  /**
   * @typedef {Object} SettingsContainerOptions
   * @property {string} email - the email address of the current user
   * @property {string} fullName - the full name of the current user
   */

  /**
   * Creates an iframe to display the keyring settings.
   * The iframe will be injected into the container identified by selector.
   * @param {CssSelector} selector - target container
   * @param {Keyring} keyring - the keyring to use for the setup
   * @param {SettingsContainerOptions} options
   * @returns {Promise.<undefined, Error>}
   */
  Mailvelope.prototype.createSettingsContainer = function(selector, keyring, options) {
    try {
      checkTypeKeyring(keyring);
    } catch (e) {
      return Promise.reject(e);
    }
    return postMessage('settings-container', {selector: selector, identifier: keyring.identifier, options: options});
  };

  var syncHandler = null;

  /**
   * Not accessible, instance can be obtained using {@link Mailvelope#getKeyring}
   * or {@link Mailvelope#createKeyring}.
   * @constructor
   * @private
   * @alias Keyring
   * @param {string} identifier - the keyring identifier
   * @param {object} options - the options
   * @property {number} logoRev - revision number of the keyring logo, initial value: 0
   */
  var Keyring = function(identifier, options) {
    this.identifier = identifier;
    this.logoRev = options.revision || 0;
  };

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
  Keyring.prototype.validKeyForAddress = function(recipients) {
    return postMessage('query-valid-key', {identifier: this.identifier, recipients: recipients}).then(function(keyMap) {
      for (var address in keyMap) {
        if (keyMap[address]) {
          keyMap[address].keys.forEach(function(key) {
            key.lastModified = new Date(key.lastModified);
          });
        }
      }
      return keyMap;
    });
  };

  /**
   * Exports the public key as an ascii armored string.
   * Only keys belonging to the user (corresponding private key exists) can be exported.
   * @param {string} emailAddr - email address to identify the public+private key
   * @returns {Promise.<AsciiArmored, Error>}
   * @throws {Error} error.code = 'NO_KEY_FOR_ADDRESS'
   * @example
   * keyring.exportOwnPublicKey('abc@web.de').then(function(armoredPublicKey) {
   *   console.log('exportOwnPublicKey', armoredPublicKey); // prints: "-----BEGIN PGP PUBLIC KEY BLOCK..."
   * });
   */
  Keyring.prototype.exportOwnPublicKey = function(emailAddr) {
    return postMessage('export-own-pub-key', {identifier: this.identifier, emailAddr: emailAddr});
  };

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
  Keyring.prototype.importPublicKey = function(armored) {
    return postMessage('import-pub-key', {identifier: this.identifier, armored: armored});
  };

  /**
   * Set logo for keyring. The image is persisted in Mailvelope with a revision number,
   * therefore the method is only required after new keyring generation or if logo and revision number changes.
   * @param {string} dataURL  - data-URL representing the logo, max. file size: ~10KB, max. image size: 192x96px, content-type: image/png
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
  Keyring.prototype.setLogo = function(dataURL, revision) {
    var that = this;
    return postMessage('set-logo', {identifier: this.identifier, dataURL: dataURL, revision: revision}).then(function() {
      that.logoRev = revision;
    });
  };

  /**
   * @typedef {Object} UserId
   * @property {string} email - the email address of the current user
   * @property {string} fullName - the full name of the current user
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
  Keyring.prototype.createKeyGenContainer = function(selector, options) {
    return postMessage('key-gen-container', {selector: selector, identifier: this.identifier, options: options}).then(function(generatorId) {
      return new Generator(generatorId);
    });
  };

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
  Keyring.prototype.createKeyBackupContainer = function(selector, options) {
    return postMessage('key-backup-container', {selector: selector, identifier: this.identifier, options: options}).then(function(popupId) {
      return new KeyBackupPopup(popupId);
    });
  };

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
  Keyring.prototype.restoreBackupContainer = function(selector, options) {
    return postMessage('restore-backup-container', {selector: selector, identifier: this.identifier, options: options}).then(function(restoreId) {
      return new RestoreBackup(restoreId);
    });
  };

  /**
   * Check if keyring contains valid private key with given fingerprint
   * @param {string} fingerprint
   * @returns {Promise.<boolean, Error>}
   */
  Keyring.prototype.hasPrivateKey = function(fingerprint) {
    return postMessage('has-private-key', {identifier: this.identifier, fingerprint: fingerprint}).then(function(result) {
      return result;
    });
  };

  /**
   * @typedef {Object} UploadSyncReply
   * @property {String} eTag - entity tag for the uploaded encrypted keyring
   */

  /**
   * @typedef {Function} UploadSyncHandler
   * @param {Object} uploadObj - object with upload data
   * @param {string} uploadObj.eTag - entity tag for the uploaded encrypted keyring, or null if initial upload
   * @param {AsciiArmored} uploadObj.keyringMsg - encrypted keyring as PGP armored message
   * @returns {Promise.<UploadSyncReply, Error>} - if version on server has different eTag, then the promise is rejected
   *                                               if server is initial and uploadObj.eTag is not null, then the promise is rejected
   */

  /**
   * @typedef {Object} DownloadSyncReply
   * @property {AsciiArmored} keyringMsg - encrypted keyring as PGP armored message
   * @property {String} eTag - entity tag for the encrypted keyring
   */

  /**
   * @typedef {Function} DownloadSyncHandler
   * @param {Object} downloadObj - meta info for download
   * @param {string} downloadObj.eTag - entity tag for the current local keyring, or null if no local eTag
   * @returns {Promise.<DownloadSyncReply, Error>} - if version on server has same eTag, then keyringMsg property of reply is empty
   *                                                 if server is initial and downloadObj.eTag is not null, then the promise is rejected
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
   * @property {UploadSyncHandler} uploadSync - function called by Mailvelope to upload encrypted private key backup
   * @property {DownloadSyncHandler} downloadSync - function called by Mailvelope to download encrypted private key backup
   * @property {BackupSyncHandler} backup - function called by Mailvelope to upload a public keyring backup
   * @property {RestoreSyncHandler} restore - function called by Mailvelope to restore a public keyring backup
   */

  /**
   * Add various functions for keyring synchronization
   * @param {SyncHandlerObject} syncHandlerObj
   * @returns {Promise.<undefined, Error>}
   */
  Keyring.prototype.addSyncHandler = function(syncHandlerObj) {
    return postMessage('add-sync-handler', {identifier: this.identifier}).then(function(syncHandlerId) {
      syncHandler = new SyncHandler(syncHandlerId, syncHandlerObj);
    });
  };

  /**
   * Open the extension settings in a new browser tab
   * @returns {Promise.<undefined, Error>}
   */
  Keyring.prototype.openSettings = function() {
    return postMessage('open-settings', {identifier: this.identifier});
  };

  /**
   * Not accessible, instance can be obtained using {@link Keyring#createKeyBackupContainer}
   * @private
   * @param {string} popupId
   * @alis Popup
   * @constructor
   */
  var KeyBackupPopup = function(popupId) {
    this.popupId = popupId;
  };

  /**
   * @returns {Promise.<undefined, Error>} - key backup ready or error
   * @throws {Error}
   */
  KeyBackupPopup.prototype.isReady = function() {
    return postMessage('keybackup-popup-isready', {popupId: this.popupId});
  };

  /**
   * Not accessible, instance can be obtained using {@link Keyring#createKeyGenContainer}.
   * @private
   * @param {string} generatorId - the internal id of the generator
   * @alias Generator
   * @constructor
   */
  var Generator = function(generatorId) {
    this.generatorId = generatorId;
  };

  /**
   * Generate a private key
   * @returns {Promise.<AsciiArmored, Error>} - the newly generated key (public part)
   * @throws {Error}
   */
  Generator.prototype.generate = function() {
    return postMessage('generator-generate', {generatorId: this.generatorId});
  };

  /**
   * Not accessible, instance can be obtained using {@link Keyring#restoreBackupContainer}.
   * @private
   * @param {string} restoreId - the internal id of the restore backup
   * @alias RestoreBackup
   * @constructor
   */
  var RestoreBackup = function(restoreId) {
    this.restoreId = restoreId;
  };

  /**
   * @returns {Promise.<undefined, Error>} - key restore ready or error
   * @throws {Error}
   */
  RestoreBackup.prototype.isReady = function() {
    return postMessage('restore-backup-isready', {restoreId: this.restoreId});
  };

  /**
   * Not accessible, instance can be obtained using {@link Mailvelope#createEditorContainer}.
   * @private
   * @param {string} editorId - the internal id of the editor
   * @alias Editor
   * @constructor
   */
  var Editor = function(editorId) {
    this.editorId = editorId;
  };

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
  Editor.prototype.encrypt = function(recipients) {
    return postMessage('editor-encrypt', {recipients: recipients, editorId: this.editorId});
  };

  var callbacks = Object.create(null);

  var SyncHandler = function(syncHandlerId, callbacks) {
    this.syncHandlerId = syncHandlerId;
    this.callbacks = callbacks;
  };

  function handleSyncEvent(msg) {
    var handler = null;
    var callbacks = syncHandler.callbacks;
    switch (msg.data.type) {
      case 'upload':
        handler = callbacks.uploadSync;
        break;
      case 'download':
        handler = callbacks.downloadSync;
        break;
      case 'backup':
        handler = callbacks.backup;
        break;
      case 'restore':
        handler = callbacks.restore;
        break;
      default:
        console.log('mailvelope-client-api unknown sync event', msg.data.type);
    }
    handler(msg.data.data)
      .then(function(result) {
        postMessage('sync-handler-done', {syncHandlerId: syncHandler.syncHandlerId, syncType: msg.data.type, syncData: result, id: msg.data.id}, true);
      })
      .catch(function(error) {
        if (error instanceof Error || typeof error === 'string') {
          error = { message: error.message || '' + error };
        }
        postMessage('sync-handler-done', {syncHandlerId: syncHandler.syncHandlerId, syncType: msg.data.type, error: error, id: msg.data.id}, true);
      });
  }

  function eventListener(event) {
    if (event.origin !== window.location.origin ||
        event.data.mvelo_client ||
        !event.data.mvelo_extension) {
      return;
    }
    //console.log('clientAPI eventListener', event.data);
    switch (event.data.event) {
      case 'sync-event':
        handleSyncEvent(event.data);
        break;
      case 'callback-reply':
        var error;
        if (event.data.error) {
          error = new Error(event.data.error.message);
          error.code = event.data.error.code;
          if (!callbacks[event.data.id]) {
            throw error;
          }
        }
        callbacks[event.data.id](error, event.data.data);
        delete callbacks[event.data.id];
        break;
      default:
        console.log('mailvelope-client-api unknown event', event.data.event);
    }
  }

  function getHash() {
    var result = '';
    var buf = new Uint16Array(6);
    window.crypto.getRandomValues(buf);
    for (var i = 0; i < buf.length; i++) {
      result += buf[i].toString(16);
    }
    return result;
  }

  function postMessage(eventName, data, noResp) {
    return new Promise(function(resolve, reject) {
      var message = {
        event: eventName,
        mvelo_client: true,
        data: data,
        id: getHash()
      };
      if (!noResp) {
        callbacks[message.id] = function(err, data) {
          if (err) {
            reject(err);
          } else {
            resolve(data);
          }
        };
      }
      window.postMessage(message, window.location.origin);
    });
  }

  /**
   * Global instance of {@link Mailvelope}
   * @global
   * @type {Mailvelope}
   */
  window.mailvelope = new Mailvelope();

  window.addEventListener('message', eventListener);

  window.setTimeout(function() {
    window.dispatchEvent(new CustomEvent('mailvelope', { detail: window.mailvelope }));
  }, 1);

}());
