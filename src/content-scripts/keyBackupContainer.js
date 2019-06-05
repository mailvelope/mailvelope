/**
 * Copyright (C) 2015-2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import {getHash} from '../lib/util';
import EventHandler from '../lib/EventHandler';
import {host} from './main';

export default class KeyBackupContainer {
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
    this.id = getHash();
    this.port = EventHandler.connect(`keyBackupCont-${this.id}`, this);
    this.registerEventListener();
    this.parent = null;
    this.container = null;
    this.host = host;
  }

  /**
   * Create an iframe
   */
  create() {
    return new Promise((resolve, reject) => {
      this.createPromise = {resolve, reject};
      const url = chrome.runtime.getURL(`components/key-backup/backupKey.html?id=${this.id}`);
      this.parent = document.querySelector(this.selector);
      this.container = document.createElement('iframe');
      this.port.emit('set-keybackup-window-props', {
        host,
        keyringId: this.keyringId,
        initialSetup: (this.options.initialSetup === undefined) ? true : this.options.initialSetup
      });
      this.container.setAttribute('src', url);
      this.container.setAttribute('frameBorder', 0);
      this.container.setAttribute('scrolling', 'no');
      this.container.style.width = '100%';
      this.container.style.height = '100%';
      this.parent.appendChild(this.container);
    });
  }

  registerEventListener() {
    this.port.on('popup-isready', this.onPopupReady);
    this.port.on('dialog-done', () => this.createPromise.resolve(this.id));
  }

  onPopupReady({error}) {
    if (this.popupReadyPromise) {
      error ? this.popupReadyPromise.reject(error) : this.popupReadyPromise.resolve();
    }
  }

  keyBackupDone() {
    return new Promise((resolve, reject) => {
      this.popupReadyPromise = {resolve, reject};
    });
  }
}
