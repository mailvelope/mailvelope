/**
 * Copyright (C) 2015-2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from '../mvelo';

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
    this.id = mvelo.util.getHash();
    this.port = mvelo.EventHandler.connect(`restoreBackupCont-${this.id}`, this);
    this.registerEventListener();
    this.parent = null;
    this.container = null;
    this.done = null;
    this.restoreDone = null;
  }

  /**
   * Create an iframe
   * @param {function} done - callback function
   */
  create(done) {
    const url = mvelo.runtime.getURL(`components/restore-backup/restoreBackupDialog.html?id=${this.id}`);
    this.done = done;
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
  }

  registerEventListener() {
    this.port.on('restore-backup-done', this.onRestoreBackupDone);
    this.port.on('dialog-done', this.onDialogDone);
  }

  onRestoreBackupDone({error}) {
    if (this.restoreDone) {
      this.restoreDone(error);
    }
  }

  onDialogDone() {
    this.port.emit('set-init-data', {data: this.options});
    this.done(null, this.id);
  }

  restoreBackupReady(done) {
    //console.log('mvelo.RestoreBackupContainer.prototype.restoreBackupReady()');
    this.restoreDone = done;
  }
}
