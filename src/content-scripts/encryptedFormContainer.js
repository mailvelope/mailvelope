/**
 * Copyright (C) 2018 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from "../mvelo";

export default class EncryptedFormContainer {
  constructor(selector, html, signature) {
    this.baseValidate(selector, html, signature);
    this.selector = selector;
    this.id = mvelo.util.getHash();
    this.name = `encryptedFormCont-${this.id}`;
    this.port = mvelo.EventHandler.connect(this.name, this);
    this.registerEventListener();
    this.parent = null;
    this.signature = signature;
    this.container = null;
    this.html = html;
    this.done = null;
  }

  create(done) {
    this.done = done;
    this.parent = document.querySelector(this.selector);
    this.container = document.createElement('iframe');
    const url = mvelo.runtime.getURL(`components/encrypted-form/encryptedForm.html?id=${this.id}`);
    this.container.setAttribute('id', this.name);
    this.container.setAttribute('src', url);
    this.container.setAttribute('frameBorder', 0);
    this.container.setAttribute('scrolling', 'no');
    this.container.style.width = '100%';
    this.container.style.height = '150px';
    this.parent.appendChild(this.container);
  }

  processFormDefinition() {
    this.port.emit('encrypted-form-definition', {
      sender: this.name,
      html: this.html,
      signature: this.signature
    });
  }

  onResize({height}) {
    const offset = 16;
    const newHeight = height + offset;
    this.container.style.height = `${newHeight}px`;
  }

  onDestroy() {
    this.parent.removeChild(this.container);
    this.port.disconnect();
    this.done(null, this.id);
  }

  onError({error}) {
    if (this.container) {
      this.parent.removeChild(this.container);
      this.port.disconnect();
    }
    this.done(error);
  }

  registerEventListener() {
    this.port.on('encrypted-form-ready', this.processFormDefinition);
    this.port.on('encrypted-form-data', ({armoredData}) => this.done(null, {armoredData}));
    this.port.on('encrypted-form-resize', this.onResize);
    this.port.on('destroy', this.onDestroy);
    this.port.on('error-message', this.onError);
  }

  baseValidate(selector, html, signature) {
    if (!selector) {
      throw new mvelo.Error('The pgp encrypted form selector cannot be empty.');
    }
    if (!html) {
      throw new mvelo.Error('The pgp encrypted form html cannot be empty.');
    }
    if (!signature) {
      throw new mvelo.Error('The pgp encrypted form signature cannot be empty.');
    }
    return true;
  }
}
