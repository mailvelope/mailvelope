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
  var l10n;
  var logTextareaInput = true;

  // Get language strings from JSON
  mvelo.l10n.getMessages([
    'editor_remove_upload',
    'waiting_dialog_decryption_failed',
    'upload_quota_exceeded_warning',
    'editor_sign_caption_short',
    'editor_sign_caption_long',
    'editor_no_sign_caption_short',
    'editor_no_sign_caption_long',
    'editor_error_header',
    'editor_error_content',
    'waiting_dialog_prepare_email',
    'upload_quota_warning_headline'
  ], function(result) {
    l10n = result;
  });

  var maxFileUploadSize = 25 * 1024 * 1024;
  var maxFileUploadSizeChrome = 20 * 1024 * 1024; // temporal fix due issue in Chrome

  function init() {
    var qs = jQuery.parseQuerystring();
    id = qs.id;
    name = 'editor-' + id;
    if (qs.quota && (parseInt(qs.quota) * 1024) < maxFileUploadSize) {
      maxFileUploadSize = parseInt(qs.quota) * 1024;
    }
    if (mvelo.crx && maxFileUploadSize > maxFileUploadSizeChrome) {
      maxFileUploadSize = maxFileUploadSizeChrome;
    }
    // plain text only
    editor_type = mvelo.PLAIN_TEXT; //qs.editor_type;
    port = mvelo.extension.connect({name: name});
    port.onMessage.addListener(messageListener);
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
      mvelo.util.showSecurityBackground(qs.embedded);

      if (qs.embedded) {
        $(".secureBgndSettingsBtn").on("click", function() {
          port.postMessage({ event: 'open-security-settings', sender: name });
        });
      }

      port.postMessage({event: 'editor-init', sender: name});
    });
    if (mvelo.crx) {
      commonPath = '../..';
    } else if (mvelo.ffa) {
      commonPath = mvelo.extension._dataPath + 'common';
    }
  }

  function loadTemplates(embedded, callback) {
    var $body = $('body');
    if (embedded) {
      $body.addClass("secureBackground");

      Promise.all([
        mvelo.appendTpl($body, mvelo.extension.getURL('common/ui/editor/tpl/editor-body.html')),
        mvelo.appendTpl($body, mvelo.extension.getURL('common/ui/editor/tpl/waiting-modal.html')),
        mvelo.appendTpl($body, mvelo.extension.getURL('common/ui/editor/tpl/error-modal.html'))
      ]).then(function() {
        $('#waitingModal').on('hidden.bs.modal', function(e) {
          editor.focus()
                .prop('selectionStart', 0)
                .prop('selectionEnd', 0);
        });

        $('#uploadEmbeddedBtn').on("click", function() {
          $('#addFileInput').click();
          logUserInput('security_log_add_attachment');
        });
      })
      .then(callback);

    } else {
      mvelo.appendTpl($body, mvelo.extension.getURL('common/ui/editor/tpl/editor-popup.html')).then(function() {
        $('.modal-body').addClass('secureBackground');
        $('#cancelBtn').click(onCancel);
        $('#transferBtn').hide().click(onTransfer);
        $('#signBtn').click(onSign);
        $('#encryptBtn').click(onEncrypt);
        $('#undoBtn').click(onUndo)
                     .prop('disabled', true);

        Promise.all([
          mvelo.appendTpl($('#editorDialog .modal-body'), mvelo.extension.getURL('common/ui/editor/tpl/editor-body.html')),
          mvelo.appendTpl($body, mvelo.extension.getURL('common/ui/editor/tpl/encrypt-modal.html')),
          mvelo.appendTpl($body, mvelo.extension.getURL('common/ui/editor/tpl/error-modal.html')),
          mvelo.appendTpl($body, mvelo.extension.getURL('common/ui/editor/tpl/transfer-warn.html')).then(function() {
            // transfer warning modal
            $('#transferWarn .btn-primary').click(transfer);
            $('#transferWarn').hide();
            return Promise.resolve();
          })
        ]).then(function() {
          $('#uploadBtn').on("click", function() {
            $('#addFileInput').click();
            logUserInput('security_log_add_attachment');
          });
          $('#uploadEmbeddedBtn, #addFileInput').hide();
        }).then(callback);
      });
    }
  }

  function logUserInput(type) {
    port.postMessage({
      event: 'editor-user-input',
      sender: name,
      source: 'security_log_editor',
      type: type
    });
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
    var fileReader = new FileReader();
    fileReader.onload = function() {
      // Add attachment
      attachments[id] = {
        filename: file.name,
        content: this.result,
        size: file.size,
        type: file.type
      };
    };
    fileReader.readAsDataURL(file);
    var $removeUploadButton = $('<span/>', {
      "data-id": id,
      "title": l10n.editor_remove_upload,
      "class": 'glyphicon glyphicon-remove removeAttachment'
    }).on("click", function(e) {
      e.preventDefault();
      removeAttachment($(this).attr("data-id"));
      $(this).parent().remove();
      logUserInput('security_log_remove_attachment');
    });

    var $extensionButton = $('<span/>', {
      "data-id": id,
      "class": 'attachmentExtension ' + extClass
    }).append(fileExt);

    var $fileName = $('<span/>', {
      "class": 'attachmentFilename'
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
    var files = selection.currentTarget.files;
    var numFiles = selection.currentTarget.files.length;
    //console.log("Selected File: "+JSON.stringify(selection.currentTarget.files[0]));
    //console.log("File Meta - Name: " + file.name + " Size: " + file.size + " Type" + file.type);
    var i;
    var fileSizeAll = 0;
    for (i = 0; i < numFiles; i++) {
      fileSizeAll = fileSizeAll + parseInt(files[i].size);
    }
    var currentAttachmentsSize = 0;
    for (var property in attachments) {
      if (attachments.hasOwnProperty(property)) {
        currentAttachmentsSize = currentAttachmentsSize + attachments[property].size;
      }
    }
    currentAttachmentsSize = currentAttachmentsSize + fileSizeAll;
    if (currentAttachmentsSize > maxFileUploadSize) {
      var error = {
        title: l10n.upload_quota_warning_headline,
        message: l10n.upload_quota_exceeded_warning + " " + Math.floor(maxFileUploadSize / (1024 * 1024)) + "MB."
      };

      showErrorModal(error);
      return;
    }
    for (i = 0; i < numFiles; i++) {
      addAttachment(files[i]);
    }
    logUserInput('security_log_attachment_added');
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
        'overflow-y': 'hidden'
      }
    });
    var text = $('<textarea/>', {
      id: 'content',
      class: 'form-control',
      rows: 12,
      css: {
        'width':         '100%',
        'height':        '100%',
        'margin-bottom': '0',
        'color':         'black',
        'resize':        'none'
      }
    });
    var style = $('<link/>', { rel: 'stylesheet', href: commonPath + '/dep/bootstrap/css/bootstrap.css' });
    var style2 = $('<link/>', { rel: 'stylesheet', href: commonPath + '/ui/mvelo.css' });
    var meta = $('<meta/>', { charset: 'UTF-8' });
    sandbox.one('load', function() {
      sandbox.contents().find('head').append(meta)
                                     .append(style)
                                     .append(style2);
      sandbox.contents().find('body').attr("style", "overflow: hidden; margin: 0")
                                     .append(text);
    });
    $('#plainText').append(sandbox);
    text.on('change', onChange);
    text.on('input', function() {
      startBlurWarnInterval();
      if (logTextareaInput) {
        logUserInput('security_log_textarea_input');
        // limit textarea log to 1 event per second
        logTextareaInput = false;
        window.setTimeout(function() {
          logTextareaInput = true;
        }, 1000);
      }
    });
    text.on('blur', onBlur);
    text.on('mouseup', function() {
      var textElement = text.get(0);
      if (textElement.selectionStart === textElement.selectionEnd) {
        logUserInput('security_log_textarea_click');
      } else {
        logUserInput('security_log_textarea_select');
      }
    });
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
    editor.focus()
          .val(text)
          .prop('selectionStart', 0)
          .prop('selectionEnd', 0);
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

    $('.modal-body', $('#encryptModal')).empty().append(dialog);
    $('#encryptModal').modal('show');
  }

  function removeDialog() {
    $('#encryptModal').modal('hide');
    $('#encryptModal iframe').remove();
  }

  /**
   * @param {Object} error
   * @param {String} [error.title]
   * @param {String} error.message
   * @param {String} [error.class]
   */
  function showErrorModal(error) {
    var title = error.title || l10n.editor_error_header;
    var content = error.message;
    var $errorModal = $('#errorModal');

    if (error.class && typeof error.class == 'string') {
      content = $('<div/>').addClass(error.class).html(content);
    }

    $('.modal-body', $errorModal).empty().append(content);
    $('.modal-title', $errorModal).empty().append(title);
    $errorModal.modal('show').on('hidden.bs.modal', function() {
      $('#waitingModal').modal('hide');
    });
  }

  function removeErrorModal() {
    $('#errorModal').modal('hide');
  }

  function setSignMode(signMsg, primaryKey) {
    var short, long;

    if (signMsg === false) {
      $('#editor_digital_signature').hide();
      return;
    }

    if (primaryKey) {
      short = l10n.editor_sign_caption_short;
      long = l10n.editor_sign_caption_long;
    } else {
      short = l10n.editor_no_primary_key_caption_short;
      long = l10n.editor_no_primary_key_caption_long;
    }
    $('#editor_digital_signature')
      .html(short)
      .attr('title', long)
      .tooltip();
  }

  function onSetText(text) {
    $('#waitingModal').modal("hide");

    if (editor) {
      setText(text);
    } else {
      initText = text;
    }
  }

  function messageListener(msg) {
    //console.log('editor messageListener: ', JSON.stringify(msg));
    switch (msg.event) {
      case 'set-text':
        onSetText(msg.text);
        break;
      case 'set-init-data':
        var data = msg.data;
        onSetText(data.text);
        setSignMode(data.signMsg || false, data.primary);
        break;
      case 'decrypt-in-progress':
      case 'encrypt-in-progress':
        $('#waitingModal').modal({keyboard: false}).modal('show');
        break;
      case 'decrypt-end':
      case 'encrypt-end':
      case 'encrypt-failed':
        $('#waitingModal').modal('hide');
        break;
      case 'decrypt-failed':
        var error = {
          title: l10n.waiting_dialog_decryption_failed,
          message: (msg.error) ? msg.error.message : l10n.waiting_dialog_decryption_failed,
          class: 'alert alert-danger'
        };
        showErrorModal(error);
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
          message: editor.val(),
          attachments: attachments,
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
      case 'error-message':
        if (msg.error.message === 'pwd-dialog-cancel') {
          break;
        }
        showErrorModal(msg.error);
        break;
      default:
        console.log('unknown event');
    }
  }

  $(document).ready(init);

}());
