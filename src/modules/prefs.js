/**
 * Copyright (C) 2012-2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from 'lib-mvelo';
import {setPreferences, getPreferences} from './pgpModel';

export let prefs = {};
const updateHandlers = [];

export function init() {
  return getPreferences()
  .then(preferences => prefs = preferences);
}

/**
 * Update preferences
 * @param  {Object} obj preferences object or properties of it
 */
export function update(obj) {
  return getPreferences()
  .then(preferences => {
    prefs = preferences;
    if (obj.security) {
      prefs.security = mvelo.util.extend(prefs.security, obj.security);
    }
    if (obj.general) {
      prefs.general = mvelo.util.extend(prefs.general, obj.general);
    }
    if (obj.keyserver) {
      prefs.keyserver = mvelo.util.extend(prefs.keyserver, obj.keyserver);
    }
    if (typeof obj.main_active !== 'undefined') {
      prefs.main_active = obj.main_active;
    }
    // notifiy update handlers
    updateHandlers.forEach(fn => {
      fn();
    });
    return setPreferences(prefs);
  });
}

/**
 * Register for preferences updates
 * @param {Function} fn handler
 */
export function addUpdateHandler(fn) {
  updateHandlers.push(fn);
}
