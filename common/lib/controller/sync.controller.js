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

define(function(require, exports, module) {

  var sub = require('./sub.controller');

  function SyncController(port) {
    sub.SubController.call(this, port);
    if (!port) {
      this.mainType = 'syncHandler';
      this.id = this.mvelo.util.getHash();
    }

    this.keyringId = null;
    this.restoreDone = null;
  }

  SyncController.prototype = Object.create(sub.SubController.prototype);

  SyncController.prototype.init = function(keyringId) {
    this.keyringId = keyringId;
  };

  SyncController.prototype.upload = function(uploadObj) {
    this.ports.syncHandler.postMessage({
      event: 'keyring-upload',
      syncObj: uploadObj
    });
  };

  SyncController.prototype.download = function(downloadObj) {
    this.ports.syncHandler.postMessage({
      event: 'keyring-download',
      syncObj: downloadObj
    });
  };

  SyncController.prototype.backup = function(backupObj) {
    this.ports.syncHandler.postMessage({
      event: 'keyring-backup',
      syncObj: backupObj
    });
  };

  SyncController.prototype.restore = function(done) {
    //console.log('SyncController.prototype.restore()');

    this.restoreDone = done;
    this.ports.syncHandler.postMessage({event: 'sync-restore'});
  };

  SyncController.prototype.handlePortMessage = function(msg) {
    //console.log('pwd.controller handlePortMessage msg', msg);
    switch (msg.event) {
      case 'init':
        this.init(msg.keyringId);
        break;
      case 'restore-done':
        //console.log('SyncController.prototype.handlePortMessage(restore-done)', msg);
        this.restoreDone(msg.restoreBackup);
        break;
      default:
        console.log('unknown event', msg);
    }
  };

  exports.SyncController = SyncController;

});
