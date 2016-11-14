/**
 * Copyright (C) 2014-2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

'use strict';

import mvelo from '../mvelo';

export default class DecryptContainer {
  constructor(selector, keyringId, options) {
    this.selector = selector;
    this.keyringId = keyringId;
    this.options = options;
    this.id = mvelo.util.getHash();
    this.name = 'decryptCont-' + this.id;
    this.port = mvelo.extension.connect({name: this.name});
    this.registerEventListener();
    this.parent = null;
    this.container = null;
    this.armored = null;
    this.done = null;
  }

  create(armored, done) {
    this.armored = armored;
    this.done = done;
    this.parent = document.querySelector(this.selector);
    this.container = document.createElement('iframe');
    var url;
    if (mvelo.crx) {
      url = mvelo.extension.getURL('components/decrypt-inline/decryptInline.html?id=' + this.id);
    } else if (mvelo.ffa) {
      url = 'about:blank?mvelo=decryptInline&id=' + this.id;
    }
    this.container.setAttribute('src', url);
    this.container.setAttribute('frameBorder', 0);
    this.container.setAttribute('scrolling', 'no');
    this.container.style.width = '100%';
    this.container.style.height = '100%';
    this.parent.appendChild(this.container);
  }

  registerEventListener() {
    this.port.onMessage.addListener(msg => {
      switch (msg.event) {
        case 'destroy':
          this.parent.removeChild(this.container);
          this.port.disconnect();
          break;
        case 'error-message':
          if (msg.error.code) {
            // error with error code is not handled as an exception
            this.done(null, {error: msg.error});
          } else {
            this.done(msg.error);
          }
          break;
        case 'get-armored':
          this.port.postMessage({
            event: 'set-armored',
            data: this.armored,
            keyringId: this.keyringId,
            options: this.options,
            sender: this.name
          });
          break;
        case 'decrypt-done':
          this.done(null, {});
          break;
        default:
          console.log('unknown event', msg);
      }
    });
  }
}
