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

/**
 * @name MailvelopeNS
 * @namespace mailvelope
 * @tutorial client-api-basics
 */

(function() {

  /**
   * Creates a new instance
   * @constructor
   * @private
   * @alias mailvelope.Mailvelope
   * @tutorial client-api-basics
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
   * @returns {Promise.<mailvelope.Keyring>}
   */
  Mailvelope.prototype.getKeyring = function(identifier) {
    return postMessage('get-keyring', {identifier: identifier}).then(function() {
      return new Keyring(identifier);
    });
  };

  /**
   * Creates a Keyring for the given identifier
   * @param {string} identifier - the identifier of the new keyring
   * @returns {Promise.<mailvelope.Keyring>}
   */
  Mailvelope.prototype.createKeyring = function(identifier) {
    return postMessage('create-keyring', {identifier: identifier}).then(function() {
      return new Keyring(identifier);
    });
  };

  /**
   * Ascii Armored PGP Text Block
   * @typedef {string} mailvelope.AsciiArmored
   */

  /**
   * CSS Selector String
   * @typedef {string} mailvelope.CssSelector
   */

  /**
   * @typedef {Object} mailvelope.DisplayContainerOptions
   * @property {boolean} showExternalContent - if true loads external content into the display container (default: true)
   */

  /**
   * Creates an iframe to display the decrypted content of the encrypted mail.
   * The iframe will be injected into the container identified by selector.
   * @param {mailvelope.CssSelector} selector - target container
   * @param {mailvelope.AsciiArmored} armored - the encrypted mail to display
   * @param {mailvelope.DisplayContainerOptions} options
   * @returns {Promise.<void>}
   */
  Mailvelope.prototype.createDisplayContainer = function(selector, armored, options) {
    return postMessage('display-container', {selector: selector, armored: armored, options: options});
  };

  /**
   * @typedef {Object} mailvelope.EditorContainerOptions
   * @property {int} quota - limit of the encrypted mail size in kilobytes (default: 20480)
   * @property {string} predefinedText - text that will be added to the editor
   * @property {mailvelope.AsciiArmored} quotedMail - mail that should be quoted
   * @property {boolean} quotedMailIndent - if true the quoted mail will be indented (default: true)
   * @property {string} quotedMailHeader - header to be added before the quoted mail
   */

  /**
   * Creates an iframe to with an editor for a new encrypted mail.
   * The iframe will be injected into the container identified by selector.
   * @param {mailvelope.CssSelector} selector - target container
   * @param {mailvelope.EditorContainerOptions} options
   * @returns {Promise.<mailvelope.Editor>}
   */
  Mailvelope.prototype.createEditorContainer = function(selector, options) {
    return postMessage('editor-container', {selector: selector, options: options}).then(function(editorId) {
      return new Editor(editorId);
    });
  };

  /**
   * Creates an iframe to display the keyring settings.
   * The iframe will be injected into the container identified by selector.
   * @param {mailvelope.CssSelector} selector - target container
   * @param {mailvelope.Keyring} keyring - the keyring to use for the setup
   * @returns {Promise.<void>}
   */
  Mailvelope.prototype.createSettingsContainer = function(selector, keyring) {
    return postMessage('settings-container', {selector: selector, identifier: keyring.identifier});
  };

  /**
   * Constructs a new Keyring instance
   * @constructor
   * @private
   * @alias mailvelope.Keyring
   * @param {string} identifier - the keyring identifier
   */
  var Keyring = function(identifier) {
    this.identifier = identifier;
  };

  Keyring.prototype.getKeyInfoForAddress = function(recipients) {
    return postMessage('get-key-info', {identifier: this.identifier, recipients: recipients});
  };

  Keyring.prototype.exportOwnPublicKey = function(emailAddr) {
    return postMessage('export-own-pub-key', {identifier: this.identifier, emailAddr: emailAddr});
  };

  Keyring.prototype.importPublicKey = function(armored) {
    return postMessage('import-pub-key', {identifier: this.identifier, armored: armored});
  };

  /**
   * Constructs a new editor instance
   * @private
   * @param {string} editorId - the internal id of the editor
   * @alias mailvelope.Editor
   * @constructor
   */
  var Editor = function(editorId) {
    this.editorId = editorId;
  };

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

  window.mailvelope = new Mailvelope();

  window.addEventListener('message', eventListener);

  window.setTimeout(function() {
    document.dispatchEvent(new CustomEvent('mailvelope', { detail: window.mailvelope }));
  }, 1);

}());
