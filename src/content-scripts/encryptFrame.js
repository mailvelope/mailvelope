/**
 * Copyright (C) 2012-2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import {getHash, normalizeArmored, encodeHTML} from '../lib/util';
import {FRAME_STATUS, FRAME_ATTACHED, FRAME_DETACHED, FRAME_OBJ, DYN_IFRAME, PLAIN_TEXT} from '../lib/constants';
import EventHandler from '../lib/EventHandler';
import $ from 'jquery';
import {currentProvider} from './main';

export default class EncryptFrame {
  constructor() {
    this.id = getHash();
    this.editElement = null;
    this.eFrame = null;
    this.port = null;
    this.refreshPosIntervalID = 0;
    this.emailTextElement = null;
    // type of external editor
    this.editorType = PLAIN_TEXT;
    this.options = {closeBtn: true};
    this.keyCounter = 0;
    this.currentProvider = currentProvider;
  }

  attachTo(element, options) {
    $.extend(this.options, options);
    this.init(element);
    this.establishConnection();
    this.registerEventListener();
    this.renderFrame();
    // set status to attached
    this.editElement.data(FRAME_STATUS, FRAME_ATTACHED);
    // store frame obj in element tag
    this.editElement.data(FRAME_OBJ, this);
  }

  init(element) {
    this.editElement = element;
    this.emailTextElement = this.editElement.is('iframe') ? this.editElement.contents().find('body') : this.editElement;
    // inject style if we have a non-body editable element inside a dynamic iframe
    if (!this.editElement.is('body') && this.editElement.closest('body').data(DYN_IFRAME)) {
      const html = this.editElement.closest('html');
      if (!html.data('M-STYLE')) {
        const style = $('<link/>', {
          rel: 'stylesheet',
          href: chrome.runtime.getURL('content-scripts/framestyles.css')
        });
        // add style
        html.find('head').append(style);
        // set marker
        html.data('M-STYLE', true);
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
    this.port.on('get-recipients', this.getRecipients);
    this.port.on('set-editor-output', this.setEditorOutput);
    this.port.on('destroy', this.closeFrame.bind(this, true));
    this.port.on('mail-editor-close', this.onMailEditorClose);
  }

  renderFrame() {
    // create frame
    let toolbar = '';
    if (this.options.closeBtn) {
      toolbar = `${toolbar}<a class="m-frame-close">×</a>`;
    } else {
      toolbar = `${toolbar}<span class="m-frame-fill-right"></span>`;
    }
    toolbar = `${toolbar}<button id="editorBtn" class="m-btn m-encrypt-button" type="button"><span class="m-icon m-icon-editor"></span></button>`;
    this.eFrame = $('<div/>', {
      id: `eFrame-${this.id}`,
      'class': 'm-encrypt-frame',
      html: toolbar
    });

    this.eFrame.insertAfter(this.editElement);
    $(window).on('resize', this.setFrameDim.bind(this));
    // to react on position changes of edit element, e.g. click on CC or BCC in GMail
    this.refreshPosIntervalID = window.setInterval(() => {
      this.setFrameDim();
    }, 1000);
    this.eFrame.find('.m-frame-close').on('click', this.closeFrame.bind(this));
    this.eFrame.find('#editorBtn').on('click', this.onEditorButton.bind(this));
    this.normalizeButtons();
    this.eFrame.fadeIn('slow');
    this.emailTextElement.on('keypress', () => {
      if (++this.keyCounter >= 13) {
        this.emailTextElement.off('keypress');
        this.eFrame.fadeOut('slow', () => {
          this.closeFrame();
        });
      }
    });
  }

  normalizeButtons() {
    //console.log('editor mode', this.editorMode);
    this.eFrame.find('.m-encrypt-button').hide();
    this.eFrame.find('#editorBtn').show().removeClass('m-active');
    this.setFrameDim();
  }

  onEditorButton() {
    this.emailTextElement.off('keypress');
    this.eFrame.find('#editorBtn').addClass('m-active');
    this.showMailEditor();
    return false;
  }

  onMailEditorClose() {
    this.eFrame.find('#editorBtn').removeClass('m-active');
  }

  closeFrame(finalClose) {
    this.eFrame.fadeOut(() => {
      window.clearInterval(this.refreshPosIntervalID);
      $(window).off('resize');
      this.eFrame.remove();
      if (finalClose === true) {
        this.port.disconnect();
        this.editElement.data(FRAME_STATUS, null);
      } else {
        this.editElement.data(FRAME_STATUS, FRAME_DETACHED);
      }
      this.editElement.data(FRAME_OBJ, null);
    });
    return false;
  }

  setFrameDim() {
    const editElementPos = this.editElement.position();
    const editElementWidth = this.editElement.width();
    const toolbarWidth = this.eFrame.width();
    const left = editElementPos.left + editElementWidth - toolbarWidth - 20;
    this.eFrame.css('top', editElementPos.top + 3);
    this.eFrame.css('left', left < 0 ? 0 : left);
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
    html = $('<div/>').html(html);
    // replace anchors
    html = html.find('a').replaceWith(function() {
      return `${$(this).text()} (${$(this).attr('href')})`;
    })
    .end()
    .html();
    html = html.replace(/(<(br|ul|ol)>)/g, '\n'); // replace <br>,<ol>,<ul> with new line
    html = html.replace(/<\/(div|p|li)>/g, '\n'); // replace </div>, </p> or </li> tags with new line
    html = html.replace(/<li>/g, '- ');
    html = html.replace(/<(.+?)>/g, ''); // remove tags
    html = html.replace(/\n{3,}/g, '\n\n'); // compress new line
    return $('<div/>').html(html).text(); // decode
  }

  getEmailText(type) {
    let text;
    let html;
    if (this.emailTextElement.is('textarea')) {
      text = this.emailTextElement.val();
    } else { // html element
      if (type === 'text') {
        this.emailTextElement.focus();
        const element = this.emailTextElement.get(0);
        const sel = element.ownerDocument.defaultView.getSelection();
        sel.selectAllChildren(element);
        text = sel.toString();
        sel.removeAllRanges();
      } else {
        html = this.emailTextElement.html();
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
    if (this.emailTextElement.is('textarea')) {
      this.emailTextElement.val(msg);
    } else {
      // element is contenteditable or RTE
      msg = `<pre>${encodeHTML(msg)}</pre>`;
      this.emailTextElement.html(msg);
    }
    // trigger input event
    const inputEvent = document.createEvent('HTMLEvents');
    inputEvent.initEvent('input', true, true);
    this.emailTextElement.get(0).dispatchEvent(inputEvent);
  }
}
