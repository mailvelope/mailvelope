/**
 * Copyright (C) 2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

export class KeyStoreBase {
  constructor(keyringId) {
    this.clear();
    this.id = keyringId;
  }

  clear() {
    this.publicKeys = new KeyArray([]);
    this.privateKeys = new KeyArray([]);
  }

  getKeysForId(keyId, deep) {
    let result = [];
    result = result.concat(this.publicKeys.getForId(keyId, deep) || []);
    result = result.concat(this.privateKeys.getForId(keyId, deep) || []);
    return result.length ? result : null;
  }

  removeKeysForId(keyId) {
    let result = [];
    result = result.concat(this.publicKeys.removeForId(keyId) || []);
    result = result.concat(this.privateKeys.removeForId(keyId) || []);
    return result.length ? result : null;
  }

  getForAddress(email) {
    const result = [];
    result.push(...this.publicKeys.getForAddress(email));
    result.push(...this.privateKeys.getForAddress(email));
    return result;
  }

  getAllKeys() {
    return this.publicKeys.keys.concat(this.privateKeys.keys);
  }
}

class KeyArray {
  constructor(keys) {
    this.keys = keys;
  }

  getForAddress(email) {
    const results = [];
    for (let i = 0; i < this.keys.length; i++) {
      if (emailCheck(email, this.keys[i])) {
        results.push(this.keys[i]);
      }
    }
    return results;
  }

  getForId(keyId, deep) {
    for (let i = 0; i < this.keys.length; i++) {
      if (keyIdCheck(keyId, this.keys[i])) {
        return this.keys[i];
      }
      if (deep && this.keys[i].subkeys.length) {
        for (let j = 0; j < this.keys[i].subkeys.length; j++) {
          if (keyIdCheck(keyId, this.keys[i].subkeys[j])) {
            return this.keys[i];
          }
        }
      }
    }
    return null;
  }

  push(key) {
    return this.keys.push(key);
  }

  removeForId(keyId) {
    for (let i = 0; i < this.keys.length; i++) {
      if (keyIdCheck(keyId, this.keys[i])) {
        return this.keys.splice(i, 1)[0];
      }
    }
    return null;
  }
}

function emailCheck(email, key) {
  email = email.toLowerCase();
  // escape email before using in regular expression
  const emailEsc = email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const emailRegex = new RegExp(`<${emailEsc}>`);
  const userIds = key.getUserIDs();
  for (let i = 0; i < userIds.length; i++) {
    const userId = userIds[i].toLowerCase();
    if (email === userId || emailRegex.test(userId)) {
      return true;
    }
  }
  return false;
}

function keyIdCheck(keyId, key) {
  if (keyId.length === 16) {
    return keyId === key.getKeyID().toHex();
  }
  return keyId === key.getFingerprint();
}
