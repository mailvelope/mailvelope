/**
 * Copyright (C) 2015-2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import {getUUID} from '../lib/util';
import EventHandler from '../lib/EventHandler';

export default class KeyGenContainer {
  /**
   * @param {CssSelector} selector - target container
   * @param {string} keyringId - the keyring to use for this operation
   * @param {object} options
   * @constructor
   */
  constructor(selector, keyringId, options) {
    this.selector = selector;
    this.keyringId = keyringId;
    this.options = options;
    this.id = getUUID();
    this.port = EventHandler.connect(`keyGenCont-${this.id}`, this);
    this.registerEventListener();
    this.parent = null;
    this.container = null;
  }

  /**
   * Create an iframe
   */
  create() {
    return new Promise((resolve, reject) => {
      this.createPromise = {resolve, reject};
      this.parent = document.querySelector(this.selector);
      this.container = document.createElement('iframe');
      const url = chrome.runtime.getURL(`components/generate-key/genKey.html?id=${this.id}`);
      this.container.setAttribute('src', url);
      this.container.setAttribute('frameBorder', 0);
      this.container.setAttribute('scrolling', 'no');
      this.container.style.width = '100%';
      this.container.style.height = '100%';
      this.parent.appendChild(this.container);
    });
  }

  registerEventListener() {
    this.port.on('generate-done', this.generateDone);
    this.port.on('dialog-done', () => this.createPromise.resolve(this.id));
  }

  /**
   * Generate a key pair and check if the inputs are correct
   * @param {boolean} confirmRequired - generated key only valid after confirm
   */
  generate(confirmRequired) {
    return new Promise((resolve, reject) => {
      this.generatePromise = {resolve, reject};
      this.options.confirmRequired = confirmRequired;
      this.port.emit('generate-key', {
        keyringId: this.keyringId,
        options: this.options
      });
    });
  }

  generateDone({error, publicKey}) {
    if (error) {
      this.generatePromise.reject(error);
    } else {
      this.generatePromise.resolve(publicKey);
    }
  }

  confirm() {
    this.port.emit('generate-confirm');
  }

  reject() {
    this.port.emit('generate-reject');
  }
}
