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

(function() {
  // shares ID with EncryptFrame
  var id;
  // id of encrypt frame that triggered this dialog
  var parentID;
  // plain or rich text
  var editor_type;
  var eFrame;
  var port;
  // editor element
  var editor
  // content of editor modified
  var isDirty = false;
  // blur warning
  var blurWarn;

  function init() {
    var qs = jQuery.parseQuerystring();
    parentID = qs['parent'];
    editor_type = qs['editor_type'];
    $('#cancelBtn').click(onCancel);
    $('#transferBtn').click(onTransfer);
    // blur warning
    blurWarn = $('#blurWarn');
    $(window).on('blur', onBlur);
    $(window).on('focus', onFocus);
    // create encrypt frame
    eFrame = new EncryptFrame({
      security: {
        editor_mode: mvelo.EDITOR_WEBMAIL
      },
      general: {
        editor_type: editor_type
      }
    });
    if (editor_type == mvelo.PLAIN_TEXT) {
      editor = createPlainText();
      eFrame.attachTo($('#plainText'), {editor: editor});
      editor.on('change', function() {
        isDirty = true;
      });
    } else {
      editor = createRichText();
      eFrame.attachTo($('iframe.wysihtml5-sandbox'), {
        set_text: setRichText
      });
    }
    id = 'editor-' + eFrame.getID();
    port = mvelo.extension.connect({name: id});
    port.onMessage.addListener(messageListener);
    port.postMessage({event: 'editor-init', sender: id});
    // transfer warning modal
    $('#transferWarn .btn-primary').click(transfer);
  }

  function onCancel() {
    window.close();
    return false;
  }

  function onTransfer() {
    if (isDirty) {
      $('#transferWarn').modal('show');
    } else {
      transfer();
    }
  }

  function transfer() {
     //wysihtml5 <body> is automatically copied to the hidden <textarea>
    var armored = editor.val();
    if (editor_type == mvelo.RICH_TEXT) {
      armored = armored.replace(/\n/g,'');
    }
    port.postMessage({
      event: 'editor-transfer-armored', 
      data: armored,
      sender: id,
      recipient: parentID
    });
    window.close();
    return true;
  }

  function createPlainText() {
    var sandbox = $('#plainText');
    sandbox.show();
    var text = $('<textarea/>', {
      id: 'content',
      rows: 12,
      autofocus: '',
      css: {
        width: '100%',
        height: '100%',
        'margin-bottom': 0
      }
    });
    var style = $('<link/>', {
      rel: 'stylesheet',
      href: '../../dep/bootstrap/css/bootstrap.min.css'
    });
    var head = sandbox.contents().find('head');
    style.appendTo(head);
    sandbox.contents().find('body').append(text);
    text.on('blur', onBlur);
    text.on('focus', onFocus);
    return text;
  }

  function createRichText() {
    $('#rte-box').show();
    $('#richText').wysihtml5('deepExtend', {
      toolbar_element: 'rte-toolbar',
      stylesheets: ['../../dep/css/bootstrap.min.css', '../../dep/wysihtml5/css/wysiwyg-color.css'],
      color: true,
      parserRules: wysihtml5ParserRules,
      events: {
        change: function() { 
          isDirty = true;
        },
        blur: onBlur,
        focus: onFocus
      }
    });
    // required to trigger focus if user clicks in non-editable area of text editor
    $('iframe.wysihtml5-sandbox').contents().find('html').click(function() {
      $(this).find('body').focus();
    });
    return $('#richText');
  }

  function setRichText(text) {
    text = text.replace(/\n/g,'<br>');
    $('#richText').data("wysihtml5").editor.setValue(text, true);
    isDirty = false;
  }

  function onBlur() {
    console.log('blur', this);
    blurWarn.removeClass('hide')
            .stop(true)
            .animate({opacity: 1}, 'slow');
    return false;
  }

  function onFocus() {
    console.log('focus', this);
    blurWarn.stop(true)
            .animate({opacity: 0}, 'fast', 'swing', function() {
              blurWarn.addClass('hide');
            });
  }

  function messageListener(msg) {
    //console.log('decrypt dialog messageListener: ', JSON.stringify(msg));
    switch (msg.event) {
      case 'set-text':
        if (editor_type == mvelo.PLAIN_TEXT) {
          editor.val(msg.text);
        } else {
          setRichText(msg.text);
        }
        break;
      default:
        console.log('unknown event');
    }
  }

  $(document).ready(init);
  
}());