/**
 * Mailvelope - secure email with OpenPGP encryption for Webmail
 * Copyright (C) 2014  Thomas Oberndörfer
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

var mvelo = mvelo || {};

mvelo.domAPI = {};

mvelo.domAPI.init = function() {
  var registeredSite = mvelo.main.watchList.some(function(site) {
    return site.active && site.frames && site.frames.some(function(frame) {
      var hosts = mvelo.domAPI.matchPattern2RegEx(frame.frame);
      return frame.scan && frame.api && hosts.test(document.location.hostname);
    });
  });
  if (registeredSite) {
    window.addEventListener('message', mvelo.domAPI.eventListener);
    document.body.dataset.mailvelopeVersion = mvelo.main.prefs.version;
    if (!document.body.dataset.mailvelope) {
      $('<script/>', {
        src: mvelo.extension.getURL('common/client-API/mailvelope-client-api.js')
      }).appendTo($('head'));
    }
  }
};

mvelo.domAPI.matchPattern2RegEx = function(matchPattern) {
  return new RegExp(
    matchPattern.replace('.', '\\.')
                .replace('*', '\\w*')
                .replace('\\w*\\.', '(\\w+\\.)?') + '$');
};

mvelo.domAPI.eventListener = function(event) {
  console.log('domAPI eventListener', event.data);
  console.log(event.origin);
};
