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
 * This checks for all strategies if they are enabled.
 * If none is enabled it will return fast.
 * So there is no need to check if the registry is enabled first.
 *
 * @param {String} email    - The user id's email address
 * @param {String} identity - The id of the keyring that is currently <br/>
 *                             being used.
 * @return {Object, undefined} - {content: armored key, source}
 */
export async function lookup(email, identity) {
  for (const strategy of strategies) {
    if (!strategy.isEnabled()) {
      continue;
    }
    try {
      const result = await strategy.lookup(email, identity);
      if (result) {
        return {
          content: result.armored,
          source: strategy.name
        };
      }
    } catch (e) {
      // Failures are not critical so we only info log them.
      console.log(`${strategy.name}: Did not find key (Errors are expected): ${e}`);
    }
  }
}

/**
* Check if any source is enabled.
*
* @return {Boolean}
*/
export function isEnabled() {
  return strategies.some(strategy => strategy.isEnabled());
}
