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
  var id, name, port, l10n;

  var
    $secureBgndButton,
    $pwdInput,
    $pwdError,
    $pwdParent,
    $replyInput,
    $replyParent,
    $replyErrorNoEmpty,
    $replyErrorNoEqual
    ;

  var
    init = function() {
      var
        qs = jQuery.parseQuerystring(),
        id = qs.id,
        name = 'keyBackupDialog-' + id
      ;

      $secureBgndButton = $('.secureBgndSettingsBtn');

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

      port.postMessage({ event: 'keybackup-dialog-init', sender: name });
    },

    /**
     * Mananaged the different post messages
     * @param {string} msg
     */
    messageListener = function(msg) {
      //console.log('generator messageListener: ', JSON.stringify(msg));
      switch (msg.event) {
        default:
          console.log('unknown event');
      }
    };

  $(document).ready(init);

}());
