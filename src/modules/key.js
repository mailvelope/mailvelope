/**
 * Copyright (C) 2018 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from '../lib/lib-mvelo';
import * as openpgp from 'openpgp';
import {goog} from './closure-library/closure/goog/emailaddress';
const l10n = mvelo.l10n.getMessage;
import {isKeyPseudoRevoked} from './trustKey';

/**
 * Get primary or first available user id of key
 * @param  {openpgp.Key} key
 * @param  {Boolean} [validityCheck=true] - only return valid user ids, e.g. for expired keys you would want to set to false to still get a result
 * @return {String} user id
 */
export async function getUserId(key, validityCheck = true) {
  const primaryUser = await key.getPrimaryUser();
  if (primaryUser) {
    return primaryUser.user.userId.userid;
  } else {
    // there is no valid user id on this key
    if (!validityCheck) {
      // take first available user ID
      for (const user of key.users) {
        if (user.userId) {
          return user.userId.userid;
        }
      }
    }
    return l10n('keygrid_invalid_userid');
  }
}

export async function cloneKey(key) {
  const binary = key.toPacketlist().write();
  const packetList = new openpgp.packet.List();
  await packetList.read(binary);
  return new openpgp.key.Key(packetList);
}

export function mapKeyUserIds(user) {
  try {
    const emailAddress = goog.format.EmailAddress.parse(user.userId);
    if (emailAddress.isValid()) {
      user.email = emailAddress.getAddress();
    } else {
      user.email = '';
    }
    user.name = emailAddress.getName();
  } catch (e) {
    user.userId = l10n('keygrid_invalid_userid');
    user.email = '';
    user.name = '';
  }
}

export async function mapKeys(keys) {
  return Promise.all(keys.map(async key => {
    const uiKey = {};
    if (key.isPublic()) {
      uiKey.type = 'public';
    } else {
      uiKey.type = 'private';
    }
    try {
      uiKey.validity = await key.verifyPrimaryKey() === openpgp.enums.keyStatus.valid;
    } catch (e) {
      uiKey.validity = false;
      console.log(`Error in mapKeys on verifyPrimaryKey for key ${key.keyPacket.getFingerprint()}.`, e);
    }
    uiKey.keyId = key.primaryKey.getKeyId().toHex().toUpperCase();
    uiKey.fingerprint = key.primaryKey.getFingerprint();
    // primary user
    try {
      uiKey.userId = await getUserId(key, false);
      const address = goog.format.EmailAddress.parse(uiKey.userId);
      uiKey.name = address.getName();
      uiKey.email = address.getAddress();
      uiKey.exDate = await key.getExpirationTime();
      if (uiKey.exDate === Infinity) {
        uiKey.exDate = false;
      } else {
        uiKey.exDate = uiKey.exDate.toISOString();
      }
    } catch (e) {
      uiKey.name = uiKey.name || 'NO USERID FOUND';
      uiKey.email = uiKey.email || 'UNKNOWN';
      uiKey.exDate = uiKey.exDate || 'UNKNOWN';
      console.log(`Error in mapKeys on mapping primary user for key ${key.keyPacket.getFingerprint()}.`, e);
    }
    uiKey.crDate = key.primaryKey.created.toISOString();
    const keyInfo = key.primaryKey.getAlgorithmInfo();
    uiKey.algorithm = getAlgorithmString(keyInfo);
    uiKey.bitLength = keyInfo.bits;
    return uiKey;
  }));
}

function getAlgorithmString({algorithm, curve}) {
  let result = '';
  switch (algorithm) {
    case 'rsa_encrypt_sign':
      result = 'RSA (Encrypt or Sign)';
      break;
    case 'rsa_encrypt':
      result = 'RSA Encrypt-Only';
      break;
    case 'rsa_sign':
      result = 'RSA Sign-Only';
      break;
    case 'elgamal':
      result = 'Elgamal (Encrypt-Only)';
      break;
    case 'dsa':
      result = 'DSA (Digital Signature Algorithm)';
      break;
    case 'ecdh':
      result = 'ECDH (Encrypt only)';
      break;
    case 'ecdsa':
      result = 'ECDSA (Sign only)';
      break;
    case 'eddsa':
      result = 'EdDSA (Sign only)';
      break;
    default:
      result = "UNKNOWN";
  }
  if (curve) {
    result = `${result} - ${curve}`;
  }
  return result;
}

export async function mapSubKeys(subkeys = [], toKey, primaryKey) {
  toKey.subkeys = [];
  await Promise.all(subkeys.map(async subkey => {
    try {
      const skey = {};
      skey.crDate = subkey.keyPacket.created.toISOString();
      skey.exDate = await subkey.getExpirationTime(primaryKey);
      if (skey.exDate === Infinity) {
        skey.exDate = false;
      } else {
        skey.exDate = skey.exDate.toISOString();
      }
      skey.keyId = subkey.keyPacket.getKeyId().toHex().toUpperCase();
      const keyInfo = subkey.keyPacket.getAlgorithmInfo();
      skey.algorithm = getAlgorithmString(keyInfo);
      skey.bitLength = keyInfo.bits;
      skey.fingerprint = subkey.keyPacket.getFingerprint();
      toKey.subkeys.push(skey);
    } catch (e) {
      console.log('Exception in mapSubKeys', e);
    }
  }));
}

export async function mapUsers(users = [], toKey, keyring, primaryKey) {
  toKey.users = [];
  await Promise.all(users.map(async user => {
    try {
      const uiUser = {};
      if (!user.userId) {
        // filter out user attribute packages
        return;
      }
      uiUser.userId = user.userId.userid;
      uiUser.signatures = [];
      if (!user.selfCertifications) {
        return;
      }
      for (const selfCert of user.selfCertifications) {
        if (await verifyUserCertificate(user, primaryKey, selfCert) !== openpgp.enums.keyStatus.valid) {
          continue;
        }
        const sig = {};
        sig.signer = user.userId.userid;
        sig.keyId = selfCert.issuerKeyId.toHex().toUpperCase();
        sig.crDate = selfCert.created.toISOString();
        uiUser.signatures.push(sig);
      }
      if (!uiUser.signatures.length || !user.otherCertifications) {
        return;
      }
      for (const otherCert of user.otherCertifications) {
        const sig = {};
        const keyidHex = otherCert.issuerKeyId.toHex();
        const issuerKeys = keyring.getKeysForId(keyidHex);
        if (issuerKeys) {
          const [{keyPacket: signingKeyPacket}] = issuerKeys[0].getKeys(otherCert.issuerKeyId);
          if (signingKeyPacket && await verifyUserCertificate(user, primaryKey, otherCert, signingKeyPacket) === openpgp.enums.keyStatus.valid) {
            sig.signer = await getUserId(issuerKeys[0]);
          } else {
            // invalid signature
            continue;
          }
        } else {
          sig.signer = l10n("keygrid_signer_unknown");
        }
        sig.keyId = keyidHex.toUpperCase();
        sig.crDate = otherCert.created.toISOString();
        uiUser.signatures.push(sig);
      }
      toKey.users.push(uiUser);
    } catch (e) {
      console.log('Exception in mapUsers', e);
    }
  }));
}

export async function verifyUserCertificate(user, primaryKey, certificate, key = primaryKey) {
  if (!(certificate.verified || await certificate.verify(key, {userId: user.userId, userAttribute: user.userAttribute, key: primaryKey}))) {
    return openpgp.enums.keyStatus.invalid;
  }
  if (certificate.revoked || await user.isRevoked(primaryKey, certificate, key)) {
    return openpgp.enums.keyStatus.revoked;
  }
  if (certificate.isExpired()) {
    return openpgp.enums.keyStatus.expired;
  }
  return openpgp.enums.keyStatus.valid;
}

export function checkKeyId(sourceKey, keyring) {
  const primaryKeyId = sourceKey.primaryKey.getKeyId();
  const keys = keyring.getKeysForId(primaryKeyId.toHex(), true);
  if (keys) {
    for (const key of keys) {
      if (!key.primaryKey.getKeyId().equals(primaryKeyId)) {
        throw new Error('Primary keyId equals existing sub keyId.');
      }
    }
  }
  for (const subKey of sourceKey.getSubkeys()) {
    const subKeyId = subKey.keyPacket.getKeyId();
    const keys = keyring.getKeysForId(subKeyId.toHex(), true);
    if (!keys) {
      continue;
    }
    for (const key of keys) {
      if (key.primaryKey.getKeyId().equals(subKeyId)) {
        throw new Error('Sub keyId equals existing primary keyId.');
      }
      if (!key.primaryKey.getKeyId().equals(primaryKeyId)) {
        throw new Error('Sub keyId equals existing sub keyId in key with different primary keyId.');
      }
    }
  }
}

/**
 * Get most recent created date field of all packets in the key
 * @param  {openpgp.key.Key} key
 * @return {Date}
 */
export function getLastModifiedDate(key) {
  let lastModified = new Date(0);
  key.toPacketlist().forEach(packet => {
    if (packet.created && packet.created > lastModified) {
      lastModified = packet.created;
    }
  });
  return lastModified;
}

export function mapAddressKeyMapToFpr(addressKeyMap = []) {
  for (const address in addressKeyMap) {
    addressKeyMap[address] = addressKeyMap[address] && addressKeyMap[address].map(key => key.primaryKey.getFingerprint());
  }
  return addressKeyMap;
}

/**
 * Check if is key is valid and can be used for encryption
 * @param  {openpgp.key.Key}  key
 * @param  {String} - [keyringId] - if keyring is provided, pseudo-revoked status is checked
 * @return {Boolean}
 */
export async function isValidEncryptionKey(key, keyringId) {
  try {
    return await key.getEncryptionKey() !== null && !await isKeyPseudoRevoked(keyringId, key);
  } catch (e) {
    console.log(`Error in isValidEncryptionKey for key ${key.keyPacket.getFingerprint()}.`, e);
    return false;
  }
}

export function sortKeysByCreationDate(keys, defaultKeyFpr) {
  keys.sort((a, b) => {
    if (defaultKeyFpr) {
      if (defaultKeyFpr === a.primaryKey.getFingerprint()) {
        return -1;
      }
      if (defaultKeyFpr === b.primaryKey.getFingerprint()) {
        return 1;
      }
    }
    return b.primaryKey.created - a.primaryKey.created;
  });
}

export function equalKey(key1, key2) {
  return key1.primaryKey.getFingerprint() === key2.primaryKey.getFingerprint();
}

export function toPublic(key) {
  if (key.isPublic()) {
    return key;
  }
  return key.toPublic();
}

/**
 * Filter out any User IDs that do not have the email provided.
 * @param {openpgp.key.Key}  key    The key to filter
 * @param {String}           email  The email of userIds to keep
 *
 * @return {openpgp.key.Key} The key with only matching userIds
 */
export function filterUserIdsByEmail(key, email) {
  const keptUsers = [];

  for (const user of key.users) {
    const userMapped = {userId: user.userId.userid};
    mapKeyUserIds(userMapped);
    if (userMapped.email.toLowerCase() === email.toLowerCase()) {
      keptUsers.push(user);
    }
  }

  const ret = key;
  ret.users = keptUsers;
  return ret;
}
