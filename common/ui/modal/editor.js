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
  var editor;
  // content of editor modified
  var isDirty = false;
  // blur warning
  var blurWarn;
  // timeoutID for period in which blur events are monitored
  var blurWarnPeriod = null;
  // timeoutID for period in which blur events are non-critical
  var blurValid = null;

  var maxFileUploadSize = 50000000;
  var currentUploadFileName;

  function init() {
    var qs = jQuery.parseQuerystring();
    parentID = qs.parent;
    editor_type = qs.editor_type;
    $('#cancelBtn').click(onCancel);
    $('#transferBtn').click(onTransfer);
    // blur warning
    blurWarn = $('#blurWarn');
    $(window).on('focus', startBlurValid);
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
      eFrame.attachTo($('#plainText'), {
        editor: editor,
        closeBtn: false,
        set_text: setPlainText
      });
    } else {
      createRichText(function(ed) {
        editor = ed;
        eFrame.attachTo($('iframe.wysihtml5-sandbox'), {
          set_text: setRichText,
          closeBtn: false
        });
      });
    }
    id = 'editor-' + eFrame.getID();
    port = mvelo.extension.connect({name: id});
    port.onMessage.addListener(messageListener);
    port.postMessage({event: 'editor-init', sender: id});
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
      sender: id
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
      sender: id,
      recipient: parentID
    });
    return true;
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

  function setRichText(text) {
    editor.data("wysihtml5").editor.setValue(text, true);
    isDirty = false;
  }

  function setPlainText(text) {
    editor.val(text);
    isDirty = false;
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

  function addPwdDialog() {
    var pwd = $('<iframe/>', {
      id: 'pwdDialog',
      src: '../modal/pwdDialog.html?id=' + eFrame.getID(),
      frameBorder: 0
    });
    $('body').find('#editorDialog').fadeOut(function() {
      //$('.m-encrypt-frame').hide();
      $('body').append(pwd);
    });
  }

  function hidePwdDialog() {
    $('body #pwdDialog').fadeOut(function() {
      $('body #pwdDialog').remove();
      $('body').find('#editorDialog').show();
      //$('.m-encrypt-frame').fadeIn();
      eFrame._setFrameDim();
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
      case 'show-pwd-dialog':
        addPwdDialog();
        break;
      case 'hide-pwd-dialog':
        hidePwdDialog();
        break;
      default:
        console.log('unknown event');
    }
  }

  $(document).ready(init);

}());
