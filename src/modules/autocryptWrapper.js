/**
 * Copyright (C) 2015-2018 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from '../lib/lib-mvelo';
import Autocrypt from 'autocrypt';
import {prefs} from './prefs';
import {goog} from './closure-library/closure/goog/emailaddress';

export const name = 'AC';
const stores = new Map;

/**
* Check if Autocrypt is enabled.
*
* @return {Boolean}
*/
export function isEnabled() {
  return prefs.keyserver.autocrypt_lookup === true;
}

function ac(id) {
  const key = `mailvelope.autocrypt.${id}`;
  let storage = stores.get(key);
  if (!storage) {
    storage = new Store(key);
    stores.set(key, storage);
  }
  return new Autocrypt({storage});
}

/**
 * Get a public key from autocrypt by email address.
 *
 * @param {String} email    - The user id's email address
 * @param {String} identity - The identity of the context the key is being looked up in
 * @return {String,undefined} - the found armored key if any.
 */
export function lookup(email, identity) {
  return new Promise((resolve, reject) => {
    ac(identity).storage.get(email, (err, record) => {
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
 * @param {Object} headers  - The relevant headers of the email
 * @param {String} identity - The identity of the recipient
 * @return {undefined}
 * @trows {Error}
 */
export async function processHeader(headers, identity) {
  return new Promise((resolve, reject) => {
    const date = new Date(headers.date);
    const fromAddr = goog.format.EmailAddress.parse(headers.from).getAddress();
    if (headers.autocrypt.length > 10240) {
      reject(new Error('Invalid Autocrypt Header: rejecting headers longer than 10k'));
    }
    ac(identity).processAutocryptHeader(headers.autocrypt, fromAddr, date, err => {
      if (err) {
        if (err.message == 'Invalid Autocrypt Header: no valid header found') {
          resolve();
        }
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

function armor(base64) {
  const head = '-----BEGIN PGP PUBLIC KEY BLOCK-----';
  const footer = '-----END PGP PUBLIC KEY BLOCK-----';
  const lines = base64.match(/.{1,64}/g);
  return [head, ''].concat(lines).concat([footer]).join('\n');
}

class Store {
  constructor(storageKey) {
    this.storageKey = storageKey;
    this.map = new Map();
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
    this.init()
    .then(cb(undefined, this.map.get(key)));
  }

  put(key, val, cb) {
    this.init()
    .then(this.map.set(key, val))
    .then(this.store())
    .then(cb());
  }

  async store() {
    await mvelo.storage.set(this.storageKey, this.toObject());
  }

  toObject() {
    const all = {};
    this.map.forEach((value, key) => all[key] = value);
    return all;
  }
}
