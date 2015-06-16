/**
 * Mailvelope - secure email with OpenPGP encryption for Webmail
 * Copyright (C) 2012  Thomas Oberndörfer
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

mvelo.EncryptFrame = function(prefs) {
  this.id = mvelo.util.getHash();
  this._editElement = null;
  this._eFrame = null;
  this._eDialog = null;
  this._port = null;
  this._isToolbar = false;
  this._refreshPosIntervalID = 0;
  this._emailTextElement = null;
  this._emailUndoText = null;
  this._editorMode = prefs.security.editor_mode;
  // type of external editor
  this._editorType = mvelo.PLAIN_TEXT; //prefs.general.editor_type;
  this._options = {expanded: false, closeBtn: true};
  this._keyCounter = 0;
};

mvelo.EncryptFrame.prototype.attachTo = function(element, options) {
  $.extend(this._options, options);
  this._init(element);
  this._establishConnection();
  this._renderFrame(this._options.expanded);
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
        href: mvelo.extension.getURL('common/ui/inline/framestyles.css')
      });
      // add style
      html.find('head').append(style);
      // set marker
      html.data('M-STYLE', true);
    }
  }
};

mvelo.EncryptFrame.prototype._renderFrame = function(expanded) {
  var that = this;
  // create frame
  var toolbar = '';
  if (this._options.closeBtn) {
    toolbar = toolbar + '<a class="m-frame-close">×</a>';
  } else {
    toolbar = toolbar + '<span class="m-frame-fill-right"></span>';
  }
  /* jshint multistr: true */
  toolbar = toolbar + '\
            <button id="signBtn" class="m-btn m-encrypt-button" type="button"><i class="m-icon m-icon-sign"></i></button> \
            <button id="encryptBtn" class="m-btn m-encrypt-button" type="button"><i class="m-icon m-icon-encrypt"></i></button> \
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
  this._refreshPosIntervalID = window.setInterval(this._setFrameDim.bind(this), 1000);
  this._eFrame.find('.m-frame-close').on('click', this._closeFrame.bind(this));
  this._eFrame.find('#signBtn').on('click', this._onSignButton.bind(this));
  this._eFrame.find('#encryptBtn').on('click', this._onEncryptButton.bind(this));
  this._eFrame.find('#undoBtn').on('click', this._onUndoButton.bind(this));
  this._eFrame.find('#editorBtn').on('click', this._onEditorButton.bind(this));
  if (!expanded) {
    this._isToolbar = true;
    this._normalizeButtons();
    this._eFrame.fadeIn('slow');
  } else {
    this.showEncryptDialog();
  }
  if (this._editorMode === mvelo.EDITOR_EXTERNAL) {
    this._emailTextElement.on('keypress', function() {
      if (++that._keyCounter >= 13) {
        that._emailTextElement.off('keypress');
        that._eFrame.fadeOut('slow', function() {
          that._closeFrame();
        });
      }
    });
  }
};

mvelo.EncryptFrame.prototype._normalizeButtons = function() {
  //console.log('editor mode', this._editorMode);
  this._eFrame.find('.m-encrypt-button').hide();
  switch (this._editorMode) {
    case mvelo.EDITOR_WEBMAIL:
      this._eFrame.find('#encryptBtn').show();
      this._eFrame.find('#signBtn').show();
      break;
    case mvelo.EDITOR_EXTERNAL:
      this._eFrame.find('#editorBtn').show();
      break;
    case mvelo.EDITOR_BOTH:
      this._eFrame.find('#encryptBtn').show();
      this._eFrame.find('#editorBtn').show();
      break;
    default:
      throw 'Unknown editor mode';
  }
  if (this._emailUndoText) {
    this._eFrame.find('#undoBtn').show();
  }
  this._setFrameDim();
};

mvelo.EncryptFrame.prototype._onSignButton = function() {
  this.showSignDialog();
  return false;
};

mvelo.EncryptFrame.prototype._onEncryptButton = function() {
  this.showEncryptDialog();
  return false;
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

mvelo.EncryptFrame.prototype.showSignDialog = function() {
  this._expandFrame(this._showDialog.bind(this, 'sign'));
};

mvelo.EncryptFrame.prototype.showEncryptDialog = function() {
  this._expandFrame(this._showDialog.bind(this, 'encrypt'));
};

mvelo.EncryptFrame.prototype._expandFrame = function(callback) {
  this._eFrame.hide();
  this._eFrame.find('.m-encrypt-button').hide();
  this._eFrame.addClass('m-encrypt-frame-expanded');
  this._eFrame.css('margin', this._editElement.css('margin'));
  this._isToolbar = false;
  this._setFrameDim();
  this._eFrame.fadeIn('slow', callback);
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
  if (this._isToolbar) {
    var toolbarWidth = this._eFrame.width();
    this._eFrame.css('top', editElementPos.top + 3);
    this._eFrame.css('left', editElementPos.left + editElementWidth - toolbarWidth - 20);
  } else {
    this._eFrame.css('top', editElementPos.top + 2);
    this._eFrame.css('left', editElementPos.left + 2);
    this._eFrame.width(editElementWidth - 20);
    this._eFrame.height(this._editElement.height() - 4);
  }
};

mvelo.EncryptFrame.prototype._showDialog = function(type) {
  this._eDialog = $('<iframe/>', {
    id: 'eDialog-' + this.id,
    'class': 'm-frame-dialog',
    frameBorder: 0,
    scrolling: 'no'
  });
  var url, dialog;
  if (type === 'encrypt') {
    dialog = 'encryptDialog';
  } else if (type === 'sign') {
    dialog = 'signDialog';
  }
  if (mvelo.crx) {
    url = mvelo.extension.getURL('common/ui/inline/dialogs/' + dialog + '.html?id=' + this.id);
  } else if (mvelo.ffa) {
    url = 'about:blank?mvelo=' + dialog + '&id=' + this.id;
  }
  this._eDialog.attr('src', url);
  this._eFrame.append(this._eDialog);
  this._setFrameDim();
  this._eDialog.fadeIn();
};

mvelo.EncryptFrame.prototype._showMailEditor = function() {
  this._port.postMessage({
    event: 'eframe-display-editor',
    sender: 'eFrame-' + this.id,
    text: this._getEmailText(this._editorType == mvelo.PLAIN_TEXT ? 'text' : 'html')
  });
};

mvelo.EncryptFrame.prototype._establishConnection = function() {
  this._port = mvelo.extension.connect({name: 'eFrame-' + this.id});
};

mvelo.EncryptFrame.prototype._removeDialog = function() {
  if (!this._eDialog) {
    return;
  }
  this._eDialog.fadeOut();
  // removal triggers disconnect event
  this._eDialog.remove();
  this._eDialog = null;
  this._showToolbar();
};

mvelo.EncryptFrame.prototype._showToolbar = function() {
  this._eFrame.fadeOut(function() {
    this._eFrame.removeClass('m-encrypt-frame-expanded');
    this._eFrame.removeAttr('style');
    this._isToolbar = true;
    this._normalizeButtons();
    this._eFrame.fadeIn('slow');
  }.bind(this));
  return false;
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

mvelo.EncryptFrame.prototype._getEmailRecipient = function() {
  var emails = [];
  var emailRegex = /[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}/g;
  $('span').filter(':visible').each(function() {
    var valid = $(this).text().match(emailRegex);
    if (valid !== null) {
      // second filtering: only direct text nodes of span elements
      var spanClone = $(this).clone();
      spanClone.children().remove();
      valid = spanClone.text().match(emailRegex);
      if (valid !== null) {
        emails = emails.concat(valid);
      }
    }
  });
  $('input, textarea').filter(':visible').each(function() {
    var valid = $(this).val().match(emailRegex);
    if (valid !== null) {
      emails = emails.concat(valid);
    }
  });
  //console.log('found emails', emails);
  return emails;
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
  var that = this;
  this._port.onMessage.addListener(function(msg) {
    //console.log('eFrame-%s event %s received', that.id, msg.event);
    switch (msg.event) {
      case 'encrypt-dialog-cancel':
      case 'sign-dialog-cancel':
        that._removeDialog();
        break;
      case 'email-text':
        that._port.postMessage({
          event: 'eframe-email-text',
          data: that._getEmailText(msg.type),
          action: msg.action,
          sender: 'eFrame-' + that.id
        });
        break;
      case 'destroy':
        that._closeFrame(true);
        break;
      case 'recipient-proposal':
        that._port.postMessage({
          event: 'eframe-recipient-proposal',
          data: that._getEmailRecipient(),
          sender: 'eFrame-' + that.id
        });
        that._port.postMessage({
          event: 'eframe-textarea-element',
          isTextElement: that._emailTextElement.is('textarea'),
          sender: 'eFrame-' + that.id
        });
        break;
      case 'encrypted-message':
      case 'signed-message':
        that._saveEmailText();
        that._removeDialog();
        that._setMessage(msg.message, 'text');
        break;
      case 'set-editor-output':
        that._saveEmailText();
        that._normalizeButtons();
        that._setMessage(msg.text, 'text');
        break;
      default:
        console.log('unknown event', msg);
    }
  });
  this._port.onDisconnect.addListener(function(msg) {
    that._closeFrame(false);
  });
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
