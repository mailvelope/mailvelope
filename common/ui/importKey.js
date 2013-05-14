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

    // find all public and private keys in the textbox
    var publicKeys = keyText.match(publicKeyRegex);
    var privateKeys = keyText.match(privateKeyRegex);
    var npublic = publicKeys===null ? 0 : publicKeys.length;
    var nprivate = privateKeys===null ? 0 : privateKeys.length;
    var ntotal = npublic+nprivate, nsucceeded = 0, nfailed = 0;

    // each one is imported asynchronously. 
    // produce a list of success/error message boxes
    // once they're all done, call importDone() to refresh the ui
    var importKey = function(key, keyType){
      keyRing.viewModel('importKey', [key, keyType.toLowerCase()], function(result, error){
        if (!error) {
          $('#importAlert').showAlert('Success', keyType + ' key ' + result[0].keyid + ' of user ' + result[0].userid + ' imported into key ring', 'success', true);
          nsucceeded++;
        } else {
          $('#importAlert').showAlert('Import Error', error.type === 'error' ? error.message : 'Not a valid key text', 'error', true);
          nfailed++;
        }
        if(nsucceeded + nfailed == ntotal){
          // finished importing! 
          importDone(nsucceeded > 0);
        }
      });
    }
    for(var i = 0; i < npublic; i++){
      importKey(publicKeys[i], 'Public');
    }
    for(var i = 0; i < nprivate; i++){
      importKey(privateKeys[i], 'Private');
    }

    // no keys found...
    if (ntotal == 0) {
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
      keyRing.event.triggerHandler('keygrid-reload');
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
