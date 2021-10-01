/**
 * Copyright (C) 2021 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import {prefs} from './prefs';
import {key as openpgpKey} from 'openpgp';
import {filterUserIdsByEmail} from './key';

// The default URL of the keys.openpgp.org verifying key server.
const DEFAULT_URL = 'https://keys.openpgp.org';

export const name = 'OKS';

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
 * @param {string} email       The user id's email address
 * @yield {String|{undefined}  Armored key with matching uid.
 *                             Undefined if no key was found.
 */
export async function lookup(email) {
  let armoredKey;
  if (!email) {
    throw new Error('openpgpKeyServer: Skipping lookup without email.');
  }
  const response = await window.fetch(`${DEFAULT_URL}/vks/v1/by-email/${encodeURIComponent(email)}`);
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
  const filtered = filterUserIdsByEmail(keys[0], email);
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
