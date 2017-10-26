/**
 * Copyright (C) 2014-2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from '../mvelo';
import {getMessageType} from './main';

export default class EditorContainer {
  constructor(selector, keyringId, options) {
    this.selector = selector;
    this.keyringId = keyringId;
    this.options = options;
    this.id = mvelo.util.getHash();
    this.name = `editorCont-${this.id}`;
    this.port = mvelo.runtime.connect({name: this.name});
    this.registerEventListener();
    this.parent = null;
    this.container = null;
    this.done = null;
    this.encryptCallback = null;
    this.createDraftCallback = null;
  }

  create(done) {
    this.done = done;
    this.parent = document.querySelector(this.selector);
    this.container = document.createElement('iframe');
    let quota = '';
    if (this.options.quota) {
      quota = `&quota=${this.options.quota}`;
    }
    const url = mvelo.runtime.getURL(`components/editor/editor.html?id=${this.id}${quota}&embedded=true`);
    this.container.setAttribute('src', url);
    this.container.setAttribute('frameBorder', 0);
    this.container.setAttribute('scrolling', 'no');
    this.container.style.width = '100%';
    this.container.style.height = '100%';
    this.parent.appendChild(this.container);
  }

  encrypt(recipients, callback) {
    this.checkInProgress();
    this.port.postMessage({
      event: 'editor-container-encrypt',
      sender: this.name,
      keyringId: this.keyringId,
      recipients
    });
    this.encryptCallback = callback;
  }

  createDraft(callback) {
    this.checkInProgress();
    this.port.postMessage({
      event: 'editor-container-create-draft',
      sender: this.name,
      keyringId: this.keyringId
    });
    this.createDraftCallback = callback;
  }

  checkInProgress() {
    if (this.encryptCallback || this.createDraftCallback) {
      const error = new Error('Encyption already in progress.');
      error.code = 'ENCRYPT_IN_PROGRESS';
      throw error;
    }
  }

  processOptions() {
    let error;
    if (this.options.quotedMail && getMessageType(this.options.quotedMail) !== mvelo.PGP_MESSAGE ||
        this.options.armoredDraft && getMessageType(this.options.armoredDraft) !== mvelo.PGP_MESSAGE) {
      error = new Error('quotedMail or armoredDraft parameter need to be a PGP message.');
      error.code = 'WRONG_ARMOR_TYPE';
      return error;
    }
    if (this.options.armoredDraft && (this.options.predefinedText || this.options.quotedMail ||
                                      this.options.quotedMailIndent || this.options.quotedMailHeader)) {
      error = new Error('armoredDraft parameter cannot be combined with parameters: predefinedText, quotedMail, quotedMailIndent, quotedMailHeader.');
      error.code = 'INVALID_OPTIONS';
      return error;
    }

    this.port.postMessage({
      event: 'editor-options',
      sender: this.name,
      keyringId: this.keyringId,
      options: this.options
    });
  }

  registerEventListener() {
    this.port.onMessage.addListener(msg => {
      switch (msg.event) {
        case 'editor-ready':
          this.done(this.options && this.processOptions(), this.id);
          break;
        case 'destroy':
          this.parent.removeChild(this.container);
          this.port.disconnect();
          break;
        case 'error-message':
          if (this.encryptCallback) {
            this.encryptCallback(msg.error);
            this.encryptCallback = null;
          } else if (this.createDraftCallback) {
            this.createDraftCallback(msg.error);
            this.createDraftCallback = null;
          }
          break;
        case 'encrypted-message':
          if (this.encryptCallback) {
            this.encryptCallback(null, msg.message);
            this.encryptCallback = null;
          } else if (this.createDraftCallback) {
            this.createDraftCallback(null, msg.message);
            this.createDraftCallback = null;
          }
          break;
        default:
          console.log('unknown event', msg);
      }
    });
  }
}
