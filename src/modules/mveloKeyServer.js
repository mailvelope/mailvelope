/**
 * Copyright (C) 2016-2018 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

/**
 * @fileOverview A simple HTTP client for Mailvelope Key Server's REST api.
 */

/** The default URL of the mailvelope authenticating keyserver. */
const DEFAULT_URL = 'https://keys.mailvelope.com';

let baseUrl = DEFAULT_URL;

/**
 * Changes the base Key Server URL this module uses.
 * Default is https://keys.mailvelope.com
 *
 * @param {String} value    The server's base url
 */
export function setKeyServerURL(value) {
  baseUrl = value;
}

/**
 * Get a verified public key either from the server by either email address,
 * key id, or fingerprint.
 * @param {string} options.email         (optional) The user id's email address
 * @param {string} options.keyId         (optional) The long 16 char key id
 * @param {string} options.fingerprint   (optional) The 40 char v4 fingerprint
 * @yield {Object}                       The public key json object
 */
export async function lookup(options) {
  const response = await window.fetch(url(options));
  if (response.status === 200) {
    return response.json();
  }
}

/**
 * Upload a public key to the server for verification by the user. Normally
 * a verification mail is sent out to all of the key's user ids, unless a primary
 * email attribute is supplied. In which case only one email is sent.
 * @param {string} options.publicKeyArmored   The ascii armored key block
 * @yield {undefined}
 */
export async function upload({publicKeyArmored}) {
  const response = await window.fetch(url(), {
    method: 'POST',
    headers: new Headers({'Content-Type': 'application/json'}),
    body: JSON.stringify({publicKeyArmored})
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
  let url = `${baseUrl}/api/v1/key`;
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
