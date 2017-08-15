/**
 * Copyright (C) 2012-2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import * as prefs from './prefs';
import {unlockKey} from './pgpModel';

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
  cache = {};
  // register for updates
  prefs.addUpdateHandler(update);
}

function clearTimeouts() {
  // clear timeout functions
  for (const entry in cache) {
    if (cache.hasOwnProperty(entry)) {
      clearTimeout(entry.timer);
    }
  }
}

function update() {
  if (active != prefs.prefs.security.password_cache ||
      timeout != prefs.prefs.security.password_timeout) {
    // init cache
    clearTimeouts();
    cache = {};
    active = prefs.prefs.security.password_cache;
    timeout = prefs.prefs.security.password_timeout;
  }
}

/**
 * Get password and unlocked key from cache
 * @param  {String} primkeyid primary key id
 * @param  {String} keyid     requested unlocked key
 * @return {Object}           password of key, if available unlocked key for keyid
 */
export function get(primkeyid, keyid) {
  if (cache[primkeyid]) {
    cache[primkeyid].operations--;
    if (cache[primkeyid].operations) {
      return {
        password: cache[primkeyid].password,
        key: cache[primkeyid][keyid]
      };
    } else {
      // number of allowed operations exhausted
      delete cache[primkeyid];
    }
  }
}

/**
 * Return true if key is cached
 * @param  {String}  primkeyid primary key id
 * @return {Boolean}           true if cached
 */
export function isCached(primkeyid) {
  return Boolean(cache[primkeyid]);
}

/**
 * Delete key from cache
 * @param  {String} primkeyid primary key id
 */
function deleteEntry(primkeyid) {
  delete cache[primkeyid];
}

export {deleteEntry as delete};

/**
 * Set key and password in cache, start timeout
 * @param {Object} message
 * @param {String} [message.keyid] - key ID of key that should be cached
 * @param {openpgp.key.Key} message.key - private key, packet of keyid expected unlocked
 * @param {String} message.pwd - password
 * @param {Number} [message.cacheTime] - timeout in minutes
 */
export function set(message, pwd, cacheTime) {
  // primary key id is main key of cache
  const primKeyIdHex = message.key.primaryKey.getKeyId().toHex();
  const entry = cache[primKeyIdHex];
  if (entry) {
    // set unlocked private key for this keyid
    if (message.keyid && !entry[message.keyid]) {
      entry[message.keyid] = message.key;
    }
  } else {
    const newEntry = cache[primKeyIdHex] = {};
    newEntry.password = pwd;
    if (message.keyid) {
      newEntry[message.keyid] = message.key;
    }
    // clear after timeout
    newEntry.timer = setTimeout(() => {
      delete cache[primKeyIdHex];
    }, (cacheTime || timeout) * 60 * 1000);
    // set max. number of operations
    newEntry.operations = RATE_LIMIT;
  }
}

/**
 * Unlocked key if required and update cache
 * @param {Object} options
 * @param {openpgp.key.Key} options.key - key to unlock
 * @param {String} options.keyid - keyid of required key packet
 * @param {String} options.password - password to unlock key
 * @return {Promise<undefined, Error>}
 */
export function unlock(options) {
  return unlockKey(options.key, options.keyid, options.password)
  .then(key => {
    options.key = key;
    // set unlocked key in cache
    set(options);
  })
  .catch(() => {
    throw {
      message: 'Password caching does not support different passphrases for primary key and subkeys'
    };
  });
}
