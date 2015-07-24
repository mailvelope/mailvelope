/**
 * Mailvelope - secure email with OpenPGP encryption for Webmail
 * Copyright (C) 2015 Mailvelope GmbH
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

'use strict';

define(function(require, exports, module) {

  var db = require('./indexedDB');

  function KeyStore(keyringId) {
    this.keyringId = keyringId;
    this.keys = null;
  }

  KeyStore.prototype.init = function() {
    var that = this;
    return db.getAll(db.DB_STORE_KEYS, 'keyringId', this.keyringId)
      .then(function(keys) {
        that.keys = keys;
      });
  };

  KeyStore.prototype.clear = function() {

  };

  /**
   * @param {String} keyId provided as string of lowercase hex number
   * withouth 0x prefix (can be 16-character key ID or fingerprint)
   * @param  {Boolean} deep if true search also in subkeys
   * @return {Array<Object>|null} keys found or null
   */
  KeyStore.prototype.getKeysForId = function(keyId, deep) {
    var result = [];

    return result.length ? result : null;
  };

  /**
   * @param {String} keyId provided as string of lowercase hex number
   * withouth 0x prefix (can be 16-character key ID or fingerprint)
   * @return {Array<Object>|null} keys found or null
   */
  KeyStore.prototype.removeKeysForId = function(keyId) {
    var result = [];

    return result.length ? result : null;
  };

  /**
   * @return {Array<Object>} all keys
   */
  KeyStore.prototype.getAllKeys = function() {

  };

  exports.KeyStore = KeyStore;

});
