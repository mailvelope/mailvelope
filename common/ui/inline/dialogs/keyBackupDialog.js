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

  var $keyBackupGenerator;
  var $keyBackupWaiting;
  var $secureBgndButton;
  var $createBackupCodeBtn;
  var $body;

  function init() {
    var qs = jQuery.parseQuerystring();
    id = qs.id;
    name = 'keyBackupDialog-' + id;

    port = mvelo.extension.connect({name: name});
    port.onMessage.addListener(messageListener);

    var $body = $('body').empty().addClass("secureBackground");

    mvelo.appendTpl($body, mvelo.extension.getURL('common/ui/inline/dialogs/templates/keybackup.html')).then(function() {
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
        'keybackup_restore_dialog_button'
      ], function(result) {
        l10n = result;
      });

      mvelo.l10n.localizeHTML();
      mvelo.util.showSecurityBackground(true);

      $secureBgndButton.on('click', function() {
        port.postMessage({ event: 'open-security-settings', sender: name });
      });

      $createBackupCodeBtn.on('click', function() {
        showWaitingDialog();
      });

      port.postMessage({ event: 'keybackup-dialog-init', sender: name });
    });
  }

  function showWaitingDialog() {
    $keyBackupGenerator.fadeOut('fast', function() {
      $keyBackupWaiting.fadeIn('fast', function() {
        window.setTimeout(function() {
          port.postMessage({ event: 'create-backup-code-window', sender: name });
        }, 3000); // 3sec
      });
    });
  }

  function showKeyBackupGenerator() {
    $keyBackupWaiting.fadeOut('fast', function() {
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
   * Mananaged the different post messages
   * @param {string} msg
   */
  function messageListener(msg) {
    //console.log('generator messageListener: ', JSON.stringify(msg));
    switch (msg.event) {
      case 'set-init-data':
        var data = msg.data;
        translateTexts(data.initialSetup);
        break;
      case 'error-message':
        switch (msg.error.code) {
          case 'PWD_DIALOG_CANCEL':
            showKeyBackupGenerator();
            break;
          default:
            port.postMessage({ event: 'error-message', sender: name, error: msg.error });
        }
        break;
      default:
        console.log('unknown event');
    }
  }

  $(document).ready(init);
}());
