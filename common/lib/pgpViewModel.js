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
  var mvelo = require('../lib-mvelo').mvelo;
  var goog = require('./closure-library/closure/goog/emailaddress').goog;
  var keyring = new openpgp.Keyring();
  
  function getKeys() {
    // map keys to UI format
    var keys = getPublicKeys().concat(getPrivateKeys());
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
    return mapKeys(keyring.publicKeys.keys);
  }

  function getPrivateKeys() {
    return mapKeys(keyring.privateKeys.keys);
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
        var address = goog.format.EmailAddress.parse(getUserId(key));
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
    var keys = keyring.getKeysForId(guid);
    if (keys) {
      var key = keys[0];
      // subkeys
      mapSubKeys(key.subKeys, details);
      // users
      mapUsers(key.users, details);
      return details;
    } else {
      throw new Error('Key with this fingerprint not found: ', guid);
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
    subkeys && subkeys.forEach(function(subkey) {
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
    users && users.forEach(function(user) {
      try {
        var uiUser = {};
        uiUser.userID = user.userId.userid;
        uiUser.signatures = [];
        user.selfCertifications && user.selfCertifications.forEach(function(selfCert) {
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
          if (issuerKeys !== null) {
            sig.signer = getUserId(issuerKeys[0]);
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
    keyring.getAllKeys().forEach(function(key) {
      if (key.verifyPrimaryKey() === openpgp.enums.keyStatus.valid) {
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
    user.keyid = key.primaryKey.getKeyId().toHex();
    try {
      user.userid = getUserId(key);
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
    var imported = openpgp.key.readArmored(armored);
    if (imported.err) {
      imported.err.forEach(function(error) {
        console.log('Error on key.readArmored', error);
        result.push({
          type: 'error',
          message: 'Unable to read one public key: ' + error.message
        });
      });
    }
    imported.keys.forEach(function(pubKey) {
      // check for existing keys
      var key = keyring.getKeysForId(pubKey.primaryKey.getFingerprint());
      var keyid = pubKey.primaryKey.getKeyId().toHex().toUpperCase();
      if (key) {
        key = key[0];
        key.update(pubKey);
        result.push({
          type: 'success',
          message: 'Public key ' + keyid + ' of user ' + getUserId(pubKey) + ' updated'
        });
      } else {
        keyring.publicKeys.push(pubKey);
        result.push({
          type: 'success',
          message: 'Public key ' + keyid + ' of user ' + getUserId(pubKey) + ' imported into key ring'
        });
      }
    });
    return result;
  }

  function importPrivateKey(armored) {
    var result = [];
    var imported = openpgp.key.readArmored(armored);
    if (imported.err) {
      imported.err.forEach(function(error) {
        console.log('Error on key.readArmored', error);
        result.push({
          type: 'error',
          message: 'Unable to read one private key: ' + error.message
        });
      });
    }
    imported.keys.forEach(function(privKey) {
      // check for existing keys
      var key = keyring.getKeysForId(privKey.primaryKey.getFingerprint());
      var keyid = privKey.primaryKey.getKeyId().toHex().toUpperCase();
      if (key) {
        key = key[0];
        if (key.isPublic()) {
          privKey.update(key);
          keyring.publicKeys.removeForId(privKey.primaryKey.getFingerprint());
          keyring.privateKeys.push(privKey);
          result.push({
            type: 'success',
            message: 'Private key of existing public key' + keyid + ' of user ' + getUserId(privKey) + ' imported into key ring'
          });
        } else {
          key.update(privKey);
          result.push({
            type: 'success',
            message: 'Private key ' + keyid + ' of user ' + getUserId(privKey) + ' updated'
          });
        }
      } else {
        keyring.privateKeys.push(privKey);
        result.push({
          type: 'success',
          message: 'Private key ' + keyid + ' of user ' + getUserId(privKey) + ' imported into key ring'
        });
      }

    });
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
      keyring.store();
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

  function decode_utf8(str) {
    // if str contains umlauts (öäü) this throws an exeception -> no decoding required
    try {
      return decodeURIComponent(escape(str));
    } catch (e) {
      return str;
    }
  }
  
  function removeKey(guid, type) {
    keyring.removeKeysForId(guid);
    keyring.store();
  }
  
  function validateEmail(email) {
    return goog.format.EmailAddress.isValidAddrSpec(email);
  }
  
  function generateKey(options) {
    var keyType = getKeyType(options.algorithm);
    var emailAdr = new goog.format.EmailAddress(options.email, options.user);
    var keyPair = openpgp.generateKeyPair(keyType, parseInt(options.numBits), emailAdr.toString(), options.passphrase);
    keyring.privateKeys.push(keyPair.key);
    keyring.store();
    return true;
  }

  function getUserId(key) {
    var primaryUser = key.getPrimaryUser();
    if (primaryUser) {
      return primaryUser.user.userId.userid;
    } else {
      return key.users[0].userId.userid;
    }
  }
  
  function readMessage(armoredText) {
    var result = {};
    try {
      result.message = openpgp.message.readArmored(armoredText);
    } catch (e) {
      console.log('openpgp.message.readArmored', e);
      throw {
        type: 'error',
        message: 'Could not read this encrypted message: ' + e
      }
    }

    result.key = null;
    result.userid = '';
    result.keyid = null;

    var encryptionKeyIds = result.message.getEncryptionKeyIds();
    for (var i = 0; i < encryptionKeyIds.length; i++) {
      result.keyid = encryptionKeyIds[i].toHex();
      result.key = keyring.privateKeys.getForId(result.keyid, true);
      if (result.key) {
        break;
      }
    }

    if (result.key) {
      result.userid = getUserId(result.key);
    } else {
      // unknown private key
      result.keyid = encryptionKeyIds[0].toHex();
      var message = 'No private key found for this message. Required private key IDs: ' + result.keyid.toUpperCase();
      for (var i = 1; i < encryptionKeyIds.length; i++) {
        message = message + ' or ' + encryptionKeyIds[i].toHex().toUpperCase();
      }
      throw {
        type: 'error',
        message: message,
      }
    }

    return result;
  }

  function unlockKey(privKey, keyid, passwd) {
    var keyIdObj = new openpgp.Keyid();
    // TODO OpenPGP.js helper method
    keyIdObj.read(openpgp.util.hex2bin(keyid));
    try {
      return privKey.decryptKeyPacket([keyIdObj], passwd);
    } catch (e) {
      throw {
        type: 'error',
        message: 'Could not unlock the private key'
      }
    }
  }

  function decryptMessage(message, callback) {
    try {
      var decryptedMsg = openpgp.decryptMessage(message.key, message.message);
      //decryptedMsg = decode_utf8(decryptedMsg);
      callback(null, decryptedMsg);
    } catch (e) {
      callback({
        type: 'error',
        message: 'Could not decrypt this message: ' + e
      });
    }
  }

  function encryptMessage(message, keyIdsHex, callback) {
    var keys = keyIdsHex.map(function(keyIdHex) {
      var keyArray = keyring.getKeysForId(keyIdHex);
      return keyArray ? keyArray[0] : null;
    }).filter(function(key) {
      return key !== null;
    }); 
    if (keys.length === 0) {
      callback({
        type: 'error',
        message: 'No valid key found for enryption'
      });
    }
    try {
      var encrypted = openpgp.encryptMessage(keys, message);
      callback(null, encrypted);
    } catch (e) {
      callback({
        type: 'error',
        message: 'Could not encrypt this message'
      });
    }
  }

  function getKeyForSigning(keyIdHex) {
    var key = keyring.privateKeys.getForId(keyIdHex);
    var userId = getUserId(key);
    return {
      signKey: key,
      userId : userId
    }
  }

  function signMessage(message, signKey, callback) {
    try {
      var signed = openpgp.signClearMessage([signKey], message);
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
  exports.getKeyForSigning = getKeyForSigning;
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
