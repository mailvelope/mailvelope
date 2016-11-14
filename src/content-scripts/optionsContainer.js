/**
 * Copyright (C) 2015-2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

'use strict';

import mvelo from '../mvelo';

export default class OptionsContainer {
  constructor(selector, keyringId, options) {
    this.selector = selector;
    this.keyringId = keyringId;

    this.email = '';
    if (options && options.email) {
      this.email = '&email=' + encodeURIComponent(options.email);
    }

    this.fullName = '';
    if (options && options.fullName) {
      this.fullName = '&fname=' + encodeURIComponent(options.fullName);
    }

    this.id = mvelo.util.getHash();
    this.parent = null;
    this.container = null;
    this.done = null;
  }

  create(done) {
    this.done = done;
    this.parent = document.querySelector(this.selector);
    this.container = document.createElement('iframe');
    var url;
    var options = 'krid=' + encodeURIComponent(this.keyringId) + this.email + this.fullName;
    if (mvelo.crx) {
      url = mvelo.extension.getURL('app/app.html?' + options + '#keyring');
    } else if (mvelo.ffa) {
      url = 'about:blank?mvelo=options&' + options + '#keyring';
    }
    this.container.setAttribute('src', url);
    this.container.setAttribute('frameBorder', 0);
    this.container.setAttribute('style', 'width: 100%; height: 100%; overflow-x: none; overflow-y: auto');
    this.container.addEventListener('load', this.done.bind(this, null, this.id));
    this.parent.appendChild(this.container);
  }
}
