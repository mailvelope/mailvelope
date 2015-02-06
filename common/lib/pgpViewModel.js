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

'use strict';

define(function(require, exports, module) {

  var mvelo = require('../lib-mvelo').mvelo;
  var l10n = mvelo.l10n.get;
  var openpgp = require('openpgp');
  if (mvelo.crx) {
    openpgp.initWorker({path: 'dep/openpgp.worker.js'});
  } else if (mvelo.ffa) {
    var CWorker = mvelo.util.getWorker();
    openpgp.initWorker({
      worker: new CWorker(mvelo.data.url('openpgp.worker.min.js'))
    });
  }
  var goog = require('./closure-library/closure/goog/emailaddress').goog;
  var keyring = null;

  var watchListBuffer = null;

  function init() {
    keyring = new openpgp.Keyring();
  }

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
  exports.init = init;
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

  function getKeyUserIDs(proposal) {
    var result = [];
    keyring.getAllKeys().forEach(function(key) {
      if (key.verifyPrimaryKey() === openpgp.enums.keyStatus.valid) {
        var user = {};
        mapKeyUserIds(key, user, proposal);
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

  function getKeyIdByAddress(emailAddr, options) {
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
        result[emailAddr] = result[emailAddr].concat(keyring.publicKeys.getForAddress(emailAddr));
      }
      if (options.priv) {
        result[emailAddr] = result[emailAddr].concat(keyring.privateKeys.getForAddress(emailAddr));
      }
      result[emailAddr] = result[emailAddr].map(function(key) {
        if (options.validity && (key.verifyPrimaryKey() !== openpgp.enums.keyStatus.valid ||
                         key.getEncryptionKeyPacket() === null)) {
          return;
        }
        return key.primaryKey.getKeyId().toHex();
      }).filter(function(keyid) {
        return keyid;
      });
      if (!result[emailAddr].length) {
        result[emailAddr] = false;
      }
    });
    return result;
  }

  function getArmoredKeys(keyids, options) {
    var result = [];
    var keys = null;
    if (options.all) {
      keys = keyring.getAllKeys();
    } else {
      keys = keyids.map(function(keyid) {
        return keyring.getKeysForId(keyid)[0];
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

  exports.getArmoredKeys = getArmoredKeys;

  function importPublicKey(armored) {
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
      var key = keyring.getKeysForId(pubKey.primaryKey.getFingerprint());
      var keyid = pubKey.primaryKey.getKeyId().toHex().toUpperCase();
      if (key) {
        key = key[0];
        key.update(pubKey);
        result.push({
          type: 'success',
          message: l10n('key_import_public_update', [keyid, getUserId(pubKey)])
        });
      } else {
        keyring.publicKeys.push(pubKey);
        result.push({
          type: 'success',
          message: l10n('key_import_public_success', [keyid, getUserId(pubKey)])
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
          message: l10n('key_import_private_read', [error.message])
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
            message: l10n('key_import_private_exists', [keyid, getUserId(privKey)])
          });
        } else {
          key.update(privKey);
          result.push({
            type: 'success',
            message: l10n('key_import_private_update', [keyid, getUserId(privKey)])
          });
        }
      } else {
        keyring.privateKeys.push(privKey);
        result.push({
          type: 'success',
          message: l10n('key_import_private_success', [keyid, getUserId(privKey)])
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
      try {
        if (key.type === 'public') {
          result = result.concat(importPublicKey(key.armored));
        } else if (key.type === 'private') {
          result = result.concat(importPrivateKey(key.armored));
        }
      } catch (e) {
        result.push({
          type: 'error',
          message: l10n('key_import_unable', [e])
        });
      }
    });
    // store if import succeeded
    if (result.some(function(message) { return message.type === 'success';})) {
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

  function generateKey(options, callback) {
    //var keyType = getKeyType(options.algorithm);
    var emailAdr = new goog.format.EmailAddress(options.email, options.user);
    openpgp.generateKeyPair({numBits: parseInt(options.numBits), userId: emailAdr.toString(), passphrase: options.passphrase}).then(function(data) {
      if (data) {
        keyring.privateKeys.push(data.key);
        keyring.store();
      }
      callback(null, data);
    }, callback);
  }

  function getUserId(key) {
    var primaryUser = key.getPrimaryUser();
    if (primaryUser) {
      return primaryUser.user.userId.userid;
    } else {
      // take first available user ID
      for (var i = 0; i < key.users.length; i++) {
        if (key.users[i].userId) {
          return key.users[i].userId.userid;
        }
      }
      return 'UNKNOWN';
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
        message: l10n('message_read_error', [e])
      };
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
      var message = l10n("message_no_keys", [result.keyid.toUpperCase()]);
      for (var i = 1; i < encryptionKeyIds.length; i++) {
        message = message + ' ' + l10n("word_or") + ' ' + encryptionKeyIds[i].toHex().toUpperCase();
      }
      throw {
        type: 'error',
        message: message,
      };
    }

    return result;
  }

  function readCleartextMessage(armoredText) {
    var result = {};
    try {
      result.message = openpgp.cleartext.readArmored(armoredText);
    } catch (e) {
      //console.log('openpgp.cleartext.readArmored', e);
      throw {
        type: 'error',
        message: l10n('cleartext_read_error', [e])
      };
    }

    result.signers = [];
    var signingKeyIds = result.message.getSigningKeyIds();
    if (signingKeyIds.length === 0) {
      throw {
        type: 'error',
        message: 'No signatures found'
      };
    }
    for (var i = 0; i < signingKeyIds.length; i++) {
      var signer = {};
      signer.keyid = signingKeyIds[i].toHex();
      signer.key = keyring.getKeysForId(signer.keyid, true);
      signer.key = signer.key ? signer.key[0] : null;
      if (signer.key) {
        signer.userid = getUserId(signer.key);
      }
      result.signers.push(signer);
    }

    return result;
  }

  function unlockKey(privKey, keyid, passwd, callback) {
    openpgp.getWorker().decryptKeyPacket(privKey, [openpgp.Keyid.fromId(keyid)], passwd).then(callback.bind(null, null), callback);
  }

  function decryptMessage(message, callback) {
    openpgp.getWorker().decryptMessage(message.key, message.message).then(callback.bind(null, null), callback);
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
        message: 'No key found for encryption'
      });
    }
    openpgp.getWorker().encryptMessage(keys, message).then(callback.bind(null, null), function(e) {
      callback({
        type: 'error',
        message: l10n('encrypt_error', [e])
      });
    });
  }

  function verifyMessage(message, signers, callback) {
    var keys = signers.map(function(signer) {
      return signer.key;
    }).filter(function(key) {
      return key !== null;
    });
    try {
      var verified = message.verify(keys);
      signers = signers.map(function(signer) {
        signer.valid = signer.key && verified.some(function(verifiedSig) {
          return signer.keyid === verifiedSig.keyid.toHex() && verifiedSig.valid;
        });
        // remove key object
        delete signer.key;
        return signer;
      });
      callback(null, signers);
    } catch (e) {
      callback({
        type: 'error',
        message: l10n('verify_error', [e])
      });
    }
  }

  function getKeyForSigning(keyIdHex) {
    var key = keyring.privateKeys.getForId(keyIdHex);
    var userId = getUserId(key);
    return {
      signKey: key,
      userId : userId
    };
  }

  function signMessage(message, signKey, callback) {
    openpgp.getWorker().signClearMessage([signKey], message).then(callback.bind(null, null), callback);
  }

  function getWatchList() {
    watchListBuffer = watchListBuffer || mvelo.storage.get('mailvelopeWatchList');
    return watchListBuffer;
  }

  function setWatchList(watchList) {
    mvelo.storage.set('mailvelopeWatchList', watchList);
    watchListBuffer = watchList;
  }

  function getHostname(url) {
    var hostname = mvelo.util.getHostname(url);
    // limit to 3 labels per domain
    return hostname.split('.').slice(-3).join('.');
  }

  exports.getKeyUserIDs = getKeyUserIDs;
  exports.getKeyIdByAddress = getKeyIdByAddress;
  exports.getKeyForSigning = getKeyForSigning;
  exports.importKeys = importKeys;
  exports.removeKey = removeKey;
  exports.validateEmail = validateEmail;
  exports.generateKey = generateKey;
  exports.readMessage = readMessage;
  exports.readCleartextMessage = readCleartextMessage;
  exports.decryptMessage = decryptMessage;
  exports.unlockKey = unlockKey;
  exports.encryptMessage = encryptMessage;
  exports.signMessage = signMessage;
  exports.verifyMessage = verifyMessage;
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

  function migrate08() {
    var prefs = getPreferences();
    if (mvelo.crx && prefs.migrate08 && prefs.migrate08.done) {
      window.localStorage.removeItem("privatekeys");
      window.localStorage.removeItem("publickeys");
      delete prefs.migrate08;
      setPreferences(prefs);
    }

  }

  exports.migrate08 = migrate08;

});
