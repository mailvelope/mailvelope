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

var EncryptFrame = EncryptFrame || (function() { 

  var encryptFrame = function(prefs) {
    this.id = mvelo.getHash();
    this._editElement;
    this._eFrame;
    this._eDialog;
    this._port;
    this._isToolbar;
    this._refreshPosIntervalID;
    this._emailTextElement;
    this._emailUndoText;
    this._editorMode = prefs.security.editor_mode;
    this._editorType = prefs.general.editor_type;
    this._options = {expanded: false, closeBtn: true};
  }

  encryptFrame.prototype = {
  
    constructor: EncryptFrame,
    
    attachTo: function(element, options) {
      $.extend(this._options, options);
      this._init(element);
      this._renderFrame(this._options.expanded);
      this._establishConnection();
      this._registerEventListener();
      // set status to attached
      this._editElement.data(mvelo.FRAME_STATUS, mvelo.FRAME_ATTACHED);
      // store frame obj in element tag
      this._editElement.data(mvelo.FRAME_OBJ, this);
    },

    getID: function() {
      return this.id;
    },
    
    _init: function(element, editor) {
      this._editElement = element;
      this._emailTextElement = this._options.editor || ( this._editElement.is('iframe') ? this._editElement.contents().find('body') : this._editElement );
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
    },
    
    _renderFrame: function(expanded) {
      var that = this;
      // create frame
      var toolbar = '';
      if (this._options.closeBtn) {
        toolbar = toolbar + '<a class="m-frame-close">×</a>';
      } else {
        toolbar = toolbar + '<span class="m-frame-fill-right"></span>';
      }
      toolbar = toolbar + '\
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
    },

    _normalizeButtons: function() {
      //console.log('editor mode', this._editorMode);
      this._eFrame.find('.m-encrypt-button').hide();
      switch (this._editorMode) {
        case mvelo.EDITOR_WEBMAIL:
          this._eFrame.find('#encryptBtn').show();
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
    },

    _onEncryptButton: function() {
      this.showEncryptDialog();
      return false;
    },

    _onUndoButton: function() {
      this._resetEmailText();
      this._normalizeButtons();
      return false;
    },

    _onEditorButton: function() {
      this._showMailEditor();
      return false;
    },    
    
    showEncryptDialog: function() {
      this._expandFrame(this._showDialog.bind(this));
    },

    _expandFrame: function(callback) {
      this._eFrame.hide();
      this._eFrame.find('.m-encrypt-button').hide();
      this._eFrame.addClass('m-encrypt-frame-expanded');
      this._eFrame.css('margin', this._editElement.css('margin'));
      this._isToolbar = false;
      this._setFrameDim();
      this._eFrame.fadeIn('slow', callback);
    },  
    
    _closeFrame: function(finalClose) {
      this._eFrame.fadeOut((function() {
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
      }).bind(this));
      return false;
    },
    
    _setFrameDim: function() {
      var editElementPos = this._editElement.position();
      var editElementWidth = this._editElement.width();
      if (this._isToolbar) {
        var toolbarWidth = this._eFrame.width();
        this._eFrame.css('top', editElementPos.top + 3);
        this._eFrame.css('left', editElementPos.left + editElementWidth - toolbarWidth - 20);
      } else {
        this._eFrame.css('top', editElementPos.top + 2);
        this._eFrame.css('left', editElementPos.left + 2);
        this._eFrame.width(editElementWidth - 15);
        this._eFrame.height(this._editElement.height() - 4);
      }
    },
    
    _showDialog: function() {
      var that = this;
      this._eDialog = $('<iframe/>', {
        id: 'eDialog' + that.id,
        'class': 'm-frame-dialog',
        frameBorder: 0, 
        scrolling: 'no'
      });
      var path = 'common/ui/inline/dialogs/encryptDialog.html?id=' + that.id;
      var url;
      if (mvelo.crx) {
        url = mvelo.extension.getURL(path);
      } else {
        url = 'http://www.mailvelope.com/' + path;
      }
      this._eDialog.attr('src', url);
      this._eFrame.append(this._eDialog);
      this._setFrameDim();
      this._eDialog.fadeIn();
    },

    _showMailEditor: function() {
      this._port.postMessage({
        event: 'eframe-display-editor', 
        sender: 'eFrame-' + this.id,
        text: this._getEmailText(this._editorType == mvelo.PLAIN_TEXT ? 'text' : 'html')
      });
    },
    
    _establishConnection: function() {
      var that = this;
      this._port = mvelo.extension.connect({name: 'eFrame-' + that.id});
    },
    
    _removeDialog: function() {
      this._eDialog.fadeOut();
      // removal triggers disconnect event
      this._eDialog.remove();
      this._eDialog = null;
      this._showToolbar();
    },

    _showToolbar: function() {
      this._eFrame.fadeOut((function() {
        this._eFrame.removeClass('m-encrypt-frame-expanded');
        this._eFrame.removeAttr('style');
        this._isToolbar = true;
        this._normalizeButtons();
        this._eFrame.fadeIn('slow');
      }).bind(this));  
      return false;
    },

    _html2text: function(html) {
      html = $('<div/>').html(html); 
      // replace anchors
      html = html.find('a').replaceWith(function() {
                                          return $(this).text() + ' (' + $(this).attr('href') + ')';
                                        })
                           .end()
                           .html();
      html = html.replace(/(<br>)/g,'\n'); // replace <br> with new line
      html = html.replace(/<\/(div|p)>/g,'\n'); // replace </div> or </p> tags with new line
      html = html.replace(/<(.+?)>/g,''); // remove tags
      html = html.replace(/\n{3,}/g, '\n\n'); // compress new line
      return $('<div/>').html(html).text(); // decode
    },
    
    _getEmailText: function(type) {
      var text;
      if (this._emailTextElement.is('textarea')) {
        text = this._emailTextElement.val();
      } else {
        var html = this._emailTextElement.html();
        if (type === 'text') {
          text = this._html2text(html);
        } else {
          text = html;
        }
      }
      return text;
    },

    _saveEmailText: function() {
      if (this._emailTextElement.is('textarea')) {
        this._emailUndoText = this._emailTextElement.val();
      } else {
        this._emailUndoText = this._emailTextElement.html();
      }
    },

    _getEmailRecipient: function() {
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
    },

    _setEncryptedMessage: function(encryptedMsg) {
      if (this._emailTextElement.is('textarea')) {
        if (this._editorType == mvelo.RICH_TEXT) {
          encryptedMsg = this._html2text(encryptedMsg);
        }
        this._emailTextElement.val(encryptedMsg);
      } else {
        // element is contenteditable or RTE
        if (this._editorType == mvelo.PLAIN_TEXT) {
          encryptedMsg = encryptedMsg.replace(/\n/g,'<br>'); // replace new line with <br> 
        }
        if (this._options.set_text) {
          this._options.set_text(encryptedMsg);
        } else {
          this._emailTextElement.html(encryptedMsg);
        }
      }
    },

    _resetEmailText: function() {
      if (this._emailTextElement.is('textarea')) {
        this._emailTextElement.val(this._emailUndoText);
      } else {
        this._emailTextElement.html(this._emailUndoText);
      }
      this._emailUndoText = null;
    },
    
    _registerEventListener: function() {
      var that = this;
      this._port.onMessage.addListener(function(msg) {
        //console.log('eFrame-%s event %s received', that.id, msg.event);
        switch (msg.event) {
          case 'encrypt-dialog-cancel':
              that._removeDialog();
            break;
          case 'email-text':
              that._port.postMessage({
                event: 'eframe-email-text', 
                data: that._getEmailText(msg.type),
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
                data: that._emailTextElement.is('textarea'),
                sender: 'eFrame-' + that.id
            });
            break;
          case 'encrypted-message':
              that._saveEmailText();
              that._removeDialog();
              that._setEncryptedMessage(msg.message);
            break;
          case 'set-armored-text':
            that._saveEmailText();
            that._normalizeButtons();
            that._setEncryptedMessage(msg.text);
            break;
          default:
            console.log('unknown event');
        }
      });
    }
    
  };

  encryptFrame.isAttached = function(element) {
    var status = element.data(mvelo.FRAME_STATUS);
    switch (status) {
      case mvelo.FRAME_ATTACHED:
      case mvelo.FRAME_DETACHED:
        return true;
        break;
      default:
        return false;
    }
  }

  return encryptFrame;

}());
