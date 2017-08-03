/**
 * Copyright (C) 2016-2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import {prefs} from './prefs';

/**
 * @fileOverview A simple HTTP client for Mailvelope Key Server's REST api.
 */

'use strict';


/**
 * Creates an instance of the keyserver client.
 * @param {Object} mvelo      An instance of the mvelo lib
 * @param {String} baseUrl    (optional) The server's base url
 */
export default class KeyServer {
  constructor(mvelo, baseUrl) {
    this._mvelo = mvelo;
    this._baseUrl = baseUrl || 'https://keys.mailvelope.com';
  }

  /**
   * Check the user's preferences if TOFU/auto-lookup is enabled.
   * @return {boolean}   If TOFU is enabled or not
   */
  getTOFUPreference() {
    return prefs.keyserver.mvelo_tofu_lookup === true;
  }

  /**
   * Get a verified public key either from the server by either email address,
   * key id, or fingerprint.
   * @param {string} options.email         (optional) The user id's email address
   * @param {string} options.keyId         (optional) The long 16 char key id
   * @param {string} options.fingerprint   (optional) The 40 char v4 fingerprint
   * @yield {Object}                       The public key object
   */
  lookup(options) {
    return this._mvelo.util.fetch(this._url(options))
    .then(response => {
      if (response.status === 200) {
        return response.json();
      }
    });
  }

  /**
   * Upload a public key to the server for verification by the user. Normally
   * a verification mail is sent out to all of the key's user ids, unless a primary
   * email attribute is supplied. In which case only one email is sent.
   * @param {string} options.publicKeyArmored   The ascii armored key block
   * @param {string} options.primaryEmail       (optional) user's primary email address
   * @yield {undefined}
   */
  upload(options) {
    var payload = {publicKeyArmored: options.publicKeyArmored};
    if (options.primaryEmail) {
      payload.primaryEmail = options.primaryEmail;
    }
    return this._mvelo.util.fetch(this._url(), {
      method: 'POST',
      body: JSON.stringify(payload)
    })
    .then(this._checkStatus);
  }

  /**
   * Request deletion of a user's key from the keyserver. Either an email address or
   * the key id have to be specified. The user will receive a verification email
   * after the request to confirm deletion.
   * @param {string} options.email   (optional) The user id's email address
   * @param {string} options.keyId   (optional) The long 16 char key id
   * @yield {undefined}
   */
  remove(options) {
    return this._mvelo.util.fetch(this._url(options), {
      method: 'DELETE'
    })
    .then(this._checkStatus);
  }

  /**
   * Helper function to create a url with the proper query string for an
   * api request.
   * @param  {string} options.email         (optional) The user id's email address
   * @param  {string} options.keyId         (optional) The long 16 char key id
   * @param  {string} options.fingerprint   (optional) The 40 char v4 fingerprint
   * @return {string}                       The complete request url
   */
  _url(options) {
    var url = this._baseUrl + '/api/v1/key';
    if (options && options.email) {
      url += '?email=' + encodeURIComponent(options.email);
    } else if (options && options.fingerprint) {
      url += '?fingerprint=' + encodeURIComponent(options.fingerprint);
    } else if (options && options.keyId) {
      url += '?keyId=' + encodeURIComponent(options.keyId);
    }
    return url;
  }

  /**
   * Helper function to deal with the HTTP response status
   * @param  {Object} response   The fetch api's response object
   * @return {Object|Error}      Either the response object in case of a successful
   *                             request or an Error containing the statusText
   */
  _checkStatus(response) {
    if (response.status >= 200 && response.status < 300) {
      return response;
    } else {
      var error = new Error(response.statusText);
      error.response = response;
      throw error;
    }
  }
}
