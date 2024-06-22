/**
 * Copyright (C) 2015-2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import {getUUID} from '../lib/util';
import EventHandler from '../lib/EventHandler';

/**
 *
 * @param {CssSelector} selector - target container
 * @param {string} keyringId - the keyring to use for this operation
 * @param {object} options
 * @constructor
 */
export default class RestoreBackupContainer {
  constructor(selector, keyringId, options) {
    this.selector = selector;
    this.keyringId = keyringId;
    this.options = options;
    this.id = getUUID();
    this.port = EventHandler.connect(`restoreBackupCont-${this.id}`, this);
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
      const url = chrome.runtime.getURL(`components/restore-backup/backupRestore.html?id=${this.id}`);
      this.parent = document.querySelector(this.selector);
      this.container = document.createElement('iframe');
      this.port.emit('set-init-data', {
        data: {
          keyringId: this.keyringId
        }
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
    this.port.on('restore-backup-done', this.onRestoreBackupDone);
    this.port.on('dialog-done', this.onDialogDone);
  }

  onRestoreBackupDone({error}) {
    if (this.restorePromise) {
      error ? this.restorePromise.reject(error) : this.restorePromise.resolve();
    }
  }

  onDialogDone() {
    this.port.emit('set-init-data', {data: this.options});
    this.createPromise.resolve(this.id);
  }

  restoreBackupReady() {
    return new Promise((resolve, reject) => {
      this.restorePromise = {resolve, reject};
    });
  }
}
