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
  var util = typeof window !== 'undefined' && window.util || openpgp.util;
  var mvelo = require('lib/lib-mvelo').mvelo;
  var goog = require('./closure-library/closure/goog/emailaddress').goog;
  
  function getKeys() {
    // get public keys
    var keys = this.getPublicKeys();
    // check for corresponding private key
    keys.forEach(function(key) {
      for (var i = 0; i < openpgp.keyring.privateKeys.length; i++) {
        if (key.guid === openpgp.keyring.privateKeys[i].obj.getFingerprint()) {
          key.type = 'private';
          key.armoredPrivate = openpgp.keyring.privateKeys[i].armored;
          break;
        }
      }
    });
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

  function getPublicKeys() {
    var result = [];
    openpgp.keyring.publicKeys.forEach(function(publicKey) {
      var key = {};
      key.type = 'public';
      key.validity = publicKey.obj.verifyBasicSignatures();
      key.armoredPublic = publicKey.armored;
      mapKeyMsg(publicKey.obj, key);
      mapKeyMaterial(publicKey.obj.publicKeyPacket, key);
      result.push(key);
    });
    return result;
  }

  function getPrivateKeys() {
    var result = [];
    openpgp.keyring.privateKeys.forEach(function(privateKey) {
      var key = {};
      key.type = 'private';
      key.validity = privateKey.obj.privateKeyPacket.verifyKey() === 3;
      key.armoredPrivate = privateKey.armored;
      mapKeyMsg(privateKey.obj, key);
      mapKeyMaterial(privateKey.obj.privateKeyPacket.publicKey, key);
      result.push(key);
    });
    return result;
  }

  function getKeyDetails(guid) {
    var details = {};
    for (var i = 0; i < openpgp.keyring.publicKeys.length; i++) {
      var pKey = openpgp.keyring.publicKeys[i];
      if (guid === pKey.obj.getFingerprint()) {
        // subkeys
        mapSubKeys(pKey.obj.subKeys, details);
        // users
        mapUsers(pKey.obj.userIds, details);
        return details;
      }
    };
  }

  exports.getKeys = getKeys;
  exports.getPublicKeys = getPublicKeys;
  exports.getPrivateKeys = getPrivateKeys;
  exports.getKeyDetails = getKeyDetails;
  
  function mapKeyMsg(obj, toKey) {
    // fingerprint used as UID
    toKey.guid = obj.getFingerprint();
    toKey.id = util.hexstrdump(obj.getKeyId()).toUpperCase();
    toKey.fingerprint = util.hexstrdump(obj.getFingerprint()).toUpperCase();
    var address = goog.format.EmailAddress.parse(obj.userIds[0].text);
    toKey.name = address.getName();
    toKey.email = address.getAddress();
    // signature
    var sig = obj.userIds[0].certificationSignatures[0];
    if (sig.keyNeverExpires || sig.keyNeverExpires === null ) {
      toKey.exDate = 'The key does not expire'; 
    } else {
      toKey.exDate = new Date(sig.creationTime.getTime() + sig.keyExpirationTime * 1000);
    }
    // subkeys
    //mapSubKeys(obj.subKeys, toKey);
    // users
    //mapUsers(obj.userIds, toKey);
  }
  
  function mapKeyMaterial(keyPacket, toKey) {
    toKey.crDate = keyPacket.creationTime;
    toKey.algorithm = getAlgorithmString(keyPacket.publicKeyAlgorithm);
    toKey.bitLength = keyPacket.MPIs[0].mpiBitLength;
  }
  
  function mapSubKeys(subkeys, toKey) {
    toKey.subkeys = [];
    subkeys.forEach(function(subkey) {
      var skey = {};
      skey.crDate = subkey.subKeySignature.creationTime;
      if (subkey.subKeySignature.keyNeverExpires || subkey.subKeySignature.keyNeverExpires === null ) {
        skey.exDate = 'The key does not expire'; 
      } else {
        skey.exDate = new Date(subkey.subKeySignature.creationTime.getTime() + subkey.subKeySignature.keyExpirationTime * 1000);
      }
      if (toKey.type === 'private') {
        subkey = subkey.publicKey;
      }
      skey.id = util.hexstrdump(subkey.getKeyId()).toUpperCase();
      skey.algorithm = getAlgorithmString(subkey.publicKeyAlgorithm);
      skey.bitLength = subkey.MPIs[0].mpiBitLength;
      skey.fingerprint = util.hexstrdump(subkey.getFingerprint()).toUpperCase();
      toKey.subkeys.push(skey);
    });
  }
  
  function mapUsers(userids, toKey) {
    toKey.users = [];
    userids.forEach(function(userPacket) {
      var user = {};
      user.userID = userPacket.text;
      user.signatures = [];
      userPacket.certificationSignatures.forEach(function(certSig) {
        var sig = {};
        var issuerKey = certSig.getIssuerKey();
        if (issuerKey !== null) {
          sig.signer = issuerKey.obj.userIds[0].text;
          
        } else {
          sig.signer = 'Unknown Signer';
          // look for issuer in private key store
          for (var i = 0; i < openpgp.keyring.privateKeys.length; i++) {
            if (certSig.getIssuer() === openpgp.keyring.privateKeys[i].obj.getKeyId()) {
              sig.signer = openpgp.keyring.privateKeys[i].obj.userIds[0].text;
              break;
            }
          }
        }
        sig.id = util.hexstrdump(certSig.getIssuer()).toUpperCase();
        sig.crDate = certSig.creationTime;
        user.signatures.push(sig);
      });
      toKey.users.push(user);
    });
  }

  function getKeyUserIDs(proposal) {
    var result = [];
    openpgp.keyring.publicKeys.forEach(function(publicKey) {
      if (publicKey.obj.verifyBasicSignatures()) {
        var key = {};
        mapKeyUserIds(publicKey.obj, key, proposal)
        result.push(key);
      }
    });
    result = result.sort(function(a, b) {
      return a.userid.localeCompare(b.userid);
    });
    return result;
  }

  function mapKeyUserIds(obj, toKey, proposal) {
    toKey.keyid = util.hexstrdump(obj.getKeyId()).toUpperCase();
    toKey.userid = obj.userIds[0].text;
    var email = goog.format.EmailAddress.parse(obj.userIds[0].text).getAddress();
    toKey.proposal = proposal.some(function(element) {
      return email === element;
    });
  }
  
  function importKey(text, keyType) {
    var result;
    if (keyType === 'public') {
      result = openpgp.read_publicKey(text);
      //console.log('importKey result', result);
      for (var i = 0; i < result.length; i++) {
        // check if public key already in key ring
        var found = openpgp.keyring.getPublicKeysForKeyId(result[i].getKeyId());
        if (found.length > 0) {
          throw {
            type: 'error',
            message: 'A public key with the ID ' + util.hexstrdump(result[i].getKeyId()).toUpperCase() + ' is already in the key ring. Update currently not supported'
          };
        }
        openpgp.keyring.publicKeys.push({armored: text, obj: result[i], keyId: result[i].getKeyId()});
      }
    } else if (keyType === 'private') {
      result = openpgp.read_privateKey(text);
      for (var i = 0; i < result.length; i++) {
        // check if private key already in key ring
        var found = openpgp.keyring.getPrivateKeyForKeyId(result[i].getKeyId());
        if (found.length > 0) {
          throw {
            type: 'error',
            message: 'A private key pair with the ID ' + util.hexstrdump(result[i].getKeyId()).toUpperCase() + ' is already in the key ring. Update currently not supported'
          }
        }
        // check if public key already in key ring
        found = openpgp.keyring.getPublicKeysForKeyId(result[i].getKeyId());
        if (found.length === 0) {
          // create public key from private key
          var pubArmored = result[i].extractPublicKey();
          if (pubArmored === null) {
            throw {
            type: 'error',
            message: 'Could not extract a valid public key from this private key. Please either paste public and private key text into the text field. Or first import public key and afterwards the private key.'
            }
          }
          // import public key
          var pubKey = openpgp.read_publicKey(pubArmored);
          for (var j = 0; j < pubKey.length; j++) {
            openpgp.keyring.publicKeys.push({armored: pubArmored, obj: pubKey[j], keyId: pubKey[j].getKeyId()});
          }
        }
        openpgp.keyring.privateKeys.push({armored: text, obj: result[i], keyId: result[i].getKeyId()});
      }
    }
    openpgp.keyring.store();
    return result.map(function(key) {
      return {
        keyid: util.hexstrdump(key.getKeyId()).toUpperCase(),
        userid: key.userIds[0].text
      }
    });
  }
  
  function getAlgorithmString(keyType) {
    var result = '';
    switch (keyType) {
    case 1:
        result += "RSA (Encrypt or Sign)";
        break;
    case 2:
        result +="RSA Encrypt-Only";
        break;
    case 3:
        result += "RSA Sign-Only";
        break;
    case 16:
        result += "Elgamal (Encrypt-Only)";
        break;
    case 17:
        result += "DSA (Digital Signature Algorithm)";
        break;
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

  function getWatchList() {
    return mvelo.storage.get('mailvelopeWatchList');
  }

  function setWatchList(watchList) {
    mvelo.storage.set('mailvelopeWatchList', watchList);
  }

  function getHostname(url) {
    var a = document.createElement('a');
    a.href = url;
    var host = a.hostname;
    // limit to 3 labels per domain
    return host.split('.').slice(-3).join('.');
  }

  function getHost(url) {
    var a = document.createElement('a');
    a.href = url;
    return a.host;
  }

  exports.getKeyUserIDs = getKeyUserIDs;
  exports.importKey = importKey;
  exports.removeKey = removeKey;
  exports.validateEmail = validateEmail;
  exports.generateKey = generateKey;
  exports.readMessage = readMessage;
  exports.decryptMessage = decryptMessage;
  exports.unlockKey = unlockKey;
  exports.encryptMessage = encryptMessage;
  exports.getWatchList = getWatchList;
  exports.setWatchList = setWatchList;
  exports.getHostname = getHostname;
  exports.getHost = getHost;

  function getPreferences() {
    return mvelo.storage.get('mailvelopePreferences');
  }

  function setPreferences(preferences) {
    mvelo.storage.set('mailvelopePreferences', preferences);
  }

  exports.getPreferences = getPreferences;
  exports.setPreferences = setPreferences;
  
});


// implementation of this function required by openpgp.js
function showMessages(text) {
  //console.log($(text).text());
}