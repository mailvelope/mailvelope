/**
 * Mailvelope - secure email with OpenPGP encryption for Webmail
 * Copyright (C) 2012  Thomas Oberndörfer
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
var options = options || null;

(function(options) {

  var advShown = false;

  var pwd, repwd, empty, nequ, match, submit;

  options.registerL10nMessages([
    "key_gen_never",
    "alert_header_success",
    "key_gen_success",
    "key_gen_error"
  ]);

  function init() {
    pwd = $('#genKeyPwd');
    repwd = $('#genKeyRePwd');
    empty = pwd.next();
    nequ = repwd.next();
    match = nequ.next();
    submit = $('#genKeySubmit');
    $('#genKeyAdv').click(onKeyAdvanced);
    $('#genKeyAdvSection').hide();
    pwd.on('keyup', onKeyPwdChange);
    repwd.on('keyup', onKeyPwdChange);
    submit.click(onGenerateKey);
    $('#genKeyClear').click(onClear);
    $('#genKeyAnother').click(onAnother);
  }

  function onKeyAdvanced() {
    if (advShown) {
      $('#genKeyAdvSection').slideUp();
      $('#genKeyAdv').removeClass('key-advanced-open');
      $('#genKeyAdv').addClass('key-advanced-closed');
      advShown = false;
    } else {
      $('#genKeyAdvSection').slideDown();
      $('#genKeyAdv').removeClass('key-advanced-closed');
      $('#genKeyAdv').addClass('key-advanced-open');
      advShown = true;
    }
    return false;
  }

  function onKeyPwdChange() {
    var mask = (repwd.val().length > 0) << 1 | (pwd.val().length > 0);
    switch (mask) {
      case 0:
        // both empty
        empty.removeClass('hide');
        nequ.addClass('hide');
        match.addClass('hide');
        submit.prop('disabled', true);
        break;
      case 1:
      case 2:
        // re-enter or enter empty
        empty.addClass('hide');
        nequ.removeClass('hide');
        match.addClass('hide');
        submit.prop('disabled', true);
        break;
      case 3:
        // both filled
        empty.addClass('hide');
        if (repwd.val() === pwd.val()) {
          nequ.addClass('hide');
          match.removeClass('hide');
          submit.prop('disabled', false);
        } else {
          nequ.removeClass('hide');
          match.addClass('hide');
          submit.prop('disabled', true);
        }
        break;
    }
  }

  function onClear() {
    $('#generateKey').find('input').val('');
    $('#genKeyAlgo').val('RSA/RSA');
    $('#genKeySize').val('4096');
    $('#genKeyExp').val('0')
                   .prop('disabled', true);
    $('#genKeyExpUnit').val(options.l10n.key_gen_never)
                   .prop('disabled', true);
    $('#genKeyEmail').closest('.control-group').removeClass('error')
                     .end().next().addClass('hide');
    $('#genAlert').hide();
    onKeyPwdChange();
    return false;
  }

  function onAnother() {
    $('#generateKey').find('input').val('');
    $('#genKeyExp').val('0');
    $('#genAlert').hide();
    $('#generateKey').find('input, select').prop('disabled', false);
    $('#genKeySubmit, #genKeyClear').prop('disabled', false);
    $('#genKeyAnother').addClass('hide');
    // disable currently unavailable options
    $('#genKeyExp, #genKeyExpUnit, #genKeyAlgo').prop('disabled', true);
    return false;
  }

  function onGenerateKey() {
    validateEmail(function() {
      $('body').addClass('busy');
      $('#genKeyWait').one('show.bs.modal', generateKey);
      $('#genKeyWait').modal({backdrop: 'static', keyboard: false});
      $('#genKeyWait').modal('show');
    });
    return false;
  }

  function validateEmail(next) {
    var email = $('#genKeyEmail');
    // validate email
    options.viewModel('validateEmail', [email.val()], function(valid) {
      if (valid) {
        email.closest('.form-group').removeClass('has-error');
        email.next().addClass('hide');
        next();
      } else {
        email.closest('.form-group').addClass('has-error');
        email.next().removeClass('hide');
        return;
      }
    });
  }

  function generateKey() {
    var parameters = {};
    parameters.algorithm = $('#genKeyAlgo').val();
    parameters.numBits = $('#genKeySize').val();
    parameters.user = $('#genKeyName').val();
    parameters.email = $('#genKeyEmail').val();
    parameters.passphrase = $('#genKeyPwd').val();
    options.viewModel('generateKey', [parameters], function(result, error) {
      if (!error) {
        $('#genAlert').showAlert(options.l10n.alert_header_success, options.l10n.key_gen_success, 'success');
        $('#generateKey').find('input, select').prop('disabled', true);
        $('#genKeySubmit, #genKeyClear').prop('disabled', true);
        $('#genKeyAnother').removeClass('hide');
        // refresh grid
        options.event.triggerHandler('keygrid-reload');
      } else {
        $('#genAlert').showAlert(options.l10n.key_gen_error, error.type === 'error' ? error.message : '', 'danger');
      }
      $('body').removeClass('busy');
      $('#genKeyWait').modal('hide');
    });
  }

  options.event.on('ready', init);

}(options));
