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
  
  function init() {
    $('#impKeySubmit').click(onImportKey);
    $('#impKeyClear').click(onClear);
    $('#impKeyAnother').click(onAnother);
  }
  
  function onImportKey() {
    var keyText = $('#newKey').val();
    var keyType = $('input:radio[name="keyType"]:checked').val();
    options.viewModel('importKey', [keyText, keyType], function(result, error){
      if (error === undefined) {
        $('#importAlert').showAlert('Success', 'Key imported into key ring', 'success');
        $('#newKey, #impKeySubmit, #impKeyClear').attr('disabled', 'disabled');
        $('#impKeyAnother').removeClass('hide');
        // refresh grid
        options.viewModel('getKeys', function(result) {
          $("#mainKeyGrid").data("kendoGrid").dataSource.data(options.mapDates(result));
        });
      } else {
        $('#importAlert').showAlert('Import Error', error.type === 'error' ? error.message : 'Not a valid key text', 'error');
      }
    });
  }
  
  function onClear() {
    $('#newKey').val('');
    $('#importAlert').hide();
  }
  
  function onAnother() {
    $('#newKey').val('');
    $('#importAlert').hide();
    $('#newKey, #impKeySubmit, #impKeyClear').removeAttr('disabled');
    $('#impKeyAnother').addClass('hide');
  }
  
  $(document).ready(init);
  
}()); 
