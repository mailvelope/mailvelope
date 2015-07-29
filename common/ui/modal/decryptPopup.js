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
    addSecuritySettingsButton();
    mvelo.l10n.localizeHTML();
    mvelo.l10n.getMessages([
      'alert_header_error'
    ], function(result) {
      l10n = result;
    });
    mvelo.util.showSecurityBackground();
  }

  function onClose() {
    $(window).off('beforeunload unload');
    port.postMessage({event: 'decrypt-dialog-cancel', sender: name});
    return false;
  }

  function addSecuritySettingsButton() {
    var securitySettingsBtn = $('<div data-l10n-title-id="security_background_button_title" class="pull-right"><span class="glyphicon lockBtnIcon"></span></div>');
    $('.modal-body .footer').append(securitySettingsBtn);
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
      id: 'attachments'
    });
    $('.modal-body .header').append(attachments);
  }

  function addSandbox() {
    sandbox = $('<iframe/>', {
      sandbox: 'allow-same-origin allow-popups',
      css: {
        position: 'absolute',
        top: "0px",
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
        bottom: '0px',
        margin: '3px',
        padding: '8px 10px',
        overflow: 'auto'
      }
    });
    var style = $('<link/>', {
      rel: 'stylesheet',
      href: '../../dep/bootstrap/css/bootstrap.css'
    });
    var meta = $('<meta/>', { charset: 'UTF-8' });
    sandbox.one('load', function() {
      sandbox.contents().find('head').append(meta)
                                     .append(style);
      sandbox.contents().find('body').append(content);
    });
    $('.modal-body .content').append(sandbox);
  }

  function addPwdDialog(id) {
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
    $('.modal-body .header').append(errorbox);
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

    var $attachments = $('#attachments');
    $attachments.append($fileUI);
  }

  function messageListener(msg) {
    // remove spinner for all events
    $('body').removeClass('spinner');
    switch (msg.event) {
      case 'decrypted-message':
        //console.log('popup decrypted message: ', msg.message);
        showMessageArea();
        // js execution is prevented by Content Security Policy directive: "script-src 'self' chrome-extension-resource:"
        msg.message = $.parseHTML(msg.message);
        sandbox.contents().find('#content').append(msg.message);
        break;
      case 'add-decrypted-attachment':
        //console.log('popup adding decrypted attachment: ', JSON.stringify(msg.message));
        showMessageArea();
        addAttachment(msg.message.filename, msg.message.content, msg.message.mimeType);
        break;
      case 'show-pwd-dialog':
        addPwdDialog(msg.id);
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
