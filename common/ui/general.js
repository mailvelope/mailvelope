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
    // this is triggered on startup
    keyRing.event.on('keygrid-data-change', keyRingUpdate);
    // change event enables form buttons
    $('#general input, #primaryKey').on('input change', function() {
      $('#general .form-actions button').prop('disabled', false);
      $('#genReloadInfo').hide();
    });
    // empty selection disables primary key options
    $('#primaryKey').on('change', onPrimaryChange);
    $('#genBtnSave').click(onSave);
    $('#genBtnCancel').click(onCancel);
  }

  function onSave() {
    if (!validate()) return false;
    var update = {
      general: {
        editor_type: $('input:radio[name="editorRadios"]:checked').val(),
        primary_key: $('#primaryKey > option:selected').val(),
        auto_add_primary: $('#autoAddPrimary:checked').length !== 0
      }
    }
    keyRing.sendMessage({ event: 'set-prefs', data: update }, function() {
      normalize();
      $('#genReloadInfo').show();
    });
    return false;
  }

  function onCancel() {
    normalize();
    clearPrimarySelect();
    loadPrefs();
    return false;
  }

  function validate() {
    return true;
  }

  function normalize() {
    $('#general .form-actions button').prop('disabled', true);
    $('#general .control-group').removeClass('error');
    $('#general .help-inline').addClass('hide');
    $('#genReloadInfo').hide();
  }

  function initPrimarySelect(callback) {
    $('#primaryKey').empty()
                    .append($('<option/>'));
    loadPrivateKeys(function() {
      clearPrimarySelect();
      callback();
    });
  }

  function onPrimaryChange() {
    if ($('#primaryKey > option:selected').val() === '') {
      $('#autoAddPrimary').prop('checked', false)
                          .prop('disabled', true);
    } else {
      $('#autoAddPrimary').prop('disabled', false);
    }
  }

  function clearPrimarySelect() {
    $('#primaryKey > option:first').prop('selected', true);
    $('#autoAddPrimary').prop('checked', false)
                        .prop('disabled', true);
  }

  function keyRingUpdate() {
    // init primary select and call save if primary_key was deleted
    initPrimarySelect(function() {
      loadPrefs(function(prefs) {
        if (prefs.general.primary_key !== $('#primaryKey > option:selected').val()) {
          onSave();
        } else {
          normalize();
        }
      });
    });
  }

  function loadPrivateKeys(callback) {
    keyRing.viewModel('getPrivateKeys', function(keys) {
      var select = $('#primaryKey');
      keys && keys.forEach(function(key) {
        select.append($('<option/>', {
          value: key.id,
          text: key.name + ' <' + key.email + '> - ' + key.id.substring(8)
        }));
      });
      callback();
    });
  }

  function loadPrefs(callback) {
    keyRing.viewModel('getPreferences', function(prefs) {
      $('input:radio[name="editorRadios"]').filter(function() {
        return $(this).val() === prefs.general.editor_type;
      }).attr('checked', 'checked');
      $('#primaryKey > option').filter(function() {
          return $(this).val() === prefs.general.primary_key;
      }).prop('selected', true);
      if (prefs.general.auto_add_primary) {
        $('#autoAddPrimary').prop('checked', true);
      }
      onPrimaryChange();
      if (callback) callback(prefs);
    });
  }

  $(document).ready(init);
  
}()); 
 
