/**
 * Mailvelope - secure email with OpenPGP encryption for Webmail
 * Copyright (C) 2012-2015 Mailvelope GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License version 3
 * as published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

/**
 * @fileOverview A simple HTTP client for Mailvelope Key Server's REST api.
 */

'use strict';

define(function(require, exports, module) {

  /**
   * Creates an instance of the keyserver client.
   * @param {Object} mvelo      An instance of the mvelo lib
   * @param {String} baseUrl    (optional) The server's base url
   */
  function KeyServer(mvelo, baseUrl) {
    this._mvelo = mvelo;
    this._baseUrl = baseUrl || 'https://keys.mailvelope.com';
  }

  /**
   * Check the user's preferences if TOFU/auto-lookup is enabled.
   * @return {boolean}   If TOFU is enabled or not
   */
  KeyServer.prototype.getTOFUPreference = function() {
    var prefs = this._mvelo.storage.get('mailvelopePreferences');
    return prefs && prefs.keyserver && prefs.keyserver.mvelo_tofu_lookup === true;
  };

  /**
   * Get a verified public key either from the server by either email address,
   * key id, or fingerprint.
   * @param {string} options.email         (optional) The user id's email address
   * @param {string} options.keyId         (optional) The long 16 char key id
   * @param {string} options.fingerprint   (optional) The 40 char v4 fingerprint
   * @yield {Object}                       The public key object
   */
  KeyServer.prototype.lookup = function(options) {
    return fetch(this._url(options))
    .then(function(response) {
      if (response.status === 200) {
        return response.json();
      }
    });
  };

  /**
   * Upload a public key to the server for verification by the user. Normally
   * a verification mail is sent out to all of the key's user ids, unless a primary
   * email attribute is supplied. In which case only one email is sent.
   * @param {string} options.publicKeyArmored   The ascii armored key block
   * @param {string} options.primaryEmail       (optional) user's primary email address
   * @yield {undefined}
   */
  KeyServer.prototype.upload = function(options) {
    return fetch(this._url(), {
      method: 'POST',
      body: JSON.stringify(options)
    })
    .then(this._checkStatus);
  };

  /**
   * Request deletion of a user's key from the keyserver. Either an email address or
   * the key id have to be specified. The user will receive a verification email
   * after the request to confirm deletion.
   * @param {string} options.email   (optional) The user id's email address
   * @param {string} options.keyId   (optional) The long 16 char key id
   * @yield {undefined}
   */
  KeyServer.prototype.remove = function(options) {
    return fetch(this._url(options), {
      method: 'DELETE'
    })
    .then(this._checkStatus);
  };

  /**
   * Helper function to create a url with the proper query string for an
   * api request.
   * @param  {string} options.email         (optional) The user id's email address
   * @param  {string} options.keyId         (optional) The long 16 char key id
   * @param  {string} options.fingerprint   (optional) The 40 char v4 fingerprint
   * @return {string}                       The complete request url
   */
  KeyServer.prototype._url = function(options) {
    var url = this._baseUrl + '/api/v1/key';
    if (options && options.email) {
      url += '?email=' + encodeURIComponent(options.email);
    } else if (options && options.fingerprint) {
      url += '?fingerprint=' + encodeURIComponent(options.fingerprint);
    } else if (options && options.keyId) {
      url += '?keyId=' + encodeURIComponent(options.keyId);
    }
    return url;
  };

  /**
   * Helper function to deal with the HTTP response status
   * @param  {Object} response   The fetch api's response object
   * @return {Object|Error}      Either the response object in case of a successful
   *                             request or an Error containing the statusText
   */
  KeyServer.prototype._checkStatus = function(response) {
    if (response.status >= 200 && response.status < 300) {
      return response;
    } else {
      var error = new Error(response.statusText);
      error.response = response;
      throw error;
    }
  };

  module.exports = KeyServer;

});
