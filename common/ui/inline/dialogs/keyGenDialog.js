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
  var id, name, port, l10n, isInputChange;

  var $secureBgndButton;
  var $pwdInput;
  var $pwdParent;
  var $confirmInput;
  var $confirmParent;
  var $confirmErrorNoEmpty;
  var $confirmErrorNoEqual;
  var $keyGenPasswordPanel;
  var $keyGenWaitingPanel;

  function init() {
    var qs = jQuery.parseQuerystring();
    id = qs.id;
    name = 'keyGenDialog-' + id;

    port = mvelo.extension.connect({name: name});
    port.onMessage.addListener(messageListener);

    $('body').addClass("secureBackground");

    mvelo.appendTpl($('body'), mvelo.extension.getURL('common/ui/inline/dialogs/templates/keyGen.html')).then(function() {
      $secureBgndButton = $('.secureBgndSettingsBtn');
      $pwdInput = $('#keygen-password');
      $pwdParent = $('#pwd-form-group');
      $confirmInput = $('#password_confirm');
      $confirmParent = $('#confirm-form-group');
      $confirmErrorNoEmpty = $confirmInput.next();
      $confirmErrorNoEqual = $confirmErrorNoEmpty.next();
      $keyGenPasswordPanel = $('#key_gen_generator');
      $keyGenWaitingPanel = $('#key_gen_waiting').hide();

      // Get language strings from JSON
      mvelo.l10n.getMessages([
        'keygen_dialog_password_placeholder'
      ], function(result) {
        l10n = result;
        $pwdInput.attr('placeholder', l10n.keygen_dialog_password_placeholder);
      });

      mvelo.l10n.localizeHTML();
      mvelo.util.showSecurityBackground(true);

      $secureBgndButton.on('click', function() {
        port.postMessage({event: 'open-security-settings', sender: name});
      });

      $pwdInput.focus().on('keyup', checkPwdInput);
      $confirmInput.on('keyup', checkConfirmInput);

      checkPwdInput();
      checkConfirmInput();

      port.postMessage({ event: 'keygen-dialog-init', sender: name });

      isInputChange = true;
    });
  }

  /**
   * return true or false if the password input is valid
   * @returns {boolean}
   */
  function checkPwdInput() {
    var pwdVal = $pwdInput.val();

    if (pwdVal.length === 0) {
      $pwdParent.removeClass('has-error has-success');
      $confirmInput.prop('disabled', true);
      return true;
    }

    checkConfirmInput();

    if (pwdVal.length >= parseInt($pwdInput.data('lengthMin'))) {
      $pwdParent.addClass('has-success');
      $confirmInput.prop('disabled', false);
      return true;
    }

    $pwdParent.addClass('has-error');
    return false;
  }

  /**
   * return true or false if the confirm input is valid
   * @returns {boolean}
   */
  function checkConfirmInput() {
    var confirmVal = $confirmInput.val();

    if (confirmVal.length === 0) {
      $confirmParent.removeClass('has-error has-success');
      $confirmErrorNoEmpty.hide();
      $confirmErrorNoEqual.hide();
      return true;
    }

    if (isInputChange) {
      logUserInput('security_log_password_input');
      // limit textarea log to 1 event per second
      isInputChange = false;
      window.setTimeout(function() {
        isInputChange = true;
      }, 1000);
    }

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
  }

  /**
   * returns true or false if the inputs are correct
   * @returns {boolean}
   */
  function validate() {
    return (checkPwdInput() && checkConfirmInput());
  }

  /**
   * send log entry for the extension
   * @param {string} type
   */
  function logUserInput(type) {
    port.postMessage({
      event: 'keygen-user-input',
      sender: name,
      source: 'security_log_key_generator',
      type: type
    });
  }

  function showPasswordPanel() {
    $keyGenWaitingPanel.fadeOut('fast', function() {
      $keyGenPasswordPanel.fadeIn('fast');
    });
  }

  function showWaitingPanel() {
    $keyGenPasswordPanel.fadeOut('fast', function() {
      $keyGenWaitingPanel.fadeIn('fast');
    });
  }

  /**
   * Mananaged the different post messages
   * @param {string} msg
   */
  function messageListener(msg) {
    //console.log('keyGenDialog messageListener: ', JSON.stringify(msg));
    switch (msg.event) {
      case 'check-dialog-inputs':
        port.postMessage({event: 'input-check', sender: name, isValid: validate(), pwd: $pwdInput.val()});
        break;
      case 'show-password':
        showPasswordPanel();
        break;
      case 'show-waiting':
        showWaitingPanel();
        break;
      default:
        console.log('unknown event');
    }
  }

  $(document).ready(init);

}());
