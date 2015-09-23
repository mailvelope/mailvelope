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

'use strict';

define(function(require, exports, module) {

  var mvelo = require('../lib-mvelo').mvelo;
  var prefs = require('./prefs');
  var model = require('./pgpModel');

  // password and key cache
  var cache;
  // caching active
  var active;
  // timeout in minutes
  var timeout;

  function init() {
    active = prefs.data().security.password_cache;
    timeout = prefs.data().security.password_timeout;
    cache = {};
    // register for updates
    prefs.addUpdateHandler(update);
  }

  function clearTimeouts() {
    // clear timeout functions
    for (var entry in cache) {
      if (cache.hasOwnProperty(entry)) {
        mvelo.util.clearTimeout(entry.timer);
      }
    }
  }

  function update() {
    if (active != prefs.data().security.password_cache ||
        timeout != prefs.data().security.password_timeout) {
      // init cache
      clearTimeouts();
      cache = {};
      active = prefs.data().security.password_cache;
      timeout = prefs.data().security.password_timeout;
    }
  }

  /**
   * Get password and unlocked key from cache
   * @param  {String} primkeyid primary key id
   * @param  {String} keyid     requested unlocked key
   * @return {Object}           password of key, if available unlocked key for keyid
   */
  function get(primkeyid, keyid) {
    if (cache[primkeyid]) {
      return {
        password: cache[primkeyid].password,
        key: cache[primkeyid][keyid]
      };
    }
  }

  /**
   * Delete key from cache
   * @param  {String} primkeyid primary key id
   */
  function deleteEntry(primkeyid) {
    delete cache[primkeyid];
  }

  /**
   * Set key and password in cache, start timeout
   * @param {Object} message
   * @param {String} [message.keyid] - key ID of key that should be cached
   * @param {openpgp.key.Key} message.key - private key, packet of keyid expected unlocked
   * @param {String} message.pwd - password
   * @param {Number} [message.cacheTime] - timeout in minutes
   */
  function set(message, pwd, cacheTime) {
    // primary key id is main key of cache
    var primKeyIdHex = message.key.primaryKey.getKeyId().toHex();
    var entry = cache[primKeyIdHex];
    if (entry) {
      // set unlocked private key for this keyid
      if (message.keyid && !entry[message.keyid]) {
        entry[message.keyid] = message.key;
      }
    } else {
      var newEntry = cache[primKeyIdHex] = {};
      newEntry.password = pwd;
      if (message.keyid) {
        newEntry[message.keyid] = message.key;
      }
      // clear after timeout
      newEntry.timer = mvelo.util.setTimeout(function() {
        delete cache[primKeyIdHex];
      }, (cacheTime || timeout) * 60 * 1000);
    }
  }

  /**
   * Unlocked key if required and update cache
   * @param {Object} options
   * @param {openpgp.key.Key} options.key - key to unlock
   * @param {String} options.keyid - keyid of required key packet
   * @param {String} options.password - password to unlock key
   * @return {Promise<undefined, Error>}
   */
  function unlock(options) {
    return model.unlockKey(options.key, options.keyid, options.password)
      .then(function(key) {
        options.key = key;
        // set unlocked key in cache
        set(options);
      })
      .catch(function(err) {
        throw {
          type: 'error',
          message: 'Password caching does not support different passphrases for primary key and subkeys'
        };
      });
  }

  exports.init = init;
  exports.get = get;
  exports.delete = deleteEntry;
  exports.set = set;
  exports.unlock = unlock;

});
