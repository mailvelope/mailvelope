/**
 * Copyright (C) 2015-2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

'use strict';

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
    this.name = 'restoreBackupCont-' + this.id;
    this.port = mvelo.extension.connect({name: this.name});
    this.registerEventListener();
    this.parent = null;
    this.container = null;
    this.done = null;
    this.restoreDone = null;
  }

  /**
   * Create an iframe
   * @param {function} done - callback function
   * @returns {mvelo.RestoreBackupContainer}
   */
  create(done) {
    var url;

    this.done = done;
    this.parent = document.querySelector(this.selector);
    this.container = document.createElement('iframe');

    this.port.postMessage({
      event: 'set-init-data',
      sender: this.name,
      data: {
        keyringId: this.keyringId
      }
    });

    if (mvelo.crx) {
      url = mvelo.extension.getURL('components/restore-backup/restoreBackupDialog.html?id=' + this.id);
    } else if (mvelo.ffa) {
      url = 'about:blank?mvelo=restoreBackup&id=' + this.id;
    }

    this.container.setAttribute('src', url);
    this.container.setAttribute('frameBorder', 0);
    this.container.setAttribute('scrolling', 'no');
    this.container.style.width = '100%';
    this.container.style.height = '100%';
    this.parent.appendChild(this.container);
    return this;
  }

  restoreBackupReady(done) {
    //console.log('mvelo.RestoreBackupContainer.prototype.restoreBackupReady()');
    this.restoreDone = done;
    return this;
  }

  registerEventListener() {
    this.port.onMessage.addListener(msg => {
      switch (msg.event) {
        case 'restore-backup-done':
          if (this.restoreDone) {
            this.restoreDone(msg.error);
          }
          break;
        case 'dialog-done':
          this.port.postMessage({event: 'set-init-data', sender: this.name, data: this.options});
          this.done(null, this.id);
          break;
        default:
          console.log('unknown event', msg);
      }
    });
    return this;
  }
}
