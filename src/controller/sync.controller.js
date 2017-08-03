/**
 * Copyright (C) 2015-2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

'use strict';


import mvelo from 'lib-mvelo';
import * as sub from './sub.controller';
import {getById as getKeyringById, getUserId} from '../modules/keyring';
import {isCached} from '../modules/pwdCache';
import {readMessage, decryptSyncMessage, encryptSyncMessage} from '../modules/pgpModel';

export class SyncController extends sub.SubController {
  constructor(port) {
    super(port);
    this.keyringId = null;
    this.keyring = null;
    this.syncDoneHandler = {};
    this.pwdControl = null;
    this.syncRunning = false;
    this.repeatSync = null;
    this.TIMEOUT = 8; // sync timeout in seconds
    this.modified = false;
    this.singleton = true;
  }

  init(keyringId) {
    this.keyringId = keyringId;
    this.keyring = getKeyringById(this.keyringId);
  }

  /**
   * @param {Object} options - either undefined, force set or key and password provided
   * @param {Boolean} [options.force] - if newer version on server available force sync
   * @param {openpgp.key.Key} [options.key] - key to decrypt and sign sync message
   * @param {String} [options.password] - password for options.key
   */
  triggerSync(options) {
    var that = this;
    options = options || {};
    if (this.syncRunning) {
      this.repeatSync = options;
      return;
    }
    this.modified = this.keyring.sync.data.modified;
    var primKey = this.keyring.getPrimaryKey();
    if (!options.key) {
      // if no key provided we take the primary key
      if (primKey) {
        options.key = primKey.key;
      } else {
        return; // no private key for sync
      }
    } else {
      // check if provided key is primary key, otherwise no sync
      if (!options.key.primaryKey.getKeyId().equals(primKey.key.primaryKey.getKeyId())) {
        return;
      }
    }
    if (!(options.force || this.canUnlockKey('decrypt', options))) {
      return;
    }
    this.syncRunning = true;
    // reset modified to detect further modification
    this.keyring.sync.data.modified = false;
    this.downloadSyncMessage(options)
    .then(() => {
      if (!that.modified) {
        return;
      }
      if (that.canUnlockKey('sign', options)) {
        return that.uploadSyncMessage(options);
      }
      // upload didn't happen, reset modified flag
      that.keyring.sync.data.modified = true;
    })
    .then(() => that.keyring.sync.save())
    .then(() => {
      that.checkRepeat();
    })
    .catch(err => {
      console.log('Sync error', err);
      if (that.modified || that.keyring.sync.data.modified) {
        that.keyring.sync.data.modified = true;
      }
      that.checkRepeat();
    });
  }

  checkRepeat() {
    this.syncRunning = false;
    if (this.repeatSync) {
      var repeat = this.repeatSync;
      this.repeatSync = null;
      this.triggerSync(repeat);
    }
  }

  /**
   * @param {Object} options
   * @param  {Boolean} [options.force] - if newer version on server available force download
   * @param  {openpgp.key.Key} options.key - key to decrypt sync message
   * @param {String} [options.password] - password for options.key
   * @return {Promise<undefined, Error}
   */
  downloadSyncMessage(options) {
    return this.download({eTag: this.keyring.sync.data.eTag})
    .then(download => {
      if (!download.eTag) {
        if (this.keyring.sync.data.eTag) {
          // initialize eTag
          this.keyring.sync.data.eTag = '';
          // set modified flag to trigger upload
          this.modified = true;
        }
        return;
      }
      if (!download.keyringMsg) {
        return;
      }
      // new version available on server
      return readMessage({armoredText: download.keyringMsg, keyringId: this.keyringId})
      .then(message => {
        message.keyringId = this.keyringId;
        message.reason = 'PWD_DIALOG_REASON_EDITOR';
        if (!message.key.primaryKey.getKeyId().equals(options.key.primaryKey.getKeyId())) {
          console.log('Key used for sync packet from server is not primary key on client');
          if (!options.force && !this.canUnlockKey('decrypt', {key: message.key})) {
            throw new Error('Key used for sync packet is locked');
          }
        } else {
          message.key = options.key;
          message.password = options.password;
        }
        // unlock key if still locked
        this.pwdControl = sub.factory.get('pwdDialog');
        return this.pwdControl.unlockKey(message);
      })
      .then(message => decryptSyncMessage(message.key, message.message))
      .then(syncPacket => {
        // merge keys
        this.keyring.sync.mute(true);
        return this.keyring.importKeys(syncPacket.keys)
        .then(() => syncPacket);
      })
      .then(syncPacket => {
        this.keyring.sync.merge(syncPacket.changeLog);
        // remove keys with change log delete entry
        let removeKeyAsync = this.keyring.sync.getDeleteEntries().map(fingerprint => this.keyring.removeKey(fingerprint, 'public'));
        return Promise.all(removeKeyAsync);
      })
      .then(() => {
        this.keyring.sync.mute(false);
        // set eTag
        this.keyring.sync.data.eTag = download.eTag;
      });
    });
  }

  uploadSyncMessage(options) {
    var that = this;
    // if key is in cache, specific unlock of sign key packet might be required
    var keyOptions = {
      key: options.key,
      password: options.password,
      keyid: options.key.getSigningKeyPacket().getKeyId().toHex(),
      userid: getUserId(options.key),
      reason: 'PWD_DIALOG_REASON_EDITOR',
      keyringId: this.keyringId
    };
    this.pwdControl = this.pwdControl || sub.factory.get('pwdDialog');
    return this.pwdControl.unlockKey(keyOptions)
    .then(message =>
      // encrypt keyring sync message
      encryptSyncMessage(message.key, that.keyring.sync.data.changeLog, that.keyringId)
    )
    // upload
    .then(armored => that.upload({eTag: that.keyring.sync.data.eTag, keyringMsg: armored}))
    .then(result => {
      that.keyring.sync.data.eTag = result.eTag;
    });
  }

  /**
   * Check if key can be unlocked without requesting the password from the user
   * @param  {String} operation - 'decrypt' or 'sign', the operation for which the key is required
   * @param  {Object} options - mandatory
   * @param {openpgp.key.Key} options.key
   * @param {String} [options.password]
   * @return {Boolean} - true if key can be unlocked
   */
  canUnlockKey(operation, options) {
    if (options.password) {
      // key can always be unlocked with password
      return true;
    }
    var isKeyCached = isCached(options.key.primaryKey.getKeyId().toHex());
    if (isKeyCached) {
      return true;
    }
    var keyPacket;
    if (operation === 'sign') {
      keyPacket = options.key.getSigningKeyPacket();
      return keyPacket && keyPacket.isDecrypted;
    } else if (operation === 'decrypt') {
      keyPacket = options.key.getEncryptionKeyPacket();
      return keyPacket && keyPacket.isDecrypted;
    }
  }

  sync(type, data) {
    var that = this;
    return new Promise((resolve, reject) => {
      var id = mvelo.util.getHash();
      that.ports.syncHandler.postMessage({
        event: 'sync-event',
        type,
        data,
        id
      });
      that.syncDoneHandler[id] = function(err, data) {
        if (timeout) {
          mvelo.util.clearTimeout(timeout);
        }
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      };
      var timeout = mvelo.util.setTimeout(() => {
        delete that.syncDoneHandler[id];
        reject(new Error('Sync timeout'));
      }, that.TIMEOUT * 1000);
    });
  }

  syncDone(data) {
    if (this.syncDoneHandler[data.id]) {
      this.syncDoneHandler[data.id](data.error, data.syncData);
      delete this.syncDoneHandler[data.id];
    }
  }

  upload(uploadObj) {
    return this.sync('upload', uploadObj);
  }

  download(downloadObj) {
    return this.sync('download', downloadObj);
  }

  backup(backupObj) {
    return this.sync('backup', backupObj);
  }

  restore() {
    return this.sync('restore');
  }

  handlePortMessage(msg) {
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
  }
}

export function getByKeyring(keyringId) {
  return sub.getByMainType('syncHandler').filter(obj => obj.keyringId === keyringId)[0];
}

/**
 * @param {Object} options
 * @param {String} options.keyringId identifies the keyring to sync
 * @param {boolean} [options.force] - if newer version on server available force sync
 * @param {Key} [options.key] - unlocked private key used for sync
 * @param {String} [options.password] - password for options.key
 */
export function triggerSync(options) {
  var syncCtrl = getByKeyring(options.keyringId);
  if (syncCtrl) {
    mvelo.util.setTimeout(() => {
      syncCtrl.triggerSync(options);
    }, 20);
  }
}
