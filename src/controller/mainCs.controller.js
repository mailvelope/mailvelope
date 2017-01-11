/**
 * Mailvelope - secure email with OpenPGP encryption for Webmail
 * Copyright (C) 2014-2015 Mailvelope GmbH
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


var sub = require('./sub.controller');

class MainCsController extends sub.SubController {
  constructor(port) {
    super(port);
    this.on('ready', this.handleContentReady);
  }

  handleContentReady() {
    this.emit('init', {
      prefs: this.prefs.data(),
      watchList: this.model.getWatchList()
    });
  }

  updatePrefs() {
    this.emit('set-prefs', {
      prefs: this.prefs.data()
    });
  }
}

exports.MainCsController = MainCsController;
