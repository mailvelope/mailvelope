/**
 * Copyright (C) 2018 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */


import {lookup as mveloKSLookup} from './mveloKeyServer';
import {prefs} from './prefs';
import {getById as getKeyringById} from './keyring';
import mvelo from '../lib/lib-mvelo';
import {lookup as wkdLookup} from './wkdLocate';

/**
 * @fileOverview This file implements a bridge for automated lookup
 * of keys from other sources. E.g. the Mailvelope Keyserver and
 * Web Key Directories.
 */

/**
 * Get a verified public key from auto-locate sources by either email address,
 * key id, or fingerprint.
 *
 * @param {string} options.email         (optional) The user id's email address
 * @param {string} options.keyId         (optional) The long 16 char key id
 * @param {string} options.fingerprint   (optional) The 40 char v4 fingerprint
 * @param {string} options.keyringId     (optional) The keyring to import to.
 *                                                  Default is the main keyring.
 */
export async function locate(options) {
  let armored;
  if (getMveloKeyserverEnabled()) {
    try {
      const key = await mveloKSLookup(options);
      if (key) {
        armored = key.publicKeyArmored;
      }
    } catch (e) {
      // Failures are not critical so we only info log them.
      console.log(`Mailvelope Server: Did not find key (Errors are expected): ${e}`);
    }
  }
  if (!armored && options.email && getWKDEnabled()) {
    // As we do not (yet) handle key updates through WKD we only want one
    // one key.
    try {
      armored = await wkdLookup(options.email, true);
    } catch (e) {
      // WKD Failures are not critical so we only info log them.
      console.log(`WKD: Did not find key (Errors are expected): ${e}`);
    }
  }
  if (armored) {
    // persist key in the provided keyring
    let keyringId = options.keyringId;
    if (!keyringId) {
      keyringId = mvelo.MAIN_KEYRING_ID;
    }
    const localKeyring = getKeyringById(keyringId);
    await localKeyring.importKeys([{type: 'public', armored}]);
  }
  return;
}

/**
* Check if WKD lookup is enabled.
*
* @return {Boolean}
*/
export function getWKDEnabled() {
  return prefs.keyserver.wkd_lookup === true;
}

/**
* Check if the Mailvelope Keyserver is enabled.
*
* @return {Boolean}
*/
export function getMveloKeyserverEnabled() {
  return prefs.keyserver.mvelo_tofu_lookup === true;
}

/**
* Check if any source is enabled.
*
* @return {Boolean}
*/
export function getEnabled() {
  return getWKDEnabled() || getMveloKeyserverEnabled();
}
