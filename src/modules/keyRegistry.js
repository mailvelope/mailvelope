/**
 * Copyright (C) 2018 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import * as mveloKeyServer from './mveloKeyServer';
import * as wkd from './wkdLocate';
import * as autocrypt from './autocryptWrapper';
/**
 * @fileOverview This file implements a registry for keys from different
 * sources.
 * It works as a bridge for automated lookup of keys from
 * the Mailvelope Key Server and Web Key Directories.
 * It also retrieves keys from the autocrypt Register.
 *
 * When looking up the key for an email address it will
 * also decide which key from the different sources seems best.
 *
 * Currently it will select the first key available when checking
 * * first Mailvelope Key Server
 * * then WKD
 * * and autocrypt last
 */

const strategies = [mveloKeyServer, wkd, autocrypt];

/**
 * Get a verified public key from auto-locate sources by email address.
 *
 * @param {String} email - The user id's email address
 * @return {String,undefined} - the found armored key if any.
 */
export async function lookup(email) {
  for (const strategy of strategies) {
    if (strategy.isEnabled()) {
      try {
        const armored = await strategy.lookup(email);
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
