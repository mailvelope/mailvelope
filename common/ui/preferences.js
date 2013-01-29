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

  var prefs;
  
  function init() {
    loadPrefs();
    $('input').on('input change', function() {
      $('.form-actions button').removeAttr('disabled');
    });
    $('#prefBtnSave').click(onSave);
    $('#prefBtnCancel').click(onCancel);
  }

  function onSave() {
    prefs.security.display_decrypted = $('input:radio[name="decryptRadios"]:checked').val();
    prefs.security.secure_code = $('#secCode').val();
    prefs.security.secure_color = $('#secColor').val();
    keyRing.sendMessage({ event: 'set-prefs', data: prefs }, function() {
      keyRing.update();
      $('.form-actions button').attr('disabled', 'disabled');  
    });
    

  }

  function onCancel() {
    $('.form-actions button').attr('disabled', 'disabled');
    loadPrefs();
  }

  function loadPrefs() {
    keyRing.viewModel('getPreferences', function(result) {
      prefs = result;
      $('input:radio[name="decryptRadios"]').filter(function() {
        return $(this).val() === prefs.security.display_decrypted;
      }).attr('checked', 'checked');
      $('#secCode').val(prefs.security.secure_code);
      $('#secColor').val(prefs.security.secure_color);
    });
  }

  $(document).ready(init);
  
}()); 
 
