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
  var model = require('./pgpViewModel');

  var defaults = mvelo.data.loadDefaults();

  init();

  function randomColor() {
    return '#'+('00000'+(Math.random()*(1<<24)|0).toString(16)).toUpperCase().slice(-6);
  }

  function randomString(length) {
    var result = '';
    while (length > 0) {
      result += String.fromCharCode(Math.floor(33 + Math.random() * 94));
      --length;
    }
    return result;
  }

  function init() {
    if (!model.getWatchList()) {
      model.setWatchList(defaults.watch_list);
    }
    if (!model.getPreferences()) {
      defaults.preferences.security.secure_color = randomColor();
      defaults.preferences.security.secure_code = randomString(3);
      if (mvelo.ffa) {
        defaults.preferences.security.display_decrypted = 'popup';
      }
      model.setPreferences(defaults.preferences);
    }
  }

});