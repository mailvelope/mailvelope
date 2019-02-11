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

import * as l10n from '../../lib/l10n.js';
import {showSecurityBackground, terminate, appendTpl} from '../../lib/util.js';
import EventHandler from '../../lib/EventHandler.js';

let port;
let isInputChange;

let $secureBgndButton;
let $pwdInput;
let $pwdParent;
let $confirmInput;
let $confirmParent;
let $confirmErrorNoEqual;
let $confirmSuccess;
let $keyGenPasswordPanel;
let $keyGenWaitingPanel;

l10n.set([
  'keygen_dialog_password_placeholder'
]);

function init() {
  if (document.body.dataset.mvelo) {
    return;
  }
  document.body.dataset.mvelo = true;
  const qs = jQuery.parseQuerystring();

  port = EventHandler.connect(`keyGenDialog-${qs.id}`);
  registerEventListeners();

  $('body').addClass('secureBackground');

  appendTpl($('body'), chrome.runtime.getURL('components/generate-key/keyGen.html')).then(() => {
    $secureBgndButton = $('.secureBgndSettingsBtn');
    $pwdInput = $('#keygen-password');
    $pwdParent = $('#pwd-form-group');
    $confirmInput = $('#password_confirm');
    $confirmParent = $('#confirm-form-group');
    $confirmErrorNoEqual = $confirmInput.next();
    $confirmSuccess = $confirmErrorNoEqual.next();
    $keyGenPasswordPanel = $('#key_gen_generator');
    $keyGenWaitingPanel = $('#key_gen_waiting').hide();

    $pwdInput.attr('placeholder', l10n.map.keygen_dialog_password_placeholder);

    l10n.localizeHTML();
    showSecurityBackground(port, true);

    $secureBgndButton
    .on('click', () => port.emit('open-security-settings'));

    $pwdInput
    .on('input paste', () => {
      checkPwdInput();
    })
    .focus();

    $confirmInput
    .on('input paste', () => {
      checkConfirmInput();
      checkInputsEqual();
    });

    $confirmSuccess.hide();
    $confirmErrorNoEqual.hide();
    $confirmInput.prop('disabled', true);

    port.emit('keygen-dialog-init');

    isInputChange = true;
  });
}

function registerEventListeners() {
  port.on('check-dialog-inputs', () => port.emit('input-check', {isValid: validate(), pwd: $pwdInput.val()}));
  port.on('show-password', showPasswordPanel);
  port.on('show-waiting', showWaitingPanel);
  port.on('terminate', () => terminate(port));
}

function checkPwdInput() {
  const pwdVal = $pwdInput.val();
  const maxLength = parseInt($pwdInput.data('lengthMin'));
  if (isInputChange) {
    logUserInput('security_log_password_input');
    // limit textarea log to 1 event per second
    isInputChange = false;
    window.setTimeout(() => {
      isInputChange = true;
    }, 1000);
  }
  if (pwdVal.length >= maxLength) {
    $pwdParent.removeClass('has-error');
    $confirmInput.prop('disabled', false);
  } else {
    $pwdParent.addClass('has-error');
    $confirmInput.prop('disabled', true);
  }
  if (checkConfirmInput(false)) {
    checkInputsEqual();
  }
}

/**
 * return true or false if the inputs are equal return true
 * @returns {boolean}
 */
function checkInputsEqual() {
  const result = $pwdInput.val() === $confirmInput.val();
  const maxLength = parseInt($pwdInput.data('lengthMin'));

  if (!$pwdInput.val().length || !$confirmInput.val().length) {
    $confirmSuccess.fadeOut(100, () => {
      $confirmErrorNoEqual.fadeOut(100);
    });
    return false;
  }

  if (!result) {
    $confirmSuccess.fadeOut(100, () => {
      $confirmErrorNoEqual.fadeIn(100);
    });
    return false;
  }

  if ($pwdInput.val().length < maxLength) {
    $confirmSuccess.fadeOut(100, () => {
      $confirmErrorNoEqual.fadeIn(100);
    });
    return false;
  }

  $confirmParent.removeClass('has-error');
  $confirmErrorNoEqual.fadeOut(100, () => {
    $confirmSuccess.fadeIn(100);
  });
  return true;
}

/**
 * return true or false if the confirm input is valid
 * @returns {boolean}
 */
function checkConfirmInput(log = true) {
  const confirmVal = $confirmInput.val();
  const maxLength = parseInt($pwdInput.data('lengthMin'));

  if (isInputChange && log) {
    logUserInput('security_log_password_input');
    // limit textarea log to 1 event per second
    isInputChange = false;
    window.setTimeout(() => {
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
  port.emit('keygen-user-input', {
    source: 'security_log_key_generator',
    type
  });
}

function showPasswordPanel() {
  $keyGenWaitingPanel.fadeOut('fast', () => {
    $keyGenPasswordPanel.fadeIn('fast');
  });
}

function showWaitingPanel() {
  $keyGenPasswordPanel.fadeOut('fast', () => {
    $keyGenWaitingPanel.fadeIn('fast');
  });
}

$(document).ready(init);
