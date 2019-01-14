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

export function init() {
  // See. https://developer.mozilla.org/en-US/docs/Web/API/Window/customElements#Specification#Browser_compatibility
  if (typeof window.customElements !== 'undefined') {
    window.customElements.define('openpgp-encrypted-form', OpenPGPEncryptedForm);
  }
}
