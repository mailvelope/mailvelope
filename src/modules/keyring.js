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

  get(keyringId, attr) {
    if (!this.has(keyringId)) {
      throw new Error(`Keyring does not exist for id: ${keyringId}`);
    }
    const keyringAttr = super.get(keyringId) || {};
    if (attr) {
      return keyringAttr[attr];
    }
    return keyringAttr;
  }

  async create(keyringId) {
    super.set(keyringId, {});
    await this.store();
  }

  async set(keyringId, attr) {
    if (!this.has(keyringId)) {
      throw new Error(`Keyring does not exist for id: ${keyringId}`);
    }
    if (typeof attr !== 'object') {
      throw new Error('KeyringAttrMap.set no attr provided');
    }
    const keyringAttr = super.get(keyringId) || {};
    Object.assign(keyringAttr, attr);
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
  if (keyringAttr.has(mvelo.LOCAL_KEYRING_ID)) {
    const keyringPromises = Array.from(keyringAttr.keys()).map(keyringId =>
      buildKeyring(keyringId)
      .catch(e => console.log(`Building keyring for id ${keyringId} failed`, e))
    );
    await Promise.all(keyringPromises);
  } else {
    await createKeyring(mvelo.LOCAL_KEYRING_ID);
  }
}

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
 * Instantiate a new keyring object
 * @param  {String} keyringId
 * @return {Promise<Keyring>}
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

export function getById(keyringId) {
  const keyring = keyringMap.get(keyringId);
  if (keyring) {
    return keyring;
  } else {
    throw new mvelo.Error('No keyring found for this identifier.', 'NO_KEYRING_FOR_ID');
  }
}

export function getAll() {
  return Array.from(keyringMap.values());
}

export function getAllKeyringAttr() {
  return keyringAttr.toObject();
}

export async function setKeyringAttr(keyringId, attr) {
  await keyringAttr.set(keyringId, attr);
}

export function getKeyringAttr(keyringId, attr) {
  return keyringAttr.get(keyringId, attr);
}

export function getAllKeyUserId() {
  const allKeyrings = getAll();
  let result = [];
  allKeyrings.forEach(keyring => {
    result = result.concat(keyring.getKeyUserIDs().map(key => {
      key.keyringId = keyring.id;
      return key;
    }));
  });
  // remove duplicate keys
  result = mvelo.util.sortAndDeDup(result, (a, b) => a.keyid.localeCompare(b.keyid));
  // sort by name
  result = result.sort((a, b) => a.name.localeCompare(b.name));
  return result;
}
