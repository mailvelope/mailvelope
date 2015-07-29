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

define(function(require, exports, module) {

  var sub = require('./sub.controller');
  var keyringMod = require('../keyring');
  var pwdCache = require('../pwdCache');

  function SyncController(port) {
    sub.SubController.call(this, port);
    this.keyringId = null;
    this.keyring = null;
    this.syncDoneHandler = {};
    this.pwdControl = null;
    this.syncRunning = false;
    this.repeatSync = null;
    this.TIMEOUT = 8; // sync timeout in seconds
  }

  SyncController.prototype = Object.create(sub.SubController.prototype);

  SyncController.prototype.init = function(keyringId) {
    this.keyringId = keyringId;
    this.keyring = keyringMod.getById(this.keyringId);
  };

  /**
   * @param {Object} options
   * @param  {Boolean} [options.force] - if newer version on server available force sync
   * @param  {openpgp.key.Key} [options.key] - key to decrypt and sign sync message
   */
  SyncController.prototype.triggerSync = function(options) {
    var that = this;
    console.log('triggerSync', this.id);
    if (this.syncRunning) {
      this.repeatSync = options;
      return;
    }
    var modified = this.keyring.sync.data.modified;
    if (!options.key) {
      var primKey = this.keyring.getPrimaryKey();
      options.key = primKey ? primKey.key : null;
    }
    if (!options.key) {
      return;
    }
    if (!this.keyIsUnlocked(options.key, 'decrypt') && !options.force) {
      return;
    }
    this.syncRunning = true;
    // reset modified to detect further modification
    this.keyring.sync.data.modified = false;
    this.downloadSyncMessage(options)
      .then(function() {
        if (!modified) {
          return;
        }
        if (that.keyIsUnlocked(options.key, 'sign')) {
          return that.uploadSyncMessage(options);
        }
        // upload didn't happen, reset modified flag
        that.keyring.sync.data.modified = true;
      })
      .then(function() {
        that.keyring.sync.save();
        that.checkRepeat();
        console.log('triggerSync finish');
      })
      .catch(function(err) {
        console.log('Sync error', err);
        if (modified || that.keyring.sync.data.modified) {
          that.keyring.sync.data.modified = true;
        }
        that.checkRepeat();
      });
  };

  SyncController.prototype.checkRepeat = function() {
    this.syncRunning = false;
    if (this.repeatSync) {
      var repeat = this.repeatSync;
      this.repeatSync = null;
      this.triggerSync(repeat);
    }
  };

  /**
   * @param {Object} options
   * @param  {Boolean} [options.force] - if newer version on server available force download
   * @param  {openpgp.key.Key} [options.key] - key to decrypt sync message
   * @return {Promise<undefined, Error}
   */
  SyncController.prototype.downloadSyncMessage = function(options) {
    var that = this;
    console.log('downloadSyncMessage');
    return this.download({eTag: this.keyring.sync.data.eTag})
      .then(function(download) {
        console.log('download.then');
        if (download && download.keyringMsg) {
          // new version available on server
          return that.model.readMessage(download.keyringMsg, that.keyringId)
            .then(function(message) {
              if (!message.key.primaryKey.getKeyId().equals(options.key.primaryKey.getKeyId())) {
                console.log('Key used for sync packet from server is not primary key on client');
                if (!this.keyIsUnlocked(message.key, 'decrypt') && !options.force) {
                  throw new Error('Key used for sync packet is locked');
                }
              }
              message.keyringId = that.keyringId;
              message.noSync = true;
              message.reason = 'PWD_DIALOG_REASON_EDITOR';
              // unlock key if still locked
              that.pwdControl = sub.factory.get('pwdDialog');
              return that.pwdControl.unlockCachedKey(message);
            })
            .then(function(message) {
              return that.model.decryptSyncMessage(message.key, message.message);
            })
            .then(function(syncPacket) {
              // merge keys
              that.keyring.sync.mute(true);
              that.keyring.importKeys(syncPacket.keys);
              that.keyring.sync.merge(syncPacket.changeLog);
              // remove keys with change log delete entry
              that.keyring.sync.getDeleteEntries().forEach(function(fingerprint) {
                that.keyring.removeKey(fingerprint, 'public');
              });
              that.keyring.sync.mute(false);
              // set eTag
              that.keyring.sync.data.eTag = download.eTag;
              console.log('downloadSyncMessage finish');
            });
        }
      });
  };

  SyncController.prototype.uploadSyncMessage = function(options) {
    var that = this;
    // if key is in cache, specific unlock of sign key packet might be required
    var unlockKey = {
      key: options.key,
      keyid: options.key.getSigningKeyPacket().getKeyId().toHex(),
      userid: keyringMod.getUserId(options.key),
      reason: 'PWD_DIALOG_REASON_EDITOR',
      keyringId: this.keyringId,
      noSync: true
    };
    this.pwdControl = this.pwdControl || sub.factory.get('pwdDialog');
    return this.pwdControl.unlockCachedKey(unlockKey)
      .then(function(message) {
        // encrypt keyring sync message
        return that.model.encryptSyncMessage(message.key, that.keyring.sync.data.changeLog, that.keyringId);
      })
      // upload
      .then(function(armored) {
        console.log('uploadSyncMessage');
        return that.upload({eTag: that.keyring.sync.data.eTag, keyringMsg: armored});
      })
      .then(function(result) {
        that.keyring.sync.data.eTag = result.eTag;
        console.log('uploadSyncMessage finish');
      });
  };

  SyncController.prototype.keyIsUnlocked = function(key, operation) {
    var cacheEntry = pwdCache.get(key.primaryKey.getKeyId().toHex());
    if (cacheEntry) {
      return true;
    }
    if (!operation) {
      return key.primaryKey.isDecrypted;
    }
    if (operation === 'sign') {
      var keyPacket = key.getSigningKeyPacket();
      return keyPacket && keyPacket.isDecrypted;
    } else if (operation === 'decrypt') {
      var keyPacket = key.getEncryptionKeyPacket();
      return keyPacket && keyPacket.isDecrypted;
    }
  };

  SyncController.prototype.sync = function(type, data) {
    var that = this;
    console.log('sync');
    return new Promise(function(resolve, reject) {
      var id = that.mvelo.util.getHash();
      that.ports.syncHandler.postMessage({
        event: 'sync-event',
        type: type,
        data: data,
        id: id
      });
      that.syncDoneHandler[id] = function(err, data) {
        console.log('syncDoneHandler');
        if (timeout) {
          that.mvelo.util.clearTimeout(timeout);
        }
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      };
      var timeout = that.mvelo.util.setTimeout(function() {
        delete that.syncDoneHandler[id];
        reject(new Error('Sync timeout'));
      }, that.TIMEOUT * 1000);
    });
  };

  SyncController.prototype.syncDone = function(data) {
    if (this.syncDoneHandler[data.id]) {
      this.syncDoneHandler[data.id](data.error, data.syncData);
      delete this.syncDoneHandler[data.id];
    }
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

  function getByKeyring(keyringId) {
    return sub.getByMainType('syncHandler').filter(function(obj) {
      return obj.keyringId === keyringId;
    })[0];
  }

  /**
   * @param {Object} options
   * @param {String} options.keyringId identifies the keyring to sync
   * @param {boolean} [options.force] - if newer version on server available force sync
   * @param {Key} [options.key] - unlocked private key used for sync
   */
  function triggerSync(options) {
    var syncCtrl = getByKeyring(options.keyringId);
    if (syncCtrl) {
      syncCtrl.triggerSync(options);
    }
  }

  exports.SyncController = SyncController;
  exports.getByKeyring = getByKeyring;
  exports.triggerSync = triggerSync;

});
