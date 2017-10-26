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

/* eslint strict: 0 */
'use strict';

var mvelo = mvelo || null; // eslint-disable-line no-var

(function() {
  // communication to background page
  let port;
  // shares ID with DecryptFrame
  let id;
  let name;
  let watermark;
  //var spinnerTimer;
  const basePath = '../../';
  let signers = [];
  const l10n = mvelo.l10n.getMessages([
    'alert_header_error',
    'digital_signature_status_true',
    'digital_signature_status_false',
    'digital_signature_status_null',
    'decrypt_digital_signature',
    'decrypt_digital_signature_failure',
    'decrypt_digital_signature_null',
    'digital_signature_status_null_description'
  ]);

  function init() {
    //console.log('init decryptInline.js');
    if (document.body.dataset.mvelo) {
      return;
    }
    document.body.dataset.mvelo = true;
    const qs = jQuery.parseQuerystring();
    id = qs.id;
    name = `dDialog-${id}`;
    // open port to background page
    port = mvelo.runtime.connect({name});
    port.onMessage.addListener(messageListener);
    port.postMessage({event: 'decrypt-inline-init', sender: name});


    // show spinner
    mvelo.util.addLoadingAnimation();
    addDecryptBody();
    addErrorView();

    mvelo.l10n.localizeHTML();

    mvelo.appendTpl($('body'), mvelo.runtime.getURL('components/decrypt-inline/signature-modal.html'))
    .then(() => {
      mvelo.l10n.localizeHTML();
      $('#signatureModal .close, #signatureModal .modal-footer button').on('click', () => {
        logUserInput('security_log_signature_modal_close');
      });
    });

    mvelo.util.showSecurityBackground(true);
    $(window).on('resize', resizeFont);
  }

  function hideSpinner() {
    $(".m-spinner").hide();
  }

  function addDecryptBody() {
    const $flex = $('<div />', {id: 'flex-container'})
    .append(addFlexHeader())
    .append(addWrapper())
    .append(addFlexFooter());

    $('<div/>', {class: 'decryptBody'})
    .append($flex)
    .appendTo('body');
  }

  function addWrapper() {
    const $plainText = $('<div/>', {id: 'plainText'});

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
    return $('<div/>', {id: 'uploadPanel'})
    .append(addSignatureButton().addClass('pull-right'));
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
    .on("click", () => {
      port.postMessage({event: 'open-security-settings', sender: name});
    });
  }

  function addSandbox() {
    const $content = $('<div/>', {
      id: 'content',
      css: {
        padding: '6px 12px',
        overflow: 'auto'
      }
    });

    const $style = $('<link/>', {rel: 'stylesheet', href: `${basePath}dep/bootstrap/css/bootstrap.css`});
    const $meta = $('<meta/>', {charset: 'UTF-8'});

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
    const $footer = $('<div/>', {class: 'pull-right'})
    .append(addSignatureButton());

    return $('<div/>', {id: 'footer'})
    .append($footer);
  }

  function addSignatureButton() {
    return $('<button/>', {
      class: 'btn btn-digital-signature',
      'data-l10n-id': 'decrypt_digital_signature'
    })
    .hide()
    .on('click', onClickSignature);
  }

  function onClickSignature() {
    logUserInput('security_log_signature_modal_open');
    showSignatureDialog('#signatureModal');
  }

  function addErrorView() {
    const errorbox = $('<div/>', {id: 'errorbox'});
    $('<div/>', {id: 'errorwell', class: 'well span5'}).appendTo(errorbox);
    errorbox.appendTo('body');
    if ($('body').height() + 2 > mvelo.LARGE_FRAME) {
      $('#errorbox').addClass('errorbox-large');
    }
  }

  function showMessageArea() {
    //$('html, body').addClass('hide_bg');
    hideSpinner();
    $('#flex-container').addClass('fade-in');
    resizeFont();
  }

  function showErrorMsg(msg) {
    hideSpinner();
    //clearTimeout(spinnerTimer);
    $('#errorbox').show();
    $('#errorwell').showAlert(l10n.alert_header_error || 'alert_error', msg, 'danger')
    .find('.alert').prepend($('<button/>', {type: 'button', class: 'close', html: '&times;'}))
    .find('button').click(() => {
      port.postMessage({event: 'decrypt-dialog-cancel', sender: name});
    });
  }

  function resizeFont() {
    watermark.css({
      fontSize: Math.floor(Math.min(watermark.width() / 3, watermark.height()))
    });
  }

  function addAttachment(filename, content, mimeType) {
    const fileNameNoExt = mvelo.util.extractFileNameWithoutExt(filename);
    const fileExt = mvelo.util.extractFileExtension(filename);
    const extClass = mvelo.util.getExtensionClass(fileExt);

    const $extensionButton = $('<span/>', {
      "class": `label attachmentExtension ${extClass}`
    }).append(fileExt);

    let objectURL = "#";

    content = mvelo.util.str2ab(content);
    // set MIME type fix to application/octet-stream as other types can be exploited in Chrome
    mimeType = 'application/octet-stream';
    const blob = new Blob([content], {type: mimeType});
    objectURL = window.URL.createObjectURL(blob);

    const $fileName = $('<span/>', {
      "class": 'attachmentFilename'
    }).append(fileNameNoExt);

    const $fileUI = $('<a/>', {
      "download": filename,
      "href": objectURL,
      "title": filename,
      "class": 'attachmentButton'
    })
    .append($extensionButton)
    .append($fileName);

    $fileUI.on("click", () => {
      logUserInput('security_log_attachment_download');
    });

    $('#uploadPanel').append($fileUI);
  }

  /**
   * send log entry for the extension
   * @param {string} type
   */
  function logUserInput(type) {
    port.postMessage({
      event: 'decrypt-inline-user-input',
      sender: name,
      source: 'security_log_email_viewer',
      type
    });
  }

  function showSignatureDialog(modalElement) {
    $(modalElement).modal('show');
  }

  function setSignatureDialog(signer) {
    if (signer === null) {
      $('.modal-body', '#signatureModal').empty();
      return;
    }

    const $body = $('.modal-body', '#signatureModal');

    const dialog = $('<div/>');

    if (signer.valid !== null) {
      const details = signer.keyDetails;
      const fingerprint = (details.fingerprint.match(/.{1,4}/g)).join(' ');

      dialog
      .append($('<p/>').html(`<b>Name:</b> ${details.name}`))
      .append($('<p/>').html(`<b>E-Mail:</b> ${details.email}`))
      .append($('<p/>').html(`<b>Fingerprint:</b> ${fingerprint}`))
      ;
    } else {
      dialog
      .append($('<p/>').html(`<b>Key-ID:</b> ${signer.keyid.toUpperCase()}`))
      ;
    }
    $body.empty().append(dialog);

    const $heading = $('.modal-header', '#signatureModal').removeClass('bg-success bg-danger bg-warning');
    const $title = $('.modal-title', '#signatureModal').empty();

    if (signer.valid === true) {
      $heading.addClass('bg-success');
      $title.html(`<b>Status:</b> ${l10n.digital_signature_status_true}`);
    } else if (signer.valid === false) {
      $heading.addClass('bg-danger');
      $title.html(`<b>Status:</b> ${l10n.digital_signature_status_false}`);
    } else if (signer.valid === null) {
      $heading.addClass('bg-warning');
      $title.html(`<b>Status:</b> ${l10n.digital_signature_status_null}`);
      $body.prepend($('<p/>').html(l10n.digital_signature_status_null_description));
    }
  }

  function setSignatureButton(isContainer) {
    let $btn;

    if (isContainer) {
      $btn = $('#footer .btn-digital-signature');
    } else {
      $btn = $('#header .btn-digital-signature');
    }

    if (signers.length === 0) {
      setSignatureDialog(null);
      $btn.hide();
      return;
    }

    const signersTrue = signers.filter(signer => signer.valid === true);
    const signersFalse = signers.filter(signer => signer.valid === false);

    if (!signersTrue.length && !signersFalse.length) {
      $btn.html(l10n.decrypt_digital_signature_null);
      setSignatureDialog(signers[0]);
    } else if (signersFalse.length && !signersTrue.length) {
      $btn.html(l10n.decrypt_digital_signature_failure);
      setSignatureDialog(signersFalse[0]);
    } else if (signersTrue.length) {
      $btn.html(l10n.decrypt_digital_signature);
      setSignatureDialog(signersTrue[0]);
    }

    $btn.show();
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
        $('body').addClass('secureBackground');
        break;
      case 'signature-verification':
        signers = msg.signers;
        setSignatureButton(msg.isContainer);
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
