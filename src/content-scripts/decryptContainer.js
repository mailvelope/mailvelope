/**
 * Copyright (C) 2014-2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import {getUUID} from '../lib/util';
import EventHandler from '../lib/EventHandler';

export default class DecryptContainer {
  constructor(selector, keyringId, options) {
    this.selector = selector;
    this.keyringId = keyringId;
    this.options = options;
    this.id = getUUID();
    this.port = EventHandler.connect(`decryptCont-${this.id}`, this);
    this.registerEventListener();
    this.parent = null;
    this.container = null;
    this.armored = null;
  }

  create(armored) {
    return new Promise((resolve, reject) => {
      this.createPromise = {resolve, reject};
      this.armored = armored;
      this.parent = document.querySelector(this.selector);
      this.container = document.createElement('iframe');
      const url = chrome.runtime.getURL(`components/decrypt-message/decryptMessage.html?id=${this.id}&embedded=true`);
      this.container.setAttribute('src', url);
      this.container.setAttribute('frameBorder', 0);
      this.container.setAttribute('scrolling', 'no');
      this.container.style.width = '100%';
      this.container.style.height = '100%';
      this.parent.appendChild(this.container);
    });
  }

  registerEventListener() {
    this.port.on('destroy', this.onDestroy);
    this.port.on('error-message', this.onError);
    this.port.on('get-armored', this.onArmored);
    this.port.on('decrypt-done', () => this.createPromise.resolve({}));
  }

  onDestroy() {
    this.parent.removeChild(this.container);
    this.port.disconnect();
  }

  onError({error}) {
    if (error.code) {
      // error with error code is not handled as an exception
      this.createPromise.resolve({error});
    } else {
      this.createPromise.reject(error);
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
