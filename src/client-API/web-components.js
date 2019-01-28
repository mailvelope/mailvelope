/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2018-2019 Mailvelope GmbH
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

/**
 * OpenPGPEncryptedForm custom HTMLElement
 */
class OpenPGPEncryptedForm extends HTMLElement {
  // Invoked when the custom element is first connected to the document's DOM.
  connectedCallback() {
    this.dispatchEvent(new Event('connected'));
    const id = this.getAttribute('id');
    if (!id) {
      const error = new Error('No form id for openpgp-encrypted-tag. Please add a unique identifier.');
      error.code = 'NO_FORM_ID';
      return this.onError(error);
    }
    let html;
    const scriptTags = this.getElementsByTagName('script');
    if (scriptTags.length) {
      html = scriptTags[0].innerText;
    } else {
      const error = new Error('No form template for openpgp-encrypted-tag. Please add a form template.');
      error.code = 'NO_FORM_SCRIPT';
      return this.onError(error);
    }
    window.mailvelope.createEncryptedFormContainer(`#${id}`, html, this.getAttribute('signature'))
    .then(data => this.onEncrypt(data), error => this.onError(error));
  }

  onEncrypt(data) {
    this.dispatchEvent(new CustomEvent('encrypt', {
      detail: {armoredData: data.armoredData},
      bubbles: true,
      cancelable: true
    }));
  }

  onError(error) {
    this.dispatchEvent(new ErrorEvent('error', {
      message: error.message,
      error
    }));
  }
}

class OpenPGPEmailRead extends HTMLElement {
  connectedCallback() {
    const id = this.getAttribute('id');
    if (!id) {
      return this.onError(new Error('Missing id attribute on openpgp-email-read tag. Please add a unique identifier.'));
    }
    const [armoredElement] = this.getElementsByClassName('armored');
    const armored = armoredElement ? armoredElement.textContent : this.dataset.armored;
    if (!armored) {
      return this.onError(new Error('Armored message required as <template class="armored"> child element or data-armored attribute.'));
    }
    const options = {senderAddress: this.dataset.senderAddress};
    if (window.mailvelope) {
      this.createContainer(id, armored, options);
    } else {
      window.addEventListener('mailvelope', () => this.createContainer(id, armored, options), {once: true});
    }
  }

  async createContainer(id, armored, options) {
    try {
      const {error} = await window.mailvelope.createDisplayContainer(`#${id}`, armored, null, options);
      if (error) {
        return this.onError(error);
      }
      this.onReady();
    } catch (e) {
      this.onError(e);
    }
  }

  onReady() {
    this.dispatchEvent(new CustomEvent('ready', {bubbles: true, cancelable: true}));
  }

  onError(error) {
    this.dispatchEvent(new ErrorEvent('error', {message: error.message, error}));
  }
}

class OpenPGPEmailWrite extends HTMLElement {
  connectedCallback() {
    const id = this.getAttribute('id');
    if (!id) {
      return this.onError(new Error('Missing id attribute on openpgp-email-write tag. Please add a unique identifier.'));
    }
    const [armoredDraftElement] = this.getElementsByClassName('armored-draft');
    const armoredDraft = armoredDraftElement ? armoredDraftElement.textContent : undefined;
    const [quotedMailElement] = this.getElementsByClassName('quoted-mail');
    const quotedMail = quotedMailElement ? quotedMailElement.textContent : undefined;
    let {quota, signMsg, keepAttachments} = this.dataset;
    quota = quota ? Number(quota) : undefined;
    signMsg = signMsg || signMsg === '' ? true : false;
    keepAttachments = keepAttachments || keepAttachments === '' ? true : false;
    const options = {armoredDraft, quotedMail, ...this.dataset, quota, signMsg, keepAttachments};
    if (window.mailvelope) {
      this.createEditor(id, options);
    } else {
      window.addEventListener('mailvelope', () => this.createEditor(id, options), {once: true});
    }
  }

  async createEditor(id, options) {
    try {
      this.editor = await window.mailvelope.createEditorContainer(`#${id}`, null, options);
      this.onReady(this.editor);
    } catch (e) {
      this.onError(e);
    }
  }

  onReady(editor) {
    this.dispatchEvent(new CustomEvent('ready', {bubbles: true, cancelable: true, detail: {editor}}));
  }

  onError(error) {
    this.dispatchEvent(new ErrorEvent('error', {message: error.message, error}));
  }
}

export function init() {
  // See. https://developer.mozilla.org/en-US/docs/Web/API/Window/customElements#Specification#Browser_compatibility
  if (!window.customElements) {
    return;
  }
  window.customElements.define('openpgp-encrypted-form', OpenPGPEncryptedForm);
  window.customElements.define('openpgp-email-read', OpenPGPEmailRead);
  window.customElements.define('openpgp-email-write', OpenPGPEmailWrite);
}
