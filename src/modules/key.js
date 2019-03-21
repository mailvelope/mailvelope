/**
 * Copyright (C) 2018 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import * as openpgp from 'openpgp';
import {goog} from './closure-library/closure/goog/emailaddress';
import * as l10n from '../lib/l10n';
import {isKeyPseudoRevoked} from './trustKey';

/**
 * Get primary or first available user id, email and name of key
 * @param  {openpgp.Key} key
 * @param  {Boolean} [validityCheck=true] - only return valid user ids, e.g. for expired keys you would want to set to false to still get a result
 * @return {Object<userId, email, content>}
 */
export async function getUserInfo(key, validityCheck = true) {
  let primaryUser = await key.getPrimaryUser();
  primaryUser = primaryUser ? primaryUser.user : null;
  if (!primaryUser && !validityCheck) {
    // take first available user with user ID
    primaryUser = key.users.find(user => user.userId);
  }
  if (!primaryUser) {
    return {userId: l10n.get('keygrid_invalid_userid'), email: '', name: ''};
  }
  const {userid: userId, name, email} = primaryUser.userId;
  const result = {userId, name, email};
  parseUserId(result);
  return result;
}

export async function cloneKey(key) {
  const binary = key.toPacketlist().write();
  const packetList = new openpgp.packet.List();
  await packetList.read(binary);
  return new openpgp.key.Key(packetList);
}

export function parseUserId(user) {
  if (user.name || user.email) {
    // user ID already parsed correctly by OpenPGP.js
    return;
  }
  try {
    const emailAddress = goog.format.EmailAddress.parse(user.userId);
    if (emailAddress.isValid()) {
      user.email = emailAddress.getAddress();
    } else {
      user.email = '';
    }
    user.name = emailAddress.getName();
  } catch (e) {}
  if (!user.name && !user.email) {
    user.name = l10n.get('keygrid_invalid_userid');
  }
}

export async function mapKeys(keys) {
  return Promise.all(keys.map(async key => {
    let uiKey = {};
    if (key.isPublic()) {
      uiKey.type = 'public';
    } else {
      uiKey.type = 'private';
    }
    try {
      uiKey.status = await key.verifyPrimaryKey();
    } catch (e) {
      uiKey.status = openpgp.enums.keyStatus.invalid;
      console.log(`Error in mapKeys on verifyPrimaryKey for key ${key.keyPacket.getFingerprint()}.`, e);
    }
    uiKey.validity = uiKey.status === openpgp.enums.keyStatus.valid;
    uiKey.keyId = key.primaryKey.getKeyId().toHex().toUpperCase();
    uiKey.fingerprint = key.primaryKey.getFingerprint();
    // primary user
    try {
      const userInfo = await getUserInfo(key, false);
      uiKey = {...uiKey, ...userInfo};
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
      result = 'UNKNOWN';
  }
  if (curve) {
    result = `${result} - ${curve}`;
  }
  return result;
}

export async function mapSubKeys(subkeys = [], toKey, key) {
  const primaryKey = key.primaryKey;
  toKey.subkeys = [];
  await Promise.all(subkeys.map(async subkey => {
    try {
      const skey = {};
      const keyStatus = await key.verifyPrimaryKey();
      const subKeyStatus = await subkey.verify(primaryKey);
      skey.status = subKeyStatus < keyStatus ? subKeyStatus : keyStatus;
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

export async function mapUsers(users = [], toKey, keyring, key) {
  toKey.users = [];
  const {user: {userId: {userid: primaryUserId}}} = await key.getPrimaryUser();
  for (const [index, user] of users.entries()) {
    try {
      const uiUser = {};
      if (!user.userId) {
        // filter out user attribute packages
        continue;
      }
      uiUser.id = index;
      uiUser.userId = user.userId.userid;
      uiUser.email = user.userId.email;
      uiUser.name = user.userId.name;
      parseUserId(uiUser);
      uiUser.isPrimary = user.userId.userid === primaryUserId;
      const keyStatus = await key.verifyPrimaryKey();
      const userStatus = await user.verify(key.primaryKey);
      uiUser.status = userStatus < keyStatus ? userStatus : keyStatus;
      uiUser.signatures = [];
      if (!user.selfCertifications) {
        continue;
      }
      for (const selfCert of user.selfCertifications) {
        const sig = {};
        sig.signer = {userId: user.userId.userid, email: user.userId.email, name: user.userId.name};
        sig.keyId = selfCert.issuerKeyId.toHex().toUpperCase();
        sig.crDate = selfCert.created.toISOString();
        uiUser.signatures.push(sig);
      }
      if (!uiUser.signatures.length || !user.otherCertifications) {
        continue;
      }
      for (const otherCert of user.otherCertifications) {
        const sig = {};
        const keyidHex = otherCert.issuerKeyId.toHex();
        const issuerKeys = keyring.getKeysForId(keyidHex, true);
        if (issuerKeys) {
          const [{keyPacket: signingKeyPacket}] = issuerKeys[0].getKeys(otherCert.issuerKeyId);
          if (signingKeyPacket && await verifyUserCertificate(user, key.primaryKey, otherCert, signingKeyPacket) === openpgp.enums.keyStatus.valid) {
            sig.signer = await getUserInfo(issuerKeys[0]);
          } else {
            // invalid signature
            continue;
          }
        } else {
          sig.signer = {
            userId: l10n.get('keygrid_signer_unknown'),
            email: null,
            name: null
          };
        }
        sig.keyId = keyidHex.toUpperCase();
        sig.crDate = otherCert.created.toISOString();
        uiUser.signatures.push(sig);
      }
      toKey.users.push(uiUser);
    } catch (e) {
      console.log('Exception in mapUsers', e);
    }
  }
}

export async function verifyUserCertificate(user, primaryKey, certificate, key = primaryKey) {
  if (!(certificate.verified || await certificate.verify(key, openpgp.enums.signature.cert_generic, {userId: user.userId, userAttribute: user.userAttribute, key: primaryKey}))) {
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
  key.users = key.users.filter(user => user.userId.email.toLowerCase() === email.toLowerCase());
  return key;
}
