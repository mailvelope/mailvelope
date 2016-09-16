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
  var id, name, port, l10n;

  function init() {
    var qs = jQuery.parseQuerystring();
    id = qs.id;
    name = 'pwdDialog-' + id;
    // open port to background page
    port = mvelo.extension.connect({name: name});
    port.onMessage.addListener(messageListener);
    $('#okBtn').click(onOk);
    $('#cancelBtn').click(onCancel);
    $('form').on('submit', onOk);
    $(window).on('beforeunload', onClose);

    // Closing the dialog with the escape key
    $(document).on('keyup', function(e) {
      if (e.keyCode === 27) {
        onCancel();
      }
    });

    $('#password').on('input paste', function() {
      logUserInput('security_log_password_input');
    }).focus();

    $('#remember').on('click', function() {
      logUserInput('security_log_password_click');
    });

    mvelo.l10n.localizeHTML();
    mvelo.l10n.getMessages([
      'pwd_dialog_pwd_please',
      'pwd_dialog_keyid_tooltip',
      'pwd_dialog_reason_decrypt',
      'pwd_dialog_reason_sign',
      'pwd_dialog_reason_editor',
      'pwd_dialog_reason_create_backup',
      'pwd_dialog_reason_create_draft'
    ], function(result) {
      l10n = result;
      $('#password').attr('placeholder', l10n.pwd_dialog_pwd_please);
      $('#keyId').attr('title', l10n.pwd_dialog_keyid_tooltip);
    });
    mvelo.util.showSecurityBackground();
    port.postMessage({event: 'pwd-dialog-init', sender: name});
  }

  function onOk() {
    $(window).off('beforeunload');
    logUserInput('security_log_dialog_ok');
    var pwd = $('#password').val();
    var cache = $('#remember').prop('checked');
    $('body').addClass('busy'); // https://bugs.webkit.org/show_bug.cgi?id=101857
    $('#spinner').show();
    $('.modal-body').css('opacity', '0.4');
    port.postMessage({event: 'pwd-dialog-ok', sender: name, password: pwd, cache: cache});
    $('#okBtn').prop('disabled', true);
    return false;
  }

  function onCancel() {
    $(window).off('beforeunload');
    logUserInput('security_log_dialog_cancel');
    port.postMessage({event: 'pwd-dialog-cancel', sender: name});
    return false;
  }

  function onClose() {
    port.postMessage({event: 'pwd-dialog-cancel', sender: name});
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
      type: type
    });
  }

  function messageListener(msg) {
    //console.log('decrypt dialog messageListener: ', JSON.stringify(msg));
    switch (msg.event) {
      case 'set-init-data':
        var data = msg.data;

        $('#keyId').text(data.keyid.toUpperCase());
        $('#userId').text(data.userid);
        $('#pwdDialogReason').text(data.reason !== '' ? l10n[data.reason.toLowerCase()] : '');
        if (data.cache) {
          $('#remember').prop('checked', true);
        }
        break;
      case 'wrong-password':
        $(window).on('beforeunload', onClose);
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
