/**
 * Copyright (C) 2012-2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from '../lib/lib-mvelo';
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
 * @param  {String} primkeyid primary key id
 * @return {Object}           password of key, if available unlocked key for keyid
 */
export function get(primkeyid) {
  if (cache.has(primkeyid)) {
    const entry = cache.get(primkeyid);
    entry.operations--;
    if (entry.operations) {
      return {
        password: entry.password,
        key: entry.key
      };
    } else {
      // number of allowed operations exhausted
      cache.delete(primkeyid);
    }
  }
}

/**
 * Return true if key is cached
 * @param  {String}  primkeyid primary key id
 * @return {Boolean}           true if cached
 */
export function isCached(primkeyid) {
  return cache.has(primkeyid);
}

/**
 * Delete key from cache
 * @param  {String} primkeyid primary key id
 */
function deleteEntry(primkeyid) {
  cache.delete(primkeyid);
}

export {deleteEntry as delete};

/**
 * Set key and password in cache, start timeout
 * @param {openpgp.key.Key} key - private key, expected unlocked
 * @param {String}          [password] - password
 * @param {Number}          [cacheTime] - timeout in minutes
 */
export function set({key, password, cacheTime}) {
  // primary key id is main key of cache
  const primKeyIdHex = key.primaryKey.getKeyId().toHex();
  if (!cache.has(primKeyIdHex)) {
    const newEntry = {key, password};
    // clear after timeout
    newEntry.timer = setTimeout(() => {
      cache.delete(primKeyIdHex);
    }, (cacheTime || timeout) * 60 * 1000);
    // set max. number of operations
    newEntry.operations = RATE_LIMIT;
    cache.set(primKeyIdHex, newEntry);
  }
}

/**
 * Unlocked key if required and update cache
 * Password caching does not support different passphrases for primary key and subkeys
 * @param {openpgp.key.Key} key - key to unlock
 * @param {String}          password - password to unlock key
 * @return {Promise<openpgp.key.Key, Error>} return the unlocked key
 */
export function unlock({key, password}) {
  return unlockKey(key, password)
  .then(key => {
    if (active) {
      // set unlocked key in cache
      set({key});
    }
    return key;
  });
}

function unlockKey(privKey, passwd) {
  return openpgp.decryptKey({privateKey: privKey, passphrase: passwd})
  .then(result => result.key)
  .catch(e => {
    if (/Invalid passphrase/.test(e.message)) {
      throw new mvelo.Error('Could not unlock key: wrong password', 'WRONG_PASSWORD');
    } else {
      throw new mvelo.Error('Error in openpgp.decryptKey');
    }
  });
}
