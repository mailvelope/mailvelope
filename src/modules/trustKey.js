/**
 * Copyright (C) 2015-2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import {someAsync} from '../lib/util';
import {KEYRING_DELIMITER, KEY_STATUS} from '../lib/constants';
import {readKey} from 'openpgp';
import * as certs from './certs';
import {verifyUserCertificate} from './key';

const keyMap = new Map();

export async function init() {
  const key = await readKey({armoredKey: certs.c1und1});
  keyMap.set('gmx.net', key);
  keyMap.set('web.de', key);
}

export function getTrustKey(keyringId) {
  const domain = keyringId.split(KEYRING_DELIMITER)[0];
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
  return someAsync(key.users, user => isUserPseudoRevoked(user, trustKey));
}

function isUserPseudoRevoked(user, trustKey) {
  if (!user.revocationSignatures || !user.userID) {
    return false;
  }
  return someAsync(user.revocationSignatures, async revCert => revCert.reasonForRevocationFlag === 101 &&
           await verifyCert(revCert, user, trustKey) &&
           !await hasNewerCert(user, trustKey, revCert.created));
}

function hasNewerCert(user, trustKey, sigDate) {
  if (!user.otherCertifications) {
    return false;
  }
  return someAsync(user.otherCertifications, async otherCert => await verifyCert(otherCert, user, trustKey) && otherCert.created > sigDate);
}

async function verifyCert(cert, user, trustKey) {
  return cert.issuerKeyID.equals(trustKey.getKeyID()) &&
         await verifyUserCertificate(user, cert, trustKey.keyPacket) === KEY_STATUS.valid;
}
