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

  var $secureBgndButton;
  var $pwdInput;
  var $pwdError;
  var $pwdParent;
  var $confirmInput;
  var $confirmParent;
  var $confirmErrorNoEmpty;
  var $confirmErrorNoEqual;

  var
    init = function() {
      var qs = jQuery.parseQuerystring();
      var id = qs.id;
      name = 'keyGenDialog-' + id;

      $('body').addClass("secureBackground");
      mvelo.appendTpl($('body'), mvelo.extension.getURL('common/ui/inline/dialogs/templates/keygen.html')).then(function() {
        $secureBgndButton = $('.secureBgndSettingsBtn');
        $pwdInput = $('#keygen-password');
        $pwdError = $pwdInput.next();
        $pwdParent = $('#pwd-form-group');
        $confirmInput = $('#password_confirm');
        $confirmParent = $('#confirm-form-group');
        $confirmErrorNoEmpty = $confirmInput.next();
        $confirmErrorNoEqual = $confirmErrorNoEmpty.next();

        port = mvelo.extension.connect({name: name});
        port.onMessage.addListener(messageListener);

        // Get language strings from JSON
        mvelo.l10n.getMessages([], function(result) {
          l10n = result;
        });

        mvelo.l10n.localizeHTML();
        mvelo.util.showSecurityBackground(qs.embedded);

        $secureBgndButton.on('click', function() {
          port.postMessage({ event: 'open-security-settings', sender: name });
        });

        $pwdInput.focus().on('keyup', checkPwdInput);
        $confirmInput.on('keyup', checkConfirmInput);

        checkPwdInput();
        checkConfirmInput();

        port.postMessage({ event: 'dialog-init', sender: name });
      });
    },

    /**
     * return true or false if the password input is valid
     * @returns {boolean}
     */
    checkPwdInput = function() {
      var pwdVal = $pwdInput.val();
      checkConfirmInput();

      if (pwdVal.length >= parseInt($pwdInput.data('lengthMin'))) {
        $pwdParent
          .removeClass('has-error')
          .addClass('has-success');
        $pwdError.fadeOut();

        $confirmInput
          .prop('disabled', false);
        return true;
      }
      $pwdParent
        .addClass('has-error')
        .removeClass('has-success');
      $pwdError.fadeIn();
      $confirmInput.prop('disabled', true);
      return false;
    },

    /**
     * return true or false if the confirm input is valid
     * @returns {boolean}
     */
    checkConfirmInput = function() {
      var confirmVal = $confirmInput.val();

      if (confirmVal && confirmVal.length >= 1) {
        if (confirmVal !== $pwdInput.val()) {
          $confirmErrorNoEqual.fadeIn();
          $confirmParent
            .addClass('has-error')
            .removeClass('has-success');
          $confirmErrorNoEmpty.hide();
          $confirmErrorNoEqual.fadeIn();
          return false;
        } else {
          $confirmParent
            .removeClass('has-error')
            .addClass('has-success');
          $confirmErrorNoEmpty.fadeOut();
          $confirmErrorNoEqual.fadeOut();
          return true;
        }
      }
      $confirmInput
        .addClass('has-error')
        .removeClass('has-success');
      $confirmErrorNoEmpty.fadeIn();
      $confirmErrorNoEqual.hide();
      return false;
    },

    /**
     * returns true or false if the inputs are correct
     * @returns {boolean}
     */
    validate = function() {
      return (checkPwdInput() && checkConfirmInput());
    },

    /**
     * Mananaged the different post messages
     * @param {string} msg
     */
    messageListener = function(msg) {
      //console.log('keyGenDialog messageListener: ', JSON.stringify(msg));
      switch (msg.event) {
        case 'check-dialog-inputs':
          port.postMessage({ event: 'input-check', sender: name, isVvalid: validate()});
          break;
        default:
          console.log('unknown event');
      }
    };

  $(document).ready(init);

}());
