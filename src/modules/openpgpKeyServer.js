/**
 * Copyright (C) 2021 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import {prefs} from './prefs';
import {key as openpgpKey} from 'openpgp';
import {filterUserIdsByEmail, removeHexPrefix} from './key';

// The default URL of the keys.openpgp.org verifying key server.
export const DEFAULT_URL = 'https://keys.openpgp.org';

export const name = 'OKS';
export const label = 'keys.openpgp.org';

/**
* Check if the key server is enabled.
*
* @return {Boolean}
*/
export function isEnabled() {
  return prefs.keyserver.oks_lookup === true;
}

/**
 * Get a verified public key from the server by email address.
 *
 * @param {Object<email, keyId, fingerprint>} query - query parameters to search key
 * @yield {String|undefined} Armored key with matching uid. Undefined if no key was found.
 */
export async function lookup(query) {
  let armoredKey;
  if (!query) {
    throw new Error('openpgpKeyServer: Skipping lookup without query.');
  }
  const response = await window.fetch(url(query));
  if (response.status === 200) {
    armoredKey = await response.text();
  }
  if (!armoredKey) {
    return;
  }
  // Only the userid matching the email should be imported.
  // This avoids usability problems and potential security issues
  // when unreleated userids are also part of the key.
  const parseResult = await openpgpKey.readArmored(armoredKey);
  if (parseResult.err) {
    throw new Error(`openpgpKeyServer: Failed to parse response '${armoredKey}': ${parseResult.err}`);
  }
  const keys = parseResult.keys;
  if (keys.length !== 1) {
    throw new Error(`openpgpKeyServer: Response '${armoredKey}': contained ${keys.length} keys.`);
  }
  const filtered = filterUserIdsByEmail(keys[0], query.email);
  if (!filtered.users.length) {
    throw new Error(`openpgpKeyServer: Response '${armoredKey}': contained no matching userIds.`);
  }
  console.log(`openpgpKeyServer: fetched key: '${filtered.primaryKey.getFingerprint()}'`);
  const result = {
    armored: filtered.armor(),
    date: new Date()
  };
  return result;
}

/**
 * Helper function to create a url with the proper path for an api request.
 * @param  {String} [options.email] - The user id's email address
 * @param  {String} [options.keyId] - The long 16 char key id
 * @param  {String} [options.fingerprint] - The 40 char v4 fingerprint
 * @return {String} The complete request url
 */
function url({email, keyId, fingerprint} = {}) {
  const url = `${DEFAULT_URL}/vks/v1/`;
  if (email) {
    return `${url}by-email/${encodeURIComponent(email)}`;
  } else if (fingerprint) {
    return `${url}by-fingerprint/${encodeURIComponent(removeHexPrefix(fingerprint).toUpperCase())}`;
  } else if (keyId) {
    return `${url}by-keyid/${encodeURIComponent(removeHexPrefix(keyId).toUpperCase())}`;
  }
  return url;
}
