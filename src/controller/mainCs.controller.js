/**
 * Copyright (C) 2015-2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

'use strict';


import {SubController} from './sub.controller';

export default class MainCsController extends SubController {
  constructor(port) {
    super(port);
    this.on('ready', this.handleContentReady);
  }

  handleContentReady() {
    this.model.getWatchList()
    .then(watchList => this.emit('init', {prefs: this.prefs.data(), watchList}));
  }

  updatePrefs() {
    this.emit('set-prefs', {
      prefs: this.prefs.data()
    });
  }
}
