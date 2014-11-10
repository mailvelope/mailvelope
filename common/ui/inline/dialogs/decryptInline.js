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
  var watermark;
  var spinnerTimer;
  var commonPath;
  var l10n;

  function init() {
    //console.log('init decryptInline.js');
    var qs = jQuery.parseQuerystring();
    id = 'dDialog-' + qs.id;
    // open port to background page
    port = mvelo.extension.connect({name: id});
    port.onMessage.addListener(messageListener);
    port.postMessage({event: 'decrypt-inline-init', sender: id});
    if (mvelo.crx) {
      commonPath = '../../..';
    } else if (mvelo.ffa) {
      commonPath = mvelo.extension._dataPath + 'common';
    }
    setStyles();
    addWrapper();
    addAttachmentPanel();
    addSandbox();
    mvelo.extension.sendMessage({event: "get-security-token"}, function(token) {
      $('#watermark').html(mvelo.encodeHTML(token.code));
    });
    $(window).on('resize', resizeFont);
    addErrorView();
    // show spinner
    spinnerTimer = setTimeout(showSpinner, 600);
    mvelo.l10n.getMessages([
      'alert_header_error'
    ], function(result) {
      l10n = result;
    });
  }

  function showSpinner() {
    $('body').addClass('spinner');
    if ($('body').height() + 2 > mvelo.LARGE_FRAME) {
      $('body').addClass('spinner-large');
    }
  }

  function setStyles() {
    if (mvelo.ffa) {
      var style = $('<link/>', {
        rel: 'stylesheet',
        href: commonPath + '/dep/bootstrap/css/bootstrap.css'
      });
      var style2 = style.clone().attr('href', commonPath + '/ui/inline/dialogs/decryptInline.css');
      $('head').append(style)
               .append(style2);
    }
  }

  function addWrapper() {
    var wrapper = $('<div/>', {id: 'wrapper'});
    watermark = $('<div/>', {id: 'watermark'});
    watermark.appendTo(wrapper);
    wrapper.appendTo('body');
  }

  function addAttachmentPanel() {
    var attachments = $('<div/>', {
      id: 'attachments',
      css: {
        position: 'absolute',
        top: '0',
        left: 0,
        right: 0,
        bottom: '0',
        padding: '3px',
        'background-color': 'rgba(0,0,0,0)', // #D7E3FF
        overflow: 'auto'
      }
    });
    $('#wrapper').append(attachments);
  }

  function addAttachmentPanel2() {
    var attachmentPanel = $('<iframe/>', {
      id: 'attachmentarea',
      frameBorder: 0
    });
    var attachments = $('<div/>', {
      id: 'attachments',
      css: {
        position: 'absolute',
        top: '0',
        left: 0,
        right: 0,
        bottom: '0',
        padding: '3px',
        'background-color': 'rgba(0,0,0,0)', // #D7E3FF
        overflow: 'auto'
      }
    });
    var style = $('<link/>', {
      rel: 'stylesheet',
      href: commonPath + '/dep/bootstrap/css/bootstrap.css'
    });
    attachmentPanel.on('load', function() {
      $(this).contents().find('head').append(style);
      $(this).contents().find('body').append(attachments);
    });
    $('#wrapper').append(attachmentPanel);
  }

  function addSandbox() {
    var sandbox = $('<iframe/>', {
      id: 'decryptmail',
      sandbox: 'allow-same-origin',
      frameBorder: 0
    });
    var content = $('<div/>', {
      id: 'content',
      css: {
        position: 'absolute',
        top: '0',
        left: 0,
        right: 0,
        bottom: 0,
        padding: '3px',
        //'margin-top': '40px',
        'background-color': 'rgba(0,0,0,0)',
        overflow: 'auto'
      }
    });
    var style = $('<link/>', {
      rel: 'stylesheet',
      href: commonPath + '/dep/bootstrap/css/bootstrap.css'
    });
    var style2 = style.clone().attr('href', commonPath + '/dep/wysihtml5/css/wysihtml5.css');
    sandbox.on('load', function() {
      $(this).contents().find('head').append(style)
                                     .append(style2);
      $(this).contents().find('body').css('background-color', 'rgba(0,0,0,0)');
      $(this).contents().find('body').append(content);
    });
    $('#wrapper').append(sandbox);
  }

  function addErrorView() {
    var errorbox = $('<div/>', {id: 'errorbox'});
    $('<div/>', {id: 'errorwell', class: 'well span5'}).appendTo(errorbox);
    errorbox.appendTo('body');
    if ($('body').height() + 2 > mvelo.LARGE_FRAME) {
      $('#errorbox').addClass('errorbox-large');
    }
  }

  function showMessageArea() {
    $('html, body').addClass('hide_bg');
    $('#wrapper').fadeIn();
    resizeFont();
  }

  function showErrorMsg(msg) {
    $('body').removeClass('spinner');
    clearTimeout(spinnerTimer);
    $('#errorbox').show();
    $('#errorwell').showAlert(l10n.alert_header_error, msg, 'danger')
                   .find('.alert').prepend($('<button/>', {type: 'button', class: 'close', html: '&times;'}))
                   .find('button').click(function() {
                      port.postMessage({event: 'decrypt-dialog-cancel', sender: id});
                    });
  }

  function resizeFont() {
    watermark.css('font-size', Math.floor(Math.min(watermark.width() / 3, watermark.height())));
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
    var blob = new Blob([uint8Array], { type: mimeType });

    var objectURL = window.URL.createObjectURL(blob);
    var fileUI = $('<a/>', {
        "href": objectURL,
        "class": 'label label-default',
        "download": filename,
        "style": 'background-color: #ddd'
      })
        .append(extensionButton)
        .append(" "+fileNameNoExt+" ");

    //$attachments = $('#attachmentarea').contents().find('#attachments');
    $attachments = $('#attachments');
    $attachments.append(fileUI);
    $attachments.append("&nbsp;");
  }

  function messageListener(msg) {
    //console.log('decrypt dialog messageListener: ', JSON.stringify(msg));
    switch (msg.event) {
      case 'decrypted-message':
        showMessageArea();
        // js execution is prevented by Content Security Policy directive: "script-src 'self' chrome-extension-resource:"
        var message = msg.message.replace(/\n/g, '<br>');
        message = $.parseHTML(message);
        $('#decryptmail').contents().find('#content').append(message);
        break;
      case 'add-decrypted-attachment':
        //console.log('popup adding decrypted attachment: ', JSON.stringify(msg.message));
        showMessageArea();
        addAttachment(msg.message.filename, msg.message.content, msg.message.mimeType);
        break;
      case 'error-message':
        showErrorMsg(msg.error);
        break;
      default:
        console.log('unknown event');
    }
  }

  $(document).ready(init);

}());
