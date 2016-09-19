/**
 * Mailvelope - secure email with OpenPGP encryption for Webmail
 * Copyright (C) 2015 Mailvelope GmbH
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

  var $secureBgndButton;
  var $restoreBackupPanel;
  var $restoreBackupButton;
  var $restorePasswordButton;
  var $restorePasswordPanel;
  var $restorePasswordInput;

  function init() {
    if (document.body.dataset.mvelo) {
      return;
    }
    document.body.dataset.mvelo = true;
    var qs = jQuery.parseQuerystring();
    id = qs.id;
    name = 'restoreBackupDialog-' + id;

    port = mvelo.extension.connect({name: name});
    port.onMessage.addListener(messageListener);

    $('body').addClass("secureBackground");

    mvelo.appendTpl($('body'), mvelo.extension.getURL('components/restore-backup/restoreBackup.html')).then(function() {
      $secureBgndButton = $('.secureBgndSettingsBtn');
      $restoreBackupPanel = $('#restoreBackupPanel');
      $restoreBackupButton = $('#restoreBackupBtn');
      $restorePasswordButton = $('#restorePasswordBtn');
      $restorePasswordInput = $('#restorePasswordInput');
      $restorePasswordPanel = $('#restorePasswordPanel').hide();

      mvelo.l10n.getMessages([
        'wrong_restore_code',
        'key_recovery_failed'
      ], function(result) {
        l10n = result;
      });

      mvelo.l10n.localizeHTML();
      mvelo.util.showSecurityBackground(true);

      $secureBgndButton.on('click', function() {
        port.postMessage({event: 'open-security-settings', sender: name});
      });

      $('.flex-digit')
        .on('input paste', function() {
          logUserInput('security_log_text_input');
          var $this = $(this),
            val = $this.val(),
            maxlength = parseInt($this.attr('maxlength'));

          if (val.length === maxlength) {
            $this
              .removeClass('invalid')
              .addClass('valid');

            var $next = $this.next().next();
            if ($next) {
              $next.focus();
            }
          } else {
            $this
              .removeClass('valid')
              .addClass('invalid');
          }

          if (isCodeValid()) {
            $restoreBackupButton.removeAttr('disabled');
          } else {
            $restoreBackupButton.attr('disabled', true);
          }

          $('#errorMsg').empty().hide();
        })
        .on('blur', function() {
          if (isCodeValid()) {
            $restoreBackupButton.removeAttr('disabled');
          } else {
            $restoreBackupButton.attr('disabled', true);
          }
          $('#errorMsg').empty().hide();
        });

      $restoreBackupButton.on('click', function() {
        logUserInput('security_log_backup_restore');
        var code = '';

        $('.flex-digit').each(function(idx, ele) {
          code += $(ele).val();
        });

        $('#errorMsg').empty().hide();

        port.postMessage({
          event: 'restore-backup-code',
          sender: name,
          code: code
        });
      });

      $restorePasswordButton.on('click', function() {
        logUserInput('security_log_restore_backup_click');
        $restorePasswordInput.attr('type', 'text');

        $(this).attr('disabled', true);

        setTimeout(function() {
          $restorePasswordInput.attr('type', 'password');
          $restorePasswordButton.removeAttr('disabled');
        }, 5000);
      });

      port.postMessage({ event: 'restore-backup-dialog-init', sender: name });
    });
  }

  function isCodeValid() {
    var valid = true;
    $('.flex-digit').each(function() {
      if ($(this).val().length !== parseInt($(this).attr('maxlength'))) {
        valid = false;
      }
    });
    return valid;
  }

  function showErrorMsg(msg) {
    $('#errorMsg').html(msg).fadeIn();
  }

  function showPassword(pwd) {
    $restorePasswordInput.val(pwd);

    $restoreBackupPanel.fadeOut('fast', function() {
      $restorePasswordPanel.fadeIn('fast');
    });
  }

  /**
   * send log entry for the extension
   * @param {string} type
   */
  function logUserInput(type) {
    port.postMessage({
      event: 'key-backup-user-input',
      sender: name,
      source: 'security_log_key_backup',
      type: type
    });
  }

  /**
   * Mananaged the different post messages
   * @param {string} msg
   */
  function messageListener(msg) {
    //console.log('keyGenDialog messageListener: ', JSON.stringify(msg));
    switch (msg.event) {
      case 'error-message':
        switch (msg.error.code) {
          case 'WRONG_RESTORE_CODE':
            // the recovery code is not correct
            showErrorMsg(l10n.wrong_restore_code);
            break;
          default:
            showErrorMsg(l10n.key_recovery_failed);
        }
        break;
      case 'set-password':
        //console.log('restoreBackupDialog show-password', msg);
        showPassword(msg.password);
        break;
      default:
        console.log('unknown event');
    }
  }

  $(document).ready(init);

}());
