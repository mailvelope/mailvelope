/**
 * Copyright (C) 2015-2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import {getUUID} from '../lib/util';
import EventHandler from '../lib/EventHandler';

export default class AppContainer {
  constructor(selector, keyringId, options = {}) {
    this.selector = selector;
    this.keyringId = keyringId;
    this.email = '';
    if (options.email) {
      this.email = `&email=${encodeURIComponent(options.email)}`;
    }
    this.fullName = '';
    if (options.fullName) {
      this.fullName = `&fname=${encodeURIComponent(options.fullName)}`;
    }
    this.hasPrivateKey = options.hasPrivateKey;
    this.id = getUUID();
    this.port = EventHandler.connect(`appCont-${this.id}`, this);
    this.parent = null;
    this.container = null;
  }

  create() {
    return new Promise(resolve => {
      this.parent = document.querySelector(this.selector);
      this.container = document.createElement('iframe');
      const options = `id=${this.id}&krid=${encodeURIComponent(this.keyringId)}${this.email}${this.fullName}#/keyring/${this.hasPrivateKey ? 'display' : 'setup'}`;
      const url = chrome.runtime.getURL(`app/app.html?${options}`);
      this.container.setAttribute('src', url);
      this.container.setAttribute('frameBorder', 0);
      this.container.setAttribute('style', 'width: 100%; height: 100%; overflow-x: none; overflow-y: auto');
      this.container.addEventListener('load', () => resolve(this.id));
      this.parent.appendChild(this.container);
    });
  }
}
