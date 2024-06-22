/**
 * Copyright (C) 2018 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import {getUUID, MvError} from '../lib/util';
import EventHandler from '../lib/EventHandler';

export default class EncryptedFormContainer {
  constructor(selector, html, signature) {
    this.baseValidate(selector, html, signature);
    this.selector = selector;
    this.id = getUUID();
    this.port = EventHandler.connect(`encryptedFormCont-${this.id}`, this);
    this.registerEventListener();
    this.parent = null;
    this.signature = signature;
    this.container = null;
    this.html = html;
  }

  create() {
    return new Promise((resolve, reject) => {
      this.createPromise = {resolve, reject};
      this.parent = document.querySelector(this.selector);
      this.container = document.createElement('iframe');
      const url = chrome.runtime.getURL(`components/encrypted-form/encryptedForm.html?id=${this.id}`);
      this.container.setAttribute('src', url);
      this.container.setAttribute('frameBorder', 0);
      this.container.setAttribute('scrolling', 'no');
      this.container.setAttribute('style', 'overflow:hidden');
      this.container.style.width = '100%';
      this.container.style.height = '150px';
      this.parent.appendChild(this.container);
    });
  }

  processFormDefinition() {
    this.port.emit('encrypted-form-definition', {
      html: this.html,
      signature: this.signature
    });
  }

  onResize({height}) {
    this.container.style.height = `${height}px`;
  }

  onDestroy() {
    this.parent.removeChild(this.container);
    this.port.disconnect();
    this.createPromise.resolve(this.id);
  }

  onError(error) {
    error.code = 'INVALID_FORM';
    if (this.container) {
      this.parent.removeChild(this.container);
      this.port.disconnect();
    }
    this.createPromise.reject(error);
  }

  registerEventListener() {
    this.port.on('encrypted-form-ready', this.processFormDefinition);
    this.port.on('encrypted-form-data', ({armoredData}) => this.createPromise.resolve({armoredData}));
    this.port.on('encrypted-form-resize', this.onResize);
    this.port.on('destroy', this.onDestroy);
    this.port.on('error-message', this.onError);
  }

  baseValidate(selector, html, signature) {
    if (!selector) {
      throw new MvError('The pgp encrypted form selector cannot be empty.', 'NO_FORM');
    }
    if (!html) {
      throw new MvError('The pgp encrypted form html cannot be empty.', 'NO_HTML');
    }
    if (!signature) {
      throw new MvError('The pgp encrypted form signature cannot be empty.', 'NO_SIGNATURE');
    }
    return true;
  }
}
