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
  var model = require('./pgpViewModel');

  var defaults = mvelo.data.loadDefaults();

  function randomColor() {
    return '#' + ('00000' + (Math.random() * (1 << 24) | 0).toString(16)).toUpperCase().slice(-6);
  }

  function randomString(length) {
    var result = '';
    while (length > 0) {
      result += String.fromCharCode(Math.floor(33 + Math.random() * 94));
      --length;
    }
    return result;
  }

  function randomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
  }

  function initSecurityBgnd() {
    defaults.preferences.security.secureBgndColor = "#f5f5f5";
    defaults.preferences.security.secureBgndIconColor = "#e9e9e9";
    defaults.preferences.security.secureBgndAngle = randomNumber(0, 120) - 60;
    defaults.preferences.security.secureBgndScaling = randomNumber(9, 15) / 10;
    defaults.preferences.security.secureBgndWidth = randomNumber(30, 60);
    defaults.preferences.security.secureBgndHeight = randomNumber(30, 60);
  }

  function init() {
    model.setOpenPGPComment('https://www.mailvelope.com');
    model.setOpenPGPVersion('Mailvelope v' + defaults.version);
    var prefs = model.getPreferences();
    if (!prefs) {
      defaults.preferences.security.secure_color = randomColor();
      defaults.preferences.security.secure_code = randomString(3);
      initSecurityBgnd();
      model.setPreferences(defaults.preferences);
      model.setWatchList(defaults.watch_list);
    } else {
      // Adding security bgnd settings for users comming from ver. <= 0.11
      if (typeof prefs.security.secureBgndColor == 'undefined') {
        initSecurityBgnd();
        prefs.security.secureBgndColor = defaults.preferences.security.secureBgndColor;
        prefs.security.secureBgndIconColor = defaults.preferences.security.secureBgndIconColor;
        prefs.security.secureBgndAngle = defaults.preferences.security.secureBgndAngle;
        prefs.security.secureBgndScaling = defaults.preferences.security.secureBgndScaling;
        prefs.security.secureBgndWidth = defaults.preferences.security.secureBgndWidth;
        prefs.security.secureBgndHeight = defaults.preferences.security.secureBgndHeight;
        model.setPreferences(prefs);
      }
      if (typeof prefs.main_active == 'undefined') {
        prefs.main_active = defaults.preferences.main_active;
        model.setPreferences(prefs);
      }
      if (prefs.version !== defaults.version) {
        prefs.version = defaults.version;
        prefs.general.editor_type = mvelo.PLAIN_TEXT;
        model.setPreferences(prefs);
        mergeWatchlist(defaults);
      }
    }
  }

  function mergeWatchlist(defaults) {
    var mod = false;
    var localList = model.getWatchList() || [];
    defaults.watch_list.forEach(function(defaultSite) {
      var localSite = localList.find(function(localSite) {
        return localSite.site === defaultSite.site;
      });
      if (localSite) {
        defaultSite.frames.forEach(function(defaultFrame) {
          localSite.frames = localSite.frames || [];
          var localFrame = localSite.frames.find(function(localFrame) {
            return localFrame.frame === defaultFrame.frame;
          });
          if (!localFrame) {
            localSite.frames.push(defaultFrame);
            mod = true;
          } else {
            if (typeof localFrame.api === 'undefined') {
              localFrame.api = false;
              mod = true;
            }
          }
        });
      } else {
        localList.push(defaultSite);
        mod = true;
      }
    });
    if (mod) {
      model.setWatchList(localList);
    }
  }

  // polyfill https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find
  if (!Array.prototype.find) {
    Array.prototype.find = function(predicate) {
      if (this === null) {
        throw new TypeError('Array.prototype.find called on null or undefined');
      }
      if (typeof predicate !== 'function') {
        throw new TypeError('predicate must be a function');
      }
      var list = Object(this);
      var length = list.length >>> 0;
      var thisArg = arguments[1];
      var value;

      for (var i = 0; i < length; i++) {
        value = list[i];
        if (predicate.call(thisArg, value, i, list)) {
          return value;
        }
      }
      return undefined;
    };
  }

  function getVersion() {
    return defaults.version;
  }

  init();

  exports.getVersion = getVersion;

});
