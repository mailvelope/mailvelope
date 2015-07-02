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
    this.syncDoneHandler = {};
  }

  SyncController.prototype = Object.create(sub.SubController.prototype);

  SyncController.prototype.init = function(keyringId) {
    this.keyringId = keyringId;
  };

  SyncController.prototype.sync = function(type, data) {
    var that = this;
    return new Promise(function(resolve, reject) {
      that.ports.syncHandler.postMessage({
        event: 'sync-event',
        type: type,
        data: data
      });
      that.syncDoneHandler[type] = function(err, data) {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      };
    });
  };

  SyncController.prototype.syncDone = function(data) {
    this.syncDoneHandler[data.syncType](data.error, data.syncData);
    delete this.syncDoneHandler[data.syncType];
  };

  SyncController.prototype.upload = function(uploadObj) {
    return this.sync('upload', uploadObj);
  };

  SyncController.prototype.download = function(downloadObj) {
    return this.sync('download', downloadObj);
  };

  SyncController.prototype.backup = function(backupObj) {
    return this.sync('backup', backupObj);
  };

  SyncController.prototype.restore = function() {
    return this.sync('restore');
  };

  SyncController.prototype.handlePortMessage = function(msg) {
    //console.log('sync.controller handlePortMessage msg', msg);
    switch (msg.event) {
      case 'init':
        this.init(msg.keyringId);
        break;
      case 'sync-done':
        this.syncDone(msg.data);
        break;
      default:
        console.log('unknown event', msg);
    }
  };

  exports.SyncController = SyncController;

});
