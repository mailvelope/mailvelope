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
  var defaults = require('./defaults');
  var prefs = require('./prefs');
  var pwdCache = require('./pwdCache');
  var crypto = require('./crypto');

  var goog = require('./closure-library/closure/goog/emailaddress').goog;
  var keyring = require('./keyring');

  var watchListBuffer = null;

  function init() {
    defaults.init();
    prefs.init();
    pwdCache.init();
    initOpenPGP();
    keyring.init();
    // test
    var backup = createPrivateKeyBackup(mvelo.LOCAL_KEYRING_ID);
    console.log(backup);
  }

  function initOpenPGP() {
    openpgp.config.commentstring = 'https://www.mailvelope.com';
    openpgp.config.versionstring = 'Mailvelope v' + defaults.getVersion();
    if (mvelo.crx) {
      openpgp.initWorker('dep/openpgp.worker.js');
    } else if (mvelo.ffa) {
      var CWorker = mvelo.util.getWorker();
      openpgp.initWorker('', {
        worker: new CWorker(mvelo.data.url('openpgp.worker.min.js'))
      });
    }
  }

  exports.init = init;

/*
  function decode_utf8(str) {
    // if str contains umlauts (öäü) this throws an exeception -> no decoding required
    try {
      return decodeURIComponent(escape(str));
    } catch (e) {
      return str;
    }
  }
*/

  function validateEmail(email) {
    return goog.format.EmailAddress.isValidAddrSpec(email);
  }

  function readMessage(armoredText, keyringId) {
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
      result.key = keyring.getById(keyringId).keyring.privateKeys.getForId(result.keyid, true);
      if (result.key) {
        break;
      }
    }

    if (result.key) {
      result.userid = keyring.getUserId(result.key, false);
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

  function readCleartextMessage(armoredText, keyringId) {
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
      signer.key = keyring.getById(keyringId).keyring.getKeysForId(signer.keyid, true);
      signer.key = signer.key ? signer.key[0] : null;
      if (signer.key) {
        signer.userid = keyring.getUserId(signer.key);
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

  function encryptMessage(message, keyringId, keyIdsHex, callback) {
    var keys = keyIdsHex.map(function(keyIdHex) {
      var keyArray = keyring.getById(keyringId).keyring.getKeysForId(keyIdHex);
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

  function signMessage(message, signKey, callback) {
    openpgp.getWorker().signClearMessage([signKey], message).then(callback.bind(null, null), callback);
  }

  function createPrivateKeyBackup(keyringId) {
    // get primary private key
    var primaryKey;
    var primaryKeyid = keyring.getById(keyringId).getAttributes().primary_key;
    if (!primaryKeyid) {
      // get newest private key
      keyring.getById(keyringId).keyring.privateKeys.keys.forEach(function(key) {
        if (!primaryKey || primaryKey.primaryKey.created < key.primaryKey.created) {
          primaryKey = key;
        }
      });
    } else {
      primaryKey = keyring.getById(keyringId).keyring.privateKeys.getForId(primaryKeyid.toLowerCase());
    }
    if (!primaryKey) {
      throw new Error('No private key for backup');
    }
    // create backup code
    var backupCode = crypto.randomString(26);
    // create packet structure
    var packetList = new openpgp.packet.List();
    var literal = new openpgp.packet.Literal();
    var text = 'Version: 1\n';
    text += 'Pwd: ' + '123' + '\n';
    literal.setText(text);
    packetList.push(literal);
    packetList.concat(primaryKey.toPacketlist());
    // symmetrically encrypt with backup code
    var msg = new openpgp.message.Message(packetList);
    msg = msg.symEncrypt(backupCode);
    return {
      backupCode: backupCode,
      message: msg.armor()
    };
  }

  exports.validateEmail = validateEmail;
  exports.readMessage = readMessage;
  exports.readCleartextMessage = readCleartextMessage;
  exports.decryptMessage = decryptMessage;
  exports.unlockKey = unlockKey;
  exports.encryptMessage = encryptMessage;
  exports.signMessage = signMessage;
  exports.verifyMessage = verifyMessage;
  exports.createPrivateKeyBackup = createPrivateKeyBackup;

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

  function getPreferences() {
    return mvelo.storage.get('mailvelopePreferences');
  }

  function setPreferences(preferences) {
    mvelo.storage.set('mailvelopePreferences', preferences);
  }

  exports.getWatchList = getWatchList;
  exports.setWatchList = setWatchList;
  exports.getHostname = getHostname;
  exports.getHost = mvelo.util.getHost;
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
