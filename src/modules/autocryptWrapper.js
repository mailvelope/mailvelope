import Autocrypt from 'autocrypt';
import Store from '../lib/Store';

export const name = 'Autocrypt';
const stores = new Map;

/**
* Check if Autocrypt is enabled.
*
* @return {Boolean}
*/
export function isEnabled() {
  return true; // TODO: add configuration setting
}

function ac(id) {
  let storage = stores.get(id);
  if (!storage) {
    storage = new Store(id);
    stores.set(id, storage);
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
        resolve(record && record.keydata);
      }
    });
  });
}

/**
 * Process an autocrypt Header to store a public key.
 *
 * @param {String} header   - The header to parse
 * @param {String} fromAddr - The senders email address
 * @param {String} identity - The identity of the recipient
 * @return {undefined}
 * @trows {Error}
 */
export async function processHeader(header, fromAddr, date, identity) {
  return new Promise((resolve, reject) => {
    ac(identity).processAutocryptHeader(header, fromAddr, date, err => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}
