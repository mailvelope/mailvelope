/**
 * Mailvelope - secure email with OpenPGP encryption for Webmail
 * Copyright (C) 2014  Mailvelope Authors
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

var mvelo = mvelo || null;
var options = options || null;

(function(options) {

  options.registerL10nMessages([
    "security_token_title",
    "security_token_info"
  ]);

  function init() { }

  options.event.on('ready', init);

}(options));
