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
  var defaults = require('./defaults');
  var model = require('./pgpModel');
  var prefs = model.getPreferences();
  var updateHandlers = [];

  /**
   * Update preferences
   * @param  {Object} obj preferences object or properties of it
   */
  function update(obj) {
    prefs = model.getPreferences();
    if (obj.security) {
      prefs.security = mvelo.util.extend(prefs.security, obj.security);
    }
    if (obj.general) {
      prefs.general = mvelo.util.extend(prefs.general, obj.general);
    }
    if (typeof obj.main_active !== 'undefined') {
      prefs.main_active = obj.main_active;
    }
    model.setPreferences(prefs);
    // notifiy update handlers
    updateHandlers.forEach(function(fn) {
      fn();
    });
  }

  /**
   * Register for preferences updates
   * @param {Function} fn handler
   */
  function addUpdateHandler(fn) {
    updateHandlers.push(fn);
  }

  function data() {
    if (!prefs) {
      prefs = model.getPreferences();
    }
    return prefs;
  }

  exports.update = update;
  exports.addUpdateHandler = addUpdateHandler;
  exports.data = data;

});
