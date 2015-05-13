/**
 * Mailvelope - secure email with OpenPGP encryption for Webmail
 * Copyright (C) 2015  Thomas Oberndörfer
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
var QRCode = QRCode || null;

(function() {
  // communication to background page
  var port;
  // shares ID with DecryptFrame
  var id;
  // type + id
  var name;
  var l10n;
  // qrcoe object
  var qrcode;

  function init() {
    var qs = jQuery.parseQuerystring();
    id = qs.id;
    name = 'backupCodeWindow-' + id;
    // open port to background page
    port = mvelo.extension.connect({name: name});
    port.onMessage.addListener(messageListener);

    var formattedDate = new Date();
    var d = formattedDate.getUTCDate(),
      m = formattedDate.getUTCMonth() + 1,
      y = formattedDate.getUTCFullYear();

    $('#currentDate').html(d + '. ' + m + '. ' + y);

    mvelo.l10n.localizeHTML();
    mvelo.l10n.getMessages([], function(result) {
      l10n = result;
    });
    mvelo.util.showSecurityBackground(qs.embedded);
    port.postMessage({event: 'backup-code-window-init', sender: name});
  }

  function setBackupCode(backupCode) {
    var length = 5, splitCode = '';
    $('.recovery-sheet_code-digit').each(function(index) {
      splitCode = backupCode.slice(length * index, (length * index) + length - 1);
      $(this).text(splitCode);
    });
    $('.recovery-sheet_code-container').addClass('secureBackground');

    qrcode = new QRCode(document.getElementById('qrcode'), {
      text: backupCode,
      width: 100,
      height: 100,
      colorDark : "#000000",
      colorLight : "#ffffff",
      correctLevel : QRCode.CorrectLevel.H
    });

    window.print();

    $('.recovery-sheet_print-button').on('click', function() {
      window.print();
    });
  }

  function messageListener(msg) {
    switch (msg.event) {
      case 'get-backup-code':
        setBackupCode(msg.backupCode);
        break;
      default:
        console.log('unknown event');
    }
  }

  $(document).ready(init);

}());
