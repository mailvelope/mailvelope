/**
 * Copyright (C) 2015-2018 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from '../lib/lib-mvelo';
import {MvError} from '../lib/util';
import Autocrypt from 'autocrypt';
import {prefs} from './prefs';
import {goog} from './closure-library/closure/goog/emailaddress';
export {parse} from 'autocrypt';

export const name = 'AC';
export const label = 'Autocrypt';
export const DEFAULT_URL = 'https://autocrypt.org';

const stores = new Map();

/**
* Check if Autocrypt is enabled.
*
* @return {Boolean}
*/
export function isEnabled() {
  return prefs.keyserver.autocrypt_lookup === true;
}

export function stringify({keydata, addr}) {
  if (keydata.startsWith('-----')) {
    return Autocrypt.stringify({keydata: keydataFromArmored(keydata), addr});
  } else {
    return Autocrypt.stringify({keydata, addr});
  }
}

async function autocrypt(id) {
  if (!id) {
    throw new MvError('Invalid Autocrypt Identity: id cannot be undefined', 'INVALID_ID');
  }
  const key = `mvelo.autocrypt.${id}`;
  let storage = stores.get(key);
  if (!storage) {
    storage = new Store(key);
    await storage.init();
    stores.set(key, storage);
  }
  return new Autocrypt({storage});
}

/**
 * Get a public key from autocrypt by email address.
 *
 * @param {String} options.email - The user id's email address
 * @param {String} options.identity - The identity of the context the key is being looked up in
 * @return {String|undefined} The found armored key if any.
 */
export async function lookup({email}, identity) {
  if (!email) {
    return;
  }
  const ac = await autocrypt(identity);
  return new Promise((resolve, reject) => {
    ac.storage.get(email, (err, record) => {
      if (err) {
        reject(err);
      } else {
        const result = record && {
          armored: armor(record.keydata),
          date: new Date(record.last_seen_autocrypt)
        };
        resolve(result);
      }
    });
  });
}

/**
 * Process an autocrypt Header to store a public key.
 *
 * @param {Object} headers - The relevant headers of the email
 * @param {String} identity - The identity of the recipient
 * @return {undefined}
 * @throws {MvError}
 */
export async function processHeader(headers, identity) {
  const date = new Date(headers.date);
  const fromAddr = goog.format.EmailAddress.parse(headers.from).getAddress();
  if (headers.autocrypt.length > 10240) {
    throw new MvError('Invalid Autocrypt Header: rejecting headers longer than 10k', 'INVALID_HEADER');
  }
  const ac = await autocrypt(identity);
  return new Promise((resolve, reject) => {
    ac.processAutocryptHeader(headers.autocrypt, fromAddr, date, err => {
      if (!err || err.message !== 'Invalid Autocrypt Header: no valid header found') {
        resolve();
        return;
      }
      if (err.code) {
        reject(err);
      } else {
        reject(new MvError(err.message, 'INVALID_HEADER'));
      }
    });
  });
}

export async function deleteIdentities(identities) {
  for (const id of identities) {
    const key = `mvelo.autocrypt.${id}`;
    await mvelo.storage.remove(key);
    stores.delete(key);
  }
}

export function armor(base64) {
  const head = '-----BEGIN PGP PUBLIC KEY BLOCK-----';
  const footer = '-----END PGP PUBLIC KEY BLOCK-----';
  const lines = base64.match(/.{1,64}/g);
  return [head, ''].concat(lines).concat([footer]).join('\n');
}

export class Store {
  constructor(storageKey) {
    this.storageKey = storageKey;
    this.map = new Map();
    this.initialized = false;
  }

  async init() {
    if (this.initalized) {
      return;
    }
    const attributes = await mvelo.storage.get(this.storageKey);
    if (attributes) {
      Object.keys(attributes).forEach(key => this.map.set(key, attributes[key]));
    }
    this.initialized = true;
  }

  get(key, cb) {
    let value;
    try {
      value = this.map.get(key);
    } catch (err) {
      cb(new MvError(err.message, 'STORAGE_ERROR'));
    }
    cb(undefined, value);
  }

  put(key, val, cb) {
    this.map.set(key, val);
    mvelo.storage.set(this.storageKey, this.toObject())
    .then(() => cb(), err => cb(new MvError(err.message, 'STORAGE_ERROR')));
  }

  toObject() {
    const all = {};
    this.map.forEach((value, key) => all[key] = value);
    return all;
  }
}

function keydataFromArmored(armored) {
  // An empty line marks the end of the headers
  const start = armored.search(/\r?\n\r?\n/);
  // The checksum is on a new line starting with '='
  const end = armored.search(/\n=/, start);
  return armored.slice(start, end).trim();
}
