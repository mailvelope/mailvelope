/**
 * Mailvelope - secure email with OpenPGP encryption for Webmail
 * Copyright (C) 2015  Thomas Oberndörfer
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
mvelo.KeyBackupContainer = function(selector, keyringId, options) {
  this.selector = selector;
  this.keyringId = keyringId;
  this.options = options;
  this.id = mvelo.util.getHash();
  this.name = 'keyBackupCont-' + this.id;
  this.port = mvelo.extension.connect({name: this.name});
  this.registerEventListener();
  this.parent = null;
  this.container = null;
  this.done = null;
  this.popupDone = null;
};

/**
 * Create an iframe
 * @param {function} done - callback function
 * @returns {mvelo.KeyBackupContainer}
 */
mvelo.KeyBackupContainer.prototype.create = function(done) {
  var url;

  this.done = done;
  this.parent = document.querySelector(this.selector);
  this.container = document.createElement('iframe');

  if (mvelo.crx) {
    url = mvelo.extension.getURL('common/ui/inline/dialogs/keyBackupDialog.html?id=' + this.id + '&embedded=true');
  } else if (mvelo.ffa) {
    url = 'about:blank?mvelo=keybackup&id=' + this.id + '&embedded=true';
  }

  this.container.setAttribute('src', url);
  this.container.setAttribute('frameBorder', 0);
  this.container.setAttribute('scrolling', 'no');
  this.container.style.width = '100%';
  this.container.style.height = '100%';
  this.parent.appendChild(this.container);
  return this;
};

mvelo.KeyBackupContainer.prototype.remove = function() {
  if (this.container) {
    this.parent.removeChild(this.container);
  }

  this.popupDone(null, this.id);
  return this;
};

mvelo.KeyBackupContainer.prototype.popupDone = function(done) {
  this.popupDone = done;
  return this;
};

mvelo.KeyBackupContainer.prototype.registerEventListener = function() {
  var that = this;

  this.port.onMessage.addListener(function(msg) {
    switch (msg.event) {
      case 'popup-done':
        that.remove();
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
