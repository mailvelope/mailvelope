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
    this.port = mvelo.EventHandler.connect(`editorCont-${this.id}`, this);
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

  registerEventListener() {
    this.port.on('editor-ready', () => this.done(this.options && this.processOptions(), this.id));
    this.port.on('destroy', this.onDestroy);
    this.port.on('error-message', this.onError);
    this.port.on('encrypted-message', this.onEncryptedMessage);
  }

  onDestroy() {
    this.parent.removeChild(this.container);
    this.port.disconnect();
  }

  onError({error}) {
    if (this.encryptCallback) {
      this.encryptCallback(error);
      this.encryptCallback = null;
    } else if (this.createDraftCallback) {
      this.createDraftCallback(error);
      this.createDraftCallback = null;
    }
  }

  onEncryptedMessage({message}) {
    if (this.encryptCallback) {
      this.encryptCallback(null, message);
      this.encryptCallback = null;
    } else if (this.createDraftCallback) {
      this.createDraftCallback(null, message);
      this.createDraftCallback = null;
    }
  }

  encrypt(recipients, callback) {
    this.checkInProgress();
    this.port.emit('editor-container-encrypt', {
      keyringId: this.keyringId,
      recipients
    });
    this.encryptCallback = callback;
  }

  createDraft(callback) {
    this.checkInProgress();
    this.port.emit('editor-container-create-draft', {keyringId: this.keyringId});
    this.createDraftCallback = callback;
  }

  checkInProgress() {
    if (this.encryptCallback || this.createDraftCallback) {
      throw new mvelo.Error('Encyption already in progress.', 'ENCRYPT_IN_PROGRESS');
    }
  }

  processOptions() {
    if (this.options.quotedMail && getMessageType(this.options.quotedMail) !== mvelo.PGP_MESSAGE ||
        this.options.armoredDraft && getMessageType(this.options.armoredDraft) !== mvelo.PGP_MESSAGE) {
      return new mvelo.Error('quotedMail or armoredDraft parameter need to be a PGP message.', 'WRONG_ARMOR_TYPE');
    }
    if (this.options.armoredDraft && (this.options.predefinedText || this.options.quotedMail ||
                                      this.options.quotedMailIndent || this.options.quotedMailHeader)) {
      return new mvelo.Error('armoredDraft parameter cannot be combined with parameters: predefinedText, quotedMail, quotedMailIndent, quotedMailHeader.', 'INVALID_OPTIONS');
    }
    this.port.emit('editor-options', {
      keyringId: this.keyringId,
      options: this.options
    });
  }
}
