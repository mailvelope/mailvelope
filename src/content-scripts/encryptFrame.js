/**
 * Copyright (C) 2012-2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from '../mvelo';
import $ from 'jquery';
import {currentProvider} from './main';

export default class EncryptFrame extends mvelo.EventHandler {
  constructor() {
    super();
    this.id = mvelo.util.getHash();
    this._editElement = null;
    this._eFrame = null;
    this._port = null;
    this._sender = `eFrame-${this.id}`;
    this._refreshPosIntervalID = 0;
    this._emailTextElement = null;
    // type of external editor
    this._editorType = mvelo.PLAIN_TEXT; //prefs.general.editor_type;
    this._options = {closeBtn: true};
    this._keyCounter = 0;
    this._currentProvider = currentProvider;
  }

  attachTo(element, options) {
    $.extend(this._options, options);
    this._init(element);
    this._establishConnection();
    this._registerEventListener();
    this._renderFrame();
    // set status to attached
    this._editElement.data(mvelo.FRAME_STATUS, mvelo.FRAME_ATTACHED);
    // store frame obj in element tag
    this._editElement.data(mvelo.FRAME_OBJ, this);
  }

  getID() {
    return this.id;
  }

  _init(element) {
    this._editElement = element;
    this._emailTextElement = this._editElement.is('iframe') ? this._editElement.contents().find('body') : this._editElement;
    // inject style if we have a non-body editable element inside a dynamic iframe
    if (!this._editElement.is('body') && this._editElement.closest('body').data(mvelo.DYN_IFRAME)) {
      const html = this._editElement.closest('html');
      if (!html.data('M-STYLE')) {
        const style = $('<link/>', {
          rel: 'stylesheet',
          href: mvelo.runtime.getURL('content-scripts/framestyles.css')
        });
        // add style
        html.find('head').append(style);
        // set marker
        html.data('M-STYLE', true);
      }
    }
  }

  _establishConnection() {
    this._port = mvelo.runtime.connect({name: `eFrame-${this.id}`});
    this.initPort(this._port);
    // attach port disconnect handler
    this._port.onDisconnect.addListener(this._closeFrame.bind(this, false));
  }

  _registerEventListener() {
    // attach event handlers
    this.on('get-recipients', this._getRecipients);
    this.on('set-editor-output', this._setEditorOutput);
    this.on('destroy', this._closeFrame.bind(this, true));
    this.on('mail-editor-close', this._onMailEditorClose);
  }

  _renderFrame() {
    // create frame
    let toolbar = '';
    if (this._options.closeBtn) {
      toolbar = `${toolbar}<a class="m-frame-close">×</a>`;
    } else {
      toolbar = `${toolbar}<span class="m-frame-fill-right"></span>`;
    }
    toolbar = `${toolbar}<button id="editorBtn" class="m-btn m-encrypt-button" type="button"><i class="m-icon m-icon-editor"></i></button>`;
    this._eFrame = $('<div/>', {
      id: `eFrame-${this.id}`,
      'class': 'm-encrypt-frame',
      html: toolbar
    });

    this._eFrame.insertAfter(this._editElement);
    $(window).on('resize', this._setFrameDim.bind(this));
    // to react on position changes of edit element, e.g. click on CC or BCC in GMail
    this._refreshPosIntervalID = window.setInterval(() => {
      this._setFrameDim();
    }, 1000);
    this._eFrame.find('.m-frame-close').on('click', this._closeFrame.bind(this));
    this._eFrame.find('#editorBtn').on('click', this._onEditorButton.bind(this));
    this._normalizeButtons();
    this._eFrame.fadeIn('slow');

    this._emailTextElement.on('keypress', () => {
      if (++this._keyCounter >= 13) {
        this._emailTextElement.off('keypress');
        this._eFrame.fadeOut('slow', () => {
          this._closeFrame();
        });
      }
    });
  }

  _normalizeButtons() {
    //console.log('editor mode', this._editorMode);
    this._eFrame.find('.m-encrypt-button').hide();
    this._eFrame.find('#editorBtn').show().removeClass('m-active');
    this._setFrameDim();
  }

  _onEditorButton() {
    this._emailTextElement.off('keypress');
    this._eFrame.find('#editorBtn').addClass('m-active');
    this._showMailEditor();
    return false;
  }

  _onMailEditorClose() {
    this._eFrame.find('#editorBtn').removeClass('m-active');
  }

  _closeFrame(finalClose) {
    this._eFrame.fadeOut(() => {
      window.clearInterval(this._refreshPosIntervalID);
      $(window).off('resize');
      this._eFrame.remove();
      if (finalClose === true) {
        this._port.disconnect();
        this._editElement.data(mvelo.FRAME_STATUS, null);
      } else {
        this._editElement.data(mvelo.FRAME_STATUS, mvelo.FRAME_DETACHED);
      }
      this._editElement.data(mvelo.FRAME_OBJ, null);
    });
    return false;
  }

  _setFrameDim() {
    const editElementPos = this._editElement.position();
    const editElementWidth = this._editElement.width();
    const toolbarWidth = this._eFrame.width();
    const left = editElementPos.left + editElementWidth - toolbarWidth - 20;
    this._eFrame.css('top', editElementPos.top + 3);
    this._eFrame.css('left', left < 0 ? 0 : left);
  }

  _showMailEditor() {
    const options = {};
    const emailContent = this._getEmailText(this._editorType == mvelo.PLAIN_TEXT ? 'text' : 'html');
    if (/BEGIN\sPGP\sMESSAGE/.test(emailContent)) {
      try {
        options.quotedMail = mvelo.util.normalizeArmored(emailContent, /-----BEGIN PGP MESSAGE-----[\s\S]+?-----END PGP MESSAGE-----/);
      } catch (e) {
        options.text = emailContent;
      }
    } else {
      options.text = emailContent;
    }
    this.emit('eframe-display-editor', options);
  }

  _getRecipients() {
    return this._currentProvider.getRecipients(this._editElement)
    .then(recipients => this.emit('eframe-recipients', {recipients}));
  }

  _html2text(html) {
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

  _getEmailText(type) {
    let text;
    let html;
    if (this._emailTextElement.is('textarea')) {
      text = this._emailTextElement.val();
    } else { // html element
      if (type === 'text') {
        this._emailTextElement.focus();
        const element = this._emailTextElement.get(0);
        const sel = element.ownerDocument.defaultView.getSelection();
        sel.selectAllChildren(element);
        text = sel.toString();
        sel.removeAllRanges();
      } else {
        html = this._emailTextElement.html();
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
  _setEditorOutput(options) {
    // set message body
    this._normalizeButtons();
    this._setMessage(options.text);
    // set recipient email addresses
    this._currentProvider.setRecipients({recipients: options.recipients, editElement: this._editElement});
  }

  /**
   * Replace content of editor element (_emailTextElement)
   */
  _setMessage(msg) {
    if (this._emailTextElement.is('textarea')) {
      this._emailTextElement.val(msg);
    } else {
      // element is contenteditable or RTE
      msg = `<pre>${mvelo.util.encodeHTML(msg)}<pre/>`;
      this._emailTextElement.html(msg);
    }
    // trigger input event
    const inputEvent = document.createEvent('HTMLEvents');
    inputEvent.initEvent('input', true, true);
    this._emailTextElement.get(0).dispatchEvent(inputEvent);
  }
}
