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

(function() {
  var id, name, port, host, l10n;

  var $secureBgndButton;
  var $securingNoteButton;

  function init() {
    var qs = jQuery.parseQuerystring();
    id = qs.id;
    name = 'keyBackupDialog-' + id;
    host = qs.host;

    $('body').addClass("secureBackground");
    mvelo.appendTpl($('body'), mvelo.extension.getURL('common/ui/inline/dialogs/templates/keybackup.html')).then(function() {
      $secureBgndButton = $('.secureBgndSettingsBtn');
      $securingNoteButton = $('#createSecuringNoteBtn');

      port = mvelo.extension.connect({name: name});
      port.onMessage.addListener(messageListener);

      // Get language strings from JSON
      mvelo.l10n.getMessages([
      ], function(result) {
        l10n = result;
      });

      mvelo.l10n.localizeHTML();
      mvelo.util.showSecurityBackground(qs.embedded);

      $secureBgndButton.on('click', function() {
        port.postMessage({ event: 'open-security-settings', sender: name });
      });

      $securingNoteButton.on('click', function() {
        var $spinner = $('<figure />')
          .addClass('waiting')
          .append($('<img/>')
            .attr('src', '../../../img/spinner.gif'))
          .append($('<figcation />')
            .addClass('caption')
            .append($('<h1 />').html('Sicherung wird eingerichtet'))
            .append($('<p />').html('Ein Dokument mit ihrem Wiederherstellungscode wird vorbereitet &hellip;')));

        $('#key_backup_generator').parent().removeClass('secureBackground').empty().append($spinner);

        window.setTimeout(function() {
          port.postMessage({ event: 'create-backup-code-window', sender: name, host: host });
        }, 3000); // 3sec
      });
      port.postMessage({ event: 'keybackup-dialog-init', sender: name });
    });
  }

  /**
   * Mananaged the different post messages
   * @param {string} msg
   */
  function messageListener(msg) {
    //console.log('generator messageListener: ', JSON.stringify(msg));
    switch (msg.event) {
      default:
        console.log('unknown event');
    }
  }

  $(document).ready(init);
}());
