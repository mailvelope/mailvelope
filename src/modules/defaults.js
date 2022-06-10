/**
 * Copyright (C) 2012-2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import {getPreferences, setPreferences, getWatchList, setWatchList} from './prefs';
import {getSecureRandom} from './crypto';
import defaults from '../res/defaults.json';
import common from '../res/common.json';

function initSecurityBgnd(prefs) {
  if (prefs.security.bgIcon && prefs.security.bgColor) {
    return;
  }
  const securityBGArr = Object.entries(common.securityBGs);
  prefs.security.bgIcon = securityBGArr[getSecureRandom(0, securityBGArr.length - 1)][0];
  const securityColorArr = Object.keys(common.securityColors);
  prefs.security.bgColor = securityColorArr[getSecureRandom(0, securityColorArr.length - 1)];
  prefs.security.personalized = false;
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
      initSecurityBgnd(prefs);
      // add default values for new settings
      if (typeof prefs.keyserver == 'undefined') {
        prefs.keyserver = defaults.preferences.keyserver;
      }
      if (typeof prefs.keyserver.autocrypt_lookup == 'undefined') {
        prefs.keyserver.autocrypt_lookup = defaults.preferences.keyserver.autocrypt_lookup;
      }
      if (typeof prefs.keyserver.key_binding == 'undefined') {
        prefs.keyserver.key_binding = defaults.preferences.keyserver.key_binding;
      }
      if (typeof prefs.keyserver.mvelo_tofu_lookup == 'undefined') {
        prefs.keyserver.mvelo_tofu_lookup = defaults.preferences.keyserver.mvelo_tofu_lookup;
      }
      if (typeof prefs.keyserver.oks_lookup == 'undefined') {
        prefs.keyserver.oks_lookup = defaults.preferences.keyserver.oks_lookup;
      }
      if (typeof prefs.keyserver.wkd_lookup == 'undefined') {
        prefs.keyserver.wkd_lookup = defaults.preferences.keyserver.wkd_lookup;
      }
      if (typeof prefs.general.prefer_gnupg == 'undefined') {
        prefs.general.prefer_gnupg = defaults.preferences.general.prefer_gnupg;
      }
      if (typeof prefs.security.hide_armored_header == 'undefined') {
        prefs.security.hide_armored_header = defaults.preferences.security.hide_armored_header;
      }
      if (typeof prefs.provider == 'undefined') {
        prefs.provider = defaults.preferences.provider;
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
