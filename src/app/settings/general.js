/**
 * Copyright (C) 2012-2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

'use strict';

import React from 'react';
import mvelo from '../../mvelo';
import $ from 'jquery';
import {pgpModel} from '../app';
import * as l10n from '../../lib/l10n';

l10n.register([
  'settings_general',
  'keygrid_primary_key',
  'general_primary_key_always',
  'general_primary_key_auto_sign',
  'form_save',
  'form_cancel'
]);

export default class General extends React.Component {
  constructor(props) {
    super(props);
  }

  componentDidMount() {
    init();
  }

  render() {
    return (
      <div id="general">
        <h3>{l10n.map.settings_general}</h3>
        <form className="form">
          <div className="form-group">
            <h4 className="control-label">{l10n.map.keygrid_primary_key}</h4>
            <div className="checkbox">
              <label>
                <input type="checkbox" id="autoAddPrimary" />
                <span>{l10n.map.general_primary_key_always}</span>
              </label>
            </div>
            <div className="checkbox">
              <label>
                <input type="checkbox" id="autoSignMsg" />
                <span>{l10n.map.general_primary_key_auto_sign}</span>
              </label>
            </div>
          </div>
          <div className="form-group">
            <button id="genBtnSave" className="btn btn-primary" disabled>{l10n.map.form_save}</button>
            <button id="genBtnCancel" className="btn btn-default" disabled>{l10n.map.form_cancel}</button>
          </div>
        </form>
      </div>
    );
  }
}

function init() {
  loadPrefs();
  $('#autoAddPrimary, #autoSignMsg').on('change', function() {
    $('#genBtnSave').prop("disabled", false);
    $('#genBtnCancel').prop("disabled", false);
  });
  $('#genBtnSave').click(onSave);
  $('#genBtnCancel').click(onCancel);
}

function onSave() {
  if (!validate()) {
    return false;
  }
  var update = {
    general: {
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
    });
}
