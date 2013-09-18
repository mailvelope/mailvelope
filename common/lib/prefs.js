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
  var defaults = require('./defaults');
  var model = require('./pgpViewModel');
  var prefs = model.getPreferences();
  var updateHandlers = [];

  /**
   * Update preferences
   * @param  {Object} obj preferences object or properties of it
   */
  function update(obj) {
    if (obj.security) {
      prefs.security = extend(prefs.security, obj.security);
    }
    if (obj.general) {
      prefs.general = extend(prefs.general, obj.general);
    }
    model.setPreferences(prefs);
    // notifiy update handlers
    updateHandlers.forEach(function(fn) {
      fn();
    })
  }

  // Attribution: http://www.2ality.com/2012/08/underscore-extend.html
  function extend(target) {
    var sources = [].slice.call(arguments, 1);
    sources.forEach(function (source) {
        Object.getOwnPropertyNames(source).forEach(function(propName) {
            Object.defineProperty(target, propName,
                Object.getOwnPropertyDescriptor(source, propName));
        });
    });
    return target;
  };

  /**
   * Register for preferences updates
   * @param {Function} fn handler
   */
  function addUpdateHandler(fn) {
    updateHandlers.push(fn);
  }

  exports.update = update;
  exports.addUpdateHandler = addUpdateHandler;
  exports.data = prefs;

});