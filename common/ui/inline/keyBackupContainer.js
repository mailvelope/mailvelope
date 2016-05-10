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
  this.host = mvelo.main.host;
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

  this.port.postMessage({
    event: 'set-keybackup-window-props',
    sender: this.name,
    host: mvelo.main.host,
    keyringId: this.keyringId,
    initialSetup: (this.options.initialSetup === undefined) ? true : this.options.initialSetup
  });

  if (mvelo.crx) {
    url = mvelo.extension.getURL('common/ui/inline/dialogs/keyBackupDialog.html?id=' + this.id);
  } else if (mvelo.ffa) {
    url = 'about:blank?mvelo=keybackup&id=' + this.id;
  }

  this.container.setAttribute('src', url);
  this.container.setAttribute('frameBorder', 0);
  this.container.setAttribute('scrolling', 'no');
  this.container.style.width = '100%';
  this.container.style.height = '100%';
  this.parent.appendChild(this.container);
  return this;
};

mvelo.KeyBackupContainer.prototype.keyBackupDone = function(done) {
  this.popupDone = done;
  return this;
};

mvelo.KeyBackupContainer.prototype.registerEventListener = function() {
  var that = this;

  this.port.onMessage.addListener(function(msg) {
    switch (msg.event) {
      case 'popup-isready':
        if (that.popupDone) {
          that.popupDone(msg.error);
        }
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
