/**
 * Copyright (C) 2018 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

/**
 * @fileOverview This file implements Web Key directory lookup.
 */

import * as crypto from 'crypto';
import * as openpgp from 'openpgp';
import {prefs} from './prefs';
import {filterUserIdsByEmail} from './key';
import defaults from '../res/defaults.json';

export const name = 'WKD';

// For testing the following publicly available userIds can be used:
//
// test-large-rsa@testkolab.intevation.de        A large > 1MiB ECC key.
// test-multikey-rsa@testkolab.intevation.de     Multiple keys, one is revoked, two are valid, one does not match the UID.
// test-not-matching-rsa@testkolab.intevation.de A key without a matching UID.
// test-multi-uids-rsa@testkolab.intevation.de   A key with multiple UIDs.
//
// By leaving of the -rsa suffix you can obtain ECC variants of the keys.

// Fetch timeout in seconds (based on GnuPG)
const TIMEOUT = 5;

// Size limit of the response in KiB (based on GnuPG).
// Needs support for access to Response.body by the browser. Otherwise
// the size limit depends on the timeout.
const SIZE_LIMIT = 256;

// blacklist to check for domains where WKD should not even be tried.
let blacklist;

/**
* Check if WKD lookup is enabled.
*
* @return {Boolean}
*/
export function isEnabled() {
  return prefs.keyserver.wkd_lookup === true;
}

/**
 * Get a key from WKD by the email address.
 * @param {String}    email    The keys email address.
 * @yield {String|{undefined}  Armored key with matching uid.
 *                             Undefined if no key was found.
 */
export async function lookup(email) {
  if (!email) {
    throw new Error('WKD: Skipping lookup without email.');
  }

  const [, domain] = /.*@(.*)/.exec(email);

  if (isBlacklisted(domain)) {
    return;
  }

  const url = buildWKDUrl(email);

  // Impose a size limit and timeout similar to that of gnupg.
  const data = await timeout(TIMEOUT * 1000, window.fetch(url)).then(
    res => sizeLimitResponse(res, SIZE_LIMIT * 1024));

  if (!data) {
    // If we got nothing the get error was already logged and
    // we do not need to throw another error. TH
    return;
  }

  // Now we should have binary keys in the response.
  const armored = await parseKeysForEMail(data, email);

  return {armored, date: new Date};
}

/**
 * Check if a domain is blacklisted.
 *
 * Throws an error if the domain is blacklisted.
 *
 * @param {String} domain  The domain to check
 * @return {Boolean}       Weather or not the domain is blacklisted.
 */
function isBlacklisted(domain) {
  if (typeof blacklist == 'undefined') {
    blacklist = (defaults.preferences.keyserver.wkd_blacklist || []).map(item => RegExp(item, 'i'));
  }

  for (const item of blacklist) {
    if (item.test(domain)) {
      return true;
    }
  }
  return false;
}

/**
 * Build a WKD Url from a canonicalized email (mbox) address.
 *
 * Code based on openpgp.js src/util.js rev. 22c66c1
 * under the terms of the GNU Lesser General Public License Version 3
 *
 * @param {String}   email  The canonicalized RFC822 addr spec.
 *
 * @returns {String} The WKD URL according to draft-koch-openpgp-webkey-service-06.
 */
function buildWKDUrl(email) {
  const [, localPart, domain] = /(.*)@(.*)/.exec(email);

  if (!localPart || !domain) {
    throw new Error(`WKD: failed to parse: ${email}`);
  }
  const shasum = crypto.createHash('sha1');
  shasum.update(localPart.toLowerCase());
  const digest = shasum.digest();
  const localEncoded = openpgp.util.encodeZBase32(digest);

  return `https://${domain}/.well-known/openpgpkey/hu/${localEncoded}`;
}

/** Convert a promise into a promise with a timeout.
  *
  * @param {Number}    ms       The timeout in milliseconds.
  * @param {Promise}   promise  The promise to wrap.
  *
  * @returns {Promise} A promise with a timeout.
  **/
function timeout(ms, promise) {
  return new Promise(((resolve, reject) => {
    setTimeout(() => {
      reject(new Error('WKD: Timeout'));
    }, ms);
    promise.then(resolve, reject);
  }));
}

/**
 * A WKD key can contain UserIDs which do not match what
 * was searched for. This function inspects the response and
 * filters out UserIDs and keys which do not match, before returning
 * the keys from the response in armored format to be imported
 * into the keyring.
 *
 * Security: This is a central element for trust by https / WKD through
 * the domain provider. If accepting any key or any userid provided, there
 * would be no trust gain as a malicious domain could pollute the keyring
 * or include userids for other domains.  The validity check and
 * limitation to one key make this function more convenient to use
 * for simple implementations which do not plan to use WKD for Key rollover
 * but have no security purpose.
 *
 * This will return only the best key. Best means: The newest, valid key.
 * If no keys are valid it only returns the newest.
 *
 * @param {ByteArray} data          Binary data that might contain keys.
 * @param {String}    email         The email address for the userids.
 * @returns {String}  An array of the ASCII armored filtered keys or only one armored key.
 */
async function parseKeysForEMail(data, email) {
  if (!openpgp.util.isUint8Array(data)) {
    throw new Error(`WKD: parseKeysForEMail invalid data type ${data.constructor.toString()}`);
  }

  const result = await openpgp.key.read(data);
  if (result.err) {
    throw new Error(`WKD: Failed to parse result for '${email}': ${result.err}`);
  }

  try {
    let candidate;

    for (const key of result.keys) {
      console.log(`WKD: inspecting: ${key.primaryKey.getFingerprint()}`);
      const filtered = filterUserIdsByEmail(key, email);
      if (filtered.users.length) {
        if (!candidate) {
          candidate = filtered;
        } else { // More then one filtered in WKD is a rare case. Example can be found as "test-multikey@testkolab.intevation.de"
          const newValid = await filtered.verifyPrimaryKey() === openpgp.enums.keyStatus.valid;
          const oldValid = await candidate.verifyPrimaryfiltered() === openpgp.enums.keyStatus.valid;
          // Prefer the one that is valid
          if (newValid && !oldValid) {
            candidate = filtered;
            console.log(`WKD: Preferring ${filtered.primaryKey.getFingerprint()} over ${candidate.primaryKey.getFingerprint()} because of validity.`);
          } else if (newValid === oldValid && filtered.primaryKey.created > candidate.primaryKey.created) {
            // If both are valid or invalid check the creation date
            console.log(`WKD: Preferring ${filtered.primaryKey.getFingerprint()} over ${candidate.primaryKey.getFingerprint()} because of cr date of primary.`);
            candidate = filtered;
          }
        }
      } else {
        // Example for this can be found as "test-not-matching@testkolab.intevation.de"
        console.log(`WKD: skipping not matching key '${key.primaryKey.getFingerprint()}' (bad server)`);
      }
    }
    if (candidate) {
      console.log(`WKD: Fetched key: '${candidate.primaryKey.getFingerprint()}'`);
      return candidate.armor();
    }
    throw new Error('WKD: Failed to parse any matching key from the result (bad server)');
  } catch (e) {
    throw new Error(`WKD: Error handling keys: '${e}'`);
  }
}

/** Adds a size limit on a Response which throws
 * an error if the limit is surpassed.
 *
 * Based on: https://fetch.spec.whatwg.org/
 *
 * @param {Response}     response  The fetch response.
 * @param {Number}       limit     The maximum bytes to read.
 *
 * @returns {Uint8array|undefined} Array containing the data read or undefined for
 *                                 responses that do not have status code 200.
 */
function sizeLimitResponse(response, limit) {
  if (response.status != 200) {
    return;
  }

  let reader;
  try {
    reader = response.body.getReader();
  } catch (e) {
    // There might not be RedableStream support in some browsers.
    // If it is not available we just read the full response.
    //
    // Security: While it would be preferrable to have a size limit
    // in place, the absence of it is not critical as we are
    // protected against stalling by the time limit and against
    // keyring pollution by the UserID / Key Filter mechanism.
    //
    // The timeout should already impose a size limit depending
    // on the bandwidth.
    return response.arrayBuffer().then(buffer => new Uint8Array(buffer));
  }
  let total = 0;
  const results = [];
  return pump();
  function pump() {
    return reader.read().then(({done, value}) => {
      if (done) {
        return openpgp.util.concatUint8Array(results);
      }
      total += value.byteLength;
      results.push(new Uint8Array(value));
      if (total > limit) {
        // Example for this can be found as "test-large@testkolab.intevation.de"
        throw new Error('WKD: Response longer then the max size');
      }
      return pump();
    });
  }
}
