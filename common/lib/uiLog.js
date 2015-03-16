/**
 * Mailvelope - secure email with OpenPGP encryption for Webmail
 * Copyright (C) 2015  Thomas Oberndörfer
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

  var log = [];

  function push(source, type) {
    var entry = {
      source: source,
      type: type,
      timestamp: new Date().toISOString()
    };
    var lastEntry = log[log.length - 1];
    if (lastEntry &&
        source === lastEntry.source &&
        type === lastEntry.type &&
        type === 'TEXTAREA_INPUT') {
      // aggregate text input events
      log[log.length - 1] = entry;
    } else {
      log.push(entry);
    }
  }

  function getAll() {
    return log;
  }

  function getLatest(size) {
    log.slice(-size);
  }

  exports.push = push;
  exports.getAll = getAll;
  exports.getLatest = getLatest;

});
