/**
 * Copyright (C) 2015-2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from '../mvelo';

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

    this.id = mvelo.util.getHash();
    this.name = `appCont-${this.id}`;
    this.port = mvelo.runtime.connect({name: this.name});
    this.parent = null;
    this.container = null;
    this.done = null;
  }

  create(done) {
    this.done = done;
    this.parent = document.querySelector(this.selector);
    this.container = document.createElement('iframe');
    const options = `id=${this.id}&krid=${encodeURIComponent(this.keyringId)}${this.email}${this.fullName}#/keyring/${this.hasPrivateKey ? 'display' : 'setup'}`;
    const url = mvelo.runtime.getURL(`app/app.html?${options}`);
    this.container.setAttribute('src', url);
    this.container.setAttribute('frameBorder', 0);
    this.container.setAttribute('style', 'width: 100%; height: 100%; overflow-x: none; overflow-y: auto');
    this.container.addEventListener('load', this.done.bind(this, null, this.id));
    this.parent.appendChild(this.container);
  }
}
