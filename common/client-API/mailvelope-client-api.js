/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2014 Thomas Oberndörfer.
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
   * @returns {string} current mailvelope version
   */
  Mailvelope.prototype.getVersion = function() {
    return document.body.dataset.mailvelopeVersion;
  };

  /**
   * Retrieves the Keyring for the given identifier
   * @param {string} identifier - the identifier of the keyring
   * @returns {Promise.<Keyring>}
   */
  Mailvelope.prototype.getKeyring = function(identifier) {
    return postMessage('get-keyring', {identifier: identifier}).then(function() {
      return new Keyring(identifier);
    });
  };

  /**
   * Creates a Keyring for the given identifier
   * @param {string} identifier - the identifier of the new keyring
   * @returns {Promise.<Keyring>}
   * @example
   * mailvelope.createKeyring('Account-ID-4711').then(function(keyring) {
   *     // continue to display the settings container and start the setup wizard
   *     mailvelope.createSettingsContainer('#mailvelope-settings', keyring);
   * });
   */
  Mailvelope.prototype.createKeyring = function(identifier) {
    return postMessage('create-keyring', {identifier: identifier}).then(function() {
      return new Keyring(identifier);
    });
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
   */

  /**
   * Creates an iframe to display the decrypted content of the encrypted mail.
   * The iframe will be injected into the container identified by selector.
   * @param {CssSelector} selector - target container
   * @param {AsciiArmored} armored - the encrypted mail to display
   * @param {Keyring} keyring - the keyring to use for this operation
   * @param {DisplayContainerOptions} options
   * @returns {Promise.<undefined>}
   */
  Mailvelope.prototype.createDisplayContainer = function(selector, armored, keyring, options) {
    return postMessage('display-container', {selector: selector, armored: armored, identifier: keyring.identifier, options: options});
  };

  /**
   * @typedef {Object} EditorContainerOptions
   * @property {int} quota - limit of the encrypted mail size in kilobytes (default: 20480)
   * @property {string} predefinedText - text that will be added to the editor
   * @property {AsciiArmored} quotedMail - mail that should be quoted
   * @property {boolean} quotedMailIndent - if true the quoted mail will be indented (default: true)
   * @property {string} quotedMailHeader - header to be added before the quoted mail
   */

  /**
   * Creates an iframe to with an editor for a new encrypted mail.
   * The iframe will be injected into the container identified by selector.
   * @param {CssSelector} selector - target container
   * @param {Keyring} keyring - the keyring to use for this operation
   * @param {EditorContainerOptions} options
   * @returns {Promise.<Editor>}
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
    return postMessage('editor-container', {selector: selector, identifier: keyring.identifier, options: options}).then(function(editorId) {
      return new Editor(editorId);
    });
  };

  /**
   * Creates an iframe to display the keyring settings.
   * The iframe will be injected into the container identified by selector.
   * @param {CssSelector} selector - target container
   * @param {Keyring} keyring - the keyring to use for the setup
   * @returns {Promise.<void>}
   */
  Mailvelope.prototype.createSettingsContainer = function(selector, keyring) {
    return postMessage('settings-container', {selector: selector, identifier: keyring.identifier});
  };

  /**
   * Not accessible, instance can be obtained using {@link Mailvelope#getKeyring}
   * or {@link Mailvelope#createKeyring}.
   * @constructor
   * @private
   * @alias Keyring
   * @param {string} identifier - the keyring identifier
   */
  var Keyring = function(identifier) {
    this.identifier = identifier;
  };

  /**
   * Checks for valid key in the keyring for provided email addresses
   * @param  {Array} recipients - list of email addresses for key lookup
   * @return {Promise.<Object>} an object that maps email addresses to a status (false: no valid key, {}: valid key)
   * @example
   * keyring.validKeyForAddress(['abc@web.de', 'info@mailvelope.com']).then(function(result) {
   *     console.log(result); // {'abc@web.de': false, 'info@mailvelope.com': {}}
   * });
   */
  Keyring.prototype.validKeyForAddress = function(recipients) {
    return postMessage('query-valid-key', {identifier: this.identifier, recipients: recipients});
  };

  /**
   * Exports the public key as an ascii armored string.
   * Only keys belonging to the user (corresponding private key exists) can be exported.
   * @param {string} emailAddr - email address to identify the public+private key
   * @returns {Promise.<AsciiArmored>}
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
   * @returns {Promise.<undefined>}
   */
  Keyring.prototype.importPublicKey = function(armored) {
    return postMessage('import-pub-key', {identifier: this.identifier, armored: armored});
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
   * @returns {Promise.<AsciiArmored>}
   * @example
   * editor.encrypt(['abc@web.de', 'info@com']).then(function (armoredMessage) {
   *     console.log('encrypt', armoredMessage); // prints: "-----BEGIN PGP MESSAGE..."
   * }
   */
  Editor.prototype.encrypt = function(recipients) {
    return postMessage('editor-encrypt', {recipients: recipients, editorId: this.editorId});
  };

  var callbacks = Object.create(null);

  function eventListener(event) {
    if (event.origin !== document.location.origin ||
        event.data.mvelo_client ||
        !event.data.mvelo_extension) {
      return;
    }
    //console.log('clientAPI eventListener', event.data.event);
    switch (event.data.event) {
      case 'callback-reply':
        var error;
        if (event.data.error) {
          error = new Error(event.data.error.message);
          error.code = event.data.error.code;
        }
        callbacks[event.data.id](error, event.data.data);
        delete callbacks[event.data.id];
        break;
      default:
        console.log('unknown event', event.data.event);
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

  function postMessage(eventName, data) {
    return new Promise(function(resolve, reject) {
      var message = {
        event: eventName,
        mvelo_client: true,
        data: data,
        id: getHash()
      };
      callbacks[message.id] = function(err, data) {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      };
      window.postMessage(message, document.location.origin);
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
    document.dispatchEvent(new CustomEvent('mailvelope', { detail: window.mailvelope }));
  }, 1);

}());
