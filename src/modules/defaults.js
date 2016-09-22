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

define(function(require, exports) {

  var mvelo = require('lib-mvelo').mvelo;
  var model = require('./pgpModel');
  var openpgp = require('openpgp');

  var defaults = null;

  function getRandomAngle() {
    var angle = openpgp.crypto.random.getSecureRandom(0, 120) - 60;
    if (angle < 0) {
      angle += 360;
    }
    return angle;
  }

  function initSecurityBgnd(pref) {
    pref.security.secureBgndScaling     = pref.security.secureBgndScaling    || (openpgp.crypto.random.getSecureRandom(9, 20) / 10);
    pref.security.secureBgndWidth       = pref.security.secureBgndWidth      || 45;
    pref.security.secureBgndHeight      = pref.security.secureBgndHeight     || 45;
    pref.security.secureBgndColor       = pref.security.secureBgndColor      || defaults.preferences.security.secureBgndColor;
    pref.security.secureBgndIconColor   = pref.security.secureBgndIconColor  || defaults.preferences.security.secureBgndIconColor;

    if (typeof pref.security.secureBgndAngle === 'undefined') {
      pref.security.secureBgndAngle = getRandomAngle();
    }

    if (typeof pref.security.secureBgndColorId === 'undefined') {
      pref.security.secureBgndColorId = defaults.preferences.security.secureBgndColorId;
    }
  }

  function init() {
    defaults = mvelo.data.loadDefaults();
    var prefs = model.getPreferences();
    if (!prefs) {
      prefs = defaults.preferences;
      prefs.version = defaults.version;
      initSecurityBgnd(prefs);
      model.setWatchList(defaults.watch_list);
    } else {
      if (prefs.version !== defaults.version) {
        prefs.version = defaults.version;
        prefs.general.editor_type = mvelo.PLAIN_TEXT;

        initSecurityBgnd(prefs);

        // add default values for new settings
        if (typeof prefs.main_active == 'undefined') {
          prefs.main_active = defaults.preferences.main_active;
        }
        if (typeof prefs.keyserver == 'undefined') {
          prefs.keyserver = defaults.preferences.keyserver;
        }
        if (typeof prefs.keyserver.mvelo_tofu_lookup == 'undefined') {
          prefs.keyserver.mvelo_tofu_lookup = defaults.preferences.keyserver.mvelo_tofu_lookup;
        }

        // merge watchlist on version change
        mergeWatchlist(defaults);
      }
    }
    model.setPreferences(prefs);
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

  function getVersion() {
    return defaults.version;
  }

  exports.init = init;
  exports.getVersion = getVersion;

});
