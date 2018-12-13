/**
 * Copyright (C) 2012-2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import {PLAIN_TEXT} from '../lib/constants';
import {getPreferences, setPreferences, getWatchList, setWatchList} from './prefs';
import {getSecureRandom} from './crypto';
import defaults from '../res/defaults.json';

function getRandomAngle() {
  let angle = getSecureRandom(0, 120) - 60;
  if (angle < 0) {
    angle += 360;
  }
  return angle;
}

function initSecurityBgnd(pref) {
  pref.security.secureBgndScaling     = pref.security.secureBgndScaling    || (getSecureRandom(9, 20) / 10);
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

export function init() {
  return getPreferences()
  .then(prefs => {
    if (!prefs) {
      // new install
      prefs = defaults.preferences;
      prefs.version = defaults.version;
      initSecurityBgnd(prefs);
      return setWatchList(defaults.watch_list)
      .then(() => setPreferences(prefs));
    } else if (prefs.version !== defaults.version) {
      // version changed
      prefs.version = defaults.version;
      prefs.general.editor_type = PLAIN_TEXT;

      initSecurityBgnd(prefs);

      // add default values for new settings
      if (typeof prefs.keyserver == 'undefined') {
        prefs.keyserver = defaults.preferences.keyserver;
      }
      if (typeof prefs.keyserver.mvelo_tofu_lookup == 'undefined') {
        prefs.keyserver.mvelo_tofu_lookup = defaults.preferences.keyserver.mvelo_tofu_lookup;
      }
      if (typeof prefs.keyserver.wkd_lookup == 'undefined') {
        prefs.keyserver.wkd_lookup = defaults.preferences.keyserver.wkd_lookup;
      }
      if (typeof prefs.keyserver.autocrypt_lookup == 'undefined') {
        prefs.keyserver.autocrypt_lookup = defaults.preferences.keyserver.autocrypt_lookup;
      }
      if (typeof prefs.keyserver.hkp_server_list == 'undefined') {
        prefs.keyserver.hkp_server_list = defaults.preferences.keyserver.hkp_server_list;
      }
      if (typeof prefs.general.prefer_gnupg == 'undefined') {
        prefs.general.prefer_gnupg = defaults.preferences.general.prefer_gnupg;
      }
      if (typeof prefs.security.hide_armored_header == 'undefined') {
        prefs.security.hide_armored_header = defaults.preferences.security.hide_armored_header;
      }

      // merge watchlist on version change
      return mergeWatchlist(defaults)
      .then(() => setPreferences(prefs));
    }
  });
}

function mergeWatchlist(defaults) {
  let mod = false;
  return getWatchList()
  .then((localList = []) => {
    defaults.watch_list.forEach(defaultSite => {
      const localSite = localList.find(localSite => localSite.site === defaultSite.site);
      if (localSite) {
        defaultSite.frames.forEach(defaultFrame => {
          localSite.frames = localSite.frames || [];
          const localFrame = localSite.frames.find(localFrame => localFrame.frame === defaultFrame.frame);
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
        if (typeof localSite.https_only === 'undefined') {
          localSite.https_only = defaultSite.https_only;
          mod = true;
        }
      } else {
        localList.push(defaultSite);
        mod = true;
      }
    });
    return localList;
  })
  .then(localList => {
    if (mod) {
      return setWatchList(localList);
    }
  });
}

export function getVersion() {
  return defaults.version;
}
