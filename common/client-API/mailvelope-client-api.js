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

  function Mailvelope() {}

  Mailvelope.prototype.getVersion = function() {
    return document.body.dataset.mailvelopeVersion;
  };

  Mailvelope.prototype.getKeyring = function(identifier) {
    return postMessage('get-keyring', {identifier: identifier}).then(function() {
      return new Keyring(identifier);
    });
  };

  Mailvelope.prototype.createKeyring = function(identifier) {
    return postMessage('create-keyring', {identifier: identifier}).then(function() {
      return new Keyring(identifier);
    });
  };

  Mailvelope.prototype.createDisplayContainer = function(selector, armored, options) {
    return postMessage('display-container', {selector: selector, armored: armored, options: options});
  };

  Mailvelope.prototype.createEditorContainer = function(selector, options) {
    return postMessage('editor-container', {selector: selector, options: options}).then(function(editorId) {
      return new Editor(editorId);
    });
  };

  Mailvelope.prototype.createSettingsContainer = function(selector, keyring) {
    return postMessage('settings-container', {selector: selector, identifier: keyring.identifier});
  };

  function Keyring(identifier) {
    this.identifier = identifier;
  }

  Keyring.prototype.getKeyInfoForAddress = function(recipients) {
    return postMessage('get-key-info', {identifier: this.identifier, recipients: recipients});
  };

  Keyring.prototype.exportOwnPublicKey = function(emailAddr) {
    return postMessage('export-own-pub-key', {identifier: this.identifier, emailAddr: emailAddr});
  };

  Keyring.prototype.importPublicKey = function(armored) {
    return postMessage('import-pub-key', {identifier: this.identifier, armored: armored});
  };

  function Editor(editorId) {
    this.editorId = editorId;
  }

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
