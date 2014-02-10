/**
 * Mailvelope - secure email with OpenPGP encryption for Webmail
 * Copyright (C) 2012  Thomas Oberndörfer
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


define(function(require, exports, module) {

  var openpgp = require('openpgp');
  var util = openpgp.util;
  var mvelo = require('../lib-mvelo').mvelo;
  var goog = require('./closure-library/closure/goog/emailaddress').goog;
  var keyring = new openpgp.Keyring();
  
  function getKeys() {
    // map keys to UI format
    var keys = mapKeys(keyring.keys);
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

  function setOpenPGPComment(text) {
    openpgp.config.commentstring = text;
  }

  function setOpenPGPVersion(text) {
    openpgp.config.versionstring = text;
  }

  function getPublicKeys() {
    var pubKeys = [];
    keyring.keys.forEach(function(key) {
      if (key.isPublic()) {
        pubKeys.push(key);
      }
    });
    pubKeys = mapKeys(pubKeys);
    return pubKeys;
  }

  function getPrivateKeys() {
    var privKeys = [];
    keyring.keys.forEach(function(key) {
      if (key.isPrivate()) {
        privKeys.push(key);
      }
    });
    privKeys = mapKeys(privKeys);
    return privKeys;
  }

  function mapKeys(keys) {
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
      // fingerprint used as UID
      uiKey.guid = key.primaryKey.getFingerprint();
      uiKey.id = key.primaryKey.getKeyId().toHex().toUpperCase();
      uiKey.fingerprint = uiKey.guid.toUpperCase();
      // primary user
      try {
        var primaryUser = key.getPrimaryUser();
        if (!primaryUser) {
          // self signatures might be expired but we still can display userid
          primaryUser = {user: key.users[0]};
        }
        var address = goog.format.EmailAddress.parse(primaryUser.user.userId);
        uiKey.name = address.getName();
        uiKey.email = address.getAddress();
        uiKey.exDate = key.getExpirationTime();
        if (uiKey.exDate) {
          uiKey.exDate = uiKey.exDate.toISOString();
        } else {
          uiKey.exDate = 'The key does not expire';
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

  function getKeyDetails(guid) {
    var details = {};
    var key = openpgp.keyring.getKeyForLongId(guid);
    if (key) {
      // subkeys
      mapSubKeys(key.subKeys, details);
      // users
      mapUsers(key.users, details);
      return details;
    } else {
      throw new Error('Key with this long ID not found: ', guid);
    }
  }

  exports.setOpenPGPComment = setOpenPGPComment;
  exports.setOpenPGPVersion = setOpenPGPVersion;
  exports.getKeys = getKeys;
  exports.getPublicKeys = getPublicKeys;
  exports.getPrivateKeys = getPrivateKeys;
  exports.getKeyDetails = getKeyDetails;
  
  function mapSubKeys(subkeys, toKey) {
    toKey.subkeys = [];
    subkeys.forEach(function(subkey) {
      try {
        var skey = {};
        skey.crDate = subkey.subKey.created.toISOString();
        skey.exDate = subkey.getExpirationTime();
        if (skey.exDate) {
          skey.exDate = skey.exDate.toISOString();
        } else {
          skey.exDate = 'The key does not expire';
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
  
  function mapUsers(users, toKey) {
    toKey.users = [];
    users.forEach(function(user) {
      try {
        var uiUser = {};
        uiUser.userID = user.userId;
        uiUser.signatures = [];
        user.selfCertifications.forEach(function(selfCert) {
          var sig = {};
          sig.signer = user.userId;
          sig.id = selfCert.issuerKeyId.toHex().toUpperCase();
          sig.crDate = selfCert.created.toISOString();
          uiUser.signatures.push(sig);
        });
        user.otherCertifications.forEach(function(otherCert) {
          var sig = {};
          var keyidHex = otherCert.issuerKeyId.toHex();
          var issuerKey = openpgp.keyring.getKeyForId(keyidHex);
          if (issuerKey !== null) {
            var primaryUser = issuerKey.getPrimaryUser();
            sig.signer = primaryUser.user.userId;
          } else {
            sig.signer = 'Unknown Signer';
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

  function getKeyUserIDs(proposal) {
    var result = [];
    openpgp.keyring.keys.forEach(function(key) {
      if (key.verifyPrimaryKey === openpgp.enums.keyStatus.valid) {
        var user = {};
        mapKeyUserIds(key, user, proposal)
        result.push(user);
      }
    });
    result = result.sort(function(a, b) {
      return a.userid.localeCompare(b.userid);
    });
    return result;
  }

  function mapKeyUserIds(key, user, proposal) {
    user.keyid = key.primaryKey.getKeyId().toHex().toUpperCase();
    try {
      var primaryUser = key.getPrimaryUser();
      user.userid = primaryUser.user.userId;
      var email = goog.format.EmailAddress.parse(user.userid).getAddress();
      user.proposal = proposal.some(function(element) {
        return email === element;
      });
    } catch (e) {
      user.userid = user.userid || 'UNKNOWN';
      console.log('Exception in mapKeyUserIds', e);
    }
  }

  function importPublicKey(armored) {
    var result = [];
    try {
      var keyObj = openpgp.read_publicKey(armored);
    } catch (e) {
      console.log('Exception in openpgp.read_publicKey', e);
    }
    if (keyObj && keyObj.length) {
      keyObj.forEach(function(obj, index) {
        var keyId = obj.getKeyId();
        if (index > 0) {
          result.push({
            type: 'warning',
            message: 'More than one key per armored text block detected. Mailvelope currently needs each key in separate block. Public key ' + util.hexstrdump(keyId).toUpperCase() + ' will not be usable.'
          });
          return;
        }
        // check if public key already in key ring
        var found = openpgp.keyring.getPublicKeysForKeyId(keyId);
        if (found.length > 0) {
          result.push({
            type: 'warning',
            message: 'A public key with the ID ' + util.hexstrdump(keyId).toUpperCase() + ' is already in the key ring. Update currently not supported'
          });
        } else {
          // sanity check on existing userId
          if (obj.userIds.length === 0) {
            result.push({
              type: 'error',
              message: 'Public key does not have valid user ID'
            });
          } else {
            // TODO: when multiple keys are in one armored key text, variable armored will contain all keys and not just one
            openpgp.keyring.publicKeys.push({armored: armored, obj: obj, keyId: keyId});
            result.push({
              type: 'success',
              message: 'Public key ' + util.hexstrdump(keyId).toUpperCase() + ' of user ' + obj.userIds[0].text + ' imported into key ring'
            });
          }
        }
      });
    } else {
      result.push({
        type: 'error',
        message: 'Unable to read one public key'
      });
    }
    return result;
  }

  function importPrivateKey(armored) {
    var result = [];
    try {
      var keyObj = openpgp.read_privateKey(armored);
    } catch (e) {
      console.log('Exception in openpgp.read_privateKey', e);
    }
    if (keyObj && keyObj.length) {
      for (var i = 0; i < keyObj.length; i++) {
        var keyId = keyObj[i].getKeyId();
        if (i > 0) {
          result.push({
            type: 'warning',
            message: 'More than one key per armored text block detected. Mailvelope currently needs each key in separate block. Private key ' + util.hexstrdump(keyId).toUpperCase() + ' will not be usable.'
          });
          continue;
        }
        // check if private key already in key ring
        var found = openpgp.keyring.getPrivateKeyForKeyId(keyId);
        if (found.length > 0) {
          result.push({
            type: 'warning',
            message: 'A private key with the ID ' + util.hexstrdump(keyId).toUpperCase() + ' is already in the key ring. Update currently not supported'
          });
          continue;
        }
        // check if public key already in key ring
        found = openpgp.keyring.getPublicKeysForKeyId(keyId);
        if (found.length === 0) {
          // create public key from private key
          var pubArmored = keyObj[i].extractPublicKey();
          if (pubArmored === null) {
            result.push({
              type: 'error',
              message: 'Could not extract a valid public key from private key with the ID ' + util.hexstrdump(keyId).toUpperCase() + '. Please either paste public and private key text into the text field. Or first import public key and afterwards the private key'
            });
            continue;
          } else {
            // import extracted public key
            var pubKey = openpgp.read_publicKey(pubArmored);
            if (pubKey && pubKey.length) {
              openpgp.keyring.publicKeys.push({armored: pubArmored, obj: pubKey[0], keyId: pubKey[0].getKeyId()});              
              result.push({
                type: 'success',
                message: 'Public key ' + util.hexstrdump(keyId).toUpperCase() + ' of user ' + (keyObj[i].userIds && keyObj[i].userIds[0] && keyObj[i].userIds[0].text) + ' extracted from private key and imported into key ring'
              });
            } else {
              throw {
                type: 'error',
                message: 'Internal exception. Was not able to read extracted public key'
              }
            }
          }
        }
        // TODO: when multiple keys are in one armored key text, variable armored will contain all keys and not just one
        openpgp.keyring.privateKeys.push({armored: armored, obj: keyObj[i], keyId: keyId});
        result.push({
          type: 'success',
          message: 'Private key ' + util.hexstrdump(keyId).toUpperCase() + ' of user ' + (keyObj[i].userIds && keyObj[i].userIds[0] && keyObj[i].userIds[0].text) + ' imported into key ring'
        });
      } // end for loop
    } else {
      result.push({
        type: 'error',
        message: 'Unable to read one private key'
      });
    }
    return result;
  }

  function importKeys(armoredKeys) {
    var result = [];
    // sort, public keys first
    armoredKeys = armoredKeys.sort(function(a, b) {
      return b.type.localeCompare(a.type);
    });
    // import
    armoredKeys.forEach(function(key) {
      if (key.type === 'public') {
        result = result.concat(importPublicKey(key.armored));
      } else if (key.type === 'private') {
        result = result.concat(importPrivateKey(key.armored));
      }
    });
    // store if import succeeded
    if (result.some(function(message) { return message.type === 'success'})) {
      openpgp.keyring.store();
    }
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
  
  function getKeyType(algorithm) {
    var result;
    switch (algorithm) {
    case "RSA":
        result = 1;
        break;
    case "RSA/RSA":
        result = 2;
        break;
    case "DSA/ElGamal":
        result = 3;
        break;
    }
    return result;
  }

  function decode_utf8(str) {
    // if str contains umlauts (öäü) this throws an exeception -> no decoding required
    try {
      return decodeURIComponent(escape(str));
    } catch (e) {
      return str;
    }
  }
  
  function removeKey(guid, type) {
    // remove public part
    for (var i = 0; i < openpgp.keyring.publicKeys.length; i++) {
      if (openpgp.keyring.publicKeys[i].obj.getFingerprint() === guid) {
        openpgp.keyring.removePublicKey(i);
        break;
      }
    }
    if (type === 'private') {
      for (var i = 0; i < openpgp.keyring.privateKeys.length; i++) {
        if (openpgp.keyring.privateKeys[i].obj.getFingerprint() === guid) {
          openpgp.keyring.removePrivateKey(i);
          break;
        }
      }
    }
  }
  
  function validateEmail(email) {
    return goog.format.EmailAddress.isValidAddrSpec(email);
  }
  
  function generateKey(options) {
    var keyType = getKeyType(options.algorithm);
    var emailAdr = new goog.format.EmailAddress(options.email, options.user);
    var keyPair = openpgp.generate_key_pair(keyType, parseInt(options.numBits), emailAdr.toString(), options.passphrase);
    openpgp.keyring.importPublicKey(keyPair.publicKeyArmored);
    // need to read key again, because userids not set in keyPair.privateKey
    var privKey = openpgp.read_privateKey(keyPair.privateKeyArmored);
    openpgp.keyring.privateKeys.push({armored: keyPair.privateKeyArmored, obj: privKey[0], keyId: privKey[0].getKeyId()});
    openpgp.keyring.store();
    return true;
  }
  
  function readMessage(armoredText) {
    var result = {};
    try {
      result.message = openpgp.read_message(armoredText)[0];
    } catch (e) {
      throw {
        type: 'error',
        message: 'Could not read this encrypted message'
      }
    }
    result.privkey = null;
    result.sesskey = null;
    result.userid = '';
    result.keyid = '';
    result.primkeyid = '';
    var primarykey;
    // Find the private (sub)key for the session key of the message
    outer: for (var i = 0; i < result.message.sessionKeys.length; i++) {
      for (var j = 0; j < openpgp.keyring.privateKeys.length; j++) {
        if (openpgp.keyring.privateKeys[j].obj.privateKeyPacket.publicKey.getKeyId() == result.message.sessionKeys[i].keyId.bytes) {
          result.privkey = { keymaterial: openpgp.keyring.privateKeys[j].obj.privateKeyPacket };
          result.sesskey = result.message.sessionKeys[i];
          primarykey = openpgp.keyring.privateKeys[j].obj;
          break outer;
        }
        for (var k = 0; k < openpgp.keyring.privateKeys[j].obj.subKeys.length; k++) {
          if (openpgp.keyring.privateKeys[j].obj.subKeys[k].publicKey.getKeyId() == result.message.sessionKeys[i].keyId.bytes) {
            result.privkey = { keymaterial: openpgp.keyring.privateKeys[j].obj.subKeys[k] };
            result.sesskey = result.message.sessionKeys[i];
            primarykey = openpgp.keyring.privateKeys[j].obj;
            break outer;
          }
        }
      }
    }
    if (result.privkey != null) {
      result.userid = primarykey.userIds[0].text;
      result.primkeyid = util.hexstrdump(primarykey.getKeyId()).toUpperCase(); 
      result.keyid = util.hexstrdump(result.privkey.keymaterial.publicKey.getKeyId()).toUpperCase();
    } else {
      // unknown private key
      result.keyid = util.hexstrdump(result.message.sessionKeys[0].keyId.bytes).toUpperCase();
      var message = 'No private key found for this message. Required private key IDs: ' + result.keyid;
      for (var i = 1; i < result.message.sessionKeys.length; i++) {
        message = message + ' or ' + util.hexstrdump(result.message.sessionKeys[i].keyId.bytes).toUpperCase();
      }
      throw {
        type: 'error',
        message: message,
        keyid: result.keyid
      }
    }
    return result;
  }

  function unlockKey(privkey, passwd) {
    try {
      return privkey.keymaterial.decryptSecretMPIs(passwd);
    } catch (e) {
      throw {
        type: 'error',
        message: 'Could not unlock the private key'
      }
    }
  }

  function decryptMessage(message, callback) {
    try {
      var decryptedMsg = message.message.decrypt(message.privkey, message.sesskey);
      decryptedMsg = decode_utf8(decryptedMsg);
      callback(null, decryptedMsg);
    } catch (e) {
      callback({
        type: 'error',
        message: 'Could not decrypt this message'
      });
    }
  }

  function encryptMessage(message, keyids, callback) {
    var keyObj = [];
    // map keyids
    keyids = keyids.map(function(keystr) {
      return util.hex2bin(keystr);
    });
    // get public key objects for keyids
    for (var i = 0; i < keyids.length; i++) {
      var pubkey = openpgp.keyring.getPublicKeysForKeyId(keyids[i])[0];
      if (pubkey) {
        keyObj.push(pubkey.obj);
      }
    } 
    if (keyObj.length == 0) {
      callback({
        type: 'error',
        message: 'No valid key found for enryption'
      });
    }
    try {
      var encrypted = openpgp.write_encrypted_message(keyObj, message);
      callback(null, encrypted);
    } catch (e) {
      callback({
        type: 'error',
        message: 'Could not encrypt this message'
      });
    }
  }

  function signMessage(message, signKey, callback) {
    var keyObj = openpgp.keyring.getPrivateKeyForKeyId(util.hex2bin(signKey)),
        key;
    if (keyObj.length == 0) {
      callback({
        type: 'error',
        message: 'No valid key found for signing'
      });
      return;
    }
    key = keyObj[0].key.obj;
    try {
      var signed = openpgp.write_signed_message(key, message);
      callback(null, signed);
    } catch (e) {
      callback({
        type: 'error',
        message: 'Could not sign this message'
      });
    }
  }

  function getWatchList() {
    return mvelo.storage.get('mailvelopeWatchList');
  }

  function setWatchList(watchList) {
    mvelo.storage.set('mailvelopeWatchList', watchList);
  }

  function getHostname(url) {
    var hostname = mvelo.util.getHostname(url);
    // limit to 3 labels per domain
    return hostname.split('.').slice(-3).join('.');
  }

  exports.getKeyUserIDs = getKeyUserIDs;
  exports.importKeys = importKeys;
  exports.removeKey = removeKey;
  exports.validateEmail = validateEmail;
  exports.generateKey = generateKey;
  exports.readMessage = readMessage;
  exports.decryptMessage = decryptMessage;
  exports.unlockKey = unlockKey;
  exports.encryptMessage = encryptMessage;
  exports.signMessage = signMessage;
  exports.getWatchList = getWatchList;
  exports.setWatchList = setWatchList;
  exports.getHostname = getHostname;
  exports.getHost = mvelo.util.getHost;

  function getPreferences() {
    return mvelo.storage.get('mailvelopePreferences');
  }

  function setPreferences(preferences) {
    mvelo.storage.set('mailvelopePreferences', preferences);
  }

  exports.getPreferences = getPreferences;
  exports.setPreferences = setPreferences;
  
});
