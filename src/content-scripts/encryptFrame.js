/**
 * Copyright (C) 2012-2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import {getHash, normalizeArmored, encodeHTML, decodeHTML, parseHTML} from '../lib/util';
import {FRAME_STATUS, FRAME_ATTACHED, FRAME_DETACHED, PLAIN_TEXT} from '../lib/constants';
import EventHandler from '../lib/EventHandler';
import * as l10n from '../lib/l10n';
import {currentProvider} from './main';

import encryptContainerCSS from './encryptFrame.css';

l10n.register([
  'encrypt_frame_btn_label'
]);

l10n.mapToLocal();

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
    this.emailTextElement = this.editElement.tagName.toLowerCase() === 'iframe' ? this.editElement.contentDocument.body : this.editElement;
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
    const encryptContainer = `<div class="m-encrypt-container"><a id="editorBtn" class="m-encrypt-button"><svg width="32px" heigh="32px" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><g fill="none" fill-rule="evenodd"><circle cx="16" cy="16" r="16" fill="#FF004F"/><path d="M15.995 28.667c-3.39 0-6.57-1.311-8.955-3.691-2.387-2.383-3.704-5.567-3.707-8.966a12.628 12.628 0 0 1 .592-3.836l.007-.028c.087-.306.194-.6.318-.875.022-.055.047-.116.073-.176.11-.251.545-1.115 1.588-1.77.943-.593 1.77-.644 1.866-.648.228-.027.464-.04.699-.04 1.07 0 2.015.423 2.662 1.194.492.587.76 1.307.78 2.097a4.321 4.321 0 0 1 1.959-.481c1.07 0 2.016.424 2.662 1.194.039.046.076.094.113.142.859-.852 1.993-1.336 3.14-1.336 1.07 0 2.015.424 2.662 1.194.656.782.913 1.81.722 2.893l-.672 3.807c-.09.513.017.982.301 1.321.274.327.696.507 1.187.507 1.482 0 2.003-1.08 2.345-2.246.293-1.033.428-2.107.401-3.191a10.675 10.675 0 0 0-3.219-7.387 10.683 10.683 0 0 0-7.445-3.086H16c-2.14 0-4.209.63-5.982 1.825a.97.97 0 0 1-.544.167.958.958 0 0 1-.729-.335L8.74 6.91a.96.96 0 0 1 .196-1.418 12.585 12.585 0 0 1 7.317-2.156 12.604 12.604 0 0 1 8.65 3.67 12.601 12.601 0 0 1 3.758 8.612 12.664 12.664 0 0 1-.41 3.606h.001l-.043.158-.019.063a12.57 12.57 0 0 1-.4 1.187c-.079.187-.518 1.143-1.599 1.822-.935.588-1.673.618-1.76.62a4.89 4.89 0 0 1-.439.02c-1.07 0-2.016-.424-2.662-1.194-.656-.783-.913-1.81-.722-2.893l.672-3.808c.09-.512-.017-.982-.301-1.32-.274-.327-.696-.507-1.187-.507-1.166 0-2.325.99-2.531 2.162l-.735 3.998a.528.528 0 0 1-.52.432h-.883a.527.527 0 0 1-.52-.623l.762-4.144c.09-.51-.017-.98-.3-1.319-.275-.326-.697-.506-1.188-.506-1.165 0-2.324.99-2.531 2.162l-.734 3.998a.528.528 0 0 1-.52.432H9.21a.526.526 0 0 1-.52-.623l.764-4.159.512-2.799c.09-.509-.018-.976-.302-1.315-.274-.327-.696-.507-1.187-.507-1.21 0-1.989.465-2.454 1.463a10.662 10.662 0 0 0-.755 4.408c.108 2.737 1.266 5.313 3.26 7.252 1.995 1.939 4.603 3.024 7.343 3.057H16c2.266 0 4.435-.7 6.272-2.026a.942.942 0 0 1 .555-.18.962.962 0 0 1 .565 1.743 12.571 12.571 0 0 1-7.397 2.389" fill="#FFF2F6"/></g></svg><span>${l10n.map.encrypt_frame_btn_label}</span></a><a class="m-encrypt-close"><span class="icon-close"></span></a></div>`;
    this.eFrame.append(parseHTML(encryptContainer));
    this.eFrame.querySelector('.m-encrypt-close').addEventListener('click', this.closeFrame.bind(this, false));
    this.eFrame.querySelector('#editorBtn').addEventListener('click', this.onEditorButton.bind(this));
    const shadowRootElem = document.createElement('div');
    this.editElement.parentNode.insertBefore(shadowRootElem, this.editElement.nextSibling);
    const eFrameShadow = shadowRootElem.attachShadow({mode: 'open'});
    const encryptContainerStyle = document.createElement('style');
    encryptContainerStyle.textContent = encryptContainerCSS;
    eFrameShadow.append(encryptContainerStyle);
    eFrameShadow.append(this.eFrame);
    window.addEventListener('resize', this.setFrameDim);
    // to react on position changes of edit element, e.g. click on CC or BCC in GMail
    this.normalizeButtons();
    this.eFrame.classList.add('m-show');
    this.emailTextElement.addEventListener('keypress', this.handleKeypress);
  }

  normalizeButtons() {
    this.eFrame.querySelector('.m-encrypt-container').classList.remove('active');
    this.setFrameDim();
  }

  onEditorButton(ev) {
    this.emailTextElement.removeEventListener('keypress', this.handleKeypress);
    this.eFrame.querySelector('.m-encrypt-container').classList.add('active');
    this.showMailEditor();
    ev.stopPropagation();
  }

  onMailEditorClose() {
    this.eFrame.querySelector('.m-encrypt-container').classList.remove('active');
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
    if (ev instanceof Event) {
      ev.stopPropagation();
    }
  }

  setFrameDim() {
    this.eFrame.style.top = `${this.editElement.offsetTop + 5}px`;
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
    if (this.emailTextElement.tagName.toLowerCase() === 'textarea') {
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
    if (this.emailTextElement.tagName.toLowerCase() === 'textarea') {
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
