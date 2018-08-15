/**
 * Copyright (C) 2015-2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from '../mvelo';

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
    this.id = mvelo.util.getHash();
    this.port = mvelo.EventHandler.connect(`keyGenCont-${this.id}`, this);
    this.registerEventListener();
    this.parent = null;
    this.container = null;
    this.done = null;
    this.generateCallback = null;
  }

  /**
   * Create an iframe
   * @param {function} done - callback function
   * @returns {mvelo.KeyGenContainer}
   */
  create(done) {
    this.done = done;
    this.parent = document.querySelector(this.selector);
    this.container = document.createElement('iframe');
    const url = mvelo.runtime.getURL(`components/generate-key/keyGenDialog.html?id=${this.id}`);
    this.container.setAttribute('src', url);
    this.container.setAttribute('frameBorder', 0);
    this.container.setAttribute('scrolling', 'no');
    this.container.style.width = '100%';
    this.container.style.height = '100%';
    while (this.parent.firstChild) {
      this.parent.removeChild(this.parent.firstChild);
    }
    this.parent.appendChild(this.container);
  }

  registerEventListener() {
    this.port.on('generate-done', ({error, publicKey}) => this.generateCallback(error, publicKey));
    this.port.on('dialog-done', () => this.done(null, this.id));
  }

  /**
   * Generate a key pair and check if the inputs are correct
   * @param {boolean} confirmRequired - generated key only valid after confirm
   * @param {function} generateCallback - callback function
   */
  generate(confirmRequired, generateCallback) {
    this.generateCallback = generateCallback;
    this.options.confirmRequired = confirmRequired;
    this.port.emit('generate-key', {
      keyringId: this.keyringId,
      options: this.options
    });
  }

  confirm() {
    this.port.emit('generate-confirm');
  }

  reject() {
    this.port.emit('generate-reject');
  }
}
