/**
 * Copyright (C) 2015-2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from '../mvelo';
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
    this.id = mvelo.util.getHash();
    this.port = mvelo.EventHandler.connect(`keyBackupCont-${this.id}`, this);
    this.registerEventListener();
    this.parent = null;
    this.container = null;
    this.done = null;
    this.popupDone = null;
    this.host = host;
  }

  /**
   * Create an iframe
   * @param {function} done - callback function
   */
  create(done) {
    const url = mvelo.runtime.getURL(`components/key-backup/keyBackupDialog.html?id=${this.id}`);
    this.done = done;
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
  }

  registerEventListener() {
    this.port.on('popup-isready', this.onPopupReady);
    this.port.on('dialog-done', () => this.done(null, this.id));
  }

  onPopupReady({error}) {
    if (this.popupDone) {
      this.popupDone(error);
    }
  }

  keyBackupDone(done) {
    this.popupDone = done;
  }
}
