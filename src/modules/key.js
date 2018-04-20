/**
 * Copyright (C) 2018 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from '../lib/lib-mvelo';
import * as openpgp from 'openpgp';
import {goog} from './closure-library/closure/goog/emailaddress';
const l10n = mvelo.l10n.getMessage;

/**
 * Get primary or first available user id of key
 * @param  {openpgp.Key} key
 * @param  {Boolean} [validityCheck=true] - only return valid user ids, e.g. for expired keys you would want to set to false to still get a result
 * @return {String} user id
 */
export function getUserId(key, validityCheck) {
  validityCheck = typeof validityCheck === 'undefined' ? true : false;
  const primaryUser = key.getPrimaryUser();
  if (primaryUser) {
    return primaryUser.user.userId.userid;
  } else {
    // there is no valid user id on this key
    if (!validityCheck) {
      // take first available user ID
      for (let i = 0; i < key.users.length; i++) {
        if (key.users[i].userId) {
          return key.users[i].userId.userid;
        }
      }
    }
    return l10n('keygrid_invalid_userid');
  }
}

export function cloneKey(key) {
  const binary = key.toPacketlist().write();
  const packetList = new openpgp.packet.List();
  packetList.read(binary);
  return new openpgp.key.Key(packetList);
}

export function mapKeyUserIds(user) {
  try {
    const emailAddress = goog.format.EmailAddress.parse(user.userid);
    if (emailAddress.isValid()) {
      user.email = emailAddress.getAddress();
    } else {
      user.email = '';
    }
    user.name = emailAddress.getName();
  } catch (e) {
    user.userid = l10n('keygrid_invalid_userid');
    user.email = '';
    user.name = '';
  }
}

export function mapKeys(keys) {
  const result = [];
  keys.forEach(key => {
    const uiKey = {};
    if (key.isPublic()) {
      uiKey.type = 'public';
    } else {
      uiKey.type = 'private';
    }
    try {
      uiKey.validity = key.verifyPrimaryKey() === openpgp.enums.keyStatus.valid;
    } catch (e) {
      uiKey.validity = false;
      console.log('Exception in verifyPrimaryKey', e);
    }
    uiKey.id = key.primaryKey.getKeyId().toHex().toUpperCase();
    uiKey.fingerprint = key.primaryKey.getFingerprint().toUpperCase();
    // primary user
    try {
      uiKey.userId = getUserId(key, false);
      const address = goog.format.EmailAddress.parse(uiKey.userId);
      uiKey.name = address.getName();
      uiKey.email = address.getAddress();
      uiKey.exDate = key.getExpirationTime();
      if (uiKey.exDate) {
        uiKey.exDate = uiKey.exDate.toISOString();
      } else {
        uiKey.exDate = false;
      }
    } catch (e) {
      uiKey.name = uiKey.name || 'NO USERID FOUND';
      uiKey.email = uiKey.email || 'UNKNOWN';
      uiKey.exDate = uiKey.exDate || 'UNKNOWN';
      console.log('Exception map primary user', e);
    }
    uiKey.crDate = key.primaryKey.created.toISOString();
    uiKey.algorithm = getAlgorithmString(key.primaryKey.algorithm);
    uiKey.bitLength = key.primaryKey.getBitSize();
    result.push(uiKey);
  });
  return result;
}

function getAlgorithmString(keyType) {
  let result = '';
  switch (keyType) {
    case 'rsa_encrypt_sign':
      result = "RSA (Encrypt or Sign)";
      break;
    case 'rsa_encrypt':
      result = "RSA Encrypt-Only";
      break;
    case 'rsa_sign':
      result = "RSA Sign-Only";
      break;
    case 'elgamal':
      result = "Elgamal (Encrypt-Only)";
      break;
    case 'dsa':
      result = "DSA (Digital Signature Algorithm)";
      break;
    default:
      result = "UNKNOWN";
  }
  return result;
}

export function mapSubKeys(subkeys, toKey) {
  toKey.subkeys = [];
  subkeys && subkeys.forEach(subkey => {
    try {
      const skey = {};
      skey.crDate = subkey.subKey.created.toISOString();
      skey.exDate = subkey.getExpirationTime();
      if (skey.exDate) {
        skey.exDate = skey.exDate.toISOString();
      } else {
        skey.exDate = false;
      }
      skey.id = subkey.subKey.getKeyId().toHex().toUpperCase();
      skey.algorithm = getAlgorithmString(subkey.subKey.algorithm);
      skey.bitLength = subkey.subKey.getBitSize();
      skey.fingerprint = subkey.subKey.getFingerprint().toUpperCase();
      toKey.subkeys.push(skey);
    } catch (e) {
      console.log('Exception in mapSubKeys', e);
    }
  });
}

export function mapUsers(users, toKey, keyring, primaryKey) {
  toKey.users = [];
  users && users.forEach(user => {
    try {
      const uiUser = {};
      uiUser.userID = user.userId.userid;
      uiUser.signatures = [];
      user.selfCertifications && user.selfCertifications.forEach(selfCert => {
        if (!user.isValidSelfCertificate(primaryKey, selfCert)) {
          return;
        }
        const sig = {};
        sig.signer = user.userId.userid;
        sig.id = selfCert.issuerKeyId.toHex().toUpperCase();
        sig.crDate = selfCert.created.toISOString();
        uiUser.signatures.push(sig);
      });
      user.otherCertifications && user.otherCertifications.forEach(otherCert => {
        const sig = {};
        const keyidHex = otherCert.issuerKeyId.toHex();
        const issuerKeys = keyring.getKeysForId(keyidHex);
        if (issuerKeys) {
          const signingKeyPacket = issuerKeys[0].getKeyPacket([otherCert.issuerKeyId]);
          if (signingKeyPacket && (otherCert.verified || otherCert.verify(signingKeyPacket, {userid: user.userId, key: primaryKey}))) {
            sig.signer = getUserId(issuerKeys[0]);
          } else {
            // invalid signature
            return;
          }
        } else {
          sig.signer = l10n("keygrid_signer_unknown");
        }
        sig.id = otherCert.issuerKeyId.toHex().toUpperCase();
        sig.crDate = otherCert.created.toISOString();
        uiUser.signatures.push(sig);
      });
      toKey.users.push(uiUser);
    } catch (e) {
      console.log('Exception in mapUsers', e);
    }
  });
}

export function checkKeyId(sourceKey, keyring) {
  const primKeyId = sourceKey.primaryKey.getKeyId();
  const keys = keyring.getKeysForId(primKeyId.toHex(), true);
  if (keys) {
    keys.forEach(key => {
      if (!key.primaryKey.getKeyId().equals(primKeyId)) {
        throw new Error('Primary keyId equals existing sub keyId.');
      }
    });
  }
  sourceKey.getSubkeyPackets().forEach(subKey => {
    const subKeyId = subKey.getKeyId();
    const keys = keyring.getKeysForId(subKeyId.toHex(), true);
    if (keys) {
      keys.forEach(key => {
        if (key.primaryKey.getKeyId().equals(subKeyId)) {
          throw new Error('Sub keyId equals existing primary keyId.');
        }
        if (!key.primaryKey.getKeyId().equals(primKeyId)) {
          throw new Error('Sub keyId equals existing sub keyId in key with different primary keyId.');
        }
      });
    }
  });
}
