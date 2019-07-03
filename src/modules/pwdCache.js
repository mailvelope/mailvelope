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
// time limit in minutes
const TIME_LIMIT = 1;
// max. nuber of operations in time limit
const TIME_LIMIT_RATE = 100;

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

function clearIntervals() {
  // clear interval functions
  cache.forEach(entry => clearInterval(entry.tlTimer));
}

function update() {
  if (active != prefs.prefs.security.password_cache ||
      timeout != prefs.prefs.security.password_timeout) {
    // init cache
    clearTimeouts();
    clearIntervals();
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
export function get(primaryKeyFpr, message) {
  if (cache.has(primaryKeyFpr)) {
    const entry = cache.get(primaryKeyFpr);
    let operations = 1;
    if (message) {
      operations += getReservedOperations({key: entry.key, message});
    }
    entry.operations -= operations;
    entry.tlOperations -= operations;
    if (!Math.max(0, entry.tlOperations)) {
      return;
    }
    if (Math.max(0, entry.operations)) {
      return {
        password: entry.password,
        key: entry.key
      };
    } else {
      // number of allowed operations exhausted
      deleteEntry(primaryKeyFpr);
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
  clearTimeouts();
  clearIntervals();
  cache.delete(primaryKeyFpr);
}

export {deleteEntry as delete};

/**
 * Set key and password in cache, start timeout
 * @param {openpgp.key.Key} key - private key, expected unlocked
 * @param {String}          [password] - password
 * @param {Number}          [cacheTime] - timeout in minutes
 */
export function set({key, password, cacheTime, reservedOperations = 0}) {
  // primary key fingerprint is main key of cache
  const primaryKeyFpr = key.primaryKey.getFingerprint();
  let entry;
  if (cache.has(primaryKeyFpr)) {
    entry = cache.get(primaryKeyFpr);
    // update remaining number of operations
    entry.operations -= reservedOperations;
    clearInterval(entry.tlTimer);
  } else {
    entry = {key, password};
    // clear after timeout
    entry.timer = setTimeout(() => {
      deleteEntry(primaryKeyFpr);
    }, (cacheTime || timeout) * 60 * 1000);
    // set max. number of operations
    entry.operations = Math.max(0, RATE_LIMIT - reservedOperations);
  }
  // clear after time limit rate has been reached
  entry.tlOperations =  Math.max(0, TIME_LIMIT_RATE - reservedOperations);
  entry.tlTimer = setInterval(() => {
    entry.tlOperations = TIME_LIMIT_RATE;
  }, TIME_LIMIT * 60 * 1000);
  cache.set(primaryKeyFpr, entry);
}

/**
 * Get number of decryptable session keys
 * @param {openpgp.key.Key} key - private key, expected unlocked
 * @param {openpgp.message.Message} message -  message with encrypted session keys
 * @return {Number} return the number of decryptable session keys
 */
function getReservedOperations({key, message}) {
  const pkESKeyPacketlist = message.packets.filterByTag(openpgp.enums.packet.publicKeyEncryptedSessionKey);
  const keyIdsHex = key.getKeys().map(({keyPacket}) => keyPacket.getKeyId().toHex());
  return pkESKeyPacketlist.filter(keyPacket => keyIdsHex.includes(keyPacket.publicKeyId.toHex())).length;
}

/**
 * Unlocked key if required and update cache
 * Password caching does not support different passphrases for primary key and subkeys
 * @param {openpgp.key.Key} key - key to unlock
 * @param {String}          password - password to unlock key
 * @return {Promise<openpgp.key.Key, Error>} return the unlocked key
 */
export async function unlock({key, password, message}) {
  const unlockedKey = await unlockKey(key, password);
  const options = {key: unlockedKey};
  if (message) {
    options.reservedOperations = getReservedOperations({key: unlockedKey, message});
  }
  if (active) {
    // set unlocked key in cache
    set(options);
  }
  return unlockedKey;
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
