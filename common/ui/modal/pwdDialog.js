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
  var l10n;

  function init() {
    var qs = jQuery.parseQuerystring();
    id = 'pwdDialog-' + qs.id;
    // open port to background page
    port = mvelo.extension.connect({name: id});
    port.onMessage.addListener(messageListener);
    $('#okBtn').click(onOk);
    $('#cancelBtn').click(onCancel);
    $('form').on('submit', onOk);
    $(window).on('unload', onCancel);

    // Closing the dialog with the escape key
    $(document).on('keyup', function(e) {
      if (e.keyCode === 27) {
        onCancel();
      }
    });
    $('#password').focus();
    mvelo.l10n.localizeHTML();
    mvelo.l10n.getMessages([
      'pwd_dialog_pwd_please',
      'pwd_dialog_keyid_tooltip',
      'pwd_dialog_reason_decrypt',
      'pwd_dialog_reason_sign',
      'pwd_dialog_reason_editor',
      'pwd_dialog_reason_create_backup'
    ], function(result) {
      l10n = result;
      $('#password').attr('placeholder', l10n.pwd_dialog_pwd_please);
      $('#keyId').attr('title', l10n.pwd_dialog_keyid_tooltip);
    });
    mvelo.util.showSecurityBackground();
    port.postMessage({event: 'pwd-dialog-init', sender: id});
  }

  function onOk() {
    $(window).off('beforeunload unload');
    var pwd = $('#password').val();
    var cache = $('#remember').prop('checked');
    $('body').addClass('busy'); // https://bugs.webkit.org/show_bug.cgi?id=101857
    $('#spinner').show();
    $('.modal-body').css('opacity', '0.4');
    port.postMessage({event: 'pwd-dialog-ok', sender: id, password: pwd, cache: cache});
    $('#okBtn').prop('disabled', true);
    return false;
  }

  function onCancel() {
    $(window).off('beforeunload unload');
    port.postMessage({event: 'pwd-dialog-cancel', sender: id});
    return false;
  }

  function showError(heading, message) {
    $('#pwdGroup, #rememberGroup').addClass('hide');
    $('#decryptAlert').showAlert(heading, message, 'danger');
    $('#okBtn').prop('disabled', true);
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
        $('#okBtn').prop('disabled', false);
        $('body').removeClass('busy');
        $('#spinner').hide();
        $('.modal-body').css('opacity', '1');
        $('#password').closest('.control-group').addClass('error')
                      .end().next().removeClass('hide');
        break;
      default:
        console.log('unknown event');
    }
  }

  $(document).ready(init);

}());
