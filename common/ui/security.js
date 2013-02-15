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
    $('#security input').on('input change', function() {
      $('#security .form-actions button').removeAttr('disabled');
      $('#secReloadInfo').hide();
    });
    $('input:radio[name="editorModeRadios"]').on('change', editorModeWarning);
    $('#secBtnSave').click(onSave);
    $('#secBtnCancel').click(onCancel);
  }

  function editorModeWarning() {
    if ($('#editorModeRadios2').attr('checked')) {
      $('#editorModeWarn').show();
    } else {
      $('#editorModeWarn').hide();
    }
  }

  function onSave() {
    if (!validate()) return false;
    prefs.security.display_decrypted = $('input:radio[name="decryptRadios"]:checked').val();
    prefs.security.editor_mode = $('input:radio[name="editorModeRadios"]:checked').val();
    prefs.security.secure_code = $('#secCode').val();
    prefs.security.secure_color = $('#secColor').val();
    keyRing.sendMessage({ event: 'set-prefs', data: prefs }, function() {
      keyRing.update();
      normalize();
      $('#secReloadInfo').show();
    });
    return false;
  }

  function validate() {
    var secCode = $('#secCode');
    if (secCode.val().length !== 3) {
      secCode.closest('.control-group').addClass('error');
      secCode.next().removeClass('hide');
      return false;
    }
    return true;
  }

  function normalize() {
    $('#security .form-actions button').attr('disabled', 'disabled');
    $('#security .control-group').removeClass('error');
    $('#security .help-inline').addClass('hide');
    $('#secReloadInfo').hide();
  }

  function onCancel() {
    normalize();
    loadPrefs();
    return false;
  }

  function loadPrefs() {
    keyRing.viewModel('getPreferences', function(result) {
      prefs = result;
      $('input:radio[name="decryptRadios"]').filter(function() {
        return $(this).val() === prefs.security.display_decrypted;
      }).attr('checked', 'checked');
      $('#secCode').val(prefs.security.secure_code);
      $('#secColor').val(prefs.security.secure_color);
      $('input:radio[name="editorModeRadios"]').filter(function() {
        return $(this).val() === prefs.security.editor_mode;
      }).attr('checked', 'checked');
      editorModeWarning();
    });
  }

  $(document).ready(init);
  
}()); 
 
