/**
 * Copyright (C) 2016-2018 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

/**
 * @fileOverview A simple HTTP client for Mailvelope Key Server's REST api.
 */
import {prefs} from './prefs';
import {key as openpgpKey} from 'openpgp';
import {filterUserIdsByEmail} from './key';

/** The default URL of the mailvelope authenticating keyserver. */
const DEFAULT_URL = 'https://keys.mailvelope.com';

export const name = 'MKS';

/**
* Check if the Mailvelope Key Server is enabled.
*
* @return {Boolean}
*/
export function isEnabled() {
  return prefs.keyserver.mvelo_tofu_lookup === true;
}

/**
 * Get a verified public key from the server by email address.
 *
 * It will only return keys with UserIDs that match the email.
 * The userIds from the json object are purely informational
 * as the userIds that are also on the key on the Key Server.
 *
 * @param {string} email       The user id's email address
 * @yield {String|{undefined}  Armored key with matching uid.
 *                             Undefined if no key was found.
 */
export async function lookup(email) {
  let jsonKey;
  if (!email) {
    throw new Error('mveloKeyServer: Skipping lookup without email.');
  }
  const response = await window.fetch(url({email}));
  if (response.status === 200) {
    jsonKey = await response.json();
  }
  if (!jsonKey) {
    return;
  }

  // Only the userid matching the email should be imported.
  // This avoids usability problems and potentioal security issues
  // when unreleated userids are also part of the key.
  const parseResult = await openpgpKey.readArmored(jsonKey.publicKeyArmored);
  if (parseResult.err) {
    throw new Error(`mveloKeyServer: Failed to parse response '${jsonKey}': ${parseResult.err}`);
  }
  const keys = parseResult.keys;
  if (keys.length !== 1) {
    throw new Error(`mveloKeyServer: Response '${jsonKey}': contained ${keys.length} keys.`);
  }
  const filtered = filterUserIdsByEmail(keys[0], email);

  if (!filtered.users.length) {
    throw new Error(`mveloKeyServer: Response '${jsonKey}': contained no matching userIds.`);
  }
  console.log(`mveloKeyServer: fetched key: '${filtered.primaryKey.getFingerprint()}'`);
  const result = {
    armored: filtered.armor(),
    date: new Date
  };
  return result;
}

/**
 * Get a verified public key either from the server by either key id, or fingerprint.
 *
 * We are not using this function yet.
 * It's part of the Mailvelope Key Server API - so we leave this here
 * for later use.
 *
 * @param {string} options.keyId         (optional) The long 16 char key id
 * @param {string} options.fingerprint   (optional) The 40 char v4 fingerprint
 * @yield {Object}                       The public key json object
 */
export async function fetch(options) {
  let jsonKey;
  const response = await window.fetch(url(options));
  if (response.status === 200) {
    jsonKey = await response.json();
  }
  return jsonKey;
}

/**
 * Upload a public key to the server for verification by the user. Normally
 * a verification mail is sent out to all of the key's user ids, unless a primary
 * email attribute is supplied. In which case only one email is sent.
 * @param {Array} options.emails              (optional) Specify the user ids by email address to upload
 * @param {string} options.publicKeyArmored   The ascii armored key block
 * @yield {undefined}
 */
export async function upload({emails, publicKeyArmored}) {
  const body = {publicKeyArmored};
  if (emails) {
    body.emails = emails;
  }
  const response = await window.fetch(url(), {
    method: 'POST',
    headers: new Headers({'Content-Type': 'application/json'}),
    body: JSON.stringify(body)
  });
  checkStatus(response);
}

/**
 * Request deletion of a user's key from the keyserver. Either an email address or
 * the key id have to be specified. The user will receive a verification email
 * after the request to confirm deletion.
 * @param {string} options.email   (optional) The user id's email address
 * @param {string} options.keyId   (optional) The long 16 char key id
 * @yield {undefined}
 */
export async function remove(options) {
  const response = await window.fetch(url(options), {
    method: 'DELETE'
  });
  checkStatus(response);
}

/**
 * Helper function to create a url with the proper query string for an
 * api request.
 * @param  {string} options.email         (optional) The user id's email address
 * @param  {string} options.keyId         (optional) The long 16 char key id
 * @param  {string} options.fingerprint   (optional) The 40 char v4 fingerprint
 * @return {string}                       The complete request url
 */
function url(options) {
  let url = `${DEFAULT_URL}/api/v1/key`;
  if (options && options.email) {
    url += `?email=${encodeURIComponent(options.email)}`;
  } else if (options && options.fingerprint) {
    url += `?fingerprint=${encodeURIComponent(options.fingerprint)}`;
  } else if (options && options.keyId) {
    url += `?keyId=${encodeURIComponent(options.keyId)}`;
  }
  return url;
}

/**
 * Helper function to deal with the HTTP response status
 * @param  {Object} response   The fetch api's response object
 * @return {Object|Error}      Either the response object in case of a successful
 *                             request or an Error containing the statusText
 */
function checkStatus(response) {
  if (response.status >= 200 && response.status < 300) {
    return response;
  } else {
    const error = new Error(response.statusText);
    error.response = response;
    throw error;
  }
}
