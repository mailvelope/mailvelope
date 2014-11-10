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
  // communication to background page
  var port;
  // shares ID with DecryptFrame
  var id;
  // type + id
  var name;
  // dialogs
  var pwd, sandbox;
  var l10n;


  function init() {
    var qs = jQuery.parseQuerystring();
    id = qs.id;
    name = 'dDialog-' + id;
    // open port to background page
    port = mvelo.extension.connect({name: name});
    port.onMessage.addListener(messageListener);
    port.postMessage({event: 'decrypt-popup-init', sender: name});
    addAttachmentPanel();
    addSandbox();
    addErrorView();
    $(window).on('unload', onClose);
    $('#closeBtn').click(onClose);
    $('#copyBtn').click(onCopy);
    $('body').addClass('spinner');
    mvelo.l10n.localizeHTML();
    mvelo.l10n.getMessages([
      'alert_header_error'
    ], function(result) {
      l10n = result;
    });
  }

  function onClose() {
    $(window).off('unload');
    port.postMessage({event: 'decrypt-dialog-cancel', sender: name});
    return false;
  }

  function onCopy() {
    // copy to clipboard
    var doc = sandbox.contents().get(0);
    var sel = doc.defaultView.getSelection();
    sel.selectAllChildren(sandbox.contents().find('#content').get(0));
    doc.execCommand('copy');
    sel.removeAllRanges();
  }

  function addAttachmentPanel() {
    var attachments = $('<div/>', {
      id: 'attachments',
      css: {
        position: 'absolute',
        top: "20px",
        left: 0,
        right: 0,
        bottom: '0',
        margin: '3px',
        padding: '3px',
        overflow: 'auto'
      }
    });
    $('.modal-body').append(attachments);
  }

  function addSandbox() {
    sandbox = $('<iframe/>', {
      sandbox: 'allow-same-origin',
      css: {
        position: 'absolute',
        top: "50px",
        left: 0,
        right: 0,
        bottom: 0
      },
      frameBorder: 0
    });
    var content = $('<div/>', {
      id: 'content',
      css: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: '60px',
        margin: '3px',
        padding: '3px',
        overflow: 'auto'
      }
    });
    var style = $('<link/>', {
      rel: 'stylesheet',
      href: '../../dep/bootstrap/css/bootstrap.css'
    });
    var style2 = style.clone().attr('href', '../../dep/wysihtml5/css/wysihtml5.css');
    sandbox.one('load', function() {
      sandbox.contents().find('head').append(style)
                                     .append(style2);
      sandbox.contents().find('body').append(content);
    });
    $('.modal-body').append(sandbox);
  }

  function addPwdDialog() {
    pwd = $('<iframe/>', {
      id: 'pwdDialog',
      src: 'pwdDialog.html?id=' + id,
      frameBorder: 0
    });
    $('body').append(pwd);
  }

  function showMessageArea() {
    if (pwd) {
      pwd.fadeOut(function() {
        $('#decryptmail').fadeIn();
      });
    } else {
      $('#decryptmail').fadeIn();
    }
  }

  function addErrorView() {
    var errorbox = $('<div/>', {id: 'errorbox'});
    $('<div/>', {id: 'errorwell', class: 'well'}).appendTo(errorbox);
    $('.modal-body').append(errorbox);
  }

  function showError(msg) {
    showMessageArea();
    // hide sandbox
    $('.modal-body iframe').hide();
    $('#errorbox').show();
    $('#errorwell').showAlert(l10n.alert_header_error, msg, 'danger');
    $('#copyBtn').prop('disabled', true);
  }

  function addAttachment(filename, content, mimeType) {
    var fileNameNoExt = mvelo.util.extractFileNameWithoutExt(filename);
    var fileExt = mvelo.util.extractFileExtension(filename);
    var extColor = mvelo.util.getExtensionColor(fileExt);

    var extensionButton = $('<span/>', {
      "style": "text-transform: uppercase; background-color: "+extColor,
      "class": 'label'
    }).append(fileExt);

    var contentLength = Object.keys(content).length;
    var uint8Array = new Uint8Array(contentLength);
    for (var i = 0; i < contentLength; i++) {
      uint8Array[i] = content[i];
    }
    var blob = new Blob([uint8Array], { type: mimeType }); // 'application/octet-binary'
    var objectURL = window.URL.createObjectURL(blob);
    var fileUI = $('<a/>', {
      "href": objectURL,
      "class": 'label label-default',
      "download": filename,
      "style": 'background-color: #ddd'
    })
      .append(extensionButton)
      .append(" "+fileNameNoExt+" ");

    $attachments = $('#attachments');
    $attachments.append(fileUI);
    $attachments.append("&nbsp;");

    /*      .click(function() {
     var link = document.createElement("a");
     link.download = $(this).attr("download");
     link.href = $(this).attr("href");
     link.click();
     }) */
  }

  function messageListener(msg) {
    // remove spinner for all events
    $('body').removeClass('spinner');
    switch (msg.event) {
      case 'decrypted-message':
        //console.log('popup decrypted message: ', msg.message);
        showMessageArea();
        // js execution is prevented by Content Security Policy directive: "script-src 'self' chrome-extension-resource:"
        var message = msg.message.replace(/\n/g, '<br>');
        message = $.parseHTML(message);
        sandbox.contents().find('#content').append(message);
        break;
      case 'add-decrypted-attachment':
        //console.log('popup adding decrypted attachment: ', JSON.stringify(msg.message));
        showMessageArea();
        addAttachment(msg.message.filename, msg.message.content, msg.message.mimeType);
        break;
      case 'show-pwd-dialog':
        addPwdDialog();
        break;
      case 'error-message':
        showError(msg.error);
        break;
      default:
        console.log('unknown event');
    }
  }

  $(document).ready(init);

}());
