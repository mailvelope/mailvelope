/**
 * Copyright (C) 2018 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import * as openpgp from 'openpgp';
import {goog} from './closure-library/closure/goog/emailaddress';
import {setKeyringAttr, getKeyringAttr} from './keyring';
import {mapKeys, mapSubKeys, mapUsers, mapKeyUserIds, getUserId} from './key';
import * as trustKey from './trustKey';
import KeyServer from './keyserver';

const keyServer = new KeyServer();

export default class KeyringBase {
  constructor(keyringId, keyStore) {
    this.id = keyringId;
    this.keystore = keyStore;
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
    return mapKeys(this.keystore.publicKeys.keys);
  }

  getPrivateKeys() {
    return mapKeys(this.keystore.privateKeys.keys);
  }

  hasPrivateKey() {
    return Boolean(this.keystore.privateKeys.keys.length);
  }

  getValidSigningKeys() {
    return mapKeys(this.keystore.privateKeys.keys.filter(key => this.validatePrimaryKey(key)))
    .sort((a, b) => a.name.localeCompare(b.name));
  }

  getKeyDetails(fingerprint) {
    const details = {};
    fingerprint = fingerprint.toLowerCase();
    const keys = this.keystore.getKeysForId(fingerprint);
    if (keys) {
      const key = keys[0];
      // subkeys
      mapSubKeys(key.subKeys, details);
      // users
      mapUsers(key.users, details, this.keystore, key.primaryKey);
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
    this.keystore.getAllKeys().forEach(key => {
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
        result[emailAddr] = result[emailAddr].concat(this.keystore.publicKeys.getForAddress(emailAddr));
      }
      if (options.priv) {
        result[emailAddr] = result[emailAddr].concat(this.keystore.privateKeys.getForAddress(emailAddr));
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
      keys = this.keystore.getAllKeys();
    } else {
      keys = keyids.map(keyid => {
        keyid = keyid.toLowerCase();
        return this.keystore.getKeysForId(keyid)[0];
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
      primaryKey = this.keystore.privateKeys.getForId(primaryKeyid.toLowerCase());
      if (!(primaryKey && this.validatePrimaryKey(primaryKey))) {
        // primary key with this id does not exist or is invalid
        setKeyringAttr(this.id, {primary_key: ''}); // clear primary key
        primaryKey = null;
      }
    }
    if (!primaryKey) {
      // get newest private key that is valid
      this.keystore.privateKeys.keys.forEach(key => {
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

  getKeyForSigning(keyIdHex) {
    const key = this.keystore.privateKeys.getForId(keyIdHex);
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

  removeKey(fingerprint, type) {
    let removedKey;
    if (type === 'public') {
      removedKey = this.keystore.publicKeys.removeForId(fingerprint);
    } else if (type === 'private') {
      removedKey = this.keystore.privateKeys.removeForId(fingerprint);
    }
    if (!removedKey) {
      throw new Error('removeKey: key not found');
    }
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
    const newKey = await this.keystore.generateKey({userIds, passphrase, numBits: parseInt(numBits), keyExpirationTime, unlocked});
    this.keystore.privateKeys.push(newKey.key);
    // upload public key
    if (uploadPublicKey) {
      await keyServer.upload({publicKeyArmored: newKey.publicKeyArmored});
    }
    return newKey;
  }
}
