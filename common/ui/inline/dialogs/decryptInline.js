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
  // communication to background page
  var port;
  // shares ID with DecryptFrame
  var id;
  var name;
  var watermark;
  //var spinnerTimer;
  var commonPath;
  var l10n;

  function init() {
    //console.log('init decryptInline.js');
    var qs = jQuery.parseQuerystring();
    id = qs.id;
    name = 'dDialog-' + id;
    // open port to background page
    port = mvelo.extension.connect({name: name});
    port.onMessage.addListener(messageListener);
    port.postMessage({event: 'decrypt-inline-init', sender: name});
    if (mvelo.crx) {
      commonPath = '../../..';
    } else if (mvelo.ffa) {
      commonPath = mvelo.extension._dataPath + 'common';
    }

    // show spinner
    addSpinner();
    addDecryptBody();
    addErrorView();

    mvelo.appendTpl($('body'), mvelo.extension.getURL('common/ui/inline/dialogs/templates/signature-modal.html'))
      .then(function() {
        mvelo.l10n.getMessages([
          'alert_header_error'
        ], function(result) {
          l10n = result;
        });
        mvelo.l10n.localizeHTML();
      });

    mvelo.util.showSecurityBackground(true);
    $(window).on('resize', resizeFont);
  }

  function addSpinner() {
    var spinner = $('<div class="m-spinner"><div class="bounce1"></div><div class="bounce2"></div><div class="bounce3"></div></div>');
    spinner.appendTo('body');
  }

  function showSpinner() {
    $(".m-spinner").show();
  }

  function hideSpinner() {
    $(".m-spinner").hide();
  }

  function addDecryptBody() {
    var $flex = $('<div />', {id: 'flex-container'})
      .append(addFlexHeader())
      .append(addWrapper())
      .append(addFlexFooter());

    $('<div/>', {class: 'decryptBody'})
      .append($flex)
      .appendTo('body');
  }

  function addWrapper() {
    var $plainText = $('<div/>', {id: 'plainText'});

    watermark = $('<div/>', {id: 'watermark'});

    return $('<div/>', {id: 'wrapper'})
      .append(watermark)
      .append($plainText.append(addSandbox()));
  }

  function addFlexHeader() {
    return $('<div/>', {id: 'header'})
      .append(addButtonBar())
      .append(addAttachmentPanel());
  }

  function addAttachmentPanel() {
    return $('<div/>', {id: 'attachments'});
  }

  function addButtonBar() {
    return $('<div/>', {id: 'buttonBar'})
      .append(addSecuritySettingsButton());
  }

  function addSecuritySettingsButton() {
    return $('<button/>', {
      class: 'btn btn-link secureBgndSettingsBtn',
      'l10n-title-id': 'security_background_button_title'
    })
      .append($('<span/>', {class: 'glyphicon lockBtnIcon'}))
      .on("click", function() {
        port.postMessage({ event: 'open-security-settings', sender: name });
      });
  }

  function addSandbox() {
    var $content = $('<div/>', {
      id: 'content',
      css: {
        padding: '6px 12px',
        overflow: 'auto'
      }
    });

    var $style = $('<link/>', {rel: 'stylesheet', href: commonPath + '/dep/bootstrap/css/bootstrap.css'});
    var $meta = $('<meta/>', { charset: 'UTF-8' });

    return $('<iframe/>', {
      id: 'decryptmail',
      sandbox: 'allow-same-origin allow-popups',
      frameBorder: 0
    })
      .on('load', function() {
        $(this).contents().find('head').append($meta)
          .append($style);
        $(this).contents().find('body').append($content);
      });
  }

  function addFlexFooter() {
    var $footer = $('<div/>', {class: 'pull-right'})
      .append(addSignatureButton());

    return $('<div/>', {id: 'footer'})
      .append($footer);
  }

  function addSignatureButton () {
    return $('<button/>', {
      class: 'btn btn-digital-signature',
      'data-l10n-id': 'decrypt_digital_signature'
    }).on('click', onClickSignature);
  }

  function onClickSignature() {
    showDialog('#signatureModal');
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
    hideSpinner();
    $('#wrapper').addClass('fade-in');
    resizeFont();
  }

  function showErrorMsg(msg) {
    hideSpinner();
    //clearTimeout(spinnerTimer);
    $('#errorbox').show();
    $('#errorwell').showAlert(l10n.alert_header_error, msg, 'danger')
      .find('.alert').prepend($('<button/>', {type: 'button', class: 'close', html: '&times;'}))
      .find('button').click(function() {
        port.postMessage({event: 'decrypt-dialog-cancel', sender: name});
      });
  }

  function resizeFont() {
    watermark.css({
      fontSize: Math.floor(Math.min(watermark.width() / 3, watermark.height()))
    });
  }

  function addAttachment(filename, content, mimeType, attachmentId) {
    var fileNameNoExt = mvelo.util.extractFileNameWithoutExt(filename);
    var fileExt = mvelo.util.extractFileExtension(filename);
    var extClass = mvelo.util.getExtensionClass(fileExt);

    var $extensionButton = $('<span/>', {
      "class": 'label attachmentExtension ' + extClass
    }).append(fileExt);

    var objectURL = "#";

    content = mvelo.util.str2ab(content);
    var blob = new Blob([content], { type: mimeType });
    objectURL = window.URL.createObjectURL(blob);

    var $fileName = $('<span/>', {
      "class": 'filename'
    }).append(fileNameNoExt);

    var $fileUI = $('<a/>', {
      "download": filename,
      "href": objectURL,
      "title": filename,
      "class": 'attachmentButton'
    })
      .append($extensionButton)
      .append($fileName);

    $fileUI.on("click", function() {
      logUserInput('security_log_attachment_download');
    });

    $('#attachments').append($fileUI);
  }

  function logUserInput(type) {
    port.postMessage({
      event: 'decrypt-inline-user-input',
      sender: name,
      source: 'security_log_email_viewer',
      type: type
    });
  }

  function showDialog(parentModal) {

    var dialog = 'Hello World';

    $('.modal-body', parentModal).empty().append(dialog);
    $(parentModal).modal('show');
  }

  function messageListener(msg) {
    //console.log('decrypt dialog messageListener: ', JSON.stringify(msg));
    switch (msg.event) {
      case 'decrypted-message':
        showMessageArea();
        // js execution is prevented by Content Security Policy directive: "script-src 'self' chrome-extension-resource:"
        msg.message = $.parseHTML(msg.message);
        $('#decryptmail').contents().find('#content').append(msg.message);
        hideSpinner();
        $('body').addClass('secureBackground');
        break;
      case 'add-decrypted-attachment':
        //console.log('popup adding decrypted attachment: ', JSON.stringify(msg.message));
        showMessageArea();
        addAttachment(msg.message.filename, msg.message.content, msg.message.mimeType, msg.message.attachmentId);
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
