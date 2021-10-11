/**
 * Copyright (C) 2012-2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from '../lib/lib-mvelo';

export let prefs = {};
const updateHandlers = [];
let watchListBuffer = null;

export async function init() {
  const preferences = await getPreferences();
  prefs = preferences;
  return preferences;
}

/**
 * Update preferences
 * @param  {Object} obj preferences object or properties of it
 */
export async function update(obj) {
  const preferences = await getPreferences();
  prefs = preferences;
  // notifiy update handlers
  updateHandlers.forEach(fn => fn(prefs, obj));
  if (obj.security) {
    Object.assign(prefs.security, obj.security);
  }
  if (obj.general) {
    Object.assign(prefs.general, obj.general);
  }
  if (obj.keyserver) {
    Object.assign(prefs.keyserver, obj.keyserver);
  }
  if (obj.provider) {
    Object.assign(prefs.provider, obj.provider);
  }
  await setPreferences(prefs);
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
    bgIcon: prefs.security.bgIcon,
    bgColor: prefs.security.bgColor
  };
}

export async function getWatchList() {
  if (!watchListBuffer) {
    watchListBuffer = await mvelo.storage.get('mvelo.watchlist');
  }
  return watchListBuffer;
}

export async function setWatchList(watchList) {
  await mvelo.storage.set('mvelo.watchlist', watchList);
  watchListBuffer = watchList;
}

export function getPreferences() {
  return mvelo.storage.get('mvelo.preferences');
}

export function setPreferences(preferences) {
  return mvelo.storage.set('mvelo.preferences', preferences);
}

export function removePreference(preference) {
  return mvelo.storage.remove(preference);
}

