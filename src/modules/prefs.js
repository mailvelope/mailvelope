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


var mvelo = require('lib-mvelo');
var model = require('./pgpModel');
var prefs = null;
var updateHandlers = [];

function init() {
  return model.getPreferences()
  .then(preferences => prefs = preferences);
}

/**
 * Update preferences
 * @param  {Object} obj preferences object or properties of it
 */
function update(obj) {
  return model.getPreferences()
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
    updateHandlers.forEach(function(fn) {
      fn();
    });
    return model.setPreferences(prefs);
  })
}

/**
 * Register for preferences updates
 * @param {Function} fn handler
 */
function addUpdateHandler(fn) {
  updateHandlers.push(fn);
}

function data() {
  return prefs;
}

exports.init = init;
exports.update = update;
exports.addUpdateHandler = addUpdateHandler;
exports.data = data;
