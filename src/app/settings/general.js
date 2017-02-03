/**
 * Mailvelope - secure email with OpenPGP encryption for Webmail
 * Copyright (C) 2012-2015 Mailvelope GmbH
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

import mvelo from '../../mvelo';
import $ from 'jquery';
import {pgpModel} from '../app';
import event from '../util/event';


function init() {
  loadPrefs();
  $('#autoAddPrimary, #autoSignMsg').on('change', function() {
    $('#genBtnSave').prop("disabled", false);
    $('#genBtnCancel').prop("disabled", false);
  });
  $('#genBtnSave').click(onSave);
  $('#genBtnCancel').click(onCancel);
  // disable editor selection
  $('input:radio[name="editorRadios"]').prop('disabled', true);
}

function onSave() {
  if (!validate()) {
    return false;
  }
  var update = {
    general: {
      editor_type: $('input:radio[name="editorRadios"]:checked').val(),
      auto_add_primary: $('#autoAddPrimary:checked').length !== 0,
      auto_sign_msg: $('#autoSignMsg:checked').length !== 0
    }
  };
  mvelo.extension.sendMessage({ event: 'set-prefs', data: update }, function() {
    normalize();
  });
  return false;
}

function onCancel() {
  normalize();
  loadPrefs();
  return false;
}

function validate() {
  return true;
}

function normalize() {
  $('#general .form-group button').prop('disabled', true);
  $('#general .control-group').removeClass('error');
  $('#general .help-inline').addClass('hide');
}

function loadPrefs() {
  pgpModel('getPreferences')
    .then(function(prefs) {
      $('#autoAddPrimary').prop('checked', prefs.general.auto_add_primary);
      $('#autoSignMsg').prop('checked', prefs.general.auto_sign_msg);
      $('input:radio[name="editorRadios"]').filter(function() {
        return $(this).val() === prefs.general.editor_type;
      }).prop('checked', true);
    });
}

event.on('ready', init);
