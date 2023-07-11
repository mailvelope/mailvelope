/**
 * Copyright (C) 2018 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import {filterAsync, toArray, MvError} from '../lib/util';
import {getKeyringAttr} from './keyring';
import {mapKeys, mapSubKeys, mapUsers, parseUserId, getUserInfo, isValidEncryptionKey, sortKeysByCreationDate, verifyForAddress, verifyPrimaryKey, verifyUser} from './key';
import * as trustKey from './trustKey';
import {upload as mveloKeyServerUpload} from './mveloKeyServer';
import {KEY_STATUS} from '../lib/constants';

export default class KeyringBase {
  constructor(keyringId, keyStore) {
    this.id = keyringId;
    this.keystore = keyStore;
  }

  async getKeys() {
    const keys = [];
    // map keys to UI format
    keys.push(...await this.getPublicKeys());
    keys.push(...await this.getPrivateKeys());
    // sort by key type and name
    keys.sort((a, b) => {
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

  /**
   * Check if keyring has any private key or specific private keys by keyId
   * @param  {Array<openpgp.Keyid|String>}  keyIds or fingerprints
   * @return {Boolean}
   */
  hasPrivateKey(keyIds) {
    if (!keyIds) {
      return Boolean(this.keystore.privateKeys.keys.length);
    }
    return keyIds.some(keyId => this.keystore.privateKeys.getForId(typeof keyId === 'string' ? keyId : keyId.toHex(), true));
  }

  async getValidSigningKeys() {
    let signingKeys = await filterAsync(this.keystore.privateKeys.keys, key => this.validateDefaultKey(key));
    signingKeys = await mapKeys(signingKeys);
    signingKeys.sort((a, b) => a.name.localeCompare(b.name));
    return signingKeys;
  }

  async getKeyDetails(fingerprint) {
    const details = {};
    const keys = this.keystore.getKeysForId(fingerprint);
    if (keys) {
      const key = keys[0];
      // subkeys
      await mapSubKeys(key.subkeys, details, key);
      // users
      await mapUsers(key.users, details, this.keystore, key);
      // key is valid default key
      details.validDefaultKey = await this.validateDefaultKey(key);
      return details;
    } else {
      throw new Error('Key with this fingerprint not found: ', fingerprint);
    }
  }

  /**
   * Get the following data for all keys: user id, key id, fingerprint, email and name
   * @param {Boolean} [options.allUsers] return separate entry for all user ids of key
   * @return {Array<Object>} list of key meta data objects in the form {key, keyId, fingerprint, users}
   */
  async getKeyData(options = {}) {
    const result = [];
    for (const key of this.keystore.getAllKeys()) {
      try {
        if (await verifyPrimaryKey(key) !== KEY_STATUS.valid ||
            await trustKey.isKeyPseudoRevoked(this.id, key)) {
          continue;
        }
        const keyData = {};
        keyData.key = key;
        keyData.keyId = key.getKeyID().toHex().toUpperCase();
        keyData.fingerprint = key.getFingerprint();
        if (options.allUsers) {
          // consider all user ids of key
          keyData.users = [];
          for (const keyUser of key.users) {
            if (keyUser.userID && await verifyUser(keyUser) === KEY_STATUS.valid) {
              const {userID: userId, name, email} = keyUser.userID;
              const user = {userId, name, email};
              parseUserId(user);
              // check for valid email address
              if (!user.email) {
                continue;
              }
              // check for duplicates
              if (keyData.users.some(existingUser => existingUser.userId === user.userId)) {
                continue;
              }
              keyData.users.push(user);
            }
          }
        } else {
          // only consider primary user
          const user = await getUserInfo(key, {strict: true});
          if (!user) {
            continue;
          }
          keyData.users = [user];
        }
        result.push(keyData);
      } catch (e) {
        console.log(`Error in KeyringBase.getKeyData for key ${key.getFingerprint()}.`, e);
      }
    }
    return result;
  }

  /**
   * Query keys by email address
   * @param  {Array<String>|String} emailAddr
   * @param  {Boolean} [options.pub = true] - query for public keys
   * @param  {Bolean} [options.priv = true] - query for private keys
   * @param  {Boolean} [options.sort = false] - sort results by key creation date and default key status
   * @param  {Boolean} [options.validForEncrypt = true] - result keys are valid for encryption operations
   * @param  {openpgp.Keyid} [options.keyId] - filter result by key Id
   * @param  {Boolean} [options.verifyUser = true] - verify user IDs
   * @return {Object} - map in the form {address: [key1, key2, ..]}
   */
  async getKeyByAddress(emailAddr, {pub = true, priv = true, sort = false, validForEncrypt = true, keyId, verifyUser = true} = {}) {
    const result = Object.create(null);
    const emailArray = toArray(emailAddr);
    for (const email of emailArray) {
      result[email] = [];
      let keys = [];
      if (pub) {
        keys = keys.concat(this.keystore.publicKeys.getForAddress(email));
      }
      if (priv) {
        keys = keys.concat(this.keystore.privateKeys.getForAddress(email));
      }
      if (validForEncrypt) {
        keys = await filterAsync(keys, key => isValidEncryptionKey(key, this.id));
      }
      if (verifyUser) {
        keys = await filterAsync(keys, key => verifyForAddress(key, email));
      }
      if (keyId) {
        keys = keys.filter(key => key.getKeys(keyId).length);
      }
      if (!keys.length) {
        result[email] = false;
        continue;
      }
      if (sort) {
        // sort by key creation date and default key status
        const defaultKeyFpr = await this.getDefaultKeyFpr();
        sortKeysByCreationDate(keys, defaultKeyFpr);
      }
      result[email] = keys;
    }
    return result;
  }

  /**
   * Get armored keys by fingerprints
   * @param  {Array<String>|String} keyFprs
   * @param  {Boolean} options.all - return all keys in the keyring
   * @param  {Boolean} options.pub - return all keys as public armored
   * @param  {Boolean} options.pub - return all private keys as private armored
   * @return {Array<Strin>}
   */
  getArmoredKeys(keyFprs, options) {
    const result = [];
    keyFprs = toArray(keyFprs);
    let keys = null;
    if (options.all) {
      keys = this.keystore.getAllKeys();
    } else {
      keys = keyFprs.map(keyFpr => this.keystore.getKeysForId(keyFpr)[0]);
    }
    for (const key of keys) {
      const armored = {};
      if (options.pub) {
        armored.armoredPublic = key.toPublic().armor();
      }
      if (options.priv && key.isPrivate()) {
        armored.armoredPrivate = key.armor();
      }
      result.push(armored);
    }
    return result;
  }

  async hasDefaultKey() {
    return Boolean(await this.keystore.getDefaultKeyFpr());
  }

  setDefaultKey(fpr) {
    return this.keystore.setDefaultKey(fpr);
  }

  async validateDefaultKey(defaultKey) {
    try {
      return await defaultKey.getEncryptionKey() &&
             await defaultKey.getSigningKey() &&
             !await trustKey.isKeyPseudoRevoked(this.id, defaultKey);
    } catch (e) {
      return false;
    }
  }

  getPrivateKeyByFpr(keyFpr) {
    return this.keystore.privateKeys.getForId(keyFpr);
  }

  /**
   * Return first private key that matches keyIds
   * @param  {Array<openpgp.Keyid|String>|openpgp.Keyid|String} keyIds - keyIds or fingerprints
   * @return {openpgp.key.Key|null}
   */
  getPrivateKeyByIds(keyIds) {
    keyIds = toArray(keyIds);
    for (const keyId of keyIds) {
      const keyIdHex = typeof keyId === 'string' ? keyId : keyId.toHex();
      const key = this.keystore.privateKeys.getForId(keyIdHex, true);
      if (key) {
        return key;
      }
    }
    return null;
  }

  /**
   * Get keys by fingerprints
   * @param  {Array<String>} keyFprs
   * @param  {Boolean} deep
   * @return {Array<openpgp.key.Key>}
   */
  getKeysByFprs(keyFprs, deep) {
    return keyFprs.map(keyFpr => {
      const keyArray = this.keystore.getKeysForId(keyFpr, deep);
      if (keyArray) {
        return keyArray[0];
      }
      throw new MvError(`No key found for ID ${keyFpr}`, 'NO_KEY_FOUND_FOR_ENCRYPTION');
    });
  }

  /**
   * Find key or sub key packet by keyId and return fingerprint
   * @param  {String} keyId
   * @return {String}
   */
  getFprForKeyId(keyId) {
    const keyArray = this.keystore.getKeysForId(keyId, true);
    if (!keyArray) {
      throw new MvError(`No key found for ID ${keyId}`, 'NO_KEY_FOUND_FOR_ID');
    }
    if (keyArray.length > 1) {
      throw new MvError(`Collision of long key ID ${keyId}, more than one key found in keyring`, 'LONG_KEY_ID_COLLISION');
    }
    const key = keyArray[0];
    const [{keyPacket}] = key.getKeys(key.keyPacket.keyID.constructor.fromID(keyId));
    return keyPacket.getFingerprint();
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
    return removedKey;
  }

  addKey(key) {
    if (key.isPrivate()) {
      this.keystore.privateKeys.push(key);
    } else {
      this.keystore.publicKeys.push(key);
    }
    return key;
  }

  /**
   * Generate a new PGP keypair and optionally upload the public key to the
   * key server.
   * @param {String} options.keyAlgo - public-key crypto algorithm of the key
   * @param {number} options.numBits - the keysize in bits
   * @param {Array} options.userIds - email addresses and names
   * @param {string} options.passphrase - to protect the private key on disk
   * @param {boolean} options.uploadPublicKey - if upload to key server is desired
   * @param {Number} options.keyExpirationTime - the number of seconds after the key creation time that the key expires
   * @param {Boolean} options.unlocked - returned secret part of the generated key is unlocked
   * @yield {Object} - the generated key pair
   */
  async generateKey({keyAlgo, numBits, userIds, passphrase, uploadPublicKey, keyExpirationTime}) {
    userIds = userIds.map(userId => ({name: userId.fullName, email: userId.email}));
    const newKey = await this.keystore.generateKey({keyAlgo, userIds, passphrase, numBits: parseInt(numBits), keyExpirationTime});
    this.keystore.privateKeys.push(newKey.privateKey);
    // upload public key
    // currently only the Mailvelope key server is supported but Web Key Directory
    // publishing could also happen at this point.
    if (uploadPublicKey) {
      await mveloKeyServerUpload({publicKeyArmored: newKey.publicKey.armor()});
    }
    return newKey;
  }
}
