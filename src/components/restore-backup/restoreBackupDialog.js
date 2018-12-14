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

/* eslint strict: 0 */
'use strict';

var mvelo = mvelo || null; // eslint-disable-line no-var

(function() {
  let port;

  let $secureBgndButton;
  let $restoreBackupPanel;
  let $restoreBackupButton;
  let $restorePasswordButton;
  let $restorePasswordPanel;
  let $restorePasswordInput;

  const l10n = mvelo.l10n.getMessages([
    'wrong_restore_code',
    'key_recovery_failed'
  ]);

  function init() {
    if (document.body.dataset.mvelo) {
      return;
    }
    document.body.dataset.mvelo = true;
    const qs = jQuery.parseQuerystring();

    port = mvelo.EventHandler.connect(`restoreBackupDialog-${qs.id}`);
    registerEventListeners();

    $('body').addClass('secureBackground');

    mvelo.appendTpl($('body'), mvelo.runtime.getURL('components/restore-backup/restoreBackup.html'))
    .then(() => {
      $secureBgndButton = $('.secureBgndSettingsBtn');
      $restoreBackupPanel = $('#restoreBackupPanel');
      $restoreBackupButton = $('#restoreBackupBtn');
      $restorePasswordButton = $('#restorePasswordBtn');
      $restorePasswordInput = $('#restorePasswordInput');
      $restorePasswordPanel = $('#restorePasswordPanel').hide();

      mvelo.l10n.localizeHTML();
      mvelo.util.showSecurityBackground(port, true);

      $secureBgndButton.on('click', () => port.emit('open-security-settings'));

      $('.flex-digit')
      .on('input paste', function() {
        logUserInput('security_log_text_input');
        const $this = $(this);
        const val = $this.val();
        const maxlength = parseInt($this.attr('maxlength'));

        if (val.length === maxlength) {
          $this
          .removeClass('invalid')
          .addClass('valid');

          const $next = $this.next().next();
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
      .on('blur', () => {
        if (isCodeValid()) {
          $restoreBackupButton.removeAttr('disabled');
        } else {
          $restoreBackupButton.attr('disabled', true);
        }
        $('#errorMsg').empty().hide();
      });

      $restoreBackupButton.on('click', () => {
        logUserInput('security_log_backup_restore');
        let code = '';

        $('.flex-digit').each((idx, ele) => {
          code += $(ele).val();
        });

        $('#errorMsg').empty().hide();

        port.emit('restore-backup-code', {code});
      });

      $restorePasswordButton.on('click', function() {
        logUserInput('security_log_restore_backup_click');
        $restorePasswordInput.attr('type', 'text');

        $(this).attr('disabled', true);

        setTimeout(() => {
          $restorePasswordInput.attr('type', 'password');
          $restorePasswordButton.removeAttr('disabled');
        }, 5000);
      });

      port.emit('restore-backup-dialog-init');
    });
  }

  function registerEventListeners() {
    port.on('error-message', onError);
    port.on('set-password', msg => showPassword(msg.password));
    port.on('terminate', () => mvelo.ui.terminate(port));
  }

  function onError(msg) {
    switch (msg.error.code) {
      case 'WRONG_RESTORE_CODE':
        // the recovery code is not correct
        showErrorMsg(l10n.wrong_restore_code);
        break;
      default:
        showErrorMsg(l10n.key_recovery_failed);
    }
  }

  function isCodeValid() {
    let valid = true;
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

    $restoreBackupPanel.fadeOut('fast', () => {
      $restorePasswordPanel.fadeIn('fast');
    });
  }

  /**
   * send log entry for the extension
   * @param {string} type
   */
  function logUserInput(type) {
    port.emit('key-backup-user-input', {
      source: 'security_log_key_backup',
      type
    });
  }

  $(document).ready(init);
}());
