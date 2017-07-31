/**
 * Copyright (C) 2015-2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

'use strict';


import mvelo from 'lib-mvelo';
import openpgp from 'openpgp';
import {goog} from './closure-library/closure/goog/emailaddress';
import * as prefs from './prefs';
import * as keyringStore from './keyringStore';
const l10n = mvelo.l10n.get;
import * as keyringSync from './keyringSync';
import * as trustKey from './trustKey';
import KeyServer from './keyserver';

const keyServer = new KeyServer(mvelo);
const keyringMap = new Map();
let keyringAttr = null;

export function init() {
  return getAllKeyringAttr()
  .then(attributes => {
    keyringAttr = attributes;
    if (keyringAttr && keyringAttr[mvelo.LOCAL_KEYRING_ID]) {
      let createKeyringAsync = [];
      for (let keyringId in keyringAttr) {
        if (keyringAttr.hasOwnProperty(keyringId)) {
          createKeyringAsync.push(
            _getKeyring(keyringId).then(keyRng => keyringMap.set(keyringId, keyRng))
          );
        }
      }
      return Promise.all(createKeyringAsync);
    } else {
      return createKeyring(mvelo.LOCAL_KEYRING_ID)
      .then(() => {
        // migrate primary_key attribute
        if (prefs.data().general.primary_key) {
          return setKeyringAttr(mvelo.LOCAL_KEYRING_ID, {primary_key: prefs.data().general.primary_key});
        }
      });
    }
  });
}

export function createKeyring(keyringId, options) {
  return Promise.resolve()
  .then(() => {
    // init keyring attributes
    if (!keyringAttr) {
      keyringAttr = {};
    }
    if (keyringAttr[keyringId]) {
      var error = new Error('Keyring for id ' + keyringId + ' already exists.');
      error.code = 'KEYRING_ALREADY_EXISTS';
      throw error;
    }
    keyringAttr[keyringId] = {};
  })
  // instantiate keyring
  .then(() => _getKeyring(keyringId))
  .then(keyRng => {
    keyringMap.set(keyringId, keyRng);
    return setKeyringAttr(keyringId, {} || options)
    .then(() => keyRng);
  });
}

/**
 * Instantiate a new keyring object
 * @param  {String} keyringId
 * @return {Promise<Keyring>}
 */
function _getKeyring(keyringId) {
  // resolve keyring dependencies
  return keyringStore.createKeyringStore(keyringId)
  .then(krStore => {
    const krSync = new keyringSync.KeyringSync(keyringId);
    // instantiate keyring
    return new Keyring(keyringId, krStore, krSync);
  });
}

export function deleteKeyring(keyringId) {
  return Promise.resolve()
  .then(() => {
    if (!keyringAttr[keyringId]) {
      var error = new Error('Keyring for id ' + keyringId + ' does not exist.');
      error.code = 'NO_KEYRING_FOR_ID';
      throw error;
    }
    var keyRng = keyringMap.get(keyringId);
    keyRng.keyring.clear();
    return keyRng.keyring.storeHandler.remove();
  })
  .then(() => {
    keyringMap.delete(keyringId);
    delete keyringAttr[keyringId];
    return mvelo.storage.set('mvelo.keyring.attributes', keyringAttr);
  })
}

export function getById(keyringId) {
  var keyring = keyringMap.get(keyringId);
  if (keyring) {
    return keyring;
  } else {
    var error = new Error('No keyring found for this identifier.');
    error.code = 'NO_KEYRING_FOR_ID';
    throw error;
  }
}

export function getAll() {
  var result = [];
  for (var keyringId in keyringAttr) {
    if (keyringAttr.hasOwnProperty(keyringId)) {
      result.push(keyringMap.get(keyringId));
    }
  }
  return result;
}

export function getAllKeyringAttr() {
  return mvelo.storage.get('mvelo.keyring.attributes');
}

export function setKeyringAttr(keyringId, attr) {
  return Promise.resolve()
  .then(() => {
    if (!keyringAttr[keyringId]) {
      throw new Error('Keyring does not exist for id: ' + keyringId);
    }
    mvelo.util.extend(keyringAttr[keyringId], attr);
    return mvelo.storage.set('mvelo.keyring.attributes', keyringAttr);
  });
}

export function getKeyringAttr(keyringId, attr) {
  if (!keyringAttr[keyringId]) {
    throw new Error('Keyring does not exist for id: ' + keyringId);
  }
  return keyringAttr[keyringId][attr];
}

/**
 * Get primary or first available user id of key
 * @param  {openpgp.Key} key
 * @param  {Boolean} [validityCheck=true] - only return valid user ids, e.g. for expired keys you would want to set to false to still get a result
 * @return {String} user id
 */
export function getUserId(key, validityCheck) {
  validityCheck = typeof validityCheck === 'undefined' ? true : false;
  var primaryUser = key.getPrimaryUser();
  if (primaryUser) {
    return primaryUser.user.userId.userid;
  } else {
    // there is no valid user id on this key
    if (!validityCheck) {
      // take first available user ID
      for (var i = 0; i < key.users.length; i++) {
        if (key.users[i].userId) {
          return key.users[i].userId.userid;
        }
      }
    }
    return l10n('keygrid_invalid_userid');
  }
}

export function getAllKeyUserId() {
  var allKeyrings = getAll();
  var result = [];
  allKeyrings.forEach(function(keyring) {
    result = result.concat(keyring.getKeyUserIDs().map(function(key) {
      key.keyringId = keyring.id;
      return key;
    }));
  });
  // remove duplicate keys
  result = mvelo.util.sortAndDeDup(result, function(a, b) {
    return a.keyid.localeCompare(b.keyid);
  });
  // sort by name
  result = result.sort(function(a, b) {
    return a.name.localeCompare(b.name);
  });
  return result;
}

export function readKey(armored) {
  var parsedKey = openpgp.key.readArmored(armored);
  if (parsedKey.err) {
    return parsedKey;
  }
  parsedKey.keys = mapKeys(parsedKey.keys);
  return parsedKey;
}

export function cloneKey(key) {
  var binary = key.toPacketlist().write();
  var packetList = new openpgp.packet.List();
  packetList.read(binary);
  return new openpgp.key.Key(packetList);
}

export class Keyring {
  constructor(keyringId, pgpKeyring, krSync) {
    this.id = keyringId;
    this.keyring = pgpKeyring;
    this.sync = krSync;
  }

  getKeys() {
    // map keys to UI format
    var keys = this.getPublicKeys().concat(this.getPrivateKeys());
    // sort by key type and name
    keys = keys.sort(function(a, b) {
      var compType = a.type.localeCompare(b.type);
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
    var details = {};
    fingerprint = fingerprint.toLowerCase();
    var keys = this.keyring.getKeysForId(fingerprint);
    if (keys) {
      var key = keys[0];
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
    var that = this;
    options = options || {};
    var result = [];
    this.keyring.getAllKeys().forEach(function(key) {
      if (key.verifyPrimaryKey() !== openpgp.enums.keyStatus.valid ||
          trustKey.isKeyPseudoRevoked(that.id, key)) {
        return;
      }
      var user;
      var keyid = key.primaryKey.getKeyId().toHex();
      if (options.allUsers) {
        // consider all user ids of key
        var users = [];
        key.users.forEach(function(keyUser) {
          if (keyUser.userId && keyUser.verify(key.primaryKey) === openpgp.enums.keyStatus.valid) {
            user = {};
            user.keyid = keyid;
            user.userid = keyUser.userId.userid;
            // check for duplicates
            if (users.some(function(existingUser) {
              return existingUser.userid === user.userid;
            })) {
              return;
            }
            that._mapKeyUserIds(user);
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
        that._mapKeyUserIds(user);
        result.push(user);
      }
    });
    // sort by user id
    result = result.sort(function(a, b) {
      return a.userid.localeCompare(b.userid);
    });
    return result;
  }

  _mapKeyUserIds(user) {
    try {
      var emailAddress = goog.format.EmailAddress.parse(user.userid);
      if (emailAddress.isValid()) {
        user.email = emailAddress.getAddress();
      } else {
        user.email = '';
      }
      user.name = emailAddress.getName();
    } catch (e) {
      user.userid = l10n('keygrid_invalid_userid');
      user.email = '';
      user.name = '';
    }
  }

  getKeyIdByAddress(emailAddr, options) {
    var addressMap = this.getKeyByAddress(emailAddr, options);
    for (var address in addressMap) {
      addressMap[address] = addressMap[address] && addressMap[address].map(function(key) {
        if (options.fingerprint) {
          return key.primaryKey.getFingerprint();
        }
        return key.primaryKey.getKeyId().toHex();
      });
    }
    return addressMap;
  }

  getKeyByAddress(emailAddr, options) {
    var that = this;
    if (typeof options.pub === 'undefined') {
      options.pub = true;
    }
    if (typeof options.priv === 'undefined') {
      options.priv = true;
    }
    var result = Object.create(null);
    emailAddr.forEach(function(emailAddr) {
      result[emailAddr] = [];
      if (options.pub) {
        result[emailAddr] = result[emailAddr].concat(that.keyring.publicKeys.getForAddress(emailAddr));
      }
      if (options.priv) {
        result[emailAddr] = result[emailAddr].concat(that.keyring.privateKeys.getForAddress(emailAddr));
      }
      result[emailAddr] = result[emailAddr].filter(function(key) {
        if (options.validity && (
            key.verifyPrimaryKey() !== openpgp.enums.keyStatus.valid ||
            key.getEncryptionKeyPacket() === null) ||
            trustKey.isKeyPseudoRevoked(that.id, key)) {
          return;
        }
        return true;
      });
      if (!result[emailAddr].length) {
        result[emailAddr] = false;
      } else if (options.sort) {
        // sort by key creation date and primary key status
        var primaryKeyId = that.getAttributes().primary_key;
        result[emailAddr].sort(function(a, b) {
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
    var that = this;
    var result = [];
    var keys = null;
    if (options.all) {
      keys = this.keyring.getAllKeys();
    } else {
      keys = keyids.map(function(keyid) {
        keyid = keyid.toLowerCase();
        return that.keyring.getKeysForId(keyid)[0];
      });
    }
    keys.forEach(function(key) {
      var armored = {};
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

  importKeys(armoredKeys) {
    var result = [];
    return Promise.resolve()
    .then(() => {
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
        return;
      }
      return this.keyring.store()
      .then(() => this.sync.commit())
      .then(() => {
        // by no primary key in the keyring set the first found private keys as primary for the keyring
        if (!this.hasPrimaryKey() && this.keyring.privateKeys.keys.length > 0) {
          return setKeyringAttr(this.id, {primary_key: this.keyring.privateKeys.keys[0].primaryKey.keyid.toHex().toUpperCase()});
        }
      });
    })
    .then(() => result);
  }

  importPublicKey(armored) {
    var that = this;
    var result = [];
    var imported = openpgp.key.readArmored(armored);
    if (imported.err) {
      imported.err.forEach(function(error) {
        console.log('Error on key.readArmored', error);
        result.push({
          type: 'error',
          message: l10n('key_import_public_read', [error.message])
        });
      });
    }
    imported.keys.forEach(function(pubKey) {
      // check for existing keys
      checkKeyId(pubKey, that.keyring);
      var fingerprint = pubKey.primaryKey.getFingerprint();
      var key = that.keyring.getKeysForId(fingerprint);
      var keyid = pubKey.primaryKey.getKeyId().toHex().toUpperCase();
      if (key) {
        key = key[0];
        key.update(pubKey);
        result.push({
          type: 'success',
          message: l10n('key_import_public_update', [keyid, getUserId(pubKey)])
        });
        that.sync.add(fingerprint, keyringSync.UPDATE);
      } else {
        that.keyring.publicKeys.push(pubKey);
        result.push({
          type: 'success',
          message: l10n('key_import_public_success', [keyid, getUserId(pubKey)])
        });
        that.sync.add(fingerprint, keyringSync.INSERT);
      }
    });
    return result;
  }

  importPrivateKey(armored) {
    var that = this;
    var result = [];
    var imported = openpgp.key.readArmored(armored);
    if (imported.err) {
      imported.err.forEach(function(error) {
        console.log('Error on key.readArmored', error);
        result.push({
          type: 'error',
          message: l10n('key_import_private_read', [error.message])
        });
      });
    }
    imported.keys.forEach(function(privKey) {
      // check for existing keys
      checkKeyId(privKey, that.keyring);
      var fingerprint = privKey.primaryKey.getFingerprint();
      var key = that.keyring.getKeysForId(fingerprint);
      var keyid = privKey.primaryKey.getKeyId().toHex().toUpperCase();
      if (key) {
        key = key[0];
        if (key.isPublic()) {
          privKey.update(key);
          that.keyring.publicKeys.removeForId(fingerprint);
          that.keyring.privateKeys.push(privKey);
          result.push({
            type: 'success',
            message: l10n('key_import_private_exists', [keyid, getUserId(privKey)])
          });
          that.sync.add(fingerprint, keyringSync.UPDATE);
        } else {
          key.update(privKey);
          result.push({
            type: 'success',
            message: l10n('key_import_private_update', [keyid, getUserId(privKey)])
          });
          that.sync.add(fingerprint, keyringSync.UPDATE);
        }
      } else {
        that.keyring.privateKeys.push(privKey);
        result.push({
          type: 'success',
          message: l10n('key_import_private_success', [keyid, getUserId(privKey)])
        });
        that.sync.add(fingerprint, keyringSync.INSERT);
      }
    });
    return result;
  }

  removeKey(fingerprint, type) {
    let removedKey;
    return Promise.resolve()
    .then(() => {
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
      return Promise.resolve()
      .then(() => {
        if (type === 'private') {
          const primaryKey = this.getAttributes().primary_key;
          // Remove the key from the keyring attributes if primary
          if (primaryKey && primaryKey.toLowerCase() === removedKey.primaryKey.keyid.toHex()) {
            return setKeyringAttr(this.id, {primary_key: ''});
          }
        }
      })
      .then(() => {
        this.sync.add(removedKey.primaryKey.getFingerprint(), keyringSync.DELETE);
        return this.keyring.store();
      })
      .then(() => this.sync.commit());
    });
  }

  /**
   * Generate a new PGP keypair and optionally upload the public key to the
   * key server.
   * @param {number}  options.numBits           The keysize in bits
   * @param {Array}   options.userIds           Email addresses and names
   * @param {string}  options.passphrase        To protect the private key on disk
   * @param {boolean} options.uploadPublicKey   If upload to key server is desired
   * @yield {Object}                            The generated key pair
   */
  generateKey(options) {
    let newKey = null;
    return Promise.resolve()
    .then(() => {
      options.userIds = options.userIds.map(function(userId) {
        if (userId.fullName) {
          return (new goog.format.EmailAddress(userId.email, userId.fullName)).toString();
        } else {
          return '<' + userId.email + '>';
        }
      });
      return openpgp.generateKeyPair({numBits: parseInt(options.numBits), userId: options.userIds, passphrase: options.passphrase, keyExpirationTime: options.keyExpirationTime})
    })
    .then(data => {
      newKey = data;
      this.keyring.privateKeys.push(newKey.key);
      this.sync.add(newKey.key.primaryKey.getFingerprint(), keyringSync.INSERT);
    })
    .then(() => this.keyring.store())
    .then(() => this.sync.commit())
    .then(() => {
      // by no primary key in the keyring set the generated key as primary
      if (!this.hasPrimaryKey()) {
        return setKeyringAttr(this.id, {primary_key: newKey.key.primaryKey.keyid.toHex().toUpperCase()});
      }
    })
    .then(() => {
      // upload public key
      if (options.uploadPublicKey) {
        return keyServer.upload({publicKeyArmored: newKey.publicKeyArmored})
      }
    })
    .then(() => newKey);
  }

  getKeyForSigning(keyIdHex) {
    var key = this.keyring.privateKeys.getForId(keyIdHex);
    if (!key) {
      return null;
    }
    return {
      key: key,
      keyid: key.primaryKey.getKeyId().toHex(),
      userid: getUserId(key)
    };
  }

  getAttributes() {
    return keyringAttr[this.id];
  }
}

export function mapKeys(keys) {
  var result = [];
  keys.forEach(function(key) {
    var uiKey = {};
    if (key.isPublic()) {
      uiKey.type = 'public';
    } else {
      uiKey.type = 'private';
    }
    try {
      uiKey.validity = key.verifyPrimaryKey() === openpgp.enums.keyStatus.valid;
    } catch (e) {
      uiKey.validity = false;
      console.log('Exception in verifyPrimaryKey', e);
    }
    uiKey.id = key.primaryKey.getKeyId().toHex().toUpperCase();
    uiKey.fingerprint = key.primaryKey.getFingerprint().toUpperCase();
    // primary user
    try {
      uiKey.userId = getUserId(key, false);
      var address = goog.format.EmailAddress.parse(uiKey.userId);
      uiKey.name = address.getName();
      uiKey.email = address.getAddress();
      uiKey.exDate = key.getExpirationTime();
      if (uiKey.exDate) {
        uiKey.exDate = uiKey.exDate.toISOString();
      } else {
        uiKey.exDate = false;
      }
    } catch (e) {
      uiKey.name = uiKey.name || 'NO USERID FOUND';
      uiKey.email = uiKey.email || 'UNKNOWN';
      uiKey.exDate = uiKey.exDate || 'UNKNOWN';
      console.log('Exception map primary user', e);
    }
    uiKey.crDate = key.primaryKey.created.toISOString();
    uiKey.algorithm = getAlgorithmString(key.primaryKey.algorithm);
    uiKey.bitLength = key.primaryKey.getBitSize();
    result.push(uiKey);
  });
  return result;
}

function getAlgorithmString(keyType) {
  var result = '';
  switch (keyType) {
  case 'rsa_encrypt_sign':
    result = "RSA (Encrypt or Sign)";
    break;
  case 'rsa_encrypt':
    result = "RSA Encrypt-Only";
    break;
  case 'rsa_sign':
    result = "RSA Sign-Only";
    break;
  case 'elgamal':
    result = "Elgamal (Encrypt-Only)";
    break;
  case 'dsa':
    result = "DSA (Digital Signature Algorithm)";
    break;
  default:
    result = "UNKNOWN";
  }
  return result;
}

/*
function getKeyType(algorithm) {
  var result;
  switch (algorithm) {
  case "RSA/RSA":
    result = openpgp.enums.publicKey.rsa_encrypt_sign;
    break;
  case "DSA/ElGamal":
    result = openpgp.enums.publicKey.dsa;
    break;
  default:
    throw new Error('Key type not supported');
  }
  return result;
}
*/

function mapSubKeys(subkeys, toKey) {
  toKey.subkeys = [];
  subkeys && subkeys.forEach(function(subkey) {
    try {
      var skey = {};
      skey.crDate = subkey.subKey.created.toISOString();
      skey.exDate = subkey.getExpirationTime();
      if (skey.exDate) {
        skey.exDate = skey.exDate.toISOString();
      } else {
        skey.exDate = false;
      }
      skey.id = subkey.subKey.getKeyId().toHex().toUpperCase();
      skey.algorithm = getAlgorithmString(subkey.subKey.algorithm);
      skey.bitLength = subkey.subKey.getBitSize();
      skey.fingerprint = subkey.subKey.getFingerprint().toUpperCase();
      toKey.subkeys.push(skey);
    } catch (e) {
      console.log('Exception in mapSubKeys', e);
    }
  });
}

function mapUsers(users, toKey, keyring, primaryKey) {
  toKey.users = [];
  users && users.forEach(function(user) {
    try {
      var uiUser = {};
      uiUser.userID = user.userId.userid;
      uiUser.signatures = [];
      user.selfCertifications && user.selfCertifications.forEach(function(selfCert) {
        if (!user.isValidSelfCertificate(primaryKey, selfCert)) {
          return;
        }
        var sig = {};
        sig.signer = user.userId.userid;
        sig.id = selfCert.issuerKeyId.toHex().toUpperCase();
        sig.crDate = selfCert.created.toISOString();
        uiUser.signatures.push(sig);
      });
      user.otherCertifications && user.otherCertifications.forEach(function(otherCert) {
        var sig = {};
        var keyidHex = otherCert.issuerKeyId.toHex();
        var issuerKeys = keyring.getKeysForId(keyidHex);
        if (issuerKeys) {
          var signingKeyPacket = issuerKeys[0].getKeyPacket([otherCert.issuerKeyId]);
          if (signingKeyPacket && (otherCert.verified || otherCert.verify(signingKeyPacket, {userid: user.userId, key: primaryKey}))) {
            sig.signer = getUserId(issuerKeys[0]);
          } else {
            // invalid signature
            return;
          }
        } else {
          sig.signer = l10n("keygrid_signer_unknown");
        }
        sig.id = otherCert.issuerKeyId.toHex().toUpperCase();
        sig.crDate = otherCert.created.toISOString();
        uiUser.signatures.push(sig);
      });
      toKey.users.push(uiUser);
    } catch (e) {
      console.log('Exception in mapUsers', e);
    }
  });
}

function checkKeyId(sourceKey, keyring) {
  var primKeyId = sourceKey.primaryKey.getKeyId();
  var keys = keyring.getKeysForId(primKeyId.toHex(), true);
  if (keys) {
    keys.forEach(function(key) {
      if (!key.primaryKey.getKeyId().equals(primKeyId)) {
        throw new Error('Primary keyId equals existing sub keyId.');
      }
    });
  }
  sourceKey.getSubkeyPackets().forEach(function(subKey) {
    var subKeyId = subKey.getKeyId();
    var keys = keyring.getKeysForId(subKeyId.toHex(), true);
    if (keys) {
      keys.forEach(function(key) {
        if (key.primaryKey.getKeyId().equals(subKeyId)) {
          throw new Error('Sub keyId equals existing primary keyId.');
        }
        if (!key.primaryKey.getKeyId().equals(primKeyId)) {
          throw new Error('Sub keyId equals existing sub keyId in key with different primary keyId.');
        }
      });
    }
  });
}
