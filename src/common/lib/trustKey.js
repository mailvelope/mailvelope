/**
 * Mailvelope - secure email with OpenPGP encryption for Webmail
 * Copyright (C) 2015 Mailvelope GmbH
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

define(function(require, exports) {

  var mvelo = require('../lib-mvelo').mvelo;
  var openpgp = require('openpgp');
  var certs = require('./certs');

  var keyMap = new Map();

  function init() {
    var key = openpgp.key.readArmored(certs.c1und1).keys[0];
    keyMap.set('gmx.net', key);
    keyMap.set('web.de', key);
  }

  function getTrustKey(keyringId) {
    var domain = keyringId.split(mvelo.KEYRING_DELIMITER)[0];
    return keyMap.get(domain);
  }

  function isKeyPseudoRevoked(keyringId, key) {
    var trustKey = getTrustKey(keyringId);
    if (!trustKey) {
      return false;
    }
    return key.users.some(function(user) {
      return isUserPseudoRevoked(user, trustKey, key.primaryKey);
    });
  }

  function isUserPseudoRevoked(user, trustKey, primaryKey) {
    if (!user.revocationCertifications || !user.userId) {
      return false;
    }
    return user.revocationCertifications.some(function(revCert) {
      return revCert.reasonForRevocationFlag === 101 &&
             verifyCert(revCert, user.userId, trustKey, primaryKey) &&
             !hasNewerCert(user, trustKey, primaryKey, revCert.created);
    });
  }

  function hasNewerCert(user, trustKey, primaryKey, sigDate) {
    if (!user.otherCertifications) {
      return false;
    }
    return user.otherCertifications.some(function(otherCert) {
      return verifyCert(otherCert, user.userId, trustKey, primaryKey) &&
             otherCert.created > sigDate;
    });
  }

  function verifyCert(cert, userId, trustKey, primaryKey) {
    return cert.issuerKeyId.equals(trustKey.primaryKey.getKeyId()) &&
           !cert.isExpired() &&
           (cert.verified ||
            cert.verify(trustKey.primaryKey, {userid: userId, key: primaryKey}));
  }

  exports.init = init;
  exports.getTrustKey = getTrustKey;
  exports.isKeyPseudoRevoked = isKeyPseudoRevoked;

});
