/**
 * Copyright (C) 2018 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import * as mveloKeyServer from './mveloKeyServer';
import * as wkd from './wkdLocate';
import * as autocrypt from './autocryptWrapper';
/**
 * @fileOverview This file implements a bridge for automated lookup
 * of keys from other sources. E.g. the Mailvelope Key Server and
 * Web Key Directories.
 */

const strategies = [mveloKeyServer, wkd, autocrypt];

/**
 * Get a verified public key from auto-locate sources by email address.
 *
 * @param {String} [options.email] - The user id's email address
 * @return {String} - if auto-locate is successful the found armored key
 */
export async function locate(options) {

  for (const strategy of strategies) {
    if (strategy.isEnabled()) {
      try {
        const armored = await strategy.lookup(options.email);
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
* Check if any source is enabled.
*
* @return {Boolean}
*/
export function isEnabled() {
  const enabled = strategies.find(strategy => strategy.isEnabled());
  return enabled !== undefined;
}
