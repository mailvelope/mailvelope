/**
 * Copyright (C) 2012-2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import $ from 'jquery';
import {port} from '../app';
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
            <button type="button" id="genBtnSave" className="btn btn-primary" disabled>{l10n.map.form_save}</button>
            <button type="button" id="genBtnCancel" className="btn btn-default" disabled>{l10n.map.form_cancel}</button>
          </div>
        </form>
      </div>
    );
  }
}

function init() {
  loadPrefs();
  $('#autoAddPrimary, #autoSignMsg').on('change', () => {
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
  const update = {
    general: {
      auto_add_primary: $('#autoAddPrimary:checked').length !== 0,
      auto_sign_msg: $('#autoSignMsg:checked').length !== 0
    }
  };
  port.send('set-prefs', {prefs: update})
  .then(normalize);
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
  port.send('get-prefs')
  .then(prefs => {
    $('#autoAddPrimary').prop('checked', prefs.general.auto_add_primary);
    $('#autoSignMsg').prop('checked', prefs.general.auto_sign_msg);
  });
}
