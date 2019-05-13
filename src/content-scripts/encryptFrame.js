/**
 * Copyright (C) 2012-2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import {getHash, normalizeArmored, encodeHTML, decodeHTML} from '../lib/util';
import {FRAME_STATUS, FRAME_ATTACHED, FRAME_DETACHED, DYN_IFRAME, PLAIN_TEXT} from '../lib/constants';
import EventHandler from '../lib/EventHandler';
import {currentProvider} from './main';

export default class EncryptFrame {
  constructor() {
    this.id = getHash();
    this.editElement = null;
    this.eFrame = null;
    this.port = null;
    this.emailTextElement = null;
    // type of external editor
    this.editorType = PLAIN_TEXT; //prefs.general.editor_type;
    this.keyCounter = 0;
    this.currentProvider = currentProvider;
    this.handleKeypress = this.handleKeypress.bind(this);
    this.setFrameDim = this.setFrameDim.bind(this);
  }

  attachTo(element) {
    this.init(element);
    this.establishConnection();
    this.registerEventListener();
    this.renderFrame();
  }

  init(element) {
    this.editElement = element;
    // set status to attached
    this.editElement.dataset[FRAME_STATUS] = FRAME_ATTACHED;
    this.emailTextElement = this.editElement.tagName === 'iframe' ? this.editElement.contentDocument.body : this.editElement;
    // inject style if we have a non-body editable element inside a dynamic iframe
    if (!this.editElement.tagName === 'body' && this.editElement.closest('body').dataset[DYN_IFRAME]) {
      const html = this.editElement.closest('html');
      if (!html.dataset.mveloStyle) {
        const style = document.createElement('link');
        style.rel = 'stylesheet';
        style.href = chrome.runtime.getURL('content-scripts/framestyles.css');
        // add style
        html.ownerDocument.head.append(style);
        // set marker
        html.dataset.mveloStyle = 'true';
      }
    }
  }

  establishConnection() {
    this.port = EventHandler.connect(`eFrame-${this.id}`, this);
    // attach port disconnect handler
    this.port.onDisconnect.addListener(this.closeFrame.bind(this, false));
  }

  registerEventListener() {
    // attach event handlers
    document.addEventListener('mailvelope-observe', this.setFrameDim);
    this.port.on('get-recipients', this.getRecipients);
    this.port.on('set-editor-output', this.setEditorOutput);
    this.port.on('destroy', this.closeFrame.bind(this, true));
    this.port.on('mail-editor-close', this.onMailEditorClose);
  }

  handleKeypress() {
    if (++this.keyCounter >= 13) {
      this.emailTextElement.removeEventListener('keypress', this.handleKeypress);
      this.eFrame.classList.remove('m-show');
      window.setTimeout(() => this.closeFrame(), 300);
    }
  }

  renderFrame() {
    // create frame
    this.eFrame = document.createElement('div');
    this.eFrame.id = `eFrame-${this.id}`;
    this.eFrame.classList.add('m-encrypt-frame');
    this.eFrame.innerHTML = '<a class="m-frame-close">×</a><button id="editorBtn" class="m-btn m-encrypt-button" type="button"><i class="m-icon m-icon-editor"></i></button>';
    this.editElement.parentNode.insertBefore(this.eFrame, this.editElement.nextSibling);
    window.addEventListener('resize', this.setFrameDim);
    // to react on position changes of edit element, e.g. click on CC or BCC in GMail
    this.eFrame.querySelector('.m-frame-close').addEventListener('click', this.closeFrame.bind(this));
    this.eFrame.querySelector('#editorBtn').addEventListener('click', this.onEditorButton.bind(this));
    this.normalizeButtons();
    this.eFrame.classList.add('m-show');
    this.emailTextElement.addEventListener('keypress', this.handleKeypress);
  }

  normalizeButtons() {
    this.eFrame.querySelector('#editorBtn').classList.remove('m-active');
    this.setFrameDim();
  }

  onEditorButton(ev) {
    this.emailTextElement.removeEventListener('keypress', this.handleKeypress);
    this.eFrame.querySelector('#editorBtn').classList.add('m-active');
    this.showMailEditor();
    ev.stopPropagation();
  }

  onMailEditorClose() {
    this.eFrame.querySelector('#editorBtn').classList.remove('m-active');
  }

  closeFrame(finalClose, ev) {
    this.eFrame.classList.remove('m-show');
    window.setTimeout(() => {
      window.removeEventListener('resize', this.setFrameDim);
      this.eFrame.remove();
      if (finalClose === true) {
        this.port.disconnect();
        this.editElement.dataset[FRAME_STATUS] = '';
      } else {
        this.editElement.dataset[FRAME_STATUS] = FRAME_DETACHED;
      }
    }, 300);
    if (ev) {
      ev.stopPropagation();
    }
  }

  setFrameDim() {
    this.eFrame.style.top = `${this.editElement.offsetTop + 3}px`;
    this.eFrame.style.right = '20px';
  }

  showMailEditor() {
    const options = {};
    const emailContent = this.getEmailText(this.editorType == PLAIN_TEXT ? 'text' : 'html');
    if (/BEGIN\sPGP\sMESSAGE/.test(emailContent)) {
      try {
        options.quotedMail = normalizeArmored(emailContent, /-----BEGIN PGP MESSAGE-----[\s\S]+?-----END PGP MESSAGE-----/);
      } catch (e) {
        options.text = emailContent;
      }
    } else {
      options.text = emailContent;
    }
    this.port.emit('eframe-display-editor', options);
  }

  getRecipients() {
    return this.currentProvider.getRecipients(this.editElement);
  }

  html2text(html) {
    const parser = new DOMParser();
    const htmlDoc = parser.parseFromString(html, 'text/html');
    // replace anchors
    for (const anchor of htmlDoc.querySelectorAll('a')) {
      anchor.replaceWith(`${anchor.textContent} (${anchor.href})`);
    }
    html = htmlDoc.innerHTML;
    html = html.replace(/(<(br|ul|ol)>)/g, '\n'); // replace <br>,<ol>,<ul> with new line
    html = html.replace(/<\/(div|p|li)>/g, '\n'); // replace </div>, </p> or </li> tags with new line
    html = html.replace(/<li>/g, '- ');
    html = html.replace(/<(.+?)>/g, ''); // remove tags
    html = html.replace(/\n{3,}/g, '\n\n'); // compress new line
    return decodeHTML(html); // decode
  }

  getEmailText(type) {
    let text;
    let html;
    if (this.emailTextElement.tagName === 'textarea') {
      text = this.emailTextElement.value;
    } else { // html element
      if (type === 'text') {
        this.emailTextElement.focus();
        const sel = this.emailTextElement.ownerDocument.defaultView.getSelection();
        sel.selectAllChildren(this.emailTextElement);
        text = sel.toString();
        sel.removeAllRanges();
      } else {
        html = this.emailTextElement.innerHTML;
        html = html.replace(/\n/g, ''); // remove new lines
        text = html;
      }
    }
    return text;
  }

  /**
   * Is called after encryption and injects ciphertext and recipient
   * email addresses into the webmail interface.
   * @param {String} options.text         The encrypted message body
   * @param {Array}  options.recipients   The recipients to be added
   */
  setEditorOutput(options) {
    // set message body
    this.normalizeButtons();
    this.setMessage(options.text);
    // set recipient email addresses
    this.currentProvider.setRecipients({recipients: options.recipients, editElement: this.editElement});
  }

  /**
   * Replace content of editor element (_emailTextElement)
   */
  setMessage(msg) {
    if (this.emailTextElement.tagName === 'textarea') {
      this.emailTextElement.value = msg;
    } else {
      // element is contenteditable or RTE
      msg = `<pre>${encodeHTML(msg)}</pre>`;
      this.emailTextElement.innerHTML = msg;
    }
    // trigger input event
    const inputEvent = document.createEvent('HTMLEvents');
    inputEvent.initEvent('input', true, true);
    this.emailTextElement.dispatchEvent(inputEvent);
  }
}
