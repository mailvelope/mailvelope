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

define(function(require, exports) {

  var mvelo = require('../lib-mvelo').mvelo;
  var l10n = mvelo.l10n.get;

  var log = [];
  var logTimer = 0;

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
  function push(source, type) {
    var entry = {
      source: source,
      sourcei18n: l10n(source),
      type: type,
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

  function getAll() {
    return log;
  }

  function getLatest(size) {
    log.slice(-size);
  }

  exports.push = push;
  exports.getAll = getAll;
  exports.getLatest = getLatest;

});
