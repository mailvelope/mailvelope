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
  let watermark;
  let spinnerTimer;
  const basePath = '../../';
  const l10n = mvelo.l10n.getMessages([
    'verify_result_success',
    'verify_result_warning',
    'verify_result_error',
    'alert_header_error',
    'dialog_keyid_label'
  ]);

  function init() {
    //console.log('init decryptInline.js');
    if (document.body.dataset.mvelo) {
      return;
    }
    document.body.dataset.mvelo = true;
    const qs = jQuery.parseQuerystring();
    port = mvelo.EventHandler.connect(`vDialog-${qs.id}`);
    registerEventListeners();
    port.emit('verify-inline-init');
    addWrapper();
    addSandbox();
    addSecuritySettingsButton();
    $(window).on('resize', resizeFont);
    addErrorView();
    // show spinner
    spinnerTimer = window.setTimeout(() => {
      showSpinner();
    }, 600);
    mvelo.l10n.localizeHTML();
    mvelo.util.showSecurityBackground(port);
  }

  function registerEventListeners() {
    port.on('verified-message', onVerifiedMessage);
    port.on('error-message', ({error}) => showErrorMsg(error));
    port.on('terminate', () => mvelo.ui.terminate(port));
  }

  function onVerifiedMessage(msg) {
    showMessageArea();
    const node = $('#verifymail').contents();
    const header = node.find('header');
    msg.signers.forEach(signer => {
      let type;
      let userid;
      const message = $('<span/>');
      const keyid = $('<span/>');
      keyid.text(`(${l10n.dialog_keyid_label} ${signer.keyid.toUpperCase()})`);
      if (signer.userid) {
        userid = $('<strong/>');
        userid.text(signer.userid);
      }
      if (signer.userid && signer.valid) {
        type = 'success';
        message.append(l10n.verify_result_success, ' ', userid, ' ', keyid);
      } else if (!signer.userid) {
        type = 'warning';
        message.append(l10n.verify_result_warning, ' ', keyid);
      } else {
        type = 'danger';
        message.append(l10n.verify_result_error, ' ', userid, ' ', keyid);
      }
      header.showAlert('', message, type, true);
    });
    node.find('#content').append(`<pre>${mvelo.util.encodeHTML(msg.message)}</pre>`);
    clearSpinner();
  }

  function clearSpinner() {
    clearTimeout(spinnerTimer);
    $('body').removeClass('spinner spinner-large');
  }

  function showSpinner() {
    $('body').addClass('spinner');
    if ($('body').height() + 2 > mvelo.LARGE_FRAME) {
      $('body').addClass('spinner-large');
    }
  }

  function addWrapper() {
    const wrapper = $('<div/>', {id: 'wrapper'});
    watermark = $('<div/>', {id: 'watermark'});
    watermark.appendTo(wrapper);
    wrapper.appendTo('body');
  }

  function addSandbox() {
    const sandbox = $('<iframe/>', {
      id: 'verifymail',
      sandbox: 'allow-same-origin allow-popups',
      frameBorder: 0
    });
    const header = $('<header/>');
    const content = $('<div/>', {
      id: 'content'
    }).append(header);
    const style = $('<link/>', {
      rel: 'stylesheet',
      href: `${basePath}dep/bootstrap/css/bootstrap.css`
    });
    const style2 = style.clone().attr('href', `${basePath}components/verify-inline/verifyInlineSig.css`);
    const meta = $('<meta/>', {charset: 'UTF-8'});
    const csp = $('<meta/>', {'http-equiv': 'Content-Security-Policy', content: "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:;"});
    sandbox.one('load', function() {
      $(this).contents().find('head').append(meta)
      .append(csp)
      .append(style)
      .append(style2);
      $(this).contents().find('body').css('background-color', 'rgba(0,0,0,0)');
      $(this).contents().find('body').append(content);
    });
    $('#wrapper').append(sandbox);
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
    $('html, body').addClass('hide_bg');
    $('body').addClass('secureBackground');
    $('#wrapper').fadeIn();
    resizeFont();
  }

  function addSecuritySettingsButton() {
    const securitySettingsBtn = $('<div data-l10n-title-id="security_background_button_title" style="margin-top: 12px; margin-right: 6px;" class="pull-right"><span class="glyphicon lockBtnIcon"></span></div>');
    $('body').append(securitySettingsBtn);
  }

  function showErrorMsg(msg) {
    $('body').removeClass('spinner');
    clearTimeout(spinnerTimer);
    $('#errorbox').show();
    $('#errorwell').showAlert(l10n.alert_header_error, msg, 'danger')
    .find('.alert').prepend($('<button/>', {type: 'button', class: 'close', html: '&times;'}))
    .find('button').click(() => {
      port.emit('verify-dialog-cancel');
    });
    clearSpinner();
  }

  function resizeFont() {
    watermark.css('font-size', Math.floor(Math.min(watermark.width() / 3, watermark.height())));
  }

  $(document).ready(init);
}());
