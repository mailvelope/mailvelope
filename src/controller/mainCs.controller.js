/**
 * Copyright (C) 2015-2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import {SubController} from './sub.controller';
import {prefs, getWatchList} from '../modules/prefs';

export default class MainCsController extends SubController {
  constructor(port) {
    super(port);
    this.on('ready', this.handleContentReady);
  }

  handleContentReady() {
    getWatchList()
    .then(watchList => this.emit('init', {prefs, watchList}));
  }

  updatePrefs() {
    this.emit('set-prefs', {prefs});
  }
}
