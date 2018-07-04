/**
 * Copyright (C) 2015-2018 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from '../lib/lib-mvelo';
import KeyringLocal from './KeyringLocal';
import KeyStoreLocal from './KeyStoreLocal';
import KeyringGPG from './KeyringGPG';
import KeyStoreGPG from './KeyStoreGPG';
import {gpgme} from '../lib/browser.runtime';
import {prefs} from './prefs';
import {isValidEncryptionKey} from './key';

/**
 * Map with all keyrings and their attributes. Data is persisted in local storage.
 * key: the keyring ID
 * value: object map with keyring attributes
 */
class KeyringAttrMap extends Map {
  async init() {
    const attributes = await mvelo.storage.get('mvelo.keyring.attributes') || {};
    Object.keys(attributes).forEach(key => super.set(key, attributes[key]));
    await this.initGPG();
  }

  async initGPG() {
    const hasGpgKeyring = this.has(mvelo.GNUPG_KEYRING_ID);
    if (gpgme) {
      if (!hasGpgKeyring) {
        await this.create(mvelo.GNUPG_KEYRING_ID);
      }
    } else {
      if (hasGpgKeyring) {
        await this.delete(mvelo.GNUPG_KEYRING_ID);
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
  if (keyringAttr.has(mvelo.MAIN_KEYRING_ID)) {
    const keyringPromises = Array.from(keyringAttr.keys()).map(keyringId =>
      buildKeyring(keyringId)
      .catch(e => console.log(`Building keyring for id ${keyringId} failed`, e))
    );
    await Promise.all(keyringPromises);
  } else {
    await createKeyring(mvelo.MAIN_KEYRING_ID);
  }
}

/**
 * Create a new keyring and initialize keyring attributes
 * @param  {String} keyringId
 * @return {KeyringBase}
 */
export async function createKeyring(keyringId) {
  if (keyringAttr.has(keyringId)) {
    throw new mvelo.Error(`Keyring for id ${keyringId} already exists.`, 'KEYRING_ALREADY_EXISTS');
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
  if (keyringId === mvelo.GNUPG_KEYRING_ID) {
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
    throw new mvelo.Error(`Keyring for id ${keyringId} does not exist.`, 'NO_KEYRING_FOR_ID');
  }
  const keyRng = keyringMap.get(keyringId);
  await keyRng.keystore.remove();
  keyRng.keystore.clear();
  keyringMap.delete(keyringId);
  await keyringAttr.delete(keyringId);
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
    throw new mvelo.Error('No keyring found for this identifier.', 'NO_KEYRING_FOR_ID');
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
 * Get all keyring attributes as an object map
 * @return {Object<keyringId, KeyringBase>}
 */
export function getAllKeyringAttr() {
  return keyringAttr.toObject();
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
 * Get user id, and key id for all keys in all keyrings. Only one user id per key is returned.
 * @return {Array<Object>} list of key meta data objects in the form {keyid, userid, email, name}
 */
export function getAllKeyUserId() {
  let result = [];
  const allKeyrings = getAll();
  allKeyrings.forEach(keyring => {
    result = result.concat(keyring.getKeyUserIds().map(key => {
      key.keyringId = keyring.id;
      return key;
    }));
  });
  // remove duplicate keys
  result = mvelo.util.sortAndDeDup(result, (a, b) => a.keyid.localeCompare(b.keyid));
  // sort by name
  result.sort((a, b) => a.name.localeCompare(b.name));
  return result;
}

/**
 * Get user id, key id, email and name for all keys in the preferred keyring queue
 * @param  {String} keyringId - requested keyring, the leading keyring of a scenario
 * @return {Array<Object>} list of recipients objects in the form {keyid, userid, email, name}
 */
export function getKeyUserIds(keyringId) {
  let result = [];
  const keyrings = getPreferredKeyringQueue(keyringId);
  keyrings.forEach(keyring => {
    const keyUserIds = keyring.getKeyUserIds({allUsers: true});
    result.push(...keyUserIds);
  });
  // remove duplicate recipients with equal keyid and userid
  result = mvelo.util.deDup(result, (element, array) => !array.find(item => element.keyid === item.keyid && element.userid === item.userid));
  // sort by user id
  result.sort((a, b) => a.userid.localeCompare(b.userid));
  return result;
}

/**
 * Query keys in all keyrings by email address
 * @param  {String} keyringId - requested keyring, the leading keyring of a scenario
 * @param  {Array<String>} emails
 * @return {Object} - map in the form {address: [key1, key2, ..]}
 */
export function getKeyByAddress(keyringId, emails) {
  const result = Object.create(null);
  emails = mvelo.util.toArray(emails);
  const keyrings = getPreferredKeyringQueue(keyringId);
  emails.forEach(email => {
    result[email] = [];
    keyrings.forEach(keyring => {
      let keys = keyring.keystore.getForAddress(email);
      keys = keys.filter(key => !isValidEncryptionKey(keyring.id, key));
      result[email].push(...keys);
    });
    if (!result[email].length) {
      result[email] = false;
      return;
    }
    // remove duplicate keys
    result[email] = mvelo.util.deDup(result[email], (element, array) => !array.find(item => element.primaryKey.getKeyId().equals(item.primaryKey.getKeyId())));
  });
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
    keyrings.push(keyringMap.get(mvelo.GNUPG_KEYRING_ID));
  }
  // next, use requested keyring if not gnupg
  if (keyringId !== mvelo.GNUPG_KEYRING_ID) {
    keyrings.push(keyringMap.get(keyringId));
  }
  // next, if requested keyring is API keyring then also use main keyring
  if (isApiKeyring(keyringId)) {
    keyrings.push(keyringMap.get(mvelo.MAIN_KEYRING_ID));
  }
  // if gnupg keyring is available but not preferred, we put at the end of the queue
  if (gpgme && !prefs.general.prefer_gnupg) {
    keyrings.push(keyringMap.get(mvelo.GNUPG_KEYRING_ID));
  }
  return keyrings;
}

/**
 * Get keyring that includes at least one private key of the specified key Ids.
 * Implements also fallback to alternative keyrings.
 * @param  {Array<openpgp.Keyid>|openpgp.Keyid} keyIds - key ids of private keys
 * @param  {String} [keyringId] - requested keyring, the leading keyring of a scenario
 * @return {KeyringBase}
 */
export function getKeyringWithPrivKey(keyIds, keyringId) {
  keyIds = mvelo.util.toArray(keyIds);
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
  // if no keyids return first keyring
  if (!keyIds.length) {
    return keyrings[0];
  }
  // return first keyring that includes private keys with keyids
  for (const keyring of keyrings) {
    if (keyring.hasPrivateKey(keyIds)) {
      return keyring;
    }
  }
  return null;
}

/**
 * Check if provided keyring is created by Mailvelope client-API
 * @param  {String}  keyringId
 * @return {Boolean}
 */
function isApiKeyring(keyringId) {
  return keyringId !== mvelo.MAIN_KEYRING_ID && keyringId !== mvelo.GNUPG_KEYRING_ID;
}

/**
 * Array.sort compareFunction
 * If prefer_gnupg then the GnuPG keyring should be sorted at the beginning of the array,
 * otherwise at the end.
 */
function compareKeyringsByPreference(a, b) {
  if (a.id === mvelo.GNUPG_KEYRING_ID) {
    return prefs.general.prefer_gnupg ? -1 : 1;
  }
  if (b.id === mvelo.GNUPG_KEYRING_ID) {
    return prefs.general.prefer_gnupg ? 1 : -1;
  }
  return 0;
}

/**
 * Synchronize public keys across keyrings.
 * @param  {KeyringBase|String} keyring - destination keyring or keyringId, public keys are synchronized from other keyrings.
 * @param  {Array<openpgp.Keyid|String>|openpgp.Keyid|String} keyIds - key ids or fingerprints of public keys that should be synchronized.
 */
export async function syncPublicKeys(keyring, keyIds) {
  // TODO
  console.log('syncPublicKeys', keyring.id, keyIds);
  if (typeof keyring === 'string') {
    keyring = getById(keyring);
  }
  keyIds = mvelo.util.toArray(keyIds);
  if (!keyIds.length) {
    // nothing to sync
    return;
  }
}

/**
 * Get preferred keyring ID
 * @return {String}
 */
export function getPreferredKeyringId() {
  // return gnupg keyring if available and preferred
  if (gpgme && prefs.general.prefer_gnupg) {
    return mvelo.GNUPG_KEYRING_ID;
  }
  return mvelo.MAIN_KEYRING_ID;
}
