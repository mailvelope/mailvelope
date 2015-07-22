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
 * @param {string} keyringId - the keyring to use for this operation
 * @constructor
 */
mvelo.SyncHandler = function(keyringId) {
  this.keyringId = keyringId;
  this.id = mvelo.util.getHash();
  this.name = 'syncHandler-' + this.id;
  this.port = mvelo.extension.connect({name: this.name});
  this.registerEventListener();

  this.port.postMessage({event: 'init', sender: this.name, keyringId: this.keyringId});
};

mvelo.SyncHandler.prototype.syncDone = function(data) {
  //console.log('mvelo.SyncHandler.prototype.restoreDone()', restoreBackup);
  this.port.postMessage({event: 'sync-done', sender: this.name, data: data});
};

/**
 * @returns {mvelo.SyncHandler}
 */
mvelo.SyncHandler.prototype.registerEventListener = function() {
  var that = this;
  this.port.onMessage.addListener(function(msg) {
    switch (msg.event) {
      case 'sync-event':
        mvelo.domAPI.postMessage('sync-event', null, msg, null);
        break;
      default:
        console.log('unknown event', msg);
    }
  });
  return this;
};
