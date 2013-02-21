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

  var prefs = require('common/lib/prefs');
  
  // password cache
  var cache;
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
   * Get password from cache
   * @param  {String} keyid
   * @return {String} password
   */
  function get(keyid) {
    if (active) {
      if (cache[keyid]) {
        return cache[keyid].password;
      }
    }
  }

  /**
   * Set password in cache, start timeout
   * @param {String} keyid
   * @param {String} password
   */
  function set(keyid, password) {
    if (cache[keyid]) {
      // clear timer if entry already exists
      mvelo.util.clearTimeout(cache[keyid].timer);
    }
    cache[keyid] = {password: password};
    // clear after timeout
    cache[keyid].timer = mvelo.util.setTimeout(function() {
      delete cache[keyid];
    }, timeout * 60 * 1000);
  }

  exports.get = get;
  exports.set = set;

});