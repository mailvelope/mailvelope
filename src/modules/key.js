/**
 * Copyright (C) 2018 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import {readKey, PacketList, SignaturePacket, enums} from 'openpgp';
import {goog} from './closure-library/closure/goog/emailaddress';
import * as l10n from '../lib/l10n';
import {KEY_STATUS} from '../lib/constants';
import {isKeyPseudoRevoked} from './trustKey';

/**
 * Get primary or first available user id, email and name of key
 * @param  {openpgp.Key} key
 * @param  {Boolean} [allowInvalid=false] - allow invalid user IDs, e.g. for expired keys you would want to set to false to still get a result
 * @param  {Boolean} [strict=false] - only the valid primary user is considered, otherwise null is returned
 * @return {Object<userId, email, content>}
 */
export async function getUserInfo(key, {allowInvalid = false, strict = false} = {}) {
  let primaryUser;
  try {
    ({user: primaryUser} = await key.getPrimaryUser());
  } catch (e) {
    console.log('No valid primary user found for key', e);
  }
  if (!primaryUser && strict) {
    return null;
  }
  if (!primaryUser && allowInvalid) {
    // take first available user with user ID
    primaryUser = key.users.find(user => user.userID);
  }
  if (!primaryUser) {
    return {userId: l10n.get('keygrid_invalid_userid'), email: '', name: ''};
  }
  const {userID: userId, name, email} = primaryUser.userID;
  const result = {userId, name, email};
  parseUserId(result);
  return result;
}

export async function cloneKey(key) {
  const binaryKey = key.toPacketList().write();
  return readKey({binaryKey});
}

export function parseUserId(user) {
  user.name ??= '';
  user.email ??= '';
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

export function formatEmailAddress(email, name) {
  const emailAddress = new goog.format.EmailAddress(email, name);
  return emailAddress.toString();
}

export async function verifyPrimaryKey(key) {
  try {
    await key.verifyPrimaryKey();
    return KEY_STATUS.valid;
  } catch (e) {
    switch (e.message) {
      case 'Primary key is revoked':
      case 'Primary user is revoked':
        return KEY_STATUS.revoked;
      case 'Primary key is expired':
        return KEY_STATUS.expired;
      default:
        return KEY_STATUS.invalid;
    }
  }
}

export async function verifyUser(user) {
  try {
    await user.verify();
    return KEY_STATUS.valid;
  } catch (e) {
    switch (e.message) {
      case 'No self-certifications found':
        return KEY_STATUS.no_self_cert;
      case 'Self-certification is revoked':
        return KEY_STATUS.revoked;
      default:
        return KEY_STATUS.invalid;
    }
  }
}

export async function verifySubKey(subKey) {
  try {
    await subKey.verify();
    return KEY_STATUS.valid;
  } catch (e) {
    switch (e.message) {
      case 'Subkey is revoked':
        return KEY_STATUS.revoked;
      case 'Subkey is expired':
        return KEY_STATUS.expired;
      default:
        return KEY_STATUS.invalid;
    }
  }
}

export function mapKeys(keys) {
  return Promise.all(keys.map(async key => {
    let uiKey = {};
    if (key.isPrivate()) {
      uiKey.type = 'private';
    } else {
      uiKey.type = 'public';
    }
    uiKey.status = await verifyPrimaryKey(key);
    uiKey.validity = uiKey.status === KEY_STATUS.valid;
    uiKey.keyId = key.getKeyID().toHex().toUpperCase();
    uiKey.fingerprint = key.getFingerprint();
    // primary user
    try {
      const userInfo = await getUserInfo(key, {allowInvalid: true});
      uiKey = {...uiKey, ...userInfo};
      uiKey.exDate = await key.getExpirationTime();
      if (uiKey.exDate === Infinity) {
        uiKey.exDate = false;
      } else if (uiKey.exDate !== null) {
        uiKey.exDate = uiKey.exDate.toISOString();
      }
    } catch (e) {
      uiKey.name = uiKey.name || 'NO USERID FOUND';
      uiKey.email = uiKey.email || 'UNKNOWN';
      uiKey.exDate = uiKey.exDate || null;
      console.log(`Error in mapKeys on mapping primary user for key ${key.getFingerprint()}.`, e);
    }
    uiKey.crDate = key.keyPacket.created.toISOString();
    const keyInfo = key.getAlgorithmInfo();
    uiKey.algorithm = getAlgorithmString(keyInfo);
    uiKey.bitLength = getKeyBitLength(keyInfo);
    return uiKey;
  }));
}

function getAlgorithmString({algorithm, curve}) {
  let result = '';
  switch (algorithm) {
    case 'rsaEncryptSign':
      result = 'RSA (Encrypt or Sign)';
      break;
    case 'rsaEncrypt':
      result = 'RSA Encrypt-Only';
      break;
    case 'rsaSign':
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

function getKeyBitLength({bits, curve}) {
  if (bits) {
    return bits;
  }
  if (curve === enums.curve.ed25519 || curve === enums.curve.curve25519) {
    return 256;
  }
  return 'UNKNOWN';
}

export async function mapSubKeys(subkeys = [], toKey, key) {
  const primaryKey = key.keyPacket;
  toKey.subkeys = [];
  await Promise.all(subkeys.map(async subkey => {
    try {
      const skey = {};
      const keyStatus = await verifyPrimaryKey(key);
      const subKeyStatus = await verifySubKey(subkey);
      skey.status = subKeyStatus < keyStatus ? subKeyStatus : keyStatus;
      skey.crDate = subkey.keyPacket.created.toISOString();
      skey.exDate = await subkey.getExpirationTime(primaryKey);
      if (skey.exDate === Infinity) {
        skey.exDate = false;
      } else if (skey.exDate !== null) {
        skey.exDate = skey.exDate.toISOString();
      }
      skey.keyId = subkey.getKeyID().toHex().toUpperCase();
      const keyInfo = subkey.getAlgorithmInfo();
      skey.algorithm = getAlgorithmString(keyInfo);
      skey.bitLength = getKeyBitLength(keyInfo);
      skey.fingerprint = subkey.getFingerprint();
      toKey.subkeys.push(skey);
    } catch (e) {
      console.log('Exception in mapSubKeys', e);
    }
  }));
}

export async function mapUsers(users = [], toKey, keyring, key) {
  toKey.users = [];
  let primaryUserId;
  try {
    ({user: {userID: {userID: primaryUserId}}} = await key.getPrimaryUser());
  } catch (e) {}
  for (const [index, user] of users.entries()) {
    try {
      const uiUser = {};
      const {userID} = user;
      if (!userID) {
        // filter out user attribute packages
        continue;
      }
      uiUser.id = index;
      uiUser.userId = userID.userID;
      uiUser.email = userID.email;
      uiUser.name = userID.name;
      parseUserId(uiUser);
      uiUser.isPrimary = userID.userID === primaryUserId;
      const keyStatus = await verifyPrimaryKey(key);
      const userStatus = await verifyUser(user);
      uiUser.status = userStatus < keyStatus ? userStatus : keyStatus;
      uiUser.signatures = [];
      if (!user.selfCertifications) {
        continue;
      }
      for (const selfCert of user.selfCertifications) {
        const sig = {};
        sig.signer = {userId: userID.userID, email: userID.email, name: userID.name};
        sig.keyId = selfCert.issuerKeyID.toHex().toUpperCase();
        sig.crDate = selfCert.created.toISOString();
        uiUser.signatures.push(sig);
      }
      if (!uiUser.signatures.length || !user.otherCertifications) {
        continue;
      }
      for (const otherCert of user.otherCertifications) {
        const sig = {};
        const keyidHex = otherCert.issuerKeyID.toHex();
        const issuerKeys = keyring.getKeysForId(keyidHex, true);
        if (issuerKeys) {
          if (await verifyUserCertificate(user, otherCert, issuerKeys[0]) === KEY_STATUS.valid) {
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

/**
 * Create a minimal key consisting of only:
 *   * a signing-capable primary key
 *   * a user id
 *   * a self signature over the user id by the primary key
 *   * an encryption-capable subkey
 *   * a binding signature over the subkey by the primary key
 * @param  {openpgp.key.Key} key
 * @param  {Object} userId - conditions for the user id to keep
 *                           see openpgp.key.Key getPrimaryUser()
 * @return {openpgp.key.Key}
 */
export async function minifyKey(key, userId) {
  let user;
  try {
    ({user} = await key.getPrimaryUser(undefined, userId));
  } catch (e) {}
  if (!user) {
    return null;
  }
  let p = new PacketList();
  p.push(key.keyPacket);
  p.push(user.userID || user.userAttribute);
  p = p.concat(user.selfCertifications);
  let signSubkey;
  try {
    signSubkey = await key.getSigningKey();
    if (key !== signSubkey) {
      p = p.concat(signSubkey.toPacketList());
    }
  } catch (e) {}
  try {
    const encSubkey = await key.getEncryptionKey();
    if (key !== encSubkey && signSubkey !== encSubkey) {
      p = p.concat(encSubkey.toPacketList());
    }
  } catch (e) {}
  const binaryKey = p.write();
  return readKey({binaryKey});
}

export async function verifyUserCertificate(user, certificate, key) {
  try {
    await user.verifyCertificate(certificate, [key]);
    return KEY_STATUS.valid;
  } catch (e) {
    switch (e.message) {
      case 'User certificate is revoked':
      case 'Primary user is revoked':
        return KEY_STATUS.revoked;
      default:
        return KEY_STATUS.invalid;
    }
  }
}

export function checkKeyId(sourceKey, keyring) {
  const primaryKeyId = sourceKey.getKeyID();
  const keys = keyring.getKeysForId(primaryKeyId.toHex(), true);
  if (keys) {
    for (const key of keys) {
      if (!key.getKeyID().equals(primaryKeyId)) {
        throw new Error('Primary keyId equals existing sub keyId.');
      }
    }
  }
  for (const subKey of sourceKey.getSubkeys()) {
    const subKeyId = subKey.getKeyID();
    const keys = keyring.getKeysForId(subKeyId.toHex(), true);
    if (!keys) {
      continue;
    }
    for (const key of keys) {
      if (key.getKeyID().equals(subKeyId)) {
        throw new Error('Sub keyId equals existing primary keyId.');
      }
      if (!key.getKeyID().equals(primaryKeyId)) {
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
  key.toPacketList().forEach(packet => {
    if (packet.created && packet.created > lastModified) {
      lastModified = packet.created;
    }
  });
  return lastModified;
}

export function mapAddressKeyMapToFpr(addressKeyMap = []) {
  for (const address in addressKeyMap) {
    addressKeyMap[address] = addressKeyMap[address] && addressKeyMap[address].map(key => key.getFingerprint());
  }
  return addressKeyMap;
}

/**
 * Check if this key is valid and can be used for encryption
 * @param  {openpgp.key.Key}  key
 * @param  {String} - [keyringId] - if keyring is provided, pseudo-revoked status is checked
 * @return {Boolean}
 */
export async function isValidEncryptionKey(key, keyringId) {
  try {
    return await key.getEncryptionKey() && !await isKeyPseudoRevoked(keyringId, key);
  } catch (e) {
    return false;
  }
}

export function sortKeysByCreationDate(keys, defaultKeyFpr) {
  keys.sort((a, b) => {
    if (defaultKeyFpr) {
      if (defaultKeyFpr === a.getFingerprint()) {
        return -1;
      }
      if (defaultKeyFpr === b.getFingerprint()) {
        return 1;
      }
    }
    return b.keyPacket.created - a.keyPacket.created;
  });
}

export function equalKey(key1, key2) {
  return key1.getFingerprint() === key2.getFingerprint();
}

export function toPublic(key) {
  if (!key.isPrivate()) {
    return key;
  }
  return key.toPublic();
}

/**
 * Filter out any User IDs that do not have the email provided.
 * @param {openpgp.key.Key}  key - The key to filter
 * @param {String}           email - The email of userIds to keep, keep all userIds if empty
 *
 * @return {openpgp.key.Key} The key with only matching userIds
 */
export function filterUserIdsByEmail(key, filterEmail) {
  if (!filterEmail) {
    return key;
  }
  key.users = key.users.filter(user => {
    if (!user.userID) {
      return;
    }
    const {userID: userId, name, email} = user.userID;
    const id = {userId, name, email};
    parseUserId(id);
    return id.email.toLowerCase() === filterEmail.toLowerCase();
  });
  return key;
}

/**
 * Filter out invalid keys and user IDs
 * @param  {openpgp.key.Key} key - key to be sanitized
 * @return {openpgp.key.Key|null}       the sanitized key or null if is invalid (expired and revoked keys are still considered as valid)
 */
export async function sanitizeKey(key) {
  // filter out users with no or invalid self certificate
  const users = [];
  for (const user of key.users) {
    try {
      const status = await verifyUser(user);
      if (status === KEY_STATUS.no_self_cert ||
          status === KEY_STATUS.invalid) {
        continue;
      }
      users.push(user);
    } catch (e) {}
  }
  key.users = users;
  // discard key without users
  if (!key.users.length) {
    return null;
  }
  // filter out sub keys with no or invalid binding signature
  const subKeys = [];
  for (const subKey of key.subkeys) {
    try {
      const status = await verifySubKey(subKey);
      if (status === KEY_STATUS.invalid) {
        continue;
      }
      subKeys.push(subKey);
    } catch (e) {}
  }
  key.subkeys = subKeys;
  return key;
}

export async function verifyForAddress(key, email) {
  email = email.toLowerCase();
  for (const keyUser of key.users) {
    try {
      const userID = keyUser.userID;
      if (!userID) {
        continue;
      }
      const user = {userId: userID.userID, name: userID.name, email: userID.email};
      parseUserId(user);
      if (email !== user.email.toLowerCase()) {
        continue;
      }
      const status = await verifyUser(keyUser);
      if (status !== KEY_STATUS.valid) {
        continue;
      }
      return true;
    } catch (e) {}
  }
  return false;
}

export function removeHexPrefix(keyId) {
  if (/^0x/.test(keyId)) {
    return keyId.substring(2);
  }
  return keyId;
}

export function keyIDfromHex({keyId, fingerprint}) {
  const sigPacket = new SignaturePacket();
  return sigPacket.issuerKeyID.constructor.fromID(keyId ?? fingerprint.slice(-16));
}
