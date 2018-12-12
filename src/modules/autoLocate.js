/**
 * Copyright (C) 2018 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import {prefs} from './prefs';
import {lookup as mveloKSLookup} from './mveloKeyServer';
import {lookup as wkdLookup} from './wkdLocate';

/**
 * @fileOverview This file implements a bridge for automated lookup
 * of keys from other sources. E.g. the Mailvelope Key Server and
 * Web Key Directories.
 */

/**
 * Get a verified public key from auto-locate sources by either email address,
 * key id, or fingerprint.
 *
 * @param {String} [options.email] - The user id's email address
 * @return {String} - if auto-locate is successful the found armored key
 */
export async function locate(options) {
  let armored;

  const strategies = [
    {name: 'Mailvelope Server',
      isEnabled: isMveloKeyServerEnabled,
      lookup: mveloKSLookup},
    {name: 'WKD',
      isEnabled: isWKDEnabled,
      lookup: wkdLookup}
  ];

  for (const strategy of strategies) {
    if (strategy.isEnabled()) {
      try {
        armored = await strategy.lookup(options.email);
        if (armored) {
          return armored;
        }
      } catch (e) {
        // Failures are not critical so we only info log them.
        console.log(`${strategy.name}: Did not find key (Errors are expected): ${e}`);
      }
    }
  }
}

/**
* Check if WKD lookup is enabled.
*
* @return {Boolean}
*/
export function isWKDEnabled() {
  return prefs.keyserver.wkd_lookup === true;
}

/**
* Check if the Mailvelope Key Server is enabled.
*
* @return {Boolean}
*/
export function isMveloKeyServerEnabled() {
  return prefs.keyserver.mvelo_tofu_lookup === true;
}

/**
* Check if any source is enabled.
*
* @return {Boolean}
*/
export function isEnabled() {
  return isWKDEnabled() || isMveloKeyServerEnabled();
}
