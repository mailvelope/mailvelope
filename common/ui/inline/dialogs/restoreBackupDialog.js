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
  var id, name, port, l10n, isInputChange;

  var $secureBgndButton;
  var $restoreBackupButton;

  function init() {
    var qs = jQuery.parseQuerystring();
    id = qs.id;
    name = 'restoreBackupDialog-' + id;

    port = mvelo.extension.connect({name: name});
    port.onMessage.addListener(messageListener);

    $('body').addClass("secureBackground");

    mvelo.appendTpl($('body'), mvelo.extension.getURL('common/ui/inline/dialogs/templates/restoreBackup.html')).then(function() {
      $secureBgndButton = $('.secureBgndSettingsBtn');
      $restoreBackupButton = $('#restoreBackupBtn');

      mvelo.l10n.getMessages([
      ], function(result) {
        l10n = result;
      });

      mvelo.l10n.localizeHTML();
      mvelo.util.showSecurityBackground(true);

      $secureBgndButton.on('click', function() {
        port.postMessage({event: 'open-security-settings', sender: name});
      });

      $('.flex-digit')
        .on('keyup', function() {
          var $this = $(this),
            val = $this.val(),
            maxlength = parseInt($this.attr('maxlength'));

          if (val.length === maxlength) {
            $this
              .removeClass('invalid')
              .addClass('valid')
              .next('input').focus();
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
        })
        .on('blur', function() {
          if (isCodeValid()) {
            $restoreBackupButton.removeAttr('disabled');
          } else {
            $restoreBackupButton.attr('disabled', true);
          }
        });

      $restoreBackupButton.on('click', function() {
        var code = '';

        $('.flex-digit').each(function(idx, ele) {
          code += $(ele).val();
        });

        port.postMessage({
          event: 'restore-backup-code',
          sender: name,
          code: code
        });
      });

      port.postMessage({ event: 'restore-backup-dialog-init', sender: name });

      isInputChange = true;
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

  /**
   * Mananaged the different post messages
   * @param {string} msg
   */
  function messageListener(msg) {
    //console.log('keyGenDialog messageListener: ', JSON.stringify(msg));
    switch (msg.event) {
      case 'error-message':
        //TODO
        console.log('restoreBackupDialog error', msg.error);
        break;
      default:
        console.log('unknown event');
    }
  }

  $(document).ready(init);

}());
