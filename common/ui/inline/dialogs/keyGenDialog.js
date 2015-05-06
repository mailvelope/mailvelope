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
        name = 'keyGenDialog-' + id
      ;

      $secureBgndButton = $('.secureBgndSettingsBtn'),
      $pwdInput = $('#key-gen-password'),
      $pwdError = $pwdInput.next(),
      $pwdParent = $pwdInput.parent().parent(),
      $replyInput = $('#password_confirm'),
      $replyParent = $replyInput.parent().parent(),
      $replyErrorNoEmpty = $replyInput.next(),
      $replyErrorNoEqual = $replyErrorNoEmpty.next()
      ;

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

      $pwdInput.focus().on('keyup', checkPwdInput);
      $replyInput.on('keyup', checkReplyInput);

      checkPwdInput();
      checkReplyInput();

      port.postMessage({ event: 'dialog-init', sender: name });
    },

    /**
     * return true or false if the password input is valid
     * @returns {boolean}
     */
    checkPwdInput = function() {
      var pwdVal = $pwdInput.val();
      checkReplyInput();

      if (pwdVal.length >= parseInt($pwdInput.data('lengthMin'))) {
        $pwdParent
          .removeClass('has-error')
          .addClass('has-success');
        $pwdError.fadeOut();

        $replyInput
          .attr('disabled', false);
        return true;
      }
      $pwdParent
        .addClass('has-error')
        .removeClass('has-success');
      $pwdError.fadeIn();
      $replyInput.attr('disabled', true);
      return false;
    },

    /**
     * return true or false if the confirm input is valid
     * @returns {boolean}
     */
    checkReplyInput = function() {
      var replyVal = $replyInput.val();

      if (replyVal && replyVal.length >= 1) {
        if (replyVal !== $pwdInput.val()) {
          $replyErrorNoEqual.fadeIn();
          $replyParent
            .addClass('has-error')
            .removeClass('has-success');
          $replyErrorNoEmpty.hide();
          $replyErrorNoEqual.fadeIn();
          return false;
        } else {
          $replyParent
            .removeClass('has-error')
            .addClass('has-success');
          $replyErrorNoEmpty.fadeOut();
          $replyErrorNoEqual.fadeOut();
          return true;
        }
      }
      $replyInput
        .addClass('has-error')
        .removeClass('has-success');
      $replyErrorNoEmpty.fadeIn();
      $replyErrorNoEqual.hide();
      return false;
    },

    /**
     * returns true or false if the inputs are correct
     * @returns {boolean}
     */
    validate = function() {
      return (checkPwdInput() && checkReplyInput());
    },

    /**
     * Mananaged the different post messages
     * @param {string} msg
     */
    messageListener = function(msg) {
      //console.log('generator messageListener: ', JSON.stringify(msg));
      switch (msg.event) {
        case 'is-dialog-valide':
          if (validate()) {
            port.postMessage({ event: 'key-gen-valid', sender: name});
          } else {
            port.postMessage({event: 'key-gen-invalid', sender: name});
          }
          break;
        default:
          console.log('unknown event');
      }
    };

  $(document).ready(init);

}());
