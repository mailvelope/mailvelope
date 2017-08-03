/**
 * Copyright (C) 2015-2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

'use strict';


import mvelo from 'lib-mvelo';

const l10n = mvelo.l10n.get;

const log = [];
let logTimer = 0;

/**
 * @param {String} source = 'security_log_editor' <br>
 *                 source = 'security_log_key_generator' <br>
 *                 source = 'security_log_key_backup' <br>
 *                 source = 'security_log_email_viewer' <br>
 *                 source = 'security_log_password_dialog' <br>
 *                 source = 'security_log_import_dialog' <br>
 *                 source = 'security_log_verify_dialog' <br>
 *                 source = 'security_log_sign_dialog' <br>
 *                 source = 'security_log_encrypt_dialog' <br>
 * @param {String} type = 'security_log_textarea_input' <br>
 *                 type = 'security_log_textarea_select' <br>
 *                 type = 'security_log_textarea_click' <br>
 *                 type = 'security_log_text_input' <br>
 *                 type = 'security_log_password_input' <br>
 *                 type = 'security_log_restore_backup_click' <br>
 *                 type = 'security_log_password_click' <br>
 *                 type = 'security_log_attachment_added' <br>
 *                 type = 'security_log_attachment_download' <br>
 *                 type = 'security_log_add_attachment' <br>
 *                 type = 'security_log_remove_attachment' <br>
 *                 type = 'security_log_backup_create' <br>
 *                 type = 'security_log_backup_restore' <br>
 *                 type = 'security_log_backup_code_input' <br>
 *                 type = 'security_log_dialog_ok' <br>
 *                 type = 'security_log_dialog_cancel' <br>
 *                 type = 'security_log_dialog_undo' <br>
 *                 type = 'security_log_dialog_transfer' <br>
 *                 type = 'security_log_dialog_sign' <br>
 *                 type = 'security_log_dialog_encrypt' <br>
 *                 type = 'security_log_content_copy' <br>
 *                 type = 'security_log_signature_modal_open' <br>
 *                 type = 'security_log_signature_modal_close' <br>
 */
export function push(source, type) {
  var entry = {
    source,
    sourcei18n: l10n(source),
    type,
    typei18n: l10n(type) || type,
    timestamp: (new Date()).toISOString()
  };
  var lastEntry = log[log.length - 1];
  if (lastEntry &&
      source === lastEntry.source &&
      type === lastEntry.type &&
      (type === 'security_log_textarea_input' || type === 'security_log_password_input')) {
    // aggregate text input events
    log[log.length - 1] = entry;
  } else {
    log.push(entry);
  }
  if (logTimer) {
    mvelo.util.clearTimeout(logTimer);
  } else {
    setBadge();
  }
  logTimer = mvelo.util.setTimeout(clearBadge, 2000);
}

function setBadge() {
  mvelo.browserAction.state({
    badge: 'Ok',
    badgeColor: '#29A000'
  });
}

function clearBadge() {
  logTimer = 0;
  mvelo.browserAction.state({
    badge: ''
  });
}

export function getAll() {
  return log;
}

export function getLatest(size) {
  log.slice(-size);
}
