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

define(function (require, exports, module) {

  var prefs = require('./prefs');
  
  // password and key cache
  var cache;
  // caching active
  var active;
  // timeout in minutes
  var timeout;


  init();

  function init() {
    active = prefs.data.security.password_cache;
    timeout = prefs.data.security.password_timeout;
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
    if (active != prefs.data.security.password_cache 
      || timeout != prefs.data.security.password_timeout) {
      // init cache
      clearTimeouts();
      cache = {};
      active = prefs.data.security.password_cache;
      timeout = prefs.data.security.password_timeout;
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
        }
      }
    }
  }

  /**
   * Set key and password in cache, start timeout
   * @param {Object} message
   *                   primkeyid: key ID of the primary key
   *                   keyid: key ID of key that should be cached
   *                   privkey: private key packet of keyid, expected unlocked
   * @param {String} pwd     password, optional
   */
  function set(message, pwd) {
    // primary key id is main key of cache
    var entry = cache[message.primkeyid]; 
    if (entry) {
      // set unlocked private key for this keyid
      if (!entry[message.keyid]) {
        entry[message.keyid] = message.privkey;
      }
    } else {
      var newEntry = cache[message.primkeyid] = {};
      newEntry.password = pwd;
      newEntry[message.keyid] = message.privkey;
      // clear after timeout
      newEntry.timer = mvelo.util.setTimeout(function() {
        delete cache[message.primkeyid];
      }, timeout * 60 * 1000);
    }
  }

  exports.get = get;
  exports.set = set;

});