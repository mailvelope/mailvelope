/**
 * Copyright (C) 2018 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from "../mvelo";

export default class EncryptedFormContainer {
  constructor(selector, html, signature) {
    this.baseValidate(html, signature);
    this.selector = selector;
    this.id = mvelo.util.getHash();
    this.name = `encryptedFormCont-${this.id}`;
    this.port = mvelo.runtime.connect({name: this.name});
    this.registerEventListener();
    this.parent = null;
    this.signature = signature;
    this.container = null;
    this.html = html;
    this.done = null;
  }

  create(done) {
    this.done = done;
    this.parent = document.getElementById(this.selector);
    this.container = document.createElement('iframe');
    const url = mvelo.runtime.getURL(`components/encrypted-form/encryptedForm.html?id=${this.id}&embedded=true`);
    this.container.setAttribute('src', url);
    this.container.setAttribute('frameBorder', 0);
    this.container.setAttribute('scrolling', 'yes');
    this.container.style.width = '100%';
    this.container.style.height = '850px';
    this.parent.appendChild(this.container);
  }

  processFormDefinition() {
    this.port.postMessage({
      event: 'encrypted-form-definition',
      sender: this.name,
      html: this.html,
      signature: this.signature
    });
  }

  registerEventListener() {
    this.port.onMessage.addListener(msg => {
      switch (msg.event) {
        case 'encrypted-form-ready':
          this.processFormDefinition();
          break;
        case 'destroy':
          this.parent.removeChild(this.container);
          this.port.disconnect();
          this.done(false, this.id);
          break;
        case 'error-message':
          this.parent.removeChild(this.container);
          this.port.disconnect();
          this.done(msg.error);
          break;
        default:
          console.log('unknown event', msg);
      }
    });
  }

  baseValidate(html, signature) {
    if (!html) {
      throw new mvelo.Error('The html cannot be empty.');
    }
    if (!signature) {
      throw new mvelo.Error('The signature cannot be empty.');
    }
    return true;
  }
}
