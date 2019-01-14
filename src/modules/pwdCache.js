/**
 * Copyright (C) 2012-2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import {MvError} from '../lib/util';
import * as openpgp from 'openpgp';
import * as prefs from './prefs';

// password and key cache
let cache;
// caching active
let active;
// timeout in minutes
let timeout;
// max. number of operations per key
const RATE_LIMIT = 1000;

export function init() {
  active = prefs.prefs.security.password_cache;
  timeout = prefs.prefs.security.password_timeout;
  cache = new Map();
  // register for updates
  prefs.addUpdateHandler(update);
}

function clearTimeouts() {
  // clear timeout functions
  cache.forEach(entry => clearTimeout(entry.timer));
}

function update() {
  if (active != prefs.prefs.security.password_cache ||
      timeout != prefs.prefs.security.password_timeout) {
    // init cache
    clearTimeouts();
    cache.clear();
    active = prefs.prefs.security.password_cache;
    timeout = prefs.prefs.security.password_timeout;
  }
}

/**
 * Get password and unlocked key from cache
 * @param  {String} primaryKeyFpr - primary key fingerprint
 * @return {Object} - password of key, if available unlocked key
 */
export function get(primaryKeyFpr) {
  if (cache.has(primaryKeyFpr)) {
    const entry = cache.get(primaryKeyFpr);
    entry.operations--;
    if (entry.operations) {
      return {
        password: entry.password,
        key: entry.key
      };
    } else {
      // number of allowed operations exhausted
      cache.delete(primaryKeyFpr);
    }
  }
}

/**
 * Return true if key is cached
 * @param  {String} primaryKeyFpr - primary key fingerprint
 * @return {Boolean} - true if cached
 */
export function isCached(primaryKeyFpr) {
  return cache.has(primaryKeyFpr);
}

/**
 * Delete key from cache
 * @param  {String} primaryKeyFpr - primary key fingerprint
 */
function deleteEntry(primaryKeyFpr) {
  cache.delete(primaryKeyFpr);
}

export {deleteEntry as delete};

/**
 * Set key and password in cache, start timeout
 * @param {openpgp.key.Key} key - private key, expected unlocked
 * @param {String}          [password] - password
 * @param {Number}          [cacheTime] - timeout in minutes
 */
export function set({key, password, cacheTime}) {
  // primary key fingerprint is main key of cache
  const primaryKeyFpr = key.primaryKey.getFingerprint();
  if (!cache.has(primaryKeyFpr)) {
    const newEntry = {key, password};
    // clear after timeout
    newEntry.timer = setTimeout(() => {
      cache.delete(primaryKeyFpr);
    }, (cacheTime || timeout) * 60 * 1000);
    // set max. number of operations
    newEntry.operations = RATE_LIMIT;
    cache.set(primaryKeyFpr, newEntry);
  }
}

/**
 * Unlocked key if required and update cache
 * Password caching does not support different passphrases for primary key and subkeys
 * @param {openpgp.key.Key} key - key to unlock
 * @param {String}          password - password to unlock key
 * @return {Promise<openpgp.key.Key, Error>} return the unlocked key
 */
export async function unlock({key, password}) {
  key = await unlockKey(key, password);
  if (active) {
    // set unlocked key in cache
    set({key});
  }
  return key;
}

async function unlockKey(privKey, passwd) {
  try {
    const {key} = await openpgp.decryptKey({privateKey: privKey, passphrase: passwd});
    return key;
  } catch ({message = ''}) {
    if (message.includes('Incorrect key passphrase')) {
      throw new MvError('Could not unlock key: wrong password', 'WRONG_PASSWORD');
    } else if (message.includes('Key packet is already decrypted')) {
      return privKey;
    } else {
      throw new MvError(`Error in openpgp.decryptKey. ${message}`);
    }
  }
}
