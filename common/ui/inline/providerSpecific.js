/**
 * Mailvelope - secure email with OpenPGP encryption for Webmail
 * Copyright (C) 2014 Mailvelope GmbH
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

//
// Global module that manages a list of provider specific modules
//

mvelo.providers = {};

mvelo.providers.init = function() {
  mvelo.providers.map = new Map();
  mvelo.providers.map.set('mail.google.com', new mvelo.providers.Gmail());
  mvelo.providers.map.set('default', new mvelo.providers.Default());
};

mvelo.providers.get = function(hostname) {
  if (mvelo.providers.map.has(hostname)) {
    return mvelo.providers.map.get(hostname);
  } else {
    return mvelo.providers.map.get('default');
  }
};

//
// Provider specific modules
//

(function(mvelo) {

  mvelo.providers.Gmail = Gmail;

  //
  // Gmail module
  //

  function Gmail() {}

  Gmail.prototype.getRecipients = function() {};

  Gmail.prototype.setRecipients = function() {};

  //
  // Default module
  //

  function Default() {}

}(mvelo));
