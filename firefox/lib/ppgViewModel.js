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

var {ppgapp} = require('ppgapp');
var term = require('term');
var ss = require("simple-storage");
var {URL} = require('url');

var {goog} = require('data/common/dep/closure-library/closure/goog/emailaddress');

// clean slate
//delete ss.storage.watchList;
//ppgapp.removeAllKeys();


function getKeys() {
  var keys = [];
  ppgapp.getAllKeys().forEach(function(key) {
    var mkey = {};
    mkey.validity = key.valid;
    if (key.secret) {
      mkey.type = 'private';
      mkey.armoredPrivate = ppgapp.exportSecret(key.id);
    } else {
      mkey.type = 'public';
      mkey.armoredPublic = ppgapp.exportPublic([key.id]);
    }
    mapKey(key, mkey);
    keys.push(mkey);
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
  ppgapp.getPublicKeys().forEach(function(publicKey) {
    var key = {};
    key.type = 'public';
    key.validity = publicKey.valid;
    key.armoredPublic = ppgapp.exportPublic([publicKey.id]);
    mapKey(publicKey, key);
    result.push(key);
  });
  return result;
}

function getPrivateKeys() {
  
}

exports.getKeys = getKeys;
exports.getPublicKeys = getPublicKeys;
exports.getPrivateKeys = getPrivateKeys;

function mapKey(obj, toKey) {
  // fingerprint used as UID
  toKey.guid = obj.fingerprint;
  toKey.id = obj.id;
  toKey.fingerprint = obj.fingerprint;
  var address = goog.format.EmailAddress.parse(obj.uids[0].name);
  toKey.name = decode_utf8(address.getName());
  toKey.email = address.getAddress();
  toKey.crDate = obj.creation_date;
  toKey.exDate = obj.expiration_date;
  toKey.algorithm = obj.algo;
  toKey.bitLength = obj.length;
  // subkeys
  mapSubKeys(obj.subkeys, toKey);
  // users
  mapUsers(obj.uids, toKey);
}

function mapSubKeys(subkeys, toKey) {
  toKey.subkeys = [];
  subkeys.forEach(function(subkey) {
    var skey = {};
    skey.crDate = subkey.creation_date;
    skey.exDate = subkey.expiration_date;
    skey.id = subkey.id;
    skey.algorithm = subkey.algo;
    skey.bitLength = subkey.length;
    skey.fingerprint = subkey.fingerprint;
    toKey.subkeys.push(skey);
  });
}

function mapUsers(userids, toKey) {
  toKey.users = [];
  userids.forEach(function(userPacket) {
    var user = {};
    user.userID = decode_utf8(userPacket.name);
    user.signatures = [];
    userPacket.selfsigs.forEach(function(certSig) {
      var sig = {};
      var issuerKey = ppgapp.findKey(certSig.id);
      if (issuerKey !== null) {
        sig.signer = decode_utf8(issuerKey.uids[0].name);
      } else {
        sig.signer = 'Unknown Signer';
      }
      sig.id = certSig.id;
      sig.crDate = certSig.creation_date;
      user.signatures.push(sig);
    });
    toKey.users.push(user);
  });
}

function getKeyUserIDs(proposal) {
  var result = [];
  ppgapp.getPublicKeys().forEach(function(publicKey) {
    var key = {};
    mapKeyUserIds(publicKey, key, proposal)
    result.push(key);
  });
  result = result.sort(function(a, b) {
    return a.userid.localeCompare(b.userid);
  });
  return result;
}

function mapKeyUserIds(obj, toKey, proposal) {
  toKey.keyid = obj.id;
  toKey.userid = obj.uids[0].name;
  var email = goog.format.EmailAddress.parse(obj.uids[0].name).getAddress();
  toKey.proposal = proposal.some(function(element) {
    return email === element;
  });
}

function importKey(text, keyType, callback) {
  ppgapp.importData(text, function(key) {
    console.log('importData callback', JSON.stringify(key));
    if (key === null) {
      callback(-1);
    } else {
      callback(null, [{
        keyid: key.id,
        userid: decode_utf8(key.uids[0].name)
      }]);
    }
  });
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
  ppgapp.getAllKeys().forEach(function(key) {
    if (key.fingerprint === guid) {
      ppgapp.removeKey(key.id);
    }
  });
}

function validateEmail(email) {
  return goog.format.EmailAddress.isValidAddrSpec(email);
}

function generateKey(options, callback) {
  var popt = {};
  popt.keyType = getKeyType(options.algorithm);
  popt.name = new goog.format.EmailAddress(options.email, options.user).toString();
  popt.subkeyType = getKeyType(options.algorithm);
  popt.keypairBits = parseInt(options.numBits);
  popt.subkeypairBits = parseInt(options.numBits);
  ppgapp.generateKeypair(popt, callback);
}

function readMessage(armoredText) {
  return {
    msgdata: armoredText,
    userid: 'unknown',
    keyid: 'unknown'
  }
}

function decryptMessage(message, passwd, callback) {
  console.log('decryptMessage', message.msgdata);
  ppgapp.decrypt(message.msgdata, function(err, msg, keyIdStr) {
    console.log('decrypt:', err, msg, keyIdStr);
    callback(err,msg);
  });
}

function encryptMessage(message, keyids, callback) {
  console.log('encryptMessage', message.msgdata);
  ppgapp.encrypt(message, keyids, null, callback);
}

function getWatchList() {
  return ss.storage.watchList;
}

function setWatchList(watchList) {
  ss.storage.watchList = watchList;
}

function getHostname(url) {
  // limit to 3 labels per domain
  return URL(url).host.split('.').slice(-3).join('.');
}

exports.getKeyUserIDs = getKeyUserIDs;
exports.importKey = importKey;
exports.removeKey = removeKey;
exports.validateEmail = validateEmail;
exports.generateKey = generateKey;
exports.readMessage = readMessage;
exports.decryptMessage = decryptMessage;
exports.encryptMessage = encryptMessage;
exports.getWatchList = getWatchList;
exports.setWatchList = setWatchList;
exports.getHostname = getHostname;
