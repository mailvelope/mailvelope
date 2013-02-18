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

  var mvelo = require('lib/lib-mvelo').mvelo;
  var model = mvelo.getModel();
  
  // password cache
  var cache = {};
  // timeout in minutes
  var timeout = getTimeout();

  /**
   * Get password timeout time
   * @return {Number} time out in minutes
   */
  function getTimeout() {
    if (timeout) {
      return timeout;
    } else {
      var prefs = model.getPreferences();
      return prefs.security.password_timeout;
    }
  }

  /**
   * Set timeout time, clear password cache
   * @param {Number} m minutes
   */
  function setTimeout(m) {
    var prefs = model.getPreferences();
    prefs.security.password_timeout = m;
    model.setPreferences(prefs);
    // clear timeout functions
    for (var entry in cache) {
      if (cache.hasOwnProperty(entry)) {
        mvelo.util.clearTimeout(entry.timer);
      }
    }
    // clear cache
    cache = {};
    // set new timeout
    timeout = m;
  }

  /**
   * Get password from cache
   * @param  {String} keyid
   * @return {String} password
   */
  function getPassword(keyid) {
    return cache[keyid].password;
  }

  /**
   * Set password in cache, start timeout
   * @param {String} keyid
   * @param {String} password
   */
  function setPassword(keyid, password) {
    cache[keyid] = {password: password};
    // clear after timeout
    cache[keyid].timer = mvelo.util.setTimeout(function() {
      delete cache[keyid];
    }, timeout * 60 * 1000);
  }

  exports.getTimeout = getTimeout;
  exports.setTimeout = setTimeout;
  exports.getPassword = getPassword;
  exports.setPassword = setPassword;

});