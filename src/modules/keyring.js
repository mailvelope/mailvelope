/**
 * Copyright (C) 2015-2018 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from '../lib/lib-mvelo';
import {MAIN_KEYRING_ID, GNUPG_KEYRING_ID} from '../lib/constants';
import {wait, filterAsync, toArray, MvError} from '../lib/util';
import KeyringLocal from './KeyringLocal';
import KeyStoreLocal from './KeyStoreLocal';
import KeyringGPG from './KeyringGPG';
import KeyStoreGPG from './KeyStoreGPG';
import {gpgme} from '../lib/browser.runtime';
import {prefs} from './prefs';
import {isValidEncryptionKey, equalKey, getLastModifiedDate, toPublic} from './key';

/**
 * Map with all keyrings and their attributes. Data is persisted in local storage.
 * key: the keyring ID
 * value: object map with keyring attributes
 */
class KeyringAttrMap extends Map {
  async init() {
    const attributes = await mvelo.storage.get('mvelo.keyring.attributes') || {};
    Object.keys(attributes).forEach(key => super.set(key, attributes[key]));
    if (!this.has(MAIN_KEYRING_ID)) {
      await this.create(MAIN_KEYRING_ID);
    }
    await this.initGPG();
  }

  async initGPG() {
    const hasGpgKeyring = this.has(GNUPG_KEYRING_ID);
    if (gpgme) {
      if (!hasGpgKeyring) {
        await this.create(GNUPG_KEYRING_ID);
      }
    } else {
      if (hasGpgKeyring) {
        await this.delete(GNUPG_KEYRING_ID);
      }
    }
  }

  get(keyringId, attrKey) {
    if (!this.has(keyringId)) {
      throw new Error(`Keyring does not exist for id: ${keyringId}`);
    }
    const keyringAttr = super.get(keyringId) || {};
    if (attrKey) {
      return keyringAttr[attrKey];
    }
    return keyringAttr;
  }

  async create(keyringId, attrMap = {}) {
    super.set(keyringId, attrMap);
    await this.store();
  }

  async set(keyringId, attrMap) {
    if (!this.has(keyringId)) {
      throw new Error(`Keyring does not exist for id: ${keyringId}`);
    }
    if (typeof attrMap !== 'object') {
      throw new Error('KeyringAttrMap.set no attrMap provided');
    }
    const keyringAttr = super.get(keyringId) || {};
    Object.assign(keyringAttr, attrMap);
    super.set(keyringId, keyringAttr);
    await this.store();
  }

  async store() {
    await mvelo.storage.set('mvelo.keyring.attributes', this.toObject());
  }

  toObject() {
    const allKeyringAttr = {};
    this.forEach((value, key) => allKeyringAttr[key] = value);
    return allKeyringAttr;
  }

  async delete(keyringId) {
    super.delete(keyringId);
    await this.store();
  }
}

// map keyringId to keyring attributes
const keyringAttr = new KeyringAttrMap();
// map keyringId to keyring objects (classes extending KeyringBase)
const keyringMap = new Map();

export async function init() {
  await keyringAttr.init();
  const keyringIds = Array.from(keyringAttr.keys());
  await Promise.all(keyringIds.map(async keyringId => {
    try {
      await buildKeyring(keyringId);
    } catch (e) {
      // could not build keyring, remove from keyring attributes
      await keyringAttr.delete(keyringId);
      console.log(`Building keyring for id ${keyringId} failed`, e);
    }
  }));
  preVerifyKeys();
}

/**
 * Create a new keyring and initialize keyring attributes
 * @param  {String} keyringId
 * @return {KeyringBase}
 */
export async function createKeyring(keyringId) {
  if (keyringAttr.has(keyringId)) {
    throw new MvError(`Keyring for id ${keyringId} already exists.`, 'KEYRING_ALREADY_EXISTS');
  }
  // persist keyring attributes
  await keyringAttr.create(keyringId);
  try {
    // instantiate keyring
    const keyRng = await buildKeyring(keyringId);
    return keyRng;
  } catch (e) {
    // cleanup
    await keyringAttr.delete(keyringId);
    throw e;
  }
}

/**
 * Instantiate a new keyring object, keys are loaded from the keystore
 * @param  {String} keyringId
 * @return {Promise<KeyringBase>}
 */
async function buildKeyring(keyringId) {
  let keyStore;
  let keyRing;
  if (keyringId === GNUPG_KEYRING_ID) {
    keyStore = new KeyStoreGPG(keyringId);
    keyRing = new KeyringGPG(keyringId, keyStore);
  } else {
    keyStore = new KeyStoreLocal(keyringId);
    keyRing = new KeyringLocal(keyringId, keyStore);
  }
  await keyStore.load();
  keyringMap.set(keyringId, keyRing);
  return keyRing;
}

/**
 * Delete keyring, all keys and keyring attributes
 * @param  {String} keyringId
 * @return {Promise<undefined>}
 */
export async function deleteKeyring(keyringId) {
  if (!keyringAttr.has(keyringId)) {
    throw new MvError(`Keyring for id ${keyringId} does not exist.`, 'NO_KEYRING_FOR_ID');
  }
  const keyRng = keyringMap.get(keyringId);
  await keyRng.keystore.remove();
  keyRng.keystore.clear();
  keyringMap.delete(keyringId);
  await keyringAttr.delete(keyringId);
}

/**
 * Improve performance of initial keyring operations by pre-verifying keys in large keyrings
 */
async function preVerifyKeys() {
  for (const {keystore} of getAll()) {
    const keys = keystore.getAllKeys();
    if (keys.length < 10) {
      continue;
    }
    for (const key of keys) {
      try {
        await key.getEncryptionKey();
      } catch (e) {}
      await wait(20);
    }
  }
}

/**
 * Get keyring by Id
 * @param  {String} keyringId
 * @return {KeyringBase}
 */
export function getById(keyringId) {
  const keyring = keyringMap.get(keyringId);
  if (keyring) {
    return keyring;
  } else {
    throw new MvError('No keyring found for this identifier.', 'NO_KEYRING_FOR_ID');
  }
}

/**
 * Get all keyrings
 * @return {Array<KeyringBase>}
 */
export function getAll() {
  return Array.from(keyringMap.values());
}

/**
 * Get all keyrings
 * @return {Array<String>}
 */
export function getAllKeyringIds() {
  return Array.from(keyringMap.keys());
}

/**
 * Get all keyring attributes as an object map
 * @return {Object<keyringId, KeyringBase>}
 */
export function getAllKeyringAttr() {
  const attrObj = keyringAttr.toObject();
  if (keyringAttr.has(GNUPG_KEYRING_ID)) {
    const gpgKeyring = keyringMap.get(GNUPG_KEYRING_ID);
    Object.assign(attrObj[GNUPG_KEYRING_ID], gpgKeyring.getAttr());
  }
  return attrObj;
}

/**
 * Set keyring attributes
 * @param {String} keyringId
 * @param {Object<key, value>} attrMap
 */
export async function setKeyringAttr(keyringId, attrMap) {
  await keyringAttr.set(keyringId, attrMap);
}

/**
 * Get keyring attributes
 * @param  {String} keyringId
 * @param  {String} [attrKey]
 * @return {Any} either the attribute value if attrKey is provided, or an object map with all attributes
 */
export function getKeyringAttr(keyringId, attrKey) {
  return keyringAttr.get(keyringId, attrKey);
}

/**
 * Get default key by interating through preferred keyring queue
 * @param  {String} keyringId - requested keyring, the leading keyring of a scenario
 * @return {String} fingerprint of default key
 */
export async function getDefaultKeyFpr(keyringId) {
  const keyrings = getPreferredKeyringQueue(keyringId);
  for (const keyring of keyrings) {
    const defaultKeyFpr = await keyring.getDefaultKeyFpr();
    if (defaultKeyFpr) {
      return defaultKeyFpr;
    }
  }
  return '';
}

/**
 * Get the following data for all keys in the preferred keyring queue: user id, key id, fingerprint, email and name
 * @param  {String} [keyringId] - requested keyring, the leading keyring of a scenario
 * @return {Array<Object>} list of recipients objects in the form {keyId, fingerprint, userId, email, name}
 */
export async function getKeyData({keyringId, allUsers = true}) {
  let result = [];
  let keyrings;
  if (keyringId) {
    keyrings = getPreferredKeyringQueue(keyringId);
  } else {
    keyrings = getAll();
  }
  for (const keyring of keyrings) {
    const keyDataArray = await keyring.getKeyData({allUsers});
    for (const keyData of keyDataArray) {
      // check if key for this fingerprint already exists in result list
      const keyIndex = result.findIndex(element => keyData.fingerprint === element.fingerprint);
      if (keyIndex === -1) {
        // key does not exist, add to result list
        result.push(keyData);
        continue;
      }
      // key already in result list
      const existing = result[keyIndex];
      if (getLastModifiedDate(existing.key) < getLastModifiedDate(keyData.key)) {
        // current key is more recent then existing key -> replace
        result[keyIndex] = keyData;
      }
    }
  }
  // filter out all invalid keys
  result = await filterAsync(result, key => isValidEncryptionKey(key.key));
  // expand users
  const expanded = [];
  for (const keyData of result) {
    for (const user of keyData.users) {
      // exclude key and users properties
      const {key, users, ...keyDataPart} = keyData;
      expanded.push({...keyDataPart, ...user});
    }
  }
  // sort by user id
  expanded.sort((a, b) => a.userId.localeCompare(b.userId));
  return expanded;
}

/**
 * Query keys in all keyrings by email address
 * @param  {String} keyringId - requested keyring, the leading keyring of a scenario
 * @param  {Array<String>|String} emails
 * @return {Object} - map in the form {address: [key1, key2, ..]}
 */
export async function getKeyByAddress(keyringId, emails) {
  const result = Object.create(null);
  emails = toArray(emails);
  const keyrings = getPreferredKeyringQueue(keyringId);
  for (const email of emails) {
    let allKeys = [];
    for (const keyring of keyrings) {
      const keys = keyring.keystore.getForAddress(email);
      for (const key of keys) {
        // check if key already exists in result list
        const keyIndex = allKeys.findIndex(element => equalKey(element, key));
        if (keyIndex === -1) {
          // key does not exist, add to result list
          allKeys.push(key);
          continue;
        }
        // key already in result list
        const existing = allKeys[keyIndex];
        if (getLastModifiedDate(existing) < getLastModifiedDate(key)) {
          // current key is more recent then existing key -> replace
          allKeys[keyIndex] = key;
        }
      }
    }
    // filter out all invalid keys
    allKeys = await filterAsync(allKeys, key => isValidEncryptionKey(key, keyringId));
    if (allKeys.length) {
      result[email] = allKeys;
    } else {
      result[email] = false;
    }
  }
  return result;
}

/**
 * Return list of keyrings in the preferred priority order
 * @param {String} keyringId - requested keyring, the leading keyring of a scenario
 * @return {Array<KeyringBase>}
 */
function getPreferredKeyringQueue(keyringId) {
  const keyrings = [];
  // use gnupg keyring if available and preferred
  if (gpgme && prefs.general.prefer_gnupg) {
    keyrings.push(keyringMap.get(GNUPG_KEYRING_ID));
  }
  // next, if requested keyring is API keyring then use that
  if (isApiKeyring(keyringId)) {
    keyrings.push(keyringMap.get(keyringId));
  }
  // always use the main keyring
  keyrings.push(keyringMap.get(MAIN_KEYRING_ID));
  // if gnupg keyring is available but not preferred, we put at the end of the queue
  if (gpgme && !prefs.general.prefer_gnupg) {
    keyrings.push(keyringMap.get(GNUPG_KEYRING_ID));
  }
  return keyrings;
}

/**
 * Get keyring that includes at least one private key of the specified key Ids.
 * Implements also fallback to alternative keyrings.
 * @param  {Array<openpgp.Keyid|String>|openpgp.Keyid|String} keyIds - key ids or fingerprints of private keys
 * @param  {String} [keyringId] - requested keyring, the leading keyring of a scenario
 * @param {Boolean} [noCache] - if true, no password cache should be used to unlock signing keys
 * @return {KeyringBase}
 */
export function getKeyringWithPrivKey(keyIds, keyringId, noCache) {
  keyIds = toArray(keyIds);
  let keyrings;
  if (!keyringId) {
    keyrings = getAll();
    if (gpgme) {
      // sort keyrings according to preference
      keyrings.sort(compareKeyringsByPreference);
    }
  } else {
    keyrings = getPreferredKeyringQueue(keyringId);
  }
  // if no keyIds return first keyring
  if (!keyIds.length) {
    return keyrings[0];
  }
  // return first keyring that includes private keys with keyIds
  for (const keyring of keyrings) {
    if (keyring.hasPrivateKey(keyIds)) {
      if (keyring.id === GNUPG_KEYRING_ID && keyIds.length && noCache) {
        // with noCache enforcement we want to make sure that a private key operation always triggers
        // a password dialog and therefore a user interaction. As GPGME does not allow to detect
        // if cache is used or not we skip the GnuPG keyring here.
        continue;
      }
      return keyring;
    }
  }
  return null;
}

/**
 * Get preferred keyring
 * @param  {String} [keyringId] - requested keyring, the leading keyring of a scenario
 * @return {KeyringBase}
 */
export function getPreferredKeyring(keyringId) {
  return getKeyringWithPrivKey(null, keyringId);
}

/**
 * Check if provided keyring is created by Mailvelope client-API
 * @param  {String}  keyringId
 * @return {Boolean}
 */
function isApiKeyring(keyringId) {
  return keyringId !== MAIN_KEYRING_ID && keyringId !== GNUPG_KEYRING_ID;
}

/**
 * Array.sort compareFunction
 * If prefer_gnupg then the GnuPG keyring should be sorted at the beginning of the array,
 * otherwise at the end.
 */
function compareKeyringsByPreference(a, b) {
  if (a.id === GNUPG_KEYRING_ID) {
    return prefs.general.prefer_gnupg ? -1 : 1;
  }
  if (b.id === GNUPG_KEYRING_ID) {
    return prefs.general.prefer_gnupg ? 1 : -1;
  }
  return 0;
}

/**
 * Synchronize public keys across keyrings.
 * @param  {KeyringBase|String} keyring - destination keyring or keyringId, public keys are synchronized from other keyrings.
 * @param  {Array<openpgp.Keyid|String>|openpgp.Keyid|String} keyIds - key ids or fingerprints of public keys that should be synchronized.
 * @param {Boolean} [allKeyrings] - use all keyrings as source keyrings
 * @param {Stringt} [keyringId] - the leading keyring of a scenario
 */
export async function syncPublicKeys({keyring, keyIds, allKeyrings = false, keyringId}) {
  let srcKeyrings;
  if (!keyring) {
    keyring = getById(keyringId);
  }
  keyIds = toArray(keyIds);
  if (!keyIds.length) {
    // nothing to sync
    return;
  }
  // get all relevant source keyrings
  if (allKeyrings) {
    srcKeyrings = getAll();
  } else {
    srcKeyrings = getPreferredKeyringQueue(keyringId);
  }
  for (let keyId of keyIds) {
    keyId = typeof keyId === 'string' ? keyId : keyId.toHex();
    // find newest key in all source keyrings
    let lastModified = null;
    for (const srcKeyring of srcKeyrings) {
      let key = srcKeyring.keystore.getKeysForId(keyId, true);
      if (!key) {
        continue;
      }
      key = key[0];
      const lastModifiedDate = getLastModifiedDate(key);
      if (!lastModified || lastModifiedDate > lastModified.date || lastModifiedDate.valueOf() === lastModified.date.valueOf() && srcKeyring.id === keyring.id) {
        lastModified = {date: lastModifiedDate, key, srcKeyring};
      }
    }
    if (lastModified && lastModified.srcKeyring.id !== keyring.id) {
      // there is a newer key available that needs to be imported into the destination keyring
      try {
        await keyring.importKeys([{armored: toPublic(lastModified.key).armor(), type: 'public'}]);
      } catch (e) {
        console.log('Key import error during sync process', e);
      }
    }
  }
}

/**
 * Get preferred keyring ID
 * @return {String}
 */
export function getPreferredKeyringId() {
  // return gnupg keyring if available, preferred and has valid private key
  if (gpgme && prefs.general.prefer_gnupg) {
    const gpgKeyring = keyringMap.get(GNUPG_KEYRING_ID);
    // directly access keystore property to avoid async method
    if (gpgKeyring.keystore.defaultKeyFpr) {
      return GNUPG_KEYRING_ID;
    }
  }
  return MAIN_KEYRING_ID;
}
