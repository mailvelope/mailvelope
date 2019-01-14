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

import EventHandler from '../../lib/EventHandler.js';
import * as l10n from '../../lib/l10n.js';
import {showSecurityBackground} from '../../lib/util.js';

let port;
l10n.set([
  'pwd_dialog_pwd_please',
  'pwd_dialog_keyid_tooltip',
  'pwd_dialog_reason_decrypt',
  'pwd_dialog_reason_sign',
  'pwd_dialog_reason_editor',
  'pwd_dialog_reason_create_backup',
  'pwd_dialog_reason_create_draft'
]);

function init() {
  const qs = jQuery.parseQuerystring();
  // open port to background page
  port = EventHandler.connect(`pwdDialog-${qs.id}`);
  registerEventListeners();
  $('#okBtn').click(onOk);
  $('#cancelBtn').click(onCancel);
  $('form').on('submit', onOk);

  // Closing the dialog with the escape key
  $(document).on('keyup', e => {
    if (e.keyCode === 27) {
      onCancel();
    }
  });

  $('#password').on('input paste', () => {
    logUserInput('security_log_password_input');
  }).focus();

  $('#remember').on('click', () => {
    logUserInput('security_log_password_click');
  });

  l10n.localizeHTML();
  $('#password').attr('placeholder', l10n.map.pwd_dialog_pwd_please);
  $('#keyId').attr('title', l10n.map.pwd_dialog_keyid_tooltip);

  showSecurityBackground(port);
  port.emit('pwd-dialog-init');
}

function registerEventListeners() {
  port.on('set-init-data', setInitData);
  port.on('wrong-password', onWrongPassword);
}

function setInitData(data) {
  $('#keyId').text(data.keyId);
  $('#userId').text(data.userId);
  $('#pwdDialogReason').text(data.reason !== '' ? l10n.map[data.reason.toLowerCase()] : '');
  if (data.cache) {
    $('#remember').prop('checked', true);
  }
}

function onWrongPassword() {
  $('#okBtn').prop('disabled', false);
  $('body').removeClass('busy');
  $('#spinner').hide();
  $('.modal-body').css('opacity', '1');
  $('#password').val('').focus().closest('.control-group').addClass('error')
  .end().next().removeClass('hide');
}

function onOk() {
  logUserInput('security_log_dialog_ok');
  const pwd = $('#password').val();
  const cache = $('#remember').prop('checked');
  $('body').addClass('busy'); // https://bugs.webkit.org/show_bug.cgi?id=101857
  $('#spinner').show();
  $('.modal-body').css('opacity', '0.4');
  port.emit('pwd-dialog-ok', {password: pwd, cache});
  $('#okBtn').prop('disabled', true);
  return false;
}

function onCancel() {
  logUserInput('security_log_dialog_cancel');
  port.emit('pwd-dialog-cancel');
  return false;
}

/**
 * send log entry for the extension
 * @param {string} type
 */
function logUserInput(type) {
  port.emit('pwd-user-input', {
    source: 'security_log_password_dialog',
    type
  });
}

$(document).ready(init);
