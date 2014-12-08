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

  var mailvelope = {};

  var callbacks = {};

  window.mailvelope = mailvelope;
  window.addEventListener('message', eventListener);
  document.body.dataset.mailvelope = 'true';
  window.setTimeout(function() {
    document.body.dispatchEvent(new Event('mailvelope'));
  }, 1);

  function eventListener(event) {
    if (event.origin !== document.location.origin ||
        event.data.mvelo_client ||
        !event.data.mvelo_extension) {
      return;
    }
    console.log('clientAPI eventListener', event.data.event);
    switch (event.data.event) {
      case 'callback-reply':
        callbacks[event.data.id](event.data.error, event.data.data);
        delete callbacks[event.data.id];
        break;
      default:
        console.log('unknown event', event.data.event);
    }
  }

  function getHash() {
    return Math.random().toString(36).substr(2, 8);
  }

  function postMessage(eventName, data, callback) {
    var message = {
      event: eventName,
      mvelo_client: true,
      data: data
    };
    if (typeof callback !== 'undefined') {
      message.id = getHash();
      callbacks[message.id] = callback;
    }
    window.postMessage(message, document.location.origin);
  }

  mailvelope.getVersion = function() {
    return document.body.dataset.mailvelopeVersion;
  };

  mailvelope.createDisplayContainer = function(selector, armored, callback) {
    postMessage('display-container', {selector: selector, armored: armored}, callback);
  };

  mailvelope.createEditorContainer = function(selector, callback) {
    postMessage('editor-container', {selector: selector}, function(editor_id) {
      callback(null, {
        encrypt: function(recipients, callback) {
          postMessage('editor-encrypt', {recipients: recipients, editor_id: editor_id}, callback);
        }
      });
    });
  };

  mailvelope.validKeyForAddress = function(recipients, callback) {
    postMessage('query-valid-key', {recipients: recipients}, callback);
  };

}());