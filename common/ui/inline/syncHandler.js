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
 * @param {string} keyringId - the keyring to use for this operation
 * @constructor
 */
mvelo.SyncHandler = function(keyringId) {
  this.keyringId = keyringId;
  this.id = mvelo.util.getHash();
  this.name = 'syncHandler-' + this.id;
  this.port = mvelo.extension.connect({name: this.name});
  this.registerEventListener();
};

/**
 * @returns {mvelo.SyncHandler}
 */
mvelo.SyncHandler.prototype.registerEventListener = function() {
  var that = this;
  this.port.onMessage.addListener(function(msg) {
    switch (msg.event) {
      case 'keyring-upload':
        mvelo.domAPI.postMessage('keyring-upload', that.keyringId, msg.syncObj, null);
        break;
      case 'keyring-download':
        mvelo.domAPI.postMessage('keyring-download', that.keyringId, msg.syncObj, null);
        break;
      case 'keyring-backup':
        mvelo.domAPI.postMessage('keyring-backup', that.keyringId, msg.syncObj, null);
        break;
      case 'keyring-restore':
        mvelo.domAPI.postMessage('keyring-restore', that.keyringId, msg.syncObj, null);
        break;
      default:
        console.log('unknown event', msg);
    }
  });
  return this;
};
