/**
 * Copyright (C) 2018 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from '../lib/lib-mvelo';
import Keyring from './keyring';
import * as keyringStore from './keyringStore';
import * as keyringSync from './keyringSync';

const keyringMap = new Map();
let keyringAttr = null;

export async function init() {
  keyringAttr = await getAllKeyringAttr();
  if (keyringAttr && keyringAttr[mvelo.LOCAL_KEYRING_ID]) {
    const createKeyringAsync = [];
    for (const keyringId in keyringAttr) {
      if (keyringAttr.hasOwnProperty(keyringId)) {
        createKeyringAsync.push(getKeyring(keyringId));
      }
    }
    await Promise.all(createKeyringAsync);
  } else {
    await createKeyring(mvelo.LOCAL_KEYRING_ID);
  }
}

export async function createKeyring(keyringId, options) {
  // init keyring attributes
  if (!keyringAttr) {
    keyringAttr = {};
  }
  if (keyringAttr[keyringId]) {
    throw new mvelo.Error(`Keyring for id ${keyringId} already exists.`, 'KEYRING_ALREADY_EXISTS');
  }
  keyringAttr[keyringId] = {};
  // instantiate keyring
  const keyRng = await getKeyring(keyringId);
  await setKeyringAttr(keyringId, {} || options);
  return keyRng;
}

/**
 * Instantiate a new keyring object
 * @param  {String} keyringId
 * @return {Promise<Keyring>}
 */
async function getKeyring(keyringId) {
  // resolve keyring dependencies
  const krStore = await keyringStore.createKeyringStore(keyringId);
  const krSync = new keyringSync.KeyringSync(keyringId);
  // instantiate keyring
  const keyRng = new Keyring(keyringId, krStore, krSync);
  keyringMap.set(keyringId, keyRng);
  return keyRng;
}

export async function deleteKeyring(keyringId) {
  if (!keyringAttr[keyringId]) {
    throw new mvelo.Error(`Keyring for id ${keyringId} does not exist.`, 'NO_KEYRING_FOR_ID');
  }
  const keyRng = keyringMap.get(keyringId);
  keyRng.keyring.clear();
  await keyRng.keyring.storeHandler.remove();
  keyringMap.delete(keyringId);
  delete keyringAttr[keyringId];
  await mvelo.storage.set('mvelo.keyring.attributes', keyringAttr);
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
  const result = [];
  for (const keyringId in keyringAttr) {
    if (keyringAttr.hasOwnProperty(keyringId)) {
      result.push(keyringMap.get(keyringId));
    }
  }
  return result;
}

export async function getAllKeyringAttr() {
  return mvelo.storage.get('mvelo.keyring.attributes');
}

export async function setKeyringAttr(keyringId, attr) {
  if (!keyringAttr[keyringId]) {
    throw new Error(`Keyring does not exist for id: ${keyringId}`);
  }
  Object.assign(keyringAttr[keyringId], attr);
  await mvelo.storage.set('mvelo.keyring.attributes', keyringAttr);
}

export function getKeyringAttr(keyringId, attr) {
  if (!keyringAttr[keyringId]) {
    throw new Error(`Keyring does not exist for id: ${keyringId}`);
  }
  if (attr) {
    return keyringAttr[keyringId][attr];
  }
  return keyringAttr[keyringId];
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
