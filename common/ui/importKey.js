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

(function(exports) {

  var publicKeyRegex = /-----BEGIN PGP PUBLIC KEY BLOCK-----[\s\S]+?-----END PGP PUBLIC KEY BLOCK-----/g;
  var privateKeyRegex = /-----BEGIN PGP PRIVATE KEY BLOCK-----[\s\S]+?-----END PGP PRIVATE KEY BLOCK-----/g;
  
  function init() {
    $('#impKeySubmit').click(function() {
      onImportKey();
    });
    $('#impKeyClear').click(onClear);
    $('#impKeyAnother').click(onAnother);
    $('#impKeyFilepath').change(onChangeFile);
  }

  function onImportKey(callback) {
    clearAlert();
    var keyText = $('#newKey').val();

    // find all public and private keys in the textbox
    var publicKeys = keyText.match(publicKeyRegex);
    var privateKeys = keyText.match(privateKeyRegex);
    
    var keys = [];

    if (publicKeys) {
      publicKeys.forEach(function(pub) {
        keys.push({type: 'public', armored: pub});
      });
    }

    if (privateKeys) {
      privateKeys.forEach(function(priv) {
        keys.push({type: 'private', armored: priv});
      });
    }

    if (keys.length === 0) {
      $('#importAlert').showAlert('Import Error', 'No valid key text found', 'error', true);
    } else {
      keyRing.viewModel('importKeys', [keys], function(result, error) {
        if (error) {
          $('#importAlert').showAlert('Import Error', error.type === 'error' ? error.message : 'An exception occored while processing the keys', 'error', true);
          if (callback) callback([{type: 'error'}]);
        } else {
          var success = false;
          result.forEach(function(imported) {
            var heading;
            switch (imported.type) {
              case 'success':
                heading = 'Success';
                success = true;
                break;
              case 'warning':
                heading = 'Warning';
                break;
              case 'error':
                heading = 'Import Error';
                break;
            }
            $('#importAlert').showAlert(heading, imported.message, imported.type, true);
          });
          if (callback) callback(result);
          importDone(success);
        }
      });
    }
  }

  exports.importKey = function(armored, callback) {
    $('#impKeyClear').click();
    $('#newKey').val(armored);
    onImportKey(callback);
  }

  function onChangeFile(event) {
    var reader = new FileReader();
    file = event.target.files[0];
    reader.onloadend = function(ev) { $('#newKey').val(ev.target.result); };
    reader.readAsText(file);
  }

  function importDone(success) {
    if (success) {
      // at least one key was imported
      $('#newKey, #impKeySubmit, #impKeyClear, #impKeyFilepath').prop('disabled', true);
      $('#impKeyAnother').removeClass('hide');
      // refresh grid
      keyRing.event.triggerHandler('keygrid-reload');
    }
  }
  
  function onClear() {
    $('#importKey form').trigger('reset');
    clearAlert();
  }
  
  function onAnother() {
    onClear();
    $('#newKey, #impKeySubmit, #impKeyClear, #impKeyFilepath').prop('disabled', false);
    $('#impKeyAnother').addClass('hide');
  }

  function clearAlert() {
    $('#importAlert').empty();
    $('#importAlert').hide();
  }
  
  $(document).ready(init);
  
}(keyRing)); 
