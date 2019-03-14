/**
 * Mailvelope - secure email with OpenPGP encryption for Webmail
 * Copyright (C) 2012-2019 Mailvelope GmbH
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

import * as l10n from '../../lib/l10n.js';
import {showSecurityBackground, encodeHTML} from '../../lib/util.js';
import EventHandler from '../../lib/EventHandler.js';

// communication to background page
let port;
// dialogs
let sandbox;
l10n.set([
  'verify_result_success',
  'verify_result_warning',
  'verify_result_error',
  'alert_header_error',
  'dialog_keyid_label'
]);

function init() {
  const qs = jQuery.parseQuerystring();
  // open port to background page
  port = EventHandler.connect(`vDialog-${qs.id}`);
  registerEventListeners();
  port.emit('verify-popup-init');
  addSandbox();
  addErrorView();
  addSecuritySettingsButton();
  $('#closeBtn').click(onCancel);
  $('#copyBtn').click(onCopy);
  $('body').addClass('spinner');
  l10n.localizeHTML();
  showSecurityBackground(port);
}

function registerEventListeners() {
  port.on('verified-message', onVerifiedMessage);
  port.on('error-message', ({error}) => showError(error));
}

function onVerifiedMessage(msg) {
  $('body').removeClass('spinner');
  const node = sandbox.contents();
  const header = node.find('header');
  msg.signers.forEach(signer => {
    signer.userId = signer.keyDetails && signer.keyDetails.userId;
    let type;
    let userId;
    const message = $('<span/>');
    const keyId = $('<span/>');
    keyId.text(`(${l10n.map.dialog_keyid_label} ${(signer.keyId || signer.fingerprint).toUpperCase()})`);
    if (signer.userId) {
      userId = $('<strong/>');
      userId.text(signer.userId);
    }
    if (signer.valid) {
      type = 'success';
      message.append(l10n.map.verify_result_success, ' ', userId, ' ', keyId);
    } else if (signer.valid === null) {
      type = 'warning';
      message.append(l10n.map.verify_result_warning, ' ', keyId);
    } else {
      type = 'danger';
      message.append(l10n.map.verify_result_error, ' ', userId, ' ', keyId);
    }
    header.showAlert('', message, type, true);
  });
  node.find('#content').append(`<pre>${encodeHTML(msg.message)}</pre>`);
}

function addSecuritySettingsButton() {
  const securitySettingsBtn = $('<button type="button" class="btn btn-link lockBtnIcon float-right mt-3 mr-1" data-l10n-title-id="security_background_button_title"></button>');
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
    href: '../../main.css'
  });
  const style3 = style.clone().attr('href', '../../components/verify-popup/verifyPopupSig.css');
  const meta = $('<meta/>', {charset: 'UTF-8'});
  const csp = $('<meta/>', {'http-equiv': 'Content-Security-Policy', content: "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:;"});
  sandbox.one('load', () => {
    sandbox.contents().find('head').append(meta)
    .append(csp)
    .append(style)
    .append(style3);
    sandbox.contents().find('body').append(content);
  });
  $('.modal-body .content').append(sandbox);
}

function addErrorView() {
  const errorbox = $('<div/>', {id: 'errorbox'});
  $('<div/>', {id: 'alert', class: 'alert alert-danger'}).appendTo(errorbox);
  $('.modal-body .content').append(errorbox);
}

function showError(msg) {
  $('body').removeClass('spinner');
  // hide sandbox
  $('.modal-body iframe').hide();
  $('#errorbox').show();
  $('#alert').html(`<strong>${l10n.map.alert_header_error}</strong> ${msg}`);
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
