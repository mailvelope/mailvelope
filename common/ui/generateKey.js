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

(function() {
  
  var advShown = false;
  
  var pwd, repwd, empty, nequ, match, submit;
  
  function init() {
    pwd = $('#genKeyPwd');
    repwd = $('#genKeyRePwd');
    empty = pwd.next();
    nequ = repwd.next();
    match = nequ.next();
    submit = $('#genKeySubmit');
    $('#genKeyAdv').click(onKeyAdvanced);
    pwd.on('keyup', onKeyPwdChange);
    repwd.on('keyup', onKeyPwdChange);
    submit.click(onGenerateKey);
    $('#genKeyClear').click(onClear);
    $('#genKeyAnother').click(onAnother);
  }
  
  function onKeyAdvanced() {
    if (advShown) {
      $('#genKeyAdvSection').slideUp();
      $('#genKeyAdv').text('Advanced >>');
      advShown = false
    } else {
      $('#genKeyAdvSection').slideDown();
      $('#genKeyAdv').text('<< Advanced');
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
        submit.attr('disabled', 'disabled');
        break;
      case 1:
      case 2:
        // re-enter or enter empty
        empty.addClass('hide');
        nequ.removeClass('hide');
        match.addClass('hide');
        submit.attr('disabled', 'disabled');
        break;
      case 3:
        // both filled
        empty.addClass('hide');
        if (repwd.val() === pwd.val()) {
          nequ.addClass('hide');
          match.removeClass('hide');
          submit.removeAttr('disabled');
        } else {
          nequ.removeClass('hide');
          match.addClass('hide');
          submit.attr('disabled', 'disabled');
        }
        break;
    }
  }
  
  function onClear() {
    $('#generateKey').find('input').val('');
    $('#genKeyAlgo').val('RSA');
    $('#genKeySize').val('2048');
    $('#genKeyExp').val('0')
                   .attr('disabled', 'disabled');
    $('#genKeyExpUnit').val('never')
                   .attr('disabled', 'disabled');
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
    $('#generateKey').find('input, select').removeAttr('disabled');
    $('#genKeySubmit, #genKeyClear').removeAttr('disabled');
    $('#genKeyAnother').addClass('hide');
    // disable currently unavailable options
    $('#genKeyExp, #genKeyExpUnit').attr('disabled', 'disabled');
    return false;
  }
  
  function onGenerateKey() {
    validateEmail(function() {
      $('body').addClass('busy');
      $('#genKeyWait').one('shown', generateKey);
      $('#genKeyWait').modal('show');
    });
    return false;
  }  

  function validateEmail(next) {
    var email = $('#genKeyEmail');
    // validate email
    keyRing.viewModel('validateEmail', [email.val()], function(valid) {
      if (valid) {
        email.closest('.control-group').removeClass('error');
        email.next().addClass('hide');
        next();
      } else {
        email.closest('.control-group').addClass('error');
        email.next().removeClass('hide');
        return;
      }  
    });
  }

  function generateKey() {
    var options = {};
    options.algorithm = $('#genKeyAlgo').val();
    options.numBits = $('#genKeySize').val();
    options.user = $('#genKeyName').val();
    options.email = $('#genKeyEmail').val();
    options.passphrase = $('#genKeyPwd').val();
    keyRing.viewModel('generateKey', [options], function(result, error) {
      if (!error) {
        $('#genAlert').showAlert('Success', 'New key generated and imported into key ring', 'success');
        $('#generateKey').find('input, select').attr('disabled', 'disabled');
        $('#genKeySubmit, #genKeyClear').attr('disabled', 'disabled');
        $('#genKeyAnother').removeClass('hide');
        // refresh grid
        keyRing.viewModel('getKeys', function(result) {
          $("#mainKeyGrid").data("kendoGrid").dataSource.data(keyRing.mapDates(result));
        });
      } else {
        $('#genAlert').showAlert('Generation Error', error.type === 'error' ? error.message : '', 'error');
      }
      $('body').removeClass('busy');
      $('#genKeyWait').modal('hide');
    });
  }

  $(document).ready(init);
  
}()); 
 
