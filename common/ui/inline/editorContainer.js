/**
 * Mailvelope - secure email with OpenPGP encryption for Webmail
 * Copyright (C) 2014  Thomas Oberndörfer
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

'use strict';

var mvelo = mvelo || {};

mvelo.EditorContainer = function(selector, keyringId, options) {
  this.selector = selector;
  this.keyringId = keyringId;
  this.options = options;
  this.id = mvelo.util.getHash();
  this.name = 'editorCont-' + this.id;
  this.port = mvelo.extension.connect({name: this.name});
  this.registerEventListener();
  this.parent = null;
  this.container = null;
  this.done = null;
  this.encryptCallback = null;
};

mvelo.EditorContainer.prototype.create = function(done) {
  var that = this;
  this.done = done;
  this.parent = document.querySelector(this.selector);
  this.container = document.createElement('iframe');
  var url;
  var quota = "";
  if (this.options.quota) {
    quota = '&quota=' + this.options.quota;
  }

  if (mvelo.crx) {
    url = mvelo.extension.getURL('common/ui/editor/editor.html?id=' + this.id + quota + '&embedded=true');
  } else if (mvelo.ffa) {
    url = 'about:blank?mvelo=editor&id=' + this.id + quota + '&embedded=true';
  }
  this.container.setAttribute('src', url);
  this.container.setAttribute('frameBorder', 0);
  this.container.setAttribute('scrolling', 'no');
  this.container.style.width = '100%';
  this.container.style.height = '100%';
  this.parent.appendChild(this.container);
};

mvelo.EditorContainer.prototype.encrypt = function(recipients, callback) {
  var error;
  if (this.encryptCallback) {
    error = new Error('Encyption already in progress.');
    error.code = 'ENCRYPT_IN_PROGRESS';
    throw error;
  }
  this.port.postMessage({
    event: 'editor-container-encrypt',
    sender: this.name,
    keyringId: this.keyringId,
    recipients: recipients
  });
  this.encryptCallback = callback;
};

mvelo.EditorContainer.prototype.processOptions = function() {
  var error;
  if (this.options.quotedMail && mvelo.main.getMessageType(this.options.quotedMail) !== mvelo.PGP_MESSAGE) {
    error = new Error('Quoted mail is not a PGP message.');
    error.code = 'WRONG_QUOTED_MAIL_TYPE';
    return error;
  }
  this.port.postMessage({
    event: 'editor-options',
    sender: this.name,
    keyringId: this.keyringId,
    options: this.options
  });
};

mvelo.EditorContainer.prototype.registerEventListener = function() {
  var that = this;
  this.port.onMessage.addListener(function(msg) {
    switch (msg.event) {
      case 'editor-ready':
        that.done(that.options && that.processOptions(), that.id);
        break;
      case 'destroy':
        that.parent.removeChild(this.container);
        that.port.disconnect();
        break;
      case 'error-message':
        that.encryptCallback(msg.error);
        that.encryptCallback = null;
        break;
      case 'encrypted-message':
        that.encryptCallback(null, msg.message);
        that.encryptCallback = null;
        break;
      default:
        console.log('unknown event', msg);
    }
  });
};
