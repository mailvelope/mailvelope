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
  if (isMveloKeyServerEnabled()) {
    try {
      armored = await mveloKSLookup(options.email);
    } catch (e) {
      // Failures are not critical so we only info log them.
      console.log(`Mailvelope Server: Did not find key (Errors are expected): ${e}`);
    }
  }
  if (!armored && options.email && isWKDEnabled()) {
    // As we do not (yet) handle key updates through WKD we only want one key.
    try {
      armored = await wkdLookup(options.email);
    } catch (e) {
      // WKD Failures are not critical so we only info log them.
      console.log(`WKD: Did not find key (Errors are expected): ${e}`);
    }
  }
  return armored;
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
