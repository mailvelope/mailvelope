/**
 * Copyright (C) 2015-2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from '../lib/lib-mvelo';
import * as openpgp from 'openpgp';
import {setKeyringAttr, getKeyringAttr} from './keyringManager';
import {mapKeys, mapSubKeys, mapUsers, mapKeyUserIds, getUserId, checkKeyId} from './key';
import {goog} from './closure-library/closure/goog/emailaddress';
const l10n = mvelo.l10n.getMessage;
import * as keyringSync from './keyringSync';
import * as trustKey from './trustKey';
import KeyServer from './keyserver';

const keyServer = new KeyServer();

export default class Keyring {
  constructor(keyringId, pgpKeyring, krSync) {
    this.id = keyringId;
    this.keyring = pgpKeyring;
    this.sync = krSync;
  }

  getKeys() {
    // map keys to UI format
    let keys = this.getPublicKeys().concat(this.getPrivateKeys());
    // sort by key type and name
    keys = keys.sort((a, b) => {
      const compType = a.type.localeCompare(b.type);
      if (compType === 0) {
        return a.name.localeCompare(b.name);
      } else {
        return compType;
      }
    });
    return keys;
  }

  getPublicKeys() {
    return mapKeys(this.keyring.publicKeys.keys);
  }

  getPrivateKeys() {
    return mapKeys(this.keyring.privateKeys.keys);
  }

  hasPrivateKey() {
    return Boolean(this.keyring.privateKeys.keys.length);
  }

  getValidSigningKeys() {
    return mapKeys(this.keyring.privateKeys.keys.filter(key => this.validatePrimaryKey(key)))
    .sort((a, b) => a.name.localeCompare(b.name));
  }

  getKeyDetails(fingerprint) {
    const details = {};
    fingerprint = fingerprint.toLowerCase();
    const keys = this.keyring.getKeysForId(fingerprint);
    if (keys) {
      const key = keys[0];
      // subkeys
      mapSubKeys(key.subKeys, details);
      // users
      mapUsers(key.users, details, this.keyring, key.primaryKey);
      // key is valid primary key
      details.validPrimaryKey = this.validatePrimaryKey(key);
      return details;
    } else {
      throw new Error('Key with this fingerprint not found: ', fingerprint);
    }
  }

  /**
   * Get user id, email and name for all keys
   * @param {Object} [options]
   * @param {Boolean} [options.allUsers] return separate entry for all user ids of key
   * @return {Array<Object>} list of key meta data objects
   */
  getKeyUserIDs(options) {
    options = options || {};
    let result = [];
    this.keyring.getAllKeys().forEach(key => {
      if (key.verifyPrimaryKey() !== openpgp.enums.keyStatus.valid ||
          trustKey.isKeyPseudoRevoked(this.id, key)) {
        return;
      }
      let user;
      const keyid = key.primaryKey.getKeyId().toHex();
      if (options.allUsers) {
        // consider all user ids of key
        const users = [];
        key.users.forEach(keyUser => {
          if (keyUser.userId && keyUser.verify(key.primaryKey) === openpgp.enums.keyStatus.valid) {
            user = {};
            user.keyid = keyid;
            user.userid = keyUser.userId.userid;
            // check for duplicates
            if (users.some(existingUser => existingUser.userid === user.userid)) {
              return;
            }
            mapKeyUserIds(user);
            // check for valid email address
            if (!user.email) {
              return;
            }
            users.push(user);
          }
        });
        result = result.concat(users);
      } else {
        // only consider primary user
        user = {};
        user.keyid = keyid;
        user.userid = getUserId(key);
        mapKeyUserIds(user);
        result.push(user);
      }
    });
    // sort by user id
    result = result.sort((a, b) => a.userid.localeCompare(b.userid));
    return result;
  }

  getKeyIdByAddress(emailAddr, options) {
    const addressMap = this.getKeyByAddress(emailAddr, options);
    for (const address in addressMap) {
      addressMap[address] = addressMap[address] && addressMap[address].map(key => {
        if (options.fingerprint) {
          return key.primaryKey.getFingerprint();
        }
        return key.primaryKey.getKeyId().toHex();
      });
    }
    return addressMap;
  }

  getKeyByAddress(emailAddr, options) {
    if (typeof options.pub === 'undefined') {
      options.pub = true;
    }
    if (typeof options.priv === 'undefined') {
      options.priv = true;
    }
    const result = Object.create(null);
    emailAddr.forEach(emailAddr => {
      result[emailAddr] = [];
      if (options.pub) {
        result[emailAddr] = result[emailAddr].concat(this.keyring.publicKeys.getForAddress(emailAddr));
      }
      if (options.priv) {
        result[emailAddr] = result[emailAddr].concat(this.keyring.privateKeys.getForAddress(emailAddr));
      }
      result[emailAddr] = result[emailAddr].filter(key => {
        if (options.validity && (
          key.verifyPrimaryKey() !== openpgp.enums.keyStatus.valid ||
            key.getEncryptionKeyPacket() === null) ||
            trustKey.isKeyPseudoRevoked(this.id, key)) {
          return;
        }
        return true;
      });
      if (!result[emailAddr].length) {
        result[emailAddr] = false;
      } else if (options.sort) {
        // sort by key creation date and primary key status
        let primaryKeyId = this.getAttributes().primary_key;
        result[emailAddr].sort((a, b) => {
          if (primaryKeyId) {
            primaryKeyId = primaryKeyId.toLowerCase();
            if (primaryKeyId === a.primaryKey.getKeyId().toHex()) {
              return -1;
            }
            if (primaryKeyId === b.primaryKey.getKeyId().toHex()) {
              return 1;
            }
          }
          return b.primaryKey.created - a.primaryKey.created;
        });
      }
    });
    return result;
  }

  getArmoredKeys(keyids, options) {
    const result = [];
    let keys = null;
    if (options.all) {
      keys = this.keyring.getAllKeys();
    } else {
      keys = keyids.map(keyid => {
        keyid = keyid.toLowerCase();
        return this.keyring.getKeysForId(keyid)[0];
      });
    }
    keys.forEach(key => {
      const armored = {};
      if (options.pub) {
        armored.armoredPublic = key.toPublic().armor();
      }
      if (options.priv && key.isPrivate()) {
        armored.armoredPrivate = key.armor();
      }
      result.push(armored);
    });
    return result;
  }

  hasPrimaryKey() {
    return this.getAttributes().primary_key ? true : false;
  }

  getPrimaryKey() {
    let primaryKey;
    const primaryKeyid = this.getAttributes().primary_key;
    if (primaryKeyid) {
      primaryKey = this.keyring.privateKeys.getForId(primaryKeyid.toLowerCase());
      if (!(primaryKey && this.validatePrimaryKey(primaryKey))) {
        // primary key with this id does not exist or is invalid
        setKeyringAttr(this.id, {primary_key: ''}); // clear primary key
        primaryKey = null;
      }
    }
    if (!primaryKey) {
      // get newest private key that is valid
      this.keyring.privateKeys.keys.forEach(key => {
        if ((!primaryKey || primaryKey.primaryKey.created < key.primaryKey.created) &&
            this.validatePrimaryKey(key)) {
          primaryKey = key;
        }
      });
    }
    if (!primaryKey) {
      return null;
    }
    return {
      key: primaryKey,
      keyid: primaryKey.primaryKey.getKeyId().toHex(),
      userid: getUserId(primaryKey)
    };
  }

  validatePrimaryKey(primaryKey) {
    return primaryKey.verifyPrimaryKey() === openpgp.enums.keyStatus.valid &&
           primaryKey.getEncryptionKeyPacket() &&
           primaryKey.getSigningKeyPacket() &&
           !trustKey.isKeyPseudoRevoked(this.id, primaryKey);
  }

  async importKeys(armoredKeys) {
    let result = [];
    // sort, public keys first
    armoredKeys = armoredKeys.sort((a, b) => b.type.localeCompare(a.type));
    // import
    armoredKeys.forEach(key => {
      try {
        if (key.type === 'public') {
          result = result.concat(this.importPublicKey(key.armored, this.keyring));
        } else if (key.type === 'private') {
          result = result.concat(this.importPrivateKey(key.armored, this.keyring));
        }
      } catch (e) {
        result.push({
          type: 'error',
          message: l10n('key_import_unable', [e])
        });
      }
    });
    // exit if no import succeeded
    if (!result.some(message => message.type === 'success')) {
      return result;
    }
    await this.keyring.store();
    await this.sync.commit();
    // by no primary key in the keyring set the first found private keys as primary for the keyring
    if (!this.hasPrimaryKey() && this.keyring.privateKeys.keys.length > 0) {
      await setKeyringAttr(this.id, {primary_key: this.keyring.privateKeys.keys[0].primaryKey.keyid.toHex().toUpperCase()});
    }
    return result;
  }

  importPublicKey(armored) {
    const result = [];
    const imported = openpgp.key.readArmored(armored);
    if (imported.err) {
      imported.err.forEach(error => {
        console.log('Error on key.readArmored', error);
        result.push({
          type: 'error',
          message: l10n('key_import_public_read', [error.message])
        });
      });
    }
    imported.keys.forEach(pubKey => {
      // check for existing keys
      checkKeyId(pubKey, this.keyring);
      const fingerprint = pubKey.primaryKey.getFingerprint();
      let key = this.keyring.getKeysForId(fingerprint);
      const keyid = pubKey.primaryKey.getKeyId().toHex().toUpperCase();
      if (key) {
        key = key[0];
        key.update(pubKey);
        result.push({
          type: 'success',
          message: l10n('key_import_public_update', [keyid, getUserId(pubKey)])
        });
        this.sync.add(fingerprint, keyringSync.UPDATE);
      } else {
        this.keyring.publicKeys.push(pubKey);
        result.push({
          type: 'success',
          message: l10n('key_import_public_success', [keyid, getUserId(pubKey)])
        });
        this.sync.add(fingerprint, keyringSync.INSERT);
      }
    });
    return result;
  }

  importPrivateKey(armored) {
    const result = [];
    const imported = openpgp.key.readArmored(armored);
    if (imported.err) {
      imported.err.forEach(error => {
        console.log('Error on key.readArmored', error);
        result.push({
          type: 'error',
          message: l10n('key_import_private_read', [error.message])
        });
      });
    }
    imported.keys.forEach(privKey => {
      // check for existing keys
      checkKeyId(privKey, this.keyring);
      const fingerprint = privKey.primaryKey.getFingerprint();
      let key = this.keyring.getKeysForId(fingerprint);
      const keyid = privKey.primaryKey.getKeyId().toHex().toUpperCase();
      if (key) {
        key = key[0];
        if (key.isPublic()) {
          privKey.update(key);
          this.keyring.publicKeys.removeForId(fingerprint);
          this.keyring.privateKeys.push(privKey);
          result.push({
            type: 'success',
            message: l10n('key_import_private_exists', [keyid, getUserId(privKey)])
          });
          this.sync.add(fingerprint, keyringSync.UPDATE);
        } else {
          key.update(privKey);
          result.push({
            type: 'success',
            message: l10n('key_import_private_update', [keyid, getUserId(privKey)])
          });
          this.sync.add(fingerprint, keyringSync.UPDATE);
        }
      } else {
        this.keyring.privateKeys.push(privKey);
        result.push({
          type: 'success',
          message: l10n('key_import_private_success', [keyid, getUserId(privKey)])
        });
        this.sync.add(fingerprint, keyringSync.INSERT);
      }
    });
    return result;
  }

  async removeKey(fingerprint, type) {
    let removedKey;
    fingerprint = fingerprint.toLowerCase();
    if (type === 'public') {
      removedKey = this.keyring.publicKeys.removeForId(fingerprint);
    } else if (type === 'private') {
      removedKey = this.keyring.privateKeys.removeForId(fingerprint);
    }
    if (!removedKey) {
      // key not found
      return;
    }
    if (type === 'private') {
      const primaryKey = this.getAttributes().primary_key;
      // Remove the key from the keyring attributes if primary
      if (primaryKey && primaryKey.toLowerCase() === removedKey.primaryKey.keyid.toHex()) {
        await setKeyringAttr(this.id, {primary_key: ''});
      }
    }
    this.sync.add(removedKey.primaryKey.getFingerprint(), keyringSync.DELETE);
    await this.keyring.store();
    await this.sync.commit();
  }

  /**
   * Generate a new PGP keypair and optionally upload the public key to the
   * key server.
   * @param {number}  options.numBits           The keysize in bits
   * @param {Array}   options.userIds           Email addresses and names
   * @param {string}  options.passphrase        To protect the private key on disk
   * @param {boolean} options.uploadPublicKey   If upload to key server is desired
   * @param {Number}  options.keyExpirationTime The number of seconds after the key creation time that the key expires
   * @param {Boolean} options.unlocked          Returned secret part of the generated key is unlocked
   * @yield {Object}                            The generated key pair
   */
  async generateKey({numBits, userIds, passphrase, uploadPublicKey, keyExpirationTime, unlocked = false}) {
    userIds = userIds.map(userId => {
      if (userId.fullName) {
        return (new goog.format.EmailAddress(userId.email, userId.fullName)).toString();
      } else {
        return `<${userId.email}>`;
      }
    });
    const newKey = await openpgp.generateKey({userIds, passphrase, numBits: parseInt(numBits), keyExpirationTime, unlocked});
    this.keyring.privateKeys.push(newKey.key);
    this.sync.add(newKey.key.primaryKey.getFingerprint(), keyringSync.INSERT);
    await this.keyring.store();
    await this.sync.commit();
    // by no primary key in the keyring set the generated key as primary
    if (!this.hasPrimaryKey()) {
      await setKeyringAttr(this.id, {primary_key: newKey.key.primaryKey.keyid.toHex().toUpperCase()});
    }
    // upload public key
    if (uploadPublicKey) {
      await keyServer.upload({publicKeyArmored: newKey.publicKeyArmored});
    }
    return newKey;
  }

  getKeyForSigning(keyIdHex) {
    const key = this.keyring.privateKeys.getForId(keyIdHex);
    if (!key) {
      return null;
    }
    return {
      key,
      keyid: key.primaryKey.getKeyId().toHex(),
      userid: getUserId(key)
    };
  }

  getAttributes() {
    return getKeyringAttr(this.id);
  }
}
