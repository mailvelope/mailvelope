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
  let id;
  let name;
  let port;
  let l10n;

  let $keyBackupGenerator;
  let $keyBackupWaiting;
  let $secureBgndButton;
  let $createBackupCodeBtn;

  function init() {
    if (document.body.dataset.mvelo) {
      return;
    }
    document.body.dataset.mvelo = true;
    const qs = jQuery.parseQuerystring();
    id = qs.id;
    name = `keyBackupDialog-${id}`;

    port = mvelo.runtime.connect({name});
    port.onMessage.addListener(messageListener);

    const $body = $('body').empty().addClass("secureBackground");

    mvelo.appendTpl($body, mvelo.runtime.getURL('components/key-backup/keybackup.html')).then(() => {
      $keyBackupGenerator = $('#key_backup_generator');
      $keyBackupWaiting = $('#key_backup_waiting').hide();
      $secureBgndButton = $('.secureBgndSettingsBtn');
      $createBackupCodeBtn = $('#createBackupCodeBtn');

      // Get language strings from JSON
      mvelo.l10n.getMessages([
        'keybackup_setup_dialog_headline',
        'keybackup_setup_dialog_description',
        'keybackup_setup_dialog_list_1',
        'keybackup_setup_dialog_list_2',
        'keybackup_setup_dialog_button',
        'keybackup_restore_dialog_headline',
        'keybackup_restore_dialog_description',
        'keybackup_restore_dialog_list_1',
        'keybackup_restore_dialog_list_2',
        'keybackup_restore_dialog_button',
        'keybackup_failed'
      ], result => {
        l10n = result;
      });

      mvelo.l10n.localizeHTML();
      mvelo.util.showSecurityBackground(true);

      $secureBgndButton.on('click', () => {
        port.postMessage({event: 'open-security-settings', sender: name});
      });

      $createBackupCodeBtn.on('click', () => {
        logUserInput('security_log_backup_create');
        showWaitingDialog();
      });

      port.postMessage({event: 'keybackup-dialog-init', sender: name});
    });
  }

  function showWaitingDialog() {
    $keyBackupGenerator.fadeOut('fast', () => {
      $keyBackupWaiting.fadeIn('fast', () => {
        window.setTimeout(() => {
          port.postMessage({event: 'create-backup-code-window', sender: name});
        }, 3000); // 3sec
      });
    });
  }

  function showKeyBackupGenerator() {
    $keyBackupWaiting.fadeOut('fast', () => {
      $keyBackupGenerator.fadeIn('fast');
    });
  }

  function translateTexts(initialSetup) {
    if (initialSetup) {
      $('[data-l10n-id=keybackup_dialog_headline]').html(l10n.keybackup_setup_dialog_headline);
      $('[data-l10n-id=keybackup_dialog_description]').html(l10n.keybackup_setup_dialog_description);
      $('[data-l10n-id=keybackup_dialog_list_1]').html(l10n.keybackup_setup_dialog_list_1);
      $('[data-l10n-id=keybackup_dialog_list_2]').html(l10n.keybackup_setup_dialog_list_2);
      $('[data-l10n-id=keybackup_dialog_button]').html(l10n.keybackup_setup_dialog_button);
    } else {
      $('[data-l10n-id=keybackup_dialog_headline]').html(l10n.keybackup_restore_dialog_headline);
      $('[data-l10n-id=keybackup_dialog_description]').html(l10n.keybackup_restore_dialog_description);
      $('[data-l10n-id=keybackup_dialog_list_1]').html(l10n.keybackup_restore_dialog_list_1);
      $('[data-l10n-id=keybackup_dialog_list_2]').html(l10n.keybackup_restore_dialog_list_2);
      $('[data-l10n-id=keybackup_dialog_button]').html(l10n.keybackup_restore_dialog_button);
    }
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
      type
    });
  }

  function showErrorMsg(msg) {
    $('#errorMsg').html(msg).fadeIn();
  }

  /**
   * Mananaged the different post messages
   * @param {string} msg
   */
  function messageListener(msg) {
    //console.log('generator messageListener: ', JSON.stringify(msg));
    switch (msg.event) {
      case 'set-init-data': {
        const data = msg.data;
        translateTexts(data.initialSetup);
        break;
      }
      case 'error-message':
        showKeyBackupGenerator();
        if (msg.error.code !== 'PWD_DIALOG_CANCEL') {
          showErrorMsg(l10n.keybackup_failed);
        }
        break;
      default:
        console.log('unknown event');
    }
  }

  $(document).ready(init);
}());
