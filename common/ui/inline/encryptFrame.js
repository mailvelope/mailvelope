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

  var encryptFrame = function() {
    this.id = ++EncryptFrame.prototype.id;
    this._editElement;
    this._eFrame;
    this._eDialog;
    this._port;
    this._isToolbar;
    this._toolbarWidth;
    this._refreshPosIntervalID;
    this._emailTextElement;
    this._emailUndoText;
    this._rte = true;
    this._rtEditor;
  }

  encryptFrame.prototype = {
  
    constructor: EncryptFrame,
    
    id: 0,
    
    attachTo: function(element, expanded, tabid) {
      this.id = tabid + '_' + this.id;
      this._init(element);
      this._renderFrame(expanded);
      this._establishConnection();
      this._registerEventListener();
      // set status to attached
      this._editElement.data(constant.FRAME_STATUS, constant.FRAME_ATTACHED);
      // store frame obj in element tag
      this._editElement.data(constant.FRAME_OBJ, this);
    },
    
    _init: function(element) {
      this._editElement = element;
      this._emailTextElement = this._editElement.is('iframe') ? this._editElement.contents().find('body') : this._editElement;
      // inject style if we have a non-body editable element inside a dynamic iframe
      if (!this._editElement.is('body') && this._editElement.closest('body').data(constant.DYN_IFRAME)) {
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
      this._eFrame = $('<div/>', {
        id: 'eFrame' + that.id,
        'class': 'm-encrypt-frame',
        html: '<a class="m-frame-close">×</a><button class="m-btn m-encrypt-button" type="button"><i class="m-icon m-icon-encrypt"></i></button>'
      });
      
      this._eFrame.insertAfter(this._editElement);
      this._toolbarWidth = this._eFrame.width();
      $(window).on('resize', this._setFrameDim.bind(this));
      // to react on position changes of edit element, e.g. click on CC or BCC in GMail
      this._refreshPosIntervalID = window.setInterval(this._setFrameDim.bind(this), 1000);
      this._eFrame.find('.m-encrypt-button').on('click', this._onEncryptButton.bind(this));
      this._eFrame.find('.m-frame-close').on('click', this._closeFrame.bind(this));
      if (!expanded) {
        this._isToolbar = true;
        this._setFrameDim();
        this._eFrame.fadeIn('slow');
      } else {
        this.showEncryptDialog();
      }
    },

    _onEncryptButton: function() {
      if (this._rte) {
        // launch rich text editor overlay
        this._showRichTextEditor();
      } else {
        if (this._eFrame.find('.m-encrypt-button > i').hasClass('m-icon-undo')) {
          this._resetEmailText();
          this._eFrame.find('.m-encrypt-button > i').removeClass('m-icon-undo');
        } else {
          this.showEncryptDialog();
        }
      }
      return false;
    },
    
    showEncryptDialog: function() {
      if (this._isToolbar === undefined || this._isToolbar) {
        this._expandFrame(this._showDialog.bind(this));
      }
      return false;
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

    _showToolbar: function() {
      this._eFrame.fadeOut((function() {
        this._eFrame.find('.m-encrypt-button').show();
        this._eFrame.removeClass('m-encrypt-frame-expanded');
        this._eFrame.removeAttr('style');
        this._isToolbar = true;
        this._setFrameDim();
        this._eFrame.fadeIn('slow');
      }).bind(this));  
      return false;
    },  
    
    _closeFrame: function(finalClose) {
      this._eFrame.fadeOut((function() {
        window.clearInterval(this._refreshPosIntervalID);
        $(window).off('resize');
        this._eFrame.remove();
        if (finalClose === true) {
          this._port.disconnect();
          this._editElement.data(constant.FRAME_STATUS, null);
        } else {
          this._editElement.data(constant.FRAME_STATUS, constant.FRAME_DETACHED);
        }
        this._editElement.data(constant.FRAME_OBJ, null);
      }).bind(this));
      return false;
    },
    
    _setFrameDim: function() {
      var editElementPos = this._editElement.position();
      var editElementWidth = this._editElement.width();
      if (this._isToolbar) {
        this._eFrame.css('top', editElementPos.top + 3);
        this._eFrame.css('left', editElementPos.left + editElementWidth - this._toolbarWidth - 20);
      } else {
        this._eFrame.css('top', editElementPos.top);
        this._eFrame.css('left', editElementPos.left);
        this._eFrame.width(editElementWidth - 15);
        this._eFrame.height(this._editElement.height());
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

    _showRichTextEditor: function() {
      var that = this;
      if (!this._rtEditor) {
        this._rtEditor = $('<iframe/>', {
          id: 'rtEditor' + that.id,
          'class': 'm-rt-editor',
          frameBorder: 0, 
          scrolling: 'no'
        });
        var path = 'common/ui/inline/dialogs/richText.html?id=' + that.id;
        var url;
        if (mvelo.crx) {
          url = mvelo.extension.getURL(path);
        } else {
          url = 'http://www.mailvelope.com/' + path;
        }
        this._rtEditor.attr('src', url);
        //this._eFrame.append(this._rtEditor);
        $(top.document.body).append(this._rtEditor);
      }
      this._rtEditor.fadeIn();
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
    
    _getEmailText: function(type) {
      var text;
      if (this._editElement.is('textarea')) {
        text = this._emailTextElement.val();
        this._emailUndoText = text;
      } else {
        text = this._emailTextElement.html();
        this._emailUndoText = text;
        if (type === 'text') {
          // replace anchors
          text = $('<div/>').html(text).find('a').replaceWith(function() {
                                                      return $(this).text() + ' (' + $(this).attr('href') + ')';
                                                  })
                                       .end()
                                       .html();
          text = text.replace(/(<br>)/g,'\n'); // replace <br> with new line
          text = text.replace(/<\/(div|p)>/g,'\n'); // replace </div> or </p> tags with new line
          text = text.replace(/<(.+?)>/g,''); // remove tags
          text = text.replace(/\n{3,}/g, '\n\n'); // compress new line
          text = $('<div/>').html(text).text(); // decode
        }
      }
      return text;
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
        this._emailTextElement.val(encryptedMsg);
      } else {
        encryptedMsg = encryptedMsg.replace(/\n/g,'<br>'); // replace new line with <br>
        this._emailTextElement.html(encryptedMsg);
      }
    },

    _resetEmailText: function() {
      if (this._emailTextElement.is('textarea')) {
        this._emailTextElement.val(this._emailUndoText);
      } else {
        this._emailTextElement.html(this._emailUndoText);
      }
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
            that._setEncryptedMessage(msg.message);
            that._removeDialog();
            that._eFrame.find('.m-encrypt-button > i').addClass('m-icon-undo');
            break;
          default:
            console.log('unknown event');
        }
      });
    }
    
  };

  encryptFrame.isAttached = function(element) {
    var status = element.data(constant.FRAME_STATUS);
    switch (status) {
      case constant.FRAME_ATTACHED:
      case constant.FRAME_DETACHED:
        return true;
        break;
      default:
        return false;
    }
  }

  return encryptFrame;

}());
