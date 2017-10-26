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
  let id;
  let name;
  let port;
  const l10n = mvelo.l10n.getMessages([
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
    id = qs.id;
    name = `pwdDialog-${id}`;
    // open port to background page
    port = mvelo.runtime.connect({name});
    port.onMessage.addListener(messageListener);
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

    mvelo.l10n.localizeHTML();
    $('#password').attr('placeholder', l10n.pwd_dialog_pwd_please);
    $('#keyId').attr('title', l10n.pwd_dialog_keyid_tooltip);

    mvelo.util.showSecurityBackground();
    port.postMessage({event: 'pwd-dialog-init', sender: name});
  }

  function onOk() {
    logUserInput('security_log_dialog_ok');
    const pwd = $('#password').val();
    const cache = $('#remember').prop('checked');
    $('body').addClass('busy'); // https://bugs.webkit.org/show_bug.cgi?id=101857
    $('#spinner').show();
    $('.modal-body').css('opacity', '0.4');
    port.postMessage({event: 'pwd-dialog-ok', sender: name, password: pwd, cache});
    $('#okBtn').prop('disabled', true);
    return false;
  }

  function onCancel() {
    logUserInput('security_log_dialog_cancel');
    port.postMessage({event: 'pwd-dialog-cancel', sender: name});
    return false;
  }

  /**
   * send log entry for the extension
   * @param {string} type
   */
  function logUserInput(type) {
    port.postMessage({
      event: 'pwd-user-input',
      sender: name,
      source: 'security_log_password_dialog',
      type
    });
  }

  function messageListener(msg) {
    //console.log('decrypt dialog messageListener: ', JSON.stringify(msg));
    switch (msg.event) {
      case 'set-init-data': {
        const data = msg.data;
        $('#keyId').text(data.keyid.toUpperCase());
        $('#userId').text(data.userid);
        $('#pwdDialogReason').text(data.reason !== '' ? l10n[data.reason.toLowerCase()] : '');
        if (data.cache) {
          $('#remember').prop('checked', true);
        }
        break;
      }
      case 'wrong-password':
        $('#okBtn').prop('disabled', false);
        $('body').removeClass('busy');
        $('#spinner').hide();
        $('.modal-body').css('opacity', '1');
        $('#password').val('').focus().closest('.control-group').addClass('error')
        .end().next().removeClass('hide');
        break;
      default:
        console.log('unknown event');
    }
  }

  $(document).ready(init);
}());
