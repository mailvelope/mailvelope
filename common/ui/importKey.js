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

  var publicKeyRegex = /-----BEGIN PGP PUBLIC KEY BLOCK-----[\s\S]+?-----END PGP PUBLIC KEY BLOCK-----/g;
  var privateKeyRegex = /-----BEGIN PGP PRIVATE KEY BLOCK-----[\s\S]+?-----END PGP PRIVATE KEY BLOCK-----/g;
  
  function init() {
    $('#impKeySubmit').click(onImportKey);
    $('#impKeyClear').click(onClear);
    $('#impKeyAnother').click(onAnother);
  }
  
  function onImportKey() {
    clearAlert();
    var keyText = $('#newKey').val();
    var publicKeys = keyText.match(publicKeyRegex);
    var privateKeys = keyText.match(privateKeyRegex);
    var one = false;
    if (publicKeys !== null) {
      publicKeys.forEach(function(publicKey, index) {
        (function(last) {
          keyRing.viewModel('importKey', [publicKey, 'public'], function(result, error) {
            if (!error) {
              one = true;
              console.log('show success');
              $('#importAlert').showAlert('Success', 'Public key ' + result[0].keyid + ' of user ' + result[0].userid + ' imported into key ring', 'success', true);
            } else {
              $('#importAlert').showAlert('Import Error', error.type === 'error' ? error.message : 'Not a valid key text', 'error', true);
            }
            if (last) {
              importDone(one);
            }
          });
        }(index + 1 === publicKeys.length && privateKeys === null));
      });
    }
    if (privateKeys !== null) {
      privateKeys.forEach(function(privateKey, index) {
        (function(last) {
          keyRing.viewModel('importKey', [privateKey, 'private'], function(result, error) {
            if (!error) {
              one = true;
              $('#importAlert').showAlert('Success', 'Private key ' + result[0].keyid + ' of user ' + result[0].userid + ' imported into key ring', 'success', true);
            } else {
              $('#importAlert').showAlert('Import Error', error.type === 'error' ? error.message : 'Not a valid key text', 'error', true);
            }
            if (last) {
              importDone(one);
            }
          });
        }(index + 1 === privateKeys.length));
      });
    }
    if (publicKeys === null && privateKeys === null) {
      $('#importAlert').showAlert('Import Error', 'Not a valid key text', 'error');
    }
  }

  function importDone(success) {
    console.log('importDone', success);
    if (success) {
      // at least one key was imported
      $('#newKey, #impKeySubmit, #impKeyClear').attr('disabled', 'disabled');
      $('#impKeyAnother').removeClass('hide');
      // refresh grid
      keyRing.viewModel('getKeys', function(result) {
        $("#mainKeyGrid").data("kendoGrid").dataSource.data(keyRing.mapDates(result));
      });
    }
  }
  
  function onClear() {
    $('#newKey').val('');
    clearAlert();
  }
  
  function onAnother() {
    $('#newKey').val('');
    clearAlert();
    $('#newKey, #impKeySubmit, #impKeyClear').removeAttr('disabled');
    $('#impKeyAnother').addClass('hide');
  }

  function clearAlert() {
    $('#importAlert').empty();
    $('#importAlert').hide();
  }
  
  $(document).ready(init);
  
}()); 
