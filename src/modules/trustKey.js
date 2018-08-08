/**
 * Copyright (C) 2015-2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from '../lib/lib-mvelo';
import * as openpgp from 'openpgp';
import * as certs from './certs';

const keyMap = new Map();

export function init() {
  const key = openpgp.key.readArmored(certs.c1und1).keys[0];
  keyMap.set('gmx.net', key);
  keyMap.set('web.de', key);
}

export function getTrustKey(keyringId) {
  const domain = keyringId.split(mvelo.KEYRING_DELIMITER)[0];
  return keyMap.get(domain);
}

export function isKeyPseudoRevoked(keyringId, key) {
  if (!keyringId) {
    return false;
  }
  const trustKey = getTrustKey(keyringId);
  if (!trustKey) {
    return false;
  }
  return key.users.some(user => isUserPseudoRevoked(user, trustKey, key.primaryKey));
}

function isUserPseudoRevoked(user, trustKey, primaryKey) {
  if (!user.revocationCertifications || !user.userId) {
    return false;
  }
  return user.revocationCertifications.some(revCert => revCert.reasonForRevocationFlag === 101 &&
           verifyCert(revCert, user.userId, trustKey, primaryKey) &&
           !hasNewerCert(user, trustKey, primaryKey, revCert.created));
}

function hasNewerCert(user, trustKey, primaryKey, sigDate) {
  if (!user.otherCertifications) {
    return false;
  }
  return user.otherCertifications.some(otherCert => verifyCert(otherCert, user.userId, trustKey, primaryKey) &&
           otherCert.created > sigDate);
}

function verifyCert(cert, userId, trustKey, primaryKey) {
  return cert.issuerKeyId.equals(trustKey.primaryKey.getKeyId()) &&
         !cert.isExpired() &&
         (cert.verified ||
          cert.verify(trustKey.primaryKey, {userid: userId, key: primaryKey}));
}
