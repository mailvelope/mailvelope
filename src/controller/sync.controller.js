/**
 * Copyright (C) 2015-2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import {getUUID} from '../lib/util';
import * as sub from './sub.controller';
import {getById as getKeyringById} from '../modules/keyring';
import {isCached} from '../modules/pwdCache';
import {readMessage, decryptSyncMessage, encryptSyncMessage} from '../modules/pgpModel';
import {equalKey} from '../modules/key';

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
    // register event handlers
    this.on('init', ({keyringId}) => this.init(keyringId));
    this.on('sync-done', this.syncDone);
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
  async triggerSync(options) {
    options = options || {};
    if (this.syncRunning) {
      this.repeatSync = options;
      return;
    }
    this.modified = this.keyring.sync.data.modified;
    const defaultKey = await this.keyring.getDefaultKey();
    if (!defaultKey) {
      return;
    }
    if (!options.key) {
      // if no key provided we take the default key
      options.key = defaultKey;
    } else {
      // check if provided key is default key, otherwise no sync
      if (!equalKey(options.key, defaultKey)) {
        return;
      }
    }
    if (!(options.force || await this.canUnlockKey('decrypt', options))) {
      return;
    }
    this.syncRunning = true;
    // reset modified to detect further modification
    this.keyring.sync.data.modified = false;
    try {
      await this.downloadSyncMessage(options);
      if (this.modified) {
        if (await this.canUnlockKey('sign', options)) {
          await this.uploadSyncMessage(options);
        } else {
          // upload didn't happen, reset modified flag
          this.keyring.sync.data.modified = true;
        }
      }
      await this.keyring.sync.save();
      this.checkRepeat();
    } catch (err) {
      console.log('Sync error', err);
      if (this.modified || this.keyring.sync.data.modified) {
        this.keyring.sync.data.modified = true;
      }
      this.checkRepeat();
    }
  }

  checkRepeat() {
    this.syncRunning = false;
    if (this.repeatSync) {
      const repeat = this.repeatSync;
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
  async downloadSyncMessage(options) {
    const download = await this.download({eTag: this.keyring.sync.data.eTag});
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
    const message = await readMessage({armoredMessage: download.keyringMsg});
    const encryptionKeyIds = message.getEncryptionKeyIDs();
    let privKey = this.keyring.getPrivateKeyByIds(encryptionKeyIds);
    if (!privKey) {
      throw new Error('No private key found to decrypt the sync message');
    }
    let password;
    if (!equalKey(privKey, options.key)) {
      console.log('Key used for sync packet from server is not default key on client');
      if (!options.force && !await this.canUnlockKey('decrypt', {key: privKey})) {
        throw new Error('Key used for sync packet is locked');
      }
    } else {
      privKey = options.key;
      password = options.password;
    }
    // unlock key if still locked
    this.pwdControl = sub.factory.get('pwdDialog');
    const unlockedKey = await this.pwdControl.unlockKey({
      key: privKey,
      reason: 'PWD_DIALOG_REASON_EDITOR',
      password
    });
    const syncPacket = await decryptSyncMessage(unlockedKey.key, message);
    this.keyring.sync.mute(true);
    await this.keyring.importKeys(syncPacket.keys);
    this.keyring.sync.merge(syncPacket.changeLog);
    // remove keys with change log delete entry
    const removeKeyAsync = this.keyring.sync.getDeleteEntries().map(fingerprint => this.keyring.removeKey(fingerprint, 'public'));
    await Promise.all(removeKeyAsync);
    this.keyring.sync.mute(false);
    // set eTag
    this.keyring.sync.data.eTag = download.eTag;
  }

  async uploadSyncMessage(options) {
    // if key is in cache, specific unlock of sign key packet might be required
    const keyOptions = {
      key: options.key,
      password: options.password,
      reason: 'PWD_DIALOG_REASON_EDITOR'
    };
    this.pwdControl = this.pwdControl || sub.factory.get('pwdDialog');
    const unlockedKey = await this.pwdControl.unlockKey(keyOptions);
    // encrypt keyring sync message
    const armored = await encryptSyncMessage(unlockedKey.key, this.keyring.sync.data.changeLog, this.keyringId);
    // upload
    const {eTag} = await this.upload({eTag: this.keyring.sync.data.eTag, keyringMsg: armored});
    this.keyring.sync.data.eTag = eTag;
  }

  /**
   * Check if key can be unlocked without requesting the password from the user
   * @param  {String} operation - 'decrypt' or 'sign', the operation for which the key is required
   * @param  {Object} options - mandatory
   * @param {openpgp.key.Key} options.key
   * @param {String} [options.password]
   * @return {Boolean} - true if key can be unlocked
   */
  async canUnlockKey(operation, options) {
    if (options.password) {
      // key can always be unlocked with password
      return true;
    }
    const isKeyCached = isCached(options.key.getFingerprint());
    if (isKeyCached) {
      return true;
    }
    try {
      let key;
      if (operation === 'sign') {
        key = await options.key.getSigningKey();
        return key && key.isDecrypted();
      } else if (operation === 'decrypt') {
        key = await options.key.getEncryptionKey();
        return key && key.isDecrypted();
      }
    } catch (e) {
      console.log('No valid key for operation sign or decrypt', e);
      return false;
    }
  }

  sync(type, data) {
    return new Promise((resolve, reject) => {
      const id = getUUID();
      const timeout = setTimeout(() => {
        delete this.syncDoneHandler[id];
        reject(new Error('Sync timeout'));
      }, this.TIMEOUT * 1000);
      this.ports.syncHandler.emit('sync-event', {
        type,
        data,
        id
      });
      this.syncDoneHandler[id] = (err, data) => {
        if (timeout) {
          clearTimeout(timeout);
        }
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      };
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
  const syncCtrl = getByKeyring(options.keyringId);
  if (syncCtrl) {
    setTimeout(() => {
      syncCtrl.triggerSync(options);
    }, 20);
  }
}
