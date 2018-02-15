/**
 * Copyright (C) 2012-2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

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
      Object.assign(prefs.security, obj.security);
    }
    if (obj.general) {
      Object.assign(prefs.general, obj.general);
    }
    if (obj.keyserver) {
      Object.assign(prefs.keyserver, obj.keyserver);
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

export function getSecurityBackground() {
  return {
    color: prefs.security.secureBgndColor,
    iconColor: prefs.security.secureBgndIconColor,
    angle: prefs.security.secureBgndAngle,
    scaling: prefs.security.secureBgndScaling,
    width: prefs.security.secureBgndWidth,
    height: prefs.security.secureBgndHeight,
    colorId: prefs.security.secureBgndColorId
  };
}
