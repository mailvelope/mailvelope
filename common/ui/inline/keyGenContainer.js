/**
 * Mailvelope - secure email with OpenPGP encryption for Webmail
 * Copyright (C) 2015 Mailvelope GmbH
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

/**
 *
 * @param {CssSelector} selector - target container
 * @param {string} keyringId - the keyring to use for this operation
 * @param {object} options
 * @constructor
 */
mvelo.KeyGenContainer = function(selector, keyringId, options) {
  this.selector = selector;
  this.keyringId = keyringId;
  this.options = options;
  this.id = mvelo.util.getHash();
  this.name = 'keyGenCont-' + this.id;
  this.port = mvelo.extension.connect({name: this.name});
  this.registerEventListener();
  this.parent = null;
  this.container = null;
  this.done = null;
  this.generateCallback = null;
};

/**
 * Create an iframe
 * @param {function} done - callback function
 * @returns {mvelo.KeyGenContainer}
 */
mvelo.KeyGenContainer.prototype.create = function(done) {
  var url;

  this.done = done;
  this.parent = document.querySelector(this.selector);
  this.container = document.createElement('iframe');

  if (mvelo.crx) {
    url = mvelo.extension.getURL('common/ui/inline/dialogs/keyGenDialog.html?id=' + this.id);
  } else if (mvelo.ffa) {
    url = 'about:blank?mvelo=keyGenDialog&id=' + this.id;
  }

  this.container.setAttribute('src', url);
  this.container.setAttribute('frameBorder', 0);
  this.container.setAttribute('scrolling', 'no');
  this.container.style.width = '100%';
  this.container.style.height = '100%';

  while (this.parent.firstChild) {
    this.parent.removeChild(this.parent.firstChild);
  }
  this.parent.appendChild(this.container);
  return this;
};

/**
 * Generate a key pair and check if the inputs are correct
 * @param {boolean} confirmRequired - generated key only valid after confirm
 * @param {function} generateCallback - callback function
 * @returns {mvelo.KeyGenContainer}
 */
mvelo.KeyGenContainer.prototype.generate = function(confirmRequired, generateCallback) {
  this.generateCallback = generateCallback;
  this.options.confirmRequired = confirmRequired;
  this.port.postMessage({
    event: 'generate-key',
    sender: this.name,
    keyringId: this.keyringId,
    options: this.options
  });
  return this;
};

mvelo.KeyGenContainer.prototype.confirm = function() {
  this.port.postMessage({
    event: 'generate-confirm',
    sender: this.name,
  });
};

mvelo.KeyGenContainer.prototype.reject = function() {
  this.port.postMessage({
    event: 'generate-reject',
    sender: this.name,
  });
};

/**
 * @returns {mvelo.KeyGenContainer}
 */
mvelo.KeyGenContainer.prototype.registerEventListener = function() {
  var that = this;

  this.port.onMessage.addListener(function(msg) {
    switch (msg.event) {
      case 'generate-done':
        that.generateCallback(msg.error, msg.publicKey);
        break;
      case 'dialog-done':
        that.done(null, that.id);
        break;
      default:
        console.log('unknown event', msg);
    }
  });
  return this;
};
