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

var pgpvm = {};

goog.require('goog.format.EmailAddress');

(function(public) {
  
  public.getKeys = function() {
    return this.getPrivateKeys().concat(this.getPublicKeys());
  }

  public.getPublicKeys = function() {
    var result = [];
    openpgp.keyring.publicKeys.forEach(function(publicKey) {
      var key = {};
      key.type = 'public';
      key.validity = publicKey.obj.verifyBasicSignatures();
      mapKeyMsg(publicKey.obj, key);
      mapKeyMaterial(publicKey.obj.publicKeyPacket, key);
      result.push(key);
    });
    return result;
  }
  
  public.getPrivateKeys = function() {
    var result = [];
    openpgp.keyring.privateKeys.forEach(function(privateKey) {
      var key = {};
      key.type = 'private';
      key.validity = privateKey.obj.privateKeyPacket.verifyKey() === 3;
      mapKeyMsg(privateKey.obj, key);
      mapKeyMaterial(privateKey.obj.privateKeyPacket.publicKey, key);
      result.push(key);
    });
    return result;
  }
  
  function mapKeyMsg(obj, toKey) {
    // fingerprint used as UID
    toKey.guid = obj.getFingerprint();
    toKey.id = util.hexstrdump(obj.getKeyId()).toUpperCase();
    toKey.fingerprint = util.hexstrdump(obj.getFingerprint()).toUpperCase();
    var address = goog.format.EmailAddress.parse(obj.userIds[0].text);
    toKey.name = decode_utf8(address.getName());
    toKey.email = address.getAddress();
    // signature
    var sig = obj.userIds[0].certificationSignatures[0];
    if (sig.keyNeverExpires || sig.keyNeverExpires === null ) {
      toKey.exDate = 'The key does not expire'; 
    } else {
      toKey.exDate = new Date(sig.creationTime.getTime() + sig.keyExpirationTime * 1000);
    }
    // subkeys
    mapSubKeys(obj.subKeys, toKey);
    // users
    mapUsers(obj.userIds, toKey);
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
      user.userID = decode_utf8(userPacket.text);
      user.signatures = [];
      userPacket.certificationSignatures.forEach(function(certSig) {
        var sig = {};
        var issuerKey = certSig.getIssuerKey();
        if (issuerKey !== null) {
          sig.signer = decode_utf8(issuerKey.obj.userIds[0].text);
          
        } else {
          sig.signer = 'Unknown Signer';
          // look for issuer in private key store
          for (var i = 0; i < openpgp.keyring.privateKeys.length; i++) {
            if (certSig.getIssuer() === openpgp.keyring.privateKeys[i].obj.getKeyId()) {
              sig.signer = decode_utf8(openpgp.keyring.privateKeys[i].obj.userIds[0].text);
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

  public.getKeyUserIDs = function(proposal) {
    var pubResult = [];
    var privResult = [];
    openpgp.keyring.publicKeys.forEach(function(publicKey) {
      var key = {};
      mapKeyUserIds(publicKey.obj, key, proposal)
      pubResult.push(key);
    });
    pubResult = pubResult.sort(function(a, b) {
      return a.userid.localeCompare(b.userid);
    });
    openpgp.keyring.privateKeys.forEach(function(privateKey) {
      var key = {};
      mapKeyUserIds(privateKey.obj, key, proposal)
      privResult.push(key);
    });
    privResult = privResult.sort(function(a, b) {
      return a.userid.localeCompare(b.userid);
    });
    return pubResult.concat(privResult);
  }

  function mapKeyUserIds(obj, toKey, proposal) {
    toKey.keyid = util.hexstrdump(obj.getKeyId()).toUpperCase();
    toKey.userid = decode_utf8(obj.userIds[0].text);
    var email = goog.format.EmailAddress.parse(obj.userIds[0].text).getAddress();
    toKey.proposal = proposal.some(function(element) {
      return email === element;
    });
  }
  
  public.importKey = function(text, keyType) {
    if (keyType === 'public') {
      var result = openpgp.read_publicKey(text);
      for (var i = 0; i < result.length; i++) {
        // check if public key already in key ring
        var found = openpgp.keyring.getPublicKeysForKeyId(result[i].getKeyId());
        if (found.length > 0) {
          throw {
            type: 'error',
            message: 'A public key with the ID ' + util.hexstrdump(result[i].getKeyId()).toUpperCase() + ' is already in the key ring. Update currently not supported'
          };
        }
        // check if private key already in key ring
        found = openpgp.keyring.getPrivateKeyForKeyId(result[i].getKeyId());
        if (found.length > 0) {
          throw {
            type: 'error',
            message: 'A public/private key pair with the ID ' + util.hexstrdump(result[i].getKeyId()).toUpperCase() + ' is already in the key ring. Update currently not supported'
          }
        }
        openpgp.keyring.publicKeys.push({armored: text, obj: result[i], keyId: result[i].getKeyId()});
      }
      openpgp.keyring.store();
    } else if (keyType === 'private') {
      var result = openpgp.read_privateKey(text);
      for (var i = 0; i < result.length; i++) {
        // check if private key already in key ring
        var found = openpgp.keyring.getPrivateKeyForKeyId(result[i].getKeyId());
        if (found.length > 0) {
          throw {
            type: 'error',
            message: 'A private key pair with the ID ' + util.hexstrdump(result[i].getKeyId()).toUpperCase() + ' is already in the key ring. Update currently not supported'
          }
        }
        // remove existing public keys
        for (var j = 0; j < openpgp.keyring.publicKeys.length; j++) {
          if (openpgp.keyring.publicKeys[j].obj.getKeyId() === result[i].getKeyId()) {
            openpgp.keyring.removePublicKey(j);
            break;
          }
        }
        openpgp.keyring.privateKeys.push({armored: text, obj: result[i], keyId: result[i].getKeyId()});
      }
      openpgp.keyring.store();
    }
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
  
  function decode_utf8(str) {
    // if str contains umlauts (öäü) this throws an exeception -> no decoding required
    try {
      return decodeURIComponent(escape(str));
    } catch (e) {
      return str;
    }
  }
  
  public.removeKey = function(guid, type) {
    if (type === 'public') {
      for (var i = 0; i < openpgp.keyring.publicKeys.length; i++) {
        if (openpgp.keyring.publicKeys[i].obj.getFingerprint() === guid) {
          openpgp.keyring.removePublicKey(i);
          break;
        }
      }
    } else if (type === 'private') {
      for (var i = 0; i < openpgp.keyring.privateKeys.length; i++) {
        if (openpgp.keyring.privateKeys[i].obj.getFingerprint() === guid) {
          openpgp.keyring.removePrivateKey(i);
          break;
        }
      }
    }
  }
  
  public.validateEmail = function(email) {
    return goog.format.EmailAddress.isValidAddrSpec(email);
  }
  
  public.generateKey = function(algorithm, numBits, user, email, passphrase) {
    var keyType = getKeyType(algorithm);
    var emailAdr = new goog.format.EmailAddress(email, user);
    var keyPair = openpgp.generate_key_pair(keyType, parseInt(numBits), emailAdr.toString(), passphrase);
    // need to read key again, because userids not set in keyPair.privateKey
    var privKey = openpgp.read_privateKey(keyPair.privateKeyArmored);
    openpgp.keyring.privateKeys.push({armored: keyPair.privateKeyArmored, obj: privKey[0], keyId: privKey[0].getKeyId()});
    openpgp.keyring.store();
  }
  
  public.readMessage = function(armoredText) {
    var result = {};
    try {
      result.message = openpgp.read_message(armoredText)[0];
    } catch (e) {
      throw {
        type: 'error',
        message: 'Could not read this encrypted message'
      }
    }
    result.keymat = null;
    result.sesskey = null;
    result.userid = '';
    result.keyid = '';
    // Find the private (sub)key for the session key of the message
    for (var i = 0; i < result.message.sessionKeys.length; i++) {
      for (var j = 0; j < openpgp.keyring.privateKeys.length; j++) {
        if (openpgp.keyring.privateKeys[j].obj.privateKeyPacket.publicKey.getKeyId() == result.message.sessionKeys[i].keyId.bytes) {
          result.keymat = { key: openpgp.keyring.privateKeys[j].obj, keymaterial: openpgp.keyring.privateKeys[j].obj.privateKeyPacket};
          result.sesskey = result.message.sessionKeys[i];
          break;
        }
        for (var k = 0; k < openpgp.keyring.privateKeys[j].obj.subKeys.length; k++) {
          if (openpgp.keyring.privateKeys[j].obj.subKeys[k].publicKey.getKeyId() == result.message.sessionKeys[i].keyId.bytes) {
            result.keymat = { key: openpgp.keyring.privateKeys[j].obj, keymaterial: openpgp.keyring.privateKeys[j].obj.subKeys[k]};
            result.sesskey = result.message.sessionKeys[i];
            break;
          }
        }
      }
    }
    if (result.keymat != null) {
      result.userid = decode_utf8(result.keymat.key.userIds[0].text);
      result.keyid = util.hexstrdump(result.keymat.key.getKeyId()).toUpperCase();
    } else {
      // unknown private key
      result.keyid = util.hexstrdump(result.message.sessionKeys[0].keyId.bytes).toUpperCase();
    }
    return result;
  }

  public.decryptMessage = function(message, passwd) {
    if (message.keymat.keymaterial.decryptSecretMPIs(passwd)) {
      var decryptedMsg = message.message.decrypt(message.keymat, message.sesskey);
      var wrapper = $('<div/>').html($.parseHTML(decryptedMsg));
      if (wrapper.find('div, p, a').length !== 0) {
        // html message
        decryptedMsg = wrapper.find('a').attr('target', '_blank')
                              .end()
                              .html();
      } else {
        // text message
         decryptedMsg = wrapper.text().replace(/\n/g, '<br>');
      }
      decryptedMsg = decode_utf8(decryptedMsg);
      return decryptedMsg;
    } else {
      throw {
        type: 'wrong-password',
        message: 'Wrong password'
      }
    }
  }

  public.encryptMessage = function(message, keyids) {
    var keyObj = [];
    // get public key objects for keyids
    for (var i = 0; i < openpgp.keyring.publicKeys.length; i++) {
      var match = keyids.some(function(element, index) {
        if (element === util.hexstrdump(openpgp.keyring.publicKeys[i].obj.getKeyId()).toUpperCase()) {
          keyids.splice(index, 1);
          return true;  
        } else {
          return false;
        }
      });
      if (match) {
        keyObj.push(openpgp.keyring.publicKeys[i].obj);
      }
      if (keyids.length === 0) break;
    }
    // get public key objects for keyids from private keys
    if (keyids.length != 0) {
      for (var i = 0; i < openpgp.keyring.privateKeys.length; i++) {
        var match = keyids.some(function(element, index) {
          if (element === util.hexstrdump(openpgp.keyring.privateKeys[i].obj.getKeyId()).toUpperCase()) {
            keyids.splice(index, 1);
            return true;  
          } else {
            return false;
          }
        });
        if (match) {
          keyObj.push(openpgp.keyring.privateKeys[i].obj);
        }
        if (keyids.length === 0) break;
      } 
    }
    return openpgp.write_encrypted_message(keyObj, message);
  }

  public.getWatchList = function() {    
    return JSON.parse(window.localStorage.getItem('mailvelopeWatchList'));
  }

  public.setWatchList = function(watchList) {
    window.localStorage.setItem('mailvelopeWatchList', JSON.stringify(watchList));
  }

  public.reduceHosts = function(hosts) {
    var reduced = [];
    hosts.forEach(function(element) {
      var labels = element.split('.');
      if (labels.length < 2) return;
      if (labels.length <= 3) {
        reduced.push(element);
      } else {
        reduced.push('*.' + labels.slice(-3).join('.'));
      }
    });
    return sortAndDeDup(reduced);
  }

  function sortAndDeDup(unordered, compFn) {
    var result = [];
    var prev = -1;
    unordered.sort(compFn).forEach(function(item) {
      var equal = (compFn !== undefined && prev !== undefined) 
                  ? compFn(prev, item) === 0 : prev === item; 
      if (!equal) {
        result.push(item);
        prev = item;
      }
    });
    return result;
  }

  public.deDup = sortAndDeDup;

  public.getHostname = function(url) {
    var host = $('<a/>').attr('href', url).prop('hostname');
    // limit to 3 labels per domain
    return host.split('.').slice(-3).join('.');
  }

  public.getWatchListFilterURLs = function() {
    var result = [];
    this.getWatchList().forEach(function(site) {
      site.active && site.frames && site.frames.forEach(function(frame) {
        frame.scan && result.push(frame.frame);
      });
    });
    if (result.length !== 0) {
      result = sortAndDeDup(result);
    }
    result = result.map(function(host) {
      return '*://' + host + '/*';
    });
    return result;
  }
  
}(pgpvm));


// implementation of this function required by openpgp.js
function showMessages(text) {
  console.log($(text).text());
}