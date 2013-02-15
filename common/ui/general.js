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
    $('#general input').on('input change', function() {
      $('#general .form-actions button').removeAttr('disabled');
      $('#genReloadInfo').hide();
    });
    $('#genBtnSave').click(onSave);
    $('#genBtnCancel').click(onCancel);
  }

  function onSave() {
    if (!validate()) return false;
    prefs.general.editor_type = $('input:radio[name="editorRadios"]:checked').val();
    keyRing.sendMessage({ event: 'set-prefs', data: prefs }, function() {
      normalize();
      $('#genReloadInfo').show();
    });
    return false;
  }

  function validate() {
    return true;
  }

  function normalize() {
    $('#general .form-actions button').attr('disabled', 'disabled');
    $('#general .control-group').removeClass('error');
    $('#general .help-inline').addClass('hide');
    $('#genReloadInfo').hide();
  }

  function onCancel() {
    normalize();
    loadPrefs();
    return false;
  }

  function loadPrefs() {
    keyRing.viewModel('getPreferences', function(result) {
      prefs = result;
      $('input:radio[name="editorRadios"]').filter(function() {
        return $(this).val() === prefs.general.editor_type;
      }).attr('checked', 'checked');
    });
  }

  $(document).ready(init);
  
}()); 
 
