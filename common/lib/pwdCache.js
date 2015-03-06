/**
 * Mailvelope - secure email with OpenPGP encryption for Webmail
 * Copyright (C) 2012  Thomas Oberndörfer
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
    if (active) {
      if (cache[primkeyid]) {
        return {
          password: cache[primkeyid].password,
          key: cache[primkeyid][keyid]
        };
      }
    }
  }

  /**
   * Set key and password in cache, start timeout
   * @param {Object} message
   *                   keyid: key ID of key that should be cached
   *                   key: private key, packet of keyid expected unlocked
   * @param {String} pwd     password, optional
   */
  function set(message, pwd) {
    // primary key id is main key of cache
    var primKeyIdHex = message.key.primaryKey.getKeyId().toHex();
    var entry = cache[primKeyIdHex];
    if (entry) {
      // set unlocked private key for this keyid
      if (!entry[message.keyid]) {
        entry[message.keyid] = message.key;
      }
    } else {
      var newEntry = cache[primKeyIdHex] = {};
      newEntry.password = pwd;
      newEntry[message.keyid] = message.key;
      // clear after timeout
      newEntry.timer = mvelo.util.setTimeout(function() {
        delete cache[primKeyIdHex];
      }, timeout * 60 * 1000);
    }
  }

  /**
   * Unlocked key if required and update cache
   * @param  {Object}   cacheEntry consisting of password and key
   * @param  {Object}   message
   *                      keyid: key ID of key packet that should be unlocked
   *                      key: private key, will be unlocked if not yet done
   * @param  {Function} callback   when done
   */
  function unlock(cacheEntry, message, callback) {
    if (!cacheEntry.key) {
      // unlock key
      model.unlockKey(message.key, message.keyid, cacheEntry.password, function(err, key) {
        if (!key) {
          throw {
            type: 'error',
            message: 'Password caching does not support different passphrases for primary key and subkeys'
          };
        }
        message.key = key;
        // set unlocked key in cache
        set(message);
        callback();
      });
    } else {
      // take unlocked key from cache
      message.key = cacheEntry.key;
      callback();
    }
  }

  exports.init = init;
  exports.get = get;
  exports.set = set;
  exports.unlock = unlock;

});
