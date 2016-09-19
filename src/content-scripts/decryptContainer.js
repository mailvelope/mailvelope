/**
 * Mailvelope - secure email with OpenPGP encryption for Webmail
 * Copyright (C) 2014-2015 Mailvelope GmbH
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

mvelo.DecryptContainer = function(selector, keyringId, options) {
  this.selector = selector;
  this.keyringId = keyringId;
  this.options = options;
  this.id = mvelo.util.getHash();
  this.name = 'decryptCont-' + this.id;
  this.port = mvelo.extension.connect({name: this.name});
  this.registerEventListener();
  this.parent = null;
  this.container = null;
  this.armored = null;
  this.done = null;
};

mvelo.DecryptContainer.prototype.create = function(armored, done) {
  this.armored = armored;
  this.done = done;
  this.parent = document.querySelector(this.selector);
  this.container = document.createElement('iframe');
  var url;
  if (mvelo.crx) {
    url = mvelo.extension.getURL('components/decrypt-inline/decryptInline.html?id=' + this.id);
  } else if (mvelo.ffa) {
    url = 'about:blank?mvelo=decryptInline&id=' + this.id;
  }
  this.container.setAttribute('src', url);
  this.container.setAttribute('frameBorder', 0);
  this.container.setAttribute('scrolling', 'no');
  this.container.style.width = '100%';
  this.container.style.height = '100%';
  this.parent.appendChild(this.container);
};

mvelo.DecryptContainer.prototype.registerEventListener = function() {
  var that = this;
  this.port.onMessage.addListener(function(msg) {
    switch (msg.event) {
      case 'destroy':
        that.parent.removeChild(this.container);
        that.port.disconnect();
        break;
      case 'error-message':
        that.done(msg.error);
        break;
      case 'get-armored':
        that.port.postMessage({
          event: 'set-armored',
          data: that.armored,
          keyringId: that.keyringId,
          options: that.options,
          sender: that.name
        });
        break;
      case 'decrypt-done':
        that.done();
        break;
      default:
        console.log('unknown event', msg);
    }
  });
};
