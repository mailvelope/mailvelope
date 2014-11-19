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

  var maxFileUploadSize = 50000000;
  var currentUploadFileName;

  function init() {
    var qs = jQuery.parseQuerystring();
    id = qs.id;
    name = 'editor-' + id;
    // plain text only
    editor_type = mvelo.PLAIN_TEXT; //qs.editor_type;
    $('#cancelBtn').click(onCancel);
    $('#transferBtn').click(onTransfer);
    $('#signBtn').click(onSign);
    $('#encryptBtn').click(onEncrypt);
    $('#undoBtn').click(onUndo);
    $('#transferBtn').hide();
    // blur warning
    blurWarn = $('#blurWarn');
    $(window).on('focus', startBlurValid);
    if (editor_type == mvelo.PLAIN_TEXT) {
      editor = createPlainText();
    } else {
      createRichText(function(ed) {
        editor = ed;
      });
    }
    port = mvelo.extension.connect({name: name});
    port.onMessage.addListener(messageListener);
    port.postMessage({event: 'editor-init', sender: name});
    // transfer warning modal
    $('#transferWarn .btn-primary').click(transfer);
    // observe modals for blur warning
    $('.modal').on('show.bs.modal', startBlurValid);
    mvelo.l10n.localizeHTML();
    $('#transferWarn').hide();

    $('#uploadBtn').on("click", function() {
      $('#addFileInput').click();
    });

    $("#addFileInput").on("change", onAddAttachment);

  }

  var attachments = [];

  function addAttachment(filename, id, content) {
    // check if id exists
    attachments.push({"filename":filename, "id":""+id, "content":content});
    $uploadPanel = $("#uploadPanel");
    // <span class="label label-default">FileName1.txt  <span class="glyphicon glyphicon-remove"></span></span>

    var removeUploadButton = $('<span/>', {
      "data-id": id,
      "class": 'glyphicon glyphicon-remove'
    }).on("click", function() {
      removeAttachment($(this).attr("data-id"));
      $(this).parent().remove();
    });

    var fileUI = $('<span/>', {
      "class": 'label label-default'
    })
    .append(filename+" ")
    .append(removeUploadButton);

    $uploadPanel.append(fileUI);
    currentUploadFileName = undefined;
  }

  function removeAttachment(id) {
    attachments.forEach(function(element, index) {
      if(element.id === id) {
        attachments.splice( index, 1 );
      }
    });
    getAttachmentsContent();
  }

  function disableAttachmentsUI() {

  }

  function downloadAttachment(id) {

  }

  function getAttachmentsContent() {
    var result = "";
    attachments.forEach(function(element, index) {
      result += element.filename+"-----------------------\n"+element.content;
    });
    console.log("Attachment content: "+result);
    return result;
  }

  function onAddAttachment(selection) {
    //console.log("Selected File: "+$("#addFileInput").val());
    var file = selection.currentTarget.files[0];
    //console.log("Selected File: "+JSON.stringify(selection.currentTarget.files[0]));
    console.log("File Meta - Name: "+file.name+" Size: "+file.size+" Type"+file.type);
    if(file.size > maxFileUploadSize) {
      alert("Attachment size exceeds "+maxFileUploadSize+" bytes. File upload will be aborted.");
      return;
    }
    currentUploadFileName = file.name;
    var reader = new FileReader();
    reader.onload = onFileReadComplete;
    reader.readAsDataURL(file);
  }

  function onFileReadComplete(event) {
    //console.log(JSON.stringify(event.currentTarget.result));
    //editor.val(editor.val()+"\n\n"+event.currentTarget.result);
    addAttachment(currentUploadFileName,event.timeStamp,event.currentTarget.result);
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
    var sandbox = $('#plainText');
    sandbox.show();
    var text = $('<textarea/>', {
      id: 'content',
      class: 'form-control',
      rows: 12,
      autofocus: '',
      css: {
        width: '100%',
        height: '100%',
        'margin-bottom': 0,
        color: 'black'
      }
    });
    var style = $('<link/>', {
      rel: 'stylesheet',
      href: '../../dep/bootstrap/css/bootstrap.css'
    });
    var head = sandbox.contents().find('head');
    style.appendTo(head);
    sandbox.contents().find('body').append(text);
    text.on('change', onChange);
    text.on('input', startBlurWarnInterval);
    text.on('blur', onBlur);
    return text;
  }

  function createRichText(callback) {
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
      url = 'about:blank?mvelo=' + dialog + '&id=' + id;
    }
    dialog.attr('src', url);
    $('#encryptModal .modal-body').append(dialog);
    $('#encryptModal').modal('show');
  }

  function removeDialog() {
    $('#encryptModal').modal('hide');
    $('#encryptModal iframe').remove();
  }

  function messageListener(msg) {
    //console.log('editor messageListener: ', JSON.stringify(msg));
    switch (msg.event) {
      case 'set-text':
        setText(msg.text);
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
          data: editor.val(),
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
