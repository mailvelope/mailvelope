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
  // dialogs
  let sandbox;
  const l10n = mvelo.l10n.getMessages([
    'verify_result_success',
    'verify_result_warning',
    'verify_result_error',
    'alert_header_error',
    'dialog_keyid_label'
  ]);

  function init() {
    const qs = jQuery.parseQuerystring();
    // open port to background page
    port = mvelo.EventHandler.connect(`vDialog-${qs.id}`);
    registerEventListeners();
    port.emit('verify-popup-init');
    addSandbox();
    addErrorView();
    addSecuritySettingsButton();
    $('#closeBtn').click(onCancel);
    $('#copyBtn').click(onCopy);
    $('body').addClass('spinner');
    mvelo.l10n.localizeHTML();
    mvelo.util.showSecurityBackground(port);
  }

  function registerEventListeners() {
    port.on('verified-message', onVerifiedMessage);
    port.on('error-message', ({error}) => showError(error));
  }

  function onVerifiedMessage(msg) {
    $('body').removeClass('spinner');
    // js execution is prevented by Content Security Policy directive: "script-src 'self' chrome-extension-resource:"
    let message = msg.message.replace(/\n/g, '<br>');
    const node = sandbox.contents();
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
    message = $.parseHTML(message);
    node.find('#content').append(message);
  }

  function addSecuritySettingsButton() {
    const securitySettingsBtn = $('<div data-l10n-title-id="security_background_button_title" class="pull-right"><span class="glyphicon lockBtnIcon"></span></div>');
    $('.modal-body .header').append(securitySettingsBtn);
  }

  function onCancel() {
    logUserInput('security_log_dialog_ok');
    port.emit('verify-dialog-cancel');
    return false;
  }

  function onCopy() {
    logUserInput('security_log_content_copy');
    // copy to clipboard
    const doc = sandbox.contents().get(0);
    const sel = doc.defaultView.getSelection();
    sel.selectAllChildren(sandbox.contents().find('#content').get(0));
    doc.execCommand('copy');
    sel.removeAllRanges();
  }

  function addSandbox() {
    sandbox = $('<iframe/>', {
      sandbox: 'allow-same-origin allow-popups',
      frameBorder: 0
    });
    const header = $('<header/>');
    const content = $('<div/>', {
      id: 'content'
    }).append(header);
    const style = $('<link/>', {
      rel: 'stylesheet',
      href: '../../dep/bootstrap/css/bootstrap.css'
    });
    const style3 = style.clone().attr('href', '../../components/verify-popup/verifyPopupSig.css');
    const meta = $('<meta/>', {charset: 'UTF-8'});
    sandbox.one('load', () => {
      sandbox.contents().find('head').append(meta)
      .append(style)
      .append(style3);
      sandbox.contents().find('body').append(content);
    });
    $('.modal-body .content').append(sandbox);
  }

  function addErrorView() {
    const errorbox = $('<div/>', {id: 'errorbox'});
    $('<div/>', {id: 'errorwell', class: 'well'}).appendTo(errorbox);
    $('.modal-body .content').append(errorbox);
  }

  function showError(msg) {
    $('body').removeClass('spinner');
    // hide sandbox
    $('.modal-body iframe').hide();
    $('#errorbox').show();
    $('#errorwell').showAlert(l10n.alert_header_error, msg, 'danger');
    $('#copyBtn').prop('disabled', true);
  }

  /**
   * send log entry for the extension
   * @param {string} type
   */
  function logUserInput(type) {
    port.emit('verify-user-input', {
      source: 'security_log_verify_dialog',
      type
    });
  }

  $(document).ready(init);
}());
