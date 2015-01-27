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

var mvelo = mvelo || null;

(function() {

  var id;
  var name;
  // plain or rich text
  var editor_type;
  var port;
  // editor element
  var editor;
  // content of editor modified
  var isDirty = false;
  // blur warning
  var blurWarn;
  // timeoutID for period in which blur events are monitored
  var blurWarnPeriod = null;
  // timeoutID for period in which blur events are non-critical
  var blurValid = null;
  var undoText = null;
  var initText = null;
  var attachments = {};
  var commonPath;

  // maximal size of the attachments in bytes, ca 50 MB
  var maxFileUploadSize = 50 * 1024 * 1024;

  function init() {
    var qs = jQuery.parseQuerystring();
    id = qs.id;
    name = 'editor-' + id;
    // plain text only
    editor_type = mvelo.PLAIN_TEXT; //qs.editor_type;
    port = mvelo.extension.connect({name: name});
    port.onMessage.addListener(messageListener);
    port.postMessage({event: 'editor-init', sender: name});
    loadTemplates(qs.embedded, function() {
      $(window).on('focus', startBlurValid);
      if (editor_type == mvelo.PLAIN_TEXT) {
        editor = createPlainText();
      } else {
        createRichText(function(ed) {
          editor = ed;
        });
      }
      // blur warning
      blurWarn = $('#blurWarn');
      // observe modals for blur warning
      $('.modal').on('show.bs.modal', startBlurValid);
      if (initText) {
        setText(initText);
        initText = null;
      }
      $("#addFileInput").on("change", onAddAttachment);
      $('#uploadBtn').hide(); // Disable Uploading Attachment
      mvelo.l10n.localizeHTML();
      mvelo.util.showSecurityBackground();
    });
    if (mvelo.crx) {
      commonPath = '../..';
    } else if (mvelo.ffa) {
      commonPath = mvelo.extension._dataPath + 'common';
    }
  }

  function loadTemplates(embedded, callback) {
    if (embedded) {
      $('body').addClass("secureBackground");
      mvelo.appendTpl($('body'), mvelo.extension.getURL('common/ui/editor/tpl/editor-body.html')).then(function() {
        $('#uploadEmbeddedBtn').on("click", function() {
          $('#addFileInput').click();
        });
      }).then(callback);
    } else {
      mvelo.appendTpl($('body'), mvelo.extension.getURL('common/ui/editor/tpl/editor-popup.html')).then(function() {
        $('#editorDialog').addClass('secureBackground');
        $('#cancelBtn').click(onCancel);
        $('#transferBtn').click(onTransfer);
        $('#signBtn').click(onSign);
        $('#encryptBtn').click(onEncrypt);
        $('#undoBtn').click(onUndo)
                     .prop('disabled', true);
        $('#transferBtn').hide();
        Promise.all([
          mvelo.appendTpl($('#editorDialog .modal-body'), mvelo.extension.getURL('common/ui/editor/tpl/editor-body.html')),
          mvelo.appendTpl($('body'), mvelo.extension.getURL('common/ui/editor/tpl/encrypt-modal.html')),
          mvelo.appendTpl($('body'), mvelo.extension.getURL('common/ui/editor/tpl/transfer-warn.html')).then(function() {
            // transfer warning modal
            $('#transferWarn .btn-primary').click(transfer);
            $('#transferWarn').hide();
            return Promise.resolve();
          })
        ]).then(function() {
          $('#uploadBtn').on("click", function() {
            $('#addFileInput').click();
          });
          $('#footer').hide();
        }).then(callback);
      });
    }
  }

  function removeAttachment(id) {
    delete attachments[id];
  }

  function addAttachment(file) {
    onChange(); // setting the message as dirty
    var fileNameNoExt = mvelo.util.extractFileNameWithoutExt(file.name);
    var fileExt = mvelo.util.extractFileExtension(file.name);
    var extClass = mvelo.util.getExtensionClass(fileExt);
    var id = Date.now();
    // TODO check if id exists

    var unint8Array;
    var fileReader = new FileReader();
    fileReader.onload = function() {
      unint8Array = new Uint8Array(this.result);
      // Add attachment
      attachments[id] = {
        "content": unint8Array,
        "filename": file.name,
        "size": file.size,
        "type": file.type
      };
    };
    fileReader.readAsArrayBuffer(file);

    var $removeUploadButton = $('<span/>', {
      "data-id": id,
      "class": 'glyphicon glyphicon-remove removeAttachment'
    }).on("click", function(e) {
      e.preventDefault();
      removeAttachment($(this).attr("data-id"));
      $(this).parent().remove();
    });

    var $extensionButton = $('<span/>', {
      "data-id": id,
      "class": 'label attachmentExtension ' + extClass
    }).append(fileExt);

    var $fileName = $('<span/>', {
      "class": 'filename'
    }).append(fileNameNoExt);

    var fileUI = $('<div/>', {
      "title": file.name,
      "class": 'attachmentButton'
    })
      .append($extensionButton)
      .append($fileName)
      .append($removeUploadButton);

    $("#uploadPanel").append(fileUI);
  }

  function onAddAttachment(selection) {
    //console.log("Selected File: "+$("#addFileInput").val());
    var file = selection.currentTarget.files[0];
    //console.log("Selected File: "+JSON.stringify(selection.currentTarget.files[0]));
    //console.log("File Meta - Name: " + file.name + " Size: " + file.size + " Type" + file.type);
    if (file.size > maxFileUploadSize) {
      alert("Attachment size exceeds " + maxFileUploadSize + " bytes. File upload will be aborted.");
      return;
    }
    addAttachment(file);
  }

  function onCancel() {
    port.postMessage({
      event: 'editor-cancel',
      sender: name
    });
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
     // wysihtml5 <body> is automatically copied to the hidden <textarea>
    var armored = editor.val();
    port.postMessage({
      event: 'editor-transfer-output',
      data: armored,
      sender: name
    });
    return true;
  }

  function onSign() {
    showDialog('signDialog');
  }

  function onEncrypt() {
    showDialog('encryptDialog');
  }

  function onUndo() {
    setText(undoText);
    undoText = null;
    $('#undoBtn').prop('disabled', true);
    $('#signBtn, #encryptBtn').show();
    $('#transferBtn').hide();
  }

  function createPlainText() {
    var sandbox = $('<iframe/>', {
      sandbox: 'allow-same-origin allow-scripts',
      frameBorder: 0,
      css: {
        'overflow-y': 'hidden',
        'opacity':    '0.8'
      }
    });
    var text = $('<textarea/>', {
      id: 'content',
      class: 'form-control',
      rows: 12,
      autofocus: '',
      css: {
        'width':        '100%',
        'height':       '100%',
        'margin-bottom': '0',
        'color':        'black',
        'resize':       'none'
      }
    });
    var style = $('<link/>', { rel: 'stylesheet', href: commonPath + '/dep/bootstrap/css/bootstrap.css' });
    var style2 = $('<link/>', { rel: 'stylesheet', href: commonPath + '/ui/mvelo.css' });
    sandbox.one('load', function() {
      sandbox.contents().find('head').append(style);
      sandbox.contents().find('head').append(style2);
      sandbox.contents().find('body').attr("style", "overflow: hidden; margin: 0").append(text);
    });
    $('#plainText').append(sandbox);
    text.on('change', onChange);
    text.on('input', startBlurWarnInterval);
    text.on('blur', onBlur);
    return text;
  }

  function createRichText(callback) {
    /*
    $('#rte-box').show();
    $('#richText').wysihtml5('deepExtend', {
      toolbar_element: 'rte-toolbar',
      stylesheets: ['../../dep/wysihtml5/css/wysiwyg-color.css'],
      color: true,
      parserRules: wysihtml5ParserRules,
      events: {
        change: onChange,
        blur: onBlur,
        load: function() {
          // if user clicks in non-editable area of text editor then next blur event is not considered as relevant
          $('iframe.wysihtml5-sandbox').contents().find('html').on('mousedown', startBlurValid);
          // each input event restarts the blur warning interval
          $('iframe.wysihtml5-sandbox').contents().find('body').on('input', startBlurWarnInterval);
          callback($('#richText'));
        }
      }
    });
    */
  }

  function setRichText(text, type) {
    if (type === 'text') {
      text = '<pre>' + text + '</pre>';
    }
    editor.data("wysihtml5").editor.setValue(text, true);
    isDirty = false;
  }

  function setPlainText(text) {
    editor.val(text);
    isDirty = false;
  }

  function setText(text, type) {
    if (editor_type == mvelo.PLAIN_TEXT) {
      setPlainText(text);
    } else {
      setRichText(text, type);
    }
  }

  function onChange() {
    // editor content modified
    isDirty = true;
  }

  function onBlur() {
    /*
    blur warning displayed if blur occurs:
    - inside blur warning period (2s after input)
    - not within 40ms after mousedown event (RTE)
    - not within 40ms before focus event (window, modal)
     */
    if (blurWarnPeriod && !blurValid) {
      setTimeout(showBlurWarning, 40);
    }
    return true;
  }

  function showBlurWarning() {
    if (!blurValid) {
      // fade in 600ms, wait 200ms, fade out 600ms
      blurWarn.removeClass('hide')
              .stop(true)
              .animate({opacity: 1}, 'slow', 'swing', function() {
                setTimeout(function() {
                  blurWarn.animate({opacity: 0}, 'slow', 'swing', function() {
                    blurWarn.addClass('hide');
                  });
                }, 200);
              });
    }
  }

  function startBlurWarnInterval() {
    if (blurWarnPeriod) {
      // clear timeout
      window.clearTimeout(blurWarnPeriod);
    }
    // restart
    blurWarnPeriod = window.setTimeout(function() {
      // end
      blurWarnPeriod = null;
    }, 2000);
    return true;
  }

  function startBlurValid() {
    if (blurValid) {
      // clear timeout
      window.clearTimeout(blurValid);
    }
    // restart
    blurValid = window.setTimeout(function() {
      // end
      blurValid = null;
    }, 40);
    return true;
  }

  function addPwdDialog(id) {
    var pwd = $('<iframe/>', {
      id: 'pwdDialog',
      src: '../modal/pwdDialog.html?id=' + id,
      frameBorder: 0
    });
    $('body').find('#editorDialog').fadeOut(function() {
      $('body').append(pwd);
    });
  }

  function hidePwdDialog() {
    $('body #pwdDialog').fadeOut(function() {
      $('body #pwdDialog').remove();
      $('body').find('#editorDialog').show();
    });
  }

  function showDialog(type) {
    var dialog = $('<iframe/>', {
      'class': 'm-dialog',
      frameBorder: 0,
      scrolling: 'no'
    });
    var url;
    if (mvelo.crx) {
      url = mvelo.extension.getURL('common/ui/inline/dialogs/' + type + '.html?id=' + id);
    } else if (mvelo.ffa) {
      url = 'about:blank?mvelo=' + type + '&id=' + id;
    }
    dialog.attr('src', url);
    $('#encryptModal .modal-body').append(dialog);
    $('#encryptModal').modal('show');
  }

  function removeDialog() {
    $('#encryptModal').modal('hide');
    $('#encryptModal iframe').remove();
  }

  function composedMessage() {
    //var t0 = Date.now();
    var mainMessage = new window.mailbuild("multipart/mixed");
    var composedMessage;
    var hasAttachment;
    var message = editor.val();
    if (message !== undefined) {
      var textMime = new window.mailbuild("text/plain")
        .setHeader("Content-Type", "text/plain; charset=utf-8")
        .addHeader("Content-Transfer-Encoding", "quoted-printable")
        .setContent(message);
      mainMessage.appendChild(textMime);
    }
    if (attachments !== undefined && Object.keys(attachments).length > 0) {
      var contentLength;
      var uint8Array;
      hasAttachment = true;
      for (var attachment in attachments) {
        contentLength = Object.keys(attachments[attachment].content).length;
        uint8Array = new Uint8Array(contentLength);
        for (var i = 0; i < contentLength; i++) {
          uint8Array[i] = attachments[attachment].content[i];
        }
        var attachmentMime = new window.mailbuild("text/plain")
          .createChild(false, {filename: attachments[attachment].filename})
          //.setHeader("Content-Type", msg.attachments[attachment].type+"; charset=utf-8")
          .addHeader("Content-Transfer-Encoding", "base64")
          .addHeader("Content-Disposition", "attachment") // ; filename="+msg.attachments[attachment].filename
          .setContent(uint8Array);
        mainMessage.appendChild(attachmentMime);
      }
    }
    if (hasAttachment) {
      composedMessage = mainMessage.build();
    } else {
      composedMessage = message;
    }
    //var t1 = Date.now();
    //console.log("Building mime message took " + (t1 - t0) + " milliseconds. Current time: "+t1);
    return composedMessage;
  }

  function messageListener(msg) {
    //console.log('editor messageListener: ', JSON.stringify(msg));
    switch (msg.event) {
      case 'set-text':
        if (editor) {
          setText(msg.text);
        } else {
          initText = msg.text;
        }
        break;
      case 'show-pwd-dialog':
        removeDialog();
        addPwdDialog(msg.id);
        break;
      case 'hide-pwd-dialog':
        hidePwdDialog();
        break;
      case 'encrypt-dialog-cancel':
      case 'sign-dialog-cancel':
        removeDialog();
        break;
      case 'get-plaintext':
        port.postMessage({
          event: 'editor-plaintext',
          sender: name,
          data: composedMessage(),
          action: msg.action
        });
        break;
      case 'encrypted-message':
      case 'signed-message':
        undoText = editor.val();
        $('#undoBtn').prop('disabled', false);
        removeDialog();
        setText(msg.message, 'text');
        if (msg.event == 'signed-message') {
          hidePwdDialog();
        }
        $('#signBtn, #encryptBtn').hide();
        $('#transferBtn').show();
        break;
      default:
        console.log('unknown event');
    }
  }

  $(document).ready(init);

}());
