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

import * as l10n from '../../lib/l10n.js';
import {showSecurityBackground, terminate, appendTpl} from '../../lib/util.js';
import EventHandler from '../../lib/EventHandler.js';

let port;

let $keyBackupGenerator;
let $keyBackupWaiting;
let $secureBgndButton;
let $createBackupCodeBtn;

l10n.set([
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
]);

function init() {
  if (document.body.dataset.mvelo) {
    return;
  }
  document.body.dataset.mvelo = true;
  const qs = jQuery.parseQuerystring();

  port = EventHandler.connect(`keyBackupDialog-${qs.id}`);
  registerEventListeners();

  const $body = $('body').empty().addClass('secureBackground');

  appendTpl($body, chrome.runtime.getURL('components/key-backup/keybackup.html')).then(() => {
    $keyBackupGenerator = $('#key_backup_generator');
    $keyBackupWaiting = $('#key_backup_waiting').hide();
    $secureBgndButton = $('.secureBgndSettingsBtn');
    $createBackupCodeBtn = $('#createBackupCodeBtn');

    l10n.localizeHTML();
    showSecurityBackground(port, true);

    $secureBgndButton.on('click', () => port.emit('open-security-settings'));

    $createBackupCodeBtn.on('click', () => {
      logUserInput('security_log_backup_create');
      showWaitingDialog();
    });

    port.emit('keybackup-dialog-init');
  });
}

function registerEventListeners() {
  port.on('set-init-data', ({data}) => translateTexts(data.initialSetup));
  port.on('error-message', onError);
  port.on('terminate', () => terminate(port));
}

function onError(msg) {
  showKeyBackupGenerator();
  if (msg.error.code !== 'PWD_DIALOG_CANCEL') {
    showErrorMsg(l10n.map.keybackup_failed);
  }
}

function showWaitingDialog() {
  $keyBackupGenerator.fadeOut('fast', () => {
    $keyBackupWaiting.fadeIn('fast', () => {
      window.setTimeout(() => {
        port.emit('create-backup-code-window');
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
    $('[data-l10n-id=keybackup_dialog_headline]').html(l10n.map.keybackup_setup_dialog_headline);
    $('[data-l10n-id=keybackup_dialog_description]').html(l10n.map.keybackup_setup_dialog_description);
    $('[data-l10n-id=keybackup_dialog_list_1]').html(l10n.map.keybackup_setup_dialog_list_1);
    $('[data-l10n-id=keybackup_dialog_list_2]').html(l10n.map.keybackup_setup_dialog_list_2);
    $('[data-l10n-id=keybackup_dialog_button]').html(l10n.map.keybackup_setup_dialog_button);
  } else {
    $('[data-l10n-id=keybackup_dialog_headline]').html(l10n.map.keybackup_restore_dialog_headline);
    $('[data-l10n-id=keybackup_dialog_description]').html(l10n.map.keybackup_restore_dialog_description);
    $('[data-l10n-id=keybackup_dialog_list_1]').html(l10n.map.keybackup_restore_dialog_list_1);
    $('[data-l10n-id=keybackup_dialog_list_2]').html(l10n.map.keybackup_restore_dialog_list_2);
    $('[data-l10n-id=keybackup_dialog_button]').html(l10n.map.keybackup_restore_dialog_button);
  }
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

function showErrorMsg(msg) {
  $('#errorMsg').html(msg).fadeIn();
}

$(document).ready(init);
