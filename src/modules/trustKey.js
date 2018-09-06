/**
 * Copyright (C) 2015-2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from '../lib/lib-mvelo';
import * as openpgp from 'openpgp';
import * as certs from './certs';
import {verifyUserCertificate} from './key';

const keyMap = new Map();

export async function init() {
  const {keys: [key]} = await openpgp.key.readArmored(certs.c1und1);
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
  return mvelo.util.someAsync(key.users, user => isUserPseudoRevoked(user, trustKey, key.primaryKey));
}

function isUserPseudoRevoked(user, trustKey, primaryKey) {
  if (!user.revocationCertifications || !user.userId) {
    return false;
  }
  return mvelo.util.someAsync(user.revocationCertifications, async revCert => revCert.reasonForRevocationFlag === 101 &&
           await verifyCert(revCert, user, trustKey, primaryKey) &&
           !await hasNewerCert(user, trustKey, primaryKey, revCert.created));
}

function hasNewerCert(user, trustKey, primaryKey, sigDate) {
  if (!user.otherCertifications) {
    return false;
  }
  return mvelo.util.someAsync(user.otherCertifications, async otherCert => await verifyCert(otherCert, user, trustKey, primaryKey) && otherCert.created > sigDate);
}

async function verifyCert(cert, user, trustKey, primaryKey) {
  return cert.issuerKeyId.equals(trustKey.primaryKey.getKeyId()) &&
         await verifyUserCertificate(user, primaryKey, cert, trustKey.primaryKey) === openpgp.enums.keyStatus.valid;
}
