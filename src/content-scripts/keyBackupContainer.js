/**
 * Copyright (C) 2015-2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

'use strict';

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
    this.name = 'keyBackupCont-' + this.id;
    this.port = mvelo.extension.connect({name: this.name});
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
   * @returns {mvelo.KeyBackupContainer}
   */
  create(done) {
    var url;

    this.done = done;
    this.parent = document.querySelector(this.selector);
    this.container = document.createElement('iframe');

    this.port.postMessage({
      event: 'set-keybackup-window-props',
      sender: this.name,
      host: host,
      keyringId: this.keyringId,
      initialSetup: (this.options.initialSetup === undefined) ? true : this.options.initialSetup
    });

    if (mvelo.crx) {
      url = mvelo.extension.getURL('components/key-backup/keyBackupDialog.html?id=' + this.id);
    } else if (mvelo.ffa) {
      url = 'about:blank?mvelo=keybackup&id=' + this.id;
    }

    this.container.setAttribute('src', url);
    this.container.setAttribute('frameBorder', 0);
    this.container.setAttribute('scrolling', 'no');
    this.container.style.width = '100%';
    this.container.style.height = '100%';
    this.parent.appendChild(this.container);
    return this;
  }

  keyBackupDone(done) {
    this.popupDone = done;
    return this;
  }

  registerEventListener() {
    this.port.onMessage.addListener(msg => {
      switch (msg.event) {
        case 'popup-isready':
          if (this.popupDone) {
            this.popupDone(msg.error);
          }
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
