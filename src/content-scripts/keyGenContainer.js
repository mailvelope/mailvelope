/**
 * Copyright (C) 2015-2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

'use strict';

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
    this.name = 'keyGenCont-' + this.id;
    this.port = mvelo.extension.connect({name: this.name});
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
    var url;

    this.done = done;
    this.parent = document.querySelector(this.selector);
    this.container = document.createElement('iframe');

    if (mvelo.crx) {
      url = mvelo.extension.getURL('components/generate-key/keyGenDialog.html?id=' + this.id);
    } else if (mvelo.ffa) {
      url = 'about:blank?mvelo=keyGenDialog&id=' + this.id;
    }

    this.container.setAttribute('src', url);
    this.container.setAttribute('frameBorder', 0);
    this.container.setAttribute('scrolling', 'no');
    this.container.style.width = '100%';
    this.container.style.height = '100%';

    while (this.parent.firstChild) {
      this.parent.removeChild(this.parent.firstChild);
    }
    this.parent.appendChild(this.container);
    return this;
  }

  /**
   * Generate a key pair and check if the inputs are correct
   * @param {boolean} confirmRequired - generated key only valid after confirm
   * @param {function} generateCallback - callback function
   * @returns {mvelo.KeyGenContainer}
   */
  generate(confirmRequired, generateCallback) {
    this.generateCallback = generateCallback;
    this.options.confirmRequired = confirmRequired;
    this.port.postMessage({
      event: 'generate-key',
      sender: this.name,
      keyringId: this.keyringId,
      options: this.options
    });
    return this;
  }

  confirm() {
    this.port.postMessage({
      event: 'generate-confirm',
      sender: this.name,
    });
  }

  reject() {
    this.port.postMessage({
      event: 'generate-reject',
      sender: this.name,
    });
  }

  /**
   * @returns {KeyGenContainer}
   */
  registerEventListener() {
    this.port.onMessage.addListener(msg => {
      switch (msg.event) {
        case 'generate-done':
          this.generateCallback(msg.error, msg.publicKey);
          break;
        case 'dialog-done':
          this.done(null, this.id);
          break;
        default:
          console.log('unknown event', msg);
      }
    });
    return this;
  }
}
