/**
 * Copyright (C) 2014-2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import {PGP_MESSAGE} from '../lib/constants';
import {getUUID, MvError} from '../lib/util';
import {getMessageType} from './main';
import EventHandler from '../lib/EventHandler';

export default class EditorContainer {
  constructor(selector, keyringId, options) {
    this.selector = selector;
    this.keyringId = keyringId;
    this.options = options;
    this.id = getUUID();
    this.port = EventHandler.connect(`editorCont-${this.id}`, this);
    this.registerEventListener();
    this.parent = null;
    this.container = null;
  }

  create() {
    return new Promise((resolve, reject) => {
      this.createPromise = {resolve, reject};
      this.parent = document.querySelector(this.selector);
      this.container = document.createElement('iframe');
      let quota = '';
      if (this.options.quota) {
        quota = `&quota=${this.options.quota}`;
      }
      const url = chrome.runtime.getURL(`components/editor/editor.html?id=${this.id}${quota}&embedded=true`);
      this.container.setAttribute('src', url);
      this.container.setAttribute('frameBorder', 0);
      this.container.setAttribute('scrolling', 'no');
      this.container.style.width = '100%';
      this.container.style.height = '100%';
      this.parent.appendChild(this.container);
    });
  }

  registerEventListener() {
    this.port.on('editor-ready', this.onEditorReady);
    this.port.on('destroy', this.onDestroy);
    this.port.on('error-message', this.onError);
    this.port.on('encrypted-message', this.onEncryptedMessage);
  }

  onEditorReady() {
    const error = this.options && this.processOptions();
    if (error) {
      this.createPromise.reject(error);
    }
    this.createPromise.resolve(this.id);
  }

  onDestroy() {
    this.parent.removeChild(this.container);
    this.port.disconnect();
  }

  onError({error}) {
    if (this.encryptPromise) {
      this.encryptPromise.reject(error);
      this.encryptPromise = null;
    } else if (this.createDraftPromise) {
      this.createDraftPromise.reject(error);
      this.createDraftPromise = null;
    }
  }

  onEncryptedMessage({message}) {
    if (this.encryptPromise) {
      this.encryptPromise.resolve(message);
      this.encryptPromise = null;
    } else if (this.createDraftPromise) {
      this.createDraftPromise.resolve(message);
      this.createDraftPromise = null;
    }
  }

  encrypt(recipients) {
    return new Promise((resolve, reject) => {
      this.checkInProgress();
      this.encryptPromise = {resolve, reject};
      this.port.emit('editor-container-encrypt', {
        keyringId: this.keyringId,
        recipients
      });
    });
  }

  createDraft() {
    return new Promise((resolve, reject) => {
      this.checkInProgress();
      this.createDraftPromise = {resolve, reject};
      this.port.emit('editor-container-create-draft', {keyringId: this.keyringId});
    });
  }

  checkInProgress() {
    if (this.encryptPromise || this.createDraftPromise) {
      throw new MvError('Encyption already in progress.', 'ENCRYPT_IN_PROGRESS');
    }
  }

  processOptions() {
    if (this.options.quotedMail && getMessageType(this.options.quotedMail) !== PGP_MESSAGE ||
        this.options.armoredDraft && getMessageType(this.options.armoredDraft) !== PGP_MESSAGE) {
      return new MvError('quotedMail or armoredDraft parameter need to be a PGP message.', 'WRONG_ARMOR_TYPE');
    }
    if (this.options.armoredDraft && (this.options.predefinedText || this.options.quotedMail ||
                                      this.options.quotedMailIndent || this.options.quotedMailHeader)) {
      return new MvError('armoredDraft parameter cannot be combined with parameters: predefinedText, quotedMail, quotedMailIndent, quotedMailHeader.', 'INVALID_OPTIONS');
    }
    this.port.emit('editor-options', {
      keyringId: this.keyringId,
      options: this.options
    });
  }
}
