/**
 * Copyright (C) 2012-2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import {MvError} from '../lib/util';
import {enums, decryptKey} from 'openpgp';
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

const PWD_SESSION_KEY = 'pwd.session.key';
const PWD_ALARM_PREFIX = 'PWD_ALARM_';

class PwdMap extends Map {
  constructor() {
    super();
    chrome.alarms.onAlarm.addListener(alarm => this.onAlarm(alarm));
    this.init();
  }

  async init() {
    const session = await this.getSession();
    for (const fpr in session) {
      const entry = session[fpr];
      entry.tlOperations =  TIME_LIMIT_RATE;
      entry.tlTimer = setInterval(() => {
        entry.tlOperations = TIME_LIMIT_RATE;
      }, TIME_LIMIT * 60 * 1000);
      super.set(fpr, entry);
    }
  }

  onAlarm(alarm) {
    this.delete(alarm.name.replace(PWD_ALARM_PREFIX, ''));
  }

  async clear() {
    super.clear();
    chrome.storage.session.remove(PWD_SESSION_KEY);
    const alarms = await chrome.alarms.getAll();
    for (const alarm of alarms) {
      if (alarm.name.startsWith(PWD_ALARM_PREFIX)) {
        chrome.alarms.clear(alarm.name);
      }
    }
  }

  async getSession() {
    const {[PWD_SESSION_KEY]: pwdSession} = await chrome.storage.session.get(PWD_SESSION_KEY);
    return pwdSession || {};
  }

  async has(fpr) {
    if (super.has(fpr)) {
      return true;
    }
    const session = await this.getSession();
    return Boolean(session[fpr]);
  }

  async get(fpr) {
    if (super.has(fpr)) {
      return super.get(fpr);
    }
    const session = await this.getSession();
    return session[fpr];
  }

  async delete(fpr) {
    const entry = super.get(fpr);
    if (entry) {
      clearInterval(entry.tlTimer);
    }
    super.delete(fpr);
    const session = await this.getSession();
    if (!session[fpr]) {
      return;
    }
    delete session[fpr];
    await chrome.storage.session.set({[PWD_SESSION_KEY]: session});
    await chrome.alarms.clear(`${PWD_ALARM_PREFIX}${fpr}`);
  }

  async set(fpr, entry, initAlarm) {
    super.set(fpr, entry);
    const {key, tlOperations, tlTimer, ...sessionEntry} = entry;
    const session = await this.getSession();
    session[fpr] = sessionEntry;
    await chrome.storage.session.set({[PWD_SESSION_KEY]: session});
    if (initAlarm) {
      chrome.alarms.create(`${PWD_ALARM_PREFIX}${fpr}`, {delayInMinutes: timeout});
    }
  }
}

export function init() {
  active = prefs.prefs.security.password_cache;
  timeout = prefs.prefs.security.password_timeout;
  // register for updates
  prefs.addUpdateHandler(update);
}

export function initSession() {
  cache = new PwdMap();
}

function clearIntervals() {
  // clear interval functions
  cache.forEach(entry => clearInterval(entry.tlTimer));
}

function update(before, after) {
  if (!after.security) {
    return;
  }
  after.security.password_timeout ??= timeout;
  if (active != after.security.password_cache ||
      timeout != after.security.password_timeout) {
    // init cache
    clearIntervals();
    cache.clear();
    active = after.security.password_cache;
    timeout = after.security.password_timeout;
  }
}

/**
 * Get password and unlocked key from cache
 * @param  {String} primaryKeyFpr - primary key fingerprint
 * @param  {openpgp.message.Message} [message] -  message with encrypted session keys
 * @return {Promise<Object>} - password of key, if available unlocked key
 */
export async function get(primaryKeyFpr, message) {
  if (!await cache.has(primaryKeyFpr)) {
    return;
  }
  const entry = await cache.get(primaryKeyFpr);
  let operations = 1;
  if (message) {
    operations += getReservedOperations({key: entry.key, message});
  }
  entry.operations -= operations;
  entry.tlOperations -= operations;
  await cache.set(primaryKeyFpr, entry);
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

/**
 * Return true if key is cached
 * @param  {String} primaryKeyFpr - primary key fingerprint
 * @return {Promise<Boolean>} - true if cached
 */
export function isCached(primaryKeyFpr) {
  return cache.has(primaryKeyFpr);
}

/**
 * Delete key from cache
 * @param  {String} primaryKeyFpr - primary key fingerprint
 */
async function deleteEntry(primaryKeyFpr) {
  await cache.delete(primaryKeyFpr);
}

export {deleteEntry as delete};

/**
 * Set key and password in cache, start timeout
 * @param {openpgp.key.Key} key - private key, expected unlocked
 * @param {String} [password] - password to unlock private key
 * @param {Number} [reserverdOperations] - number of decrypt operations initially used
 */
export async function set({key, password, reservedOperations = 0}) {
  // primary key fingerprint is main key of cache
  const primaryKeyFpr = key.getFingerprint();
  let entry;
  let newEntry;
  if (await cache.has(primaryKeyFpr)) {
    entry = await cache.get(primaryKeyFpr);
    // update remaining number of operations
    entry.operations -= reservedOperations;
    clearInterval(entry.tlTimer);
  } else {
    entry = {key, password};
    newEntry = true;
    // set max. number of operations
    entry.operations = Math.max(0, RATE_LIMIT - reservedOperations);
  }
  // clear after time limit rate has been reached
  entry.tlOperations =  Math.max(0, TIME_LIMIT_RATE - reservedOperations);
  entry.tlTimer = setInterval(() => {
    entry.tlOperations = TIME_LIMIT_RATE;
  }, TIME_LIMIT * 60 * 1000);
  await cache.set(primaryKeyFpr, entry, newEntry);
}

/**
 * Get number of decryptable session keys
 * @param {openpgp.key.Key} key - private key, expected unlocked
 * @param {openpgp.message.Message} message -  message with encrypted session keys
 * @return {Number} return the number of decryptable session keys
 */
function getReservedOperations({key, message}) {
  if (!key) {
    return 1;
  }
  const pkESKeyPacketlist = message.packets.filterByTag(enums.packet.publicKeyEncryptedSessionKey);
  const keyIdsHex = key.getKeys().map(({keyPacket}) => keyPacket.getKeyID().toHex());
  return pkESKeyPacketlist.filter(keyPacket => keyIdsHex.includes(keyPacket.publicKeyID.toHex())).length;
}

/**
 * Unlocked key if required and update cache
 * Password caching does not support different passphrases for primary key and subkeys
 * @param {openpgp.key.Key} key - key to unlock
 * @param {String}          password - password to unlock key
 * @param  {openpgp.message.Message} [message] -  message with encrypted session keys
 * @return {Promise<openpgp.key.Key, Error>} return the unlocked key
 */
export async function unlock({key, password, message}) {
  const unlockedKey = await unlockKey(key, password);
  const options = {key: unlockedKey, password};
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
    return await decryptKey({privateKey: privKey, passphrase: passwd});
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
