/**
 * Copyright (C) 2014-2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from '../mvelo';

export default class DecryptContainer {
  constructor(selector, keyringId, options) {
    this.selector = selector;
    this.keyringId = keyringId;
    this.options = options;
    this.id = mvelo.util.getHash();
    this.port = mvelo.EventHandler.connect(`decryptCont-${this.id}`, this);
    this.registerEventListener();
    this.parent = null;
    this.container = null;
    this.armored = null;
    this.done = null;
  }

  create(armored, done) {
    this.armored = armored;
    this.done = done;
    this.parent = document.querySelector(this.selector);
    this.container = document.createElement('iframe');
    const url = mvelo.runtime.getURL(`components/decrypt-message/decryptMessage.html?id=${this.id}&isContainer=true`);
    this.container.setAttribute('src', url);
    this.container.setAttribute('frameBorder', 0);
    this.container.setAttribute('scrolling', 'no');
    this.container.style.width = '100%';
    this.container.style.height = '100%';
    this.parent.appendChild(this.container);
  }

  registerEventListener() {
    this.port.on('destroy', this.onDestroy);
    this.port.on('error-message', this.onError);
    this.port.on('get-armored', this.onArmored);
    this.port.on('decrypt-done', () => this.done(null, {}));
  }

  onDestroy() {
    this.parent.removeChild(this.container);
    this.port.disconnect();
  }

  onError({error}) {
    if (error.code) {
      // error with error code is not handled as an exception
      this.done(null, {error});
    } else {
      this.done(error);
    }
  }

  onArmored() {
    this.port.emit('set-armored', {
      data: this.armored,
      keyringId: this.keyringId,
      options: this.options
    });
  }
}
