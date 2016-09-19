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
  var $confirmErrorNoEqual;
  var $confirmSuccess;
  var $keyGenPasswordPanel;
  var $keyGenWaitingPanel;

  function init() {
    if (document.body.dataset.mvelo) {
      return;
    }
    document.body.dataset.mvelo = true;
    var qs = jQuery.parseQuerystring();
    id = qs.id;
    name = 'keyGenDialog-' + id;

    port = mvelo.extension.connect({name: name});
    port.onMessage.addListener(messageListener);

    $('body').addClass("secureBackground");

    mvelo.appendTpl($('body'), mvelo.extension.getURL('components/generate-key/keyGen.html')).then(function() {
      $secureBgndButton = $('.secureBgndSettingsBtn');
      $pwdInput = $('#keygen-password');
      $pwdParent = $('#pwd-form-group');
      $confirmInput = $('#password_confirm');
      $confirmParent = $('#confirm-form-group');
      $confirmErrorNoEqual = $confirmInput.next();
      $confirmSuccess = $confirmErrorNoEqual.next();
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

      $secureBgndButton
        .on('click', function() {
          port.postMessage({event: 'open-security-settings', sender: name});
        });

      $pwdInput
        .on('input paste', function() {
          logUserInput('security_log_password_input');
          checkPwdInput();
        })
        .focus();

      $confirmInput
        .on('input paste', function() {
          logUserInput('security_log_password_input');
          checkConfirmInput();
          checkInputsEqual();
        });

      $confirmSuccess.hide();
      $confirmErrorNoEqual.hide();
      $confirmInput.prop('disabled', true);

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
    var maxLength = parseInt($pwdInput.data('lengthMin'));
    var result = false;

    if (isInputChange) {
      logUserInput('security_log_password_input');
      // limit textarea log to 1 event per second
      isInputChange = false;
      window.setTimeout(function() {
        isInputChange = true;
      }, 1000);
    }

    if (pwdVal.length >= maxLength) {
      $pwdParent.removeClass('has-error');
      $confirmInput.prop('disabled', false);
      result = true;
    } else {
      $pwdParent.addClass('has-error');
      $confirmInput.prop('disabled', true);
    }

    if (checkConfirmInput()) {
      checkInputsEqual();
    }
    return result;
  }

  /**
   * return true or false if the inputs are equal return true
   * @returns {boolean}
   */
  function checkInputsEqual() {
    var result = $pwdInput.val() === $confirmInput.val();
    var maxLength = parseInt($pwdInput.data('lengthMin'));

    if (!$pwdInput.val().length || !$confirmInput.val().length) {
      $confirmSuccess.fadeOut(100, function() {
        $confirmErrorNoEqual.fadeOut(100);
      });
      return false;
    }

    if (!result) {
      $confirmSuccess.fadeOut(100, function() {
        $confirmErrorNoEqual.fadeIn(100);
      });
      return false;
    }

    if ($pwdInput.val().length < maxLength) {
      $confirmSuccess.fadeOut(100, function() {
        $confirmErrorNoEqual.fadeIn(100);
      });
      return false;
    }

    $confirmParent.removeClass('has-error');
    $confirmErrorNoEqual.fadeOut(100, function() {
      $confirmSuccess.fadeIn(100);
    });
    return true;
  }

  /**
   * return true or false if the confirm input is valid
   * @returns {boolean}
   */
  function checkConfirmInput() {
    var confirmVal = $confirmInput.val();
    var maxLength = parseInt($pwdInput.data('lengthMin'));

    if (isInputChange) {
      // limit textarea log to 1 event per second
      isInputChange = false;
      window.setTimeout(function() {
        isInputChange = true;
      }, 1000);
    }

    if (confirmVal.length >= maxLength) {
      return true;
    }

    $confirmParent.addClass('has-error');
    return false;
  }

  /**
   * returns true or false if the inputs are correct
   * @returns {boolean}
   */
  function validate() {
    return checkInputsEqual();
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
