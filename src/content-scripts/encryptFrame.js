/**
 * Copyright (C) 2012-2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

'use strict';

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
    this._senderId = 'eFrame-' + this.id;
    this._refreshPosIntervalID = 0;
    this._emailTextElement = null;
    this._emailUndoText = null;
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
    this._renderFrame();
    this._registerEventListener();
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
      var html = this._editElement.closest('html');
      if (!html.data('M-STYLE')) {
        var style = $('<link/>', {
          rel: 'stylesheet',
          href: mvelo.extension.getURL('content-scripts/framestyles.css')
        });
        // add style
        html.find('head').append(style);
        // set marker
        html.data('M-STYLE', true);
      }
    }
  }

  _renderFrame() {
    var that = this;
    // create frame
    var toolbar = '';
    if (this._options.closeBtn) {
      toolbar = toolbar + '<a class="m-frame-close">×</a>';
    } else {
      toolbar = toolbar + '<span class="m-frame-fill-right"></span>';
    }
    toolbar = toolbar + '\
              <button id="undoBtn" class="m-btn m-encrypt-button" type="button"><i class="m-icon m-icon-undo"></i></button> \
              <button id="editorBtn" class="m-btn m-encrypt-button" type="button"><i class="m-icon m-icon-editor"></i></button> \
              ';
    this._eFrame = $('<div/>', {
      id: 'eFrame-' + that.id,
      'class': 'm-encrypt-frame',
      html: toolbar
    });

    this._eFrame.insertAfter(this._editElement);
    $(window).on('resize', this._setFrameDim.bind(this));
    // to react on position changes of edit element, e.g. click on CC or BCC in GMail
    this._refreshPosIntervalID = window.setInterval(function() {
      that._setFrameDim();
    }, 1000);
    this._eFrame.find('.m-frame-close').on('click', this._closeFrame.bind(this));
    this._eFrame.find('#undoBtn').on('click', this._onUndoButton.bind(this));
    this._eFrame.find('#editorBtn').on('click', this._onEditorButton.bind(this));
    this._normalizeButtons();
    this._eFrame.fadeIn('slow');

    this._emailTextElement.on('keypress', function() {
      if (++that._keyCounter >= 13) {
        that._emailTextElement.off('keypress');
        that._eFrame.fadeOut('slow', function() {
          that._closeFrame();
        });
      }
    });
  }

  _normalizeButtons() {
    //console.log('editor mode', this._editorMode);
    this._eFrame.find('.m-encrypt-button').hide();
    this._eFrame.find('#editorBtn').show();
    if (this._emailUndoText) {
      this._eFrame.find('#undoBtn').show();
    }
    this._setFrameDim();
  }

  _onUndoButton() {
    this._resetEmailText();
    this._normalizeButtons();
    return false;
  }

  _onEditorButton() {
    this._emailTextElement.off('keypress');
    this._showMailEditor();
    return false;
  }

  _closeFrame(finalClose) {
    this._eFrame.fadeOut(function() {
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
    }.bind(this));
    return false;
  }

  _setFrameDim() {
    var editElementPos = this._editElement.position();
    var editElementWidth = this._editElement.width();
    var toolbarWidth = this._eFrame.width();
    this._eFrame.css('top', editElementPos.top + 3);
    this._eFrame.css('left', editElementPos.left + editElementWidth - toolbarWidth - 20);
  }

  _showMailEditor() {
    this.emit('eframe-display-editor', {
      text: this._getEmailText(this._editorType == mvelo.PLAIN_TEXT ? 'text' : 'html')
    });
  }

  _getRecipients() {
    return this._currentProvider.getRecipients(this._editElement)
    .then(recipients => this.emit('eframe-recipients', {recipients}));
  }

  _establishConnection() {
    this._port = mvelo.extension.connect({name: 'eFrame-' + this.id});
  }

  _html2text(html) {
    html = $('<div/>').html(html);
    // replace anchors
    html = html.find('a').replaceWith(function() {
                                        return $(this).text() + ' (' + $(this).attr('href') + ')';
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
    var text, html;
    if (this._emailTextElement.is('textarea')) {
      text = this._emailTextElement.val();
    } else { // html element
      if (type === 'text') {
        this._emailTextElement.focus();
        var element = this._emailTextElement.get(0);
        var sel = element.ownerDocument.defaultView.getSelection();
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
   * Save editor content for later undo
   */
  _saveEmailText() {
    if (this._emailTextElement.is('textarea')) {
      this._emailUndoText = this._emailTextElement.val();
    } else {
      this._emailUndoText = this._emailTextElement.html();
    }
  }

  /**
   * Is called after encryption and injects ciphertext and recipient
   * email addresses into the webmail interface.
   * @param {String} options.text         The encrypted message body
   * @param {Array}  options.recipients   The recipients to be added
   */
   _setEditorOutput(options) {
    // set message body
    this._saveEmailText();
    this._normalizeButtons();
    this._setMessage(options.text, 'text');
    // set recipient email addresses
    this._currentProvider.setRecipients({recipients: options.recipients, editElement: this._editElement});
  }

  /**
   * Replace content of editor element (_emailTextElement)
   * @param {string} msg txt or html content
   */
  _setMessage(msg, type) {
    if (this._emailTextElement.is('textarea')) {
      // decode HTML entities for type text due to previous HTML parsing
      msg = mvelo.util.decodeHTML(msg);
      this._emailTextElement.val(msg);
    } else {
      // element is contenteditable or RTE
      if (type == 'text') {
        msg = '<pre>' + msg + '<pre/>';
      }
      this._emailTextElement.html(msg);
    }
    // trigger input event
    var inputEvent = document.createEvent('HTMLEvents');
    inputEvent.initEvent('input', true, true);
    this._emailTextElement.get(0).dispatchEvent(inputEvent);
  }

  _resetEmailText() {
    if (this._emailTextElement.is('textarea')) {
      this._emailTextElement.val(this._emailUndoText);
    } else {
      this._emailTextElement.html(this._emailUndoText);
    }
    this._emailUndoText = null;
  }

  _registerEventListener() {
    // attach event handlers
    this.on('get-recipients', this._getRecipients);
    this.on('set-editor-output', this._setEditorOutput);
    this.on('destroy', this._closeFrame.bind(this, true));
    // attach port message handler
    this._port.onMessage.addListener(this.handlePortMessage.bind(this));
    this._port.onDisconnect.addListener(this._closeFrame.bind(this, false));
  }
}
