/**
 * Copyright (C) 2015-2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

'use strict';


import {SubController} from './sub.controller';
import * as prefs from '../modules/prefs';
import {getWatchList} from '../modules/pgpModel';

export default class MainCsController extends SubController {
  constructor(port) {
    super(port);
    this.on('ready', this.handleContentReady);
  }

  handleContentReady() {
    getWatchList()
    .then(watchList => this.emit('init', {prefs: prefs.data(), watchList}));
  }

  updatePrefs() {
    this.emit('set-prefs', {
      prefs: prefs.data()
    });
  }
}
