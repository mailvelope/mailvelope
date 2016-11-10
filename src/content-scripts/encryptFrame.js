/**
 * Mailvelope - secure email with OpenPGP encryption for Webmail
 * Copyright (C) 2012-2015 Mailvelope GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License version 3
 * as published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

'use strict';

var mvelo = mvelo || {};

mvelo.EncryptFrame = function() {
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
};

mvelo.EncryptFrame.prototype = Object.create(mvelo.EventHandler.prototype); // add new event api functions

mvelo.EncryptFrame.prototype.attachTo = function(element, options) {
  $.extend(this._options, options);
  this._init(element);
  this._establishConnection();
  this._renderFrame();
  this._registerEventListener();
  // set status to attached
  this._editElement.data(mvelo.FRAME_STATUS, mvelo.FRAME_ATTACHED);
  // store frame obj in element tag
  this._editElement.data(mvelo.FRAME_OBJ, this);
};

mvelo.EncryptFrame.prototype.getID = function() {
  return this.id;
};

mvelo.EncryptFrame.prototype._init = function(element) {
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
};

mvelo.EncryptFrame.prototype._renderFrame = function() {
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

};

mvelo.EncryptFrame.prototype._normalizeButtons = function() {
  //console.log('editor mode', this._editorMode);
  this._eFrame.find('.m-encrypt-button').hide();
  this._eFrame.find('#editorBtn').show();
  if (this._emailUndoText) {
    this._eFrame.find('#undoBtn').show();
  }
  this._setFrameDim();
};

mvelo.EncryptFrame.prototype._onUndoButton = function() {
  this._resetEmailText();
  this._normalizeButtons();
  return false;
};

mvelo.EncryptFrame.prototype._onEditorButton = function() {
  this._emailTextElement.off('keypress');
  this._showMailEditor();
  return false;
};

mvelo.EncryptFrame.prototype._closeFrame = function(finalClose) {
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
};

mvelo.EncryptFrame.prototype._setFrameDim = function() {
  var editElementPos = this._editElement.position();
  var editElementWidth = this._editElement.width();
  var toolbarWidth = this._eFrame.width();
  this._eFrame.css('top', editElementPos.top + 3);
  this._eFrame.css('left', editElementPos.left + editElementWidth - toolbarWidth - 20);
};

mvelo.EncryptFrame.prototype._showMailEditor = function() {
  this.emit('eframe-display-editor', {
    text: this._getEmailText(this._editorType == mvelo.PLAIN_TEXT ? 'text' : 'html')
  });
};

mvelo.EncryptFrame.prototype._getRecipients = function() {
  mvelo.main.currentProvider.getRecipients()
  .then(recipients => this.emit('eframe-recipients', {recipients}));
};

mvelo.EncryptFrame.prototype._establishConnection = function() {
  this._port = mvelo.extension.connect({name: 'eFrame-' + this.id});
};

mvelo.EncryptFrame.prototype._html2text = function(html) {
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
};

mvelo.EncryptFrame.prototype._getEmailText = function(type) {
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
};

/**
 * Save editor content for later undo
 */
mvelo.EncryptFrame.prototype._saveEmailText = function() {
  if (this._emailTextElement.is('textarea')) {
    this._emailUndoText = this._emailTextElement.val();
  } else {
    this._emailUndoText = this._emailTextElement.html();
  }
};

/**
 * Is called after encryption and injects ciphertext and recipient
 * email addresses into the webmail interface.
 * @param {String} options.text         The encrypted message body
 * @param {Array}  options.recipients   The recipients to be added
 */
mvelo.EncryptFrame.prototype._setEditorOutput = function(options) {
  // set message body
  this._saveEmailText();
  this._normalizeButtons();
  this._setMessage(options.text, 'text');
  // set recipient email addresses
  mvelo.main.currentProvider.setRecipients(options.recipients);
};

/**
 * Replace content of editor element (_emailTextElement)
 * @param {string} msg txt or html content
 */
mvelo.EncryptFrame.prototype._setMessage = function(msg, type) {
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
};

mvelo.EncryptFrame.prototype._resetEmailText = function() {
  if (this._emailTextElement.is('textarea')) {
    this._emailTextElement.val(this._emailUndoText);
  } else {
    this._emailTextElement.html(this._emailUndoText);
  }
  this._emailUndoText = null;
};

mvelo.EncryptFrame.prototype._registerEventListener = function() {
  // attach event handlers
  this.on('get-recipients', this._getRecipients);
  this.on('set-editor-output', this._setEditorOutput);
  this.on('destroy', this._closeFrame.bind(this, true));
  // attach port message handler
  this._port.onMessage.addListener(this.handlePortMessage.bind(this));
  this._port.onDisconnect.addListener(this._closeFrame.bind(this, false));
};

mvelo.EncryptFrame.isAttached = function(element) {
  var status = element.data(mvelo.FRAME_STATUS);
  switch (status) {
    case mvelo.FRAME_ATTACHED:
    case mvelo.FRAME_DETACHED:
      return true;
    default:
      return false;
  }
};
