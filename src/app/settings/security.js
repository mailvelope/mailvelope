/**
 * Copyright (C) 2012-2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import $ from 'jquery';
import {port} from '../app';
import * as l10n from '../../lib/l10n';

l10n.register([
  'settings_security',
  'security_cache_header',
  'security_cache_on',
  'security_cache_time',
  'security_cache_help',
  'security_cache_off',
  'security_display_decrypted',
  'security_display_popup',
  'security_display_inline',
  'security_openpgp_header',
  'security_hide_armored_head',
  'reload_tab',
  'form_save',
  'form_cancel'
]);

export default class Security extends React.Component {
  componentDidMount() {
    init();
  }

  render() {
    return (
      <div id="security">
        <h2 className="mb-4">{l10n.map.settings_security}</h2>
        <form className="form">
          <div className="form-group mb-4">
            <h3>{l10n.map.security_cache_header}</h3>
            <div className="form-inline">
              <div className="custom-control custom-radio custom-control-inline mr-2">
                <input type="radio" name="pwdCacheRadios" id="pwdCacheRadios1" value="true" className="custom-control-input" />
                <label className="custom-control-label" htmlFor="pwdCacheRadios1">{l10n.map.security_cache_on}</label>
              </div>
              <input type="text" maxLength="3" id="pwdCacheTime" style={{width: '50px'}} className="form-control mr-2 text-right" />
              <label className="my-1 mr-2" htmlFor="pwdCacheTime">{l10n.map.security_cache_time}</label>
              <div className="invalid-feedback mb-2">{l10n.map.security_cache_help}</div>
            </div>
            <div className="custom-control custom-radio custom-control-inline mr-2">
              <input type="radio" name="pwdCacheRadios" id="pwdCacheRadios2" value="false" className="custom-control-input" />
              <label className="custom-control-label" htmlFor="pwdCacheRadios2">{l10n.map.security_cache_off}</label>
            </div>
          </div>
          <div className="form-group mb-4">
            <h3>{l10n.map.security_display_decrypted}</h3>
            <div className="custom-control custom-radio">
              <input type="radio" name="decryptRadios" id="decryptRadios2" value="popup" className="custom-control-input" />
              <label className="custom-control-label" htmlFor="decryptRadios2">{l10n.map.security_display_popup}</label>
            </div>
            <div className="custom-control custom-radio">
              <input type="radio" name="decryptRadios" id="decryptRadios1" value="inline" className="custom-control-input" />
              <label className="custom-control-label" htmlFor="decryptRadios1">{l10n.map.security_display_inline}</label>
            </div>
          </div>
          <div className="form-group mb-4">
            <h3>{l10n.map.security_openpgp_header}</h3>
            <div className="custom-control custom-checkbox">
              <input className="custom-control-input" type="checkbox" id="hideArmoredHeader" name="hideArmoredHeader" />
              <label className="custom-control-label" htmlFor="hideArmoredHeader">{l10n.map.security_hide_armored_head}</label>
            </div>
          </div>
          <div id="secReloadInfo" className="alert alert-success">{l10n.map.reload_tab}</div>
          <div className="btn-bar">
            <button type="button" id="secBtnSave" className="btn btn-primary" disabled>{l10n.map.form_save}</button>
            <button type="button" id="secBtnCancel" className="btn btn-secondary" disabled>{l10n.map.form_cancel}</button>
          </div>
        </form>
      </div>
    );
  }
}

function init() {
  loadPrefs();
  $('#secReloadInfo').hide();
  $('#security input').on('input change', () => {
    $('#security .btn-bar button').prop('disabled', false);
    $('#secReloadInfo').hide();
  });
  $('input:radio[name="pwdCacheRadios"]').on('change', toggleCacheTime);
  $('#secBtnSave').click(onSave);
  $('#secBtnCancel').click(onCancel);
  // https://bugzilla.mozilla.org/show_bug.cgi?id=213519
  $('#pwdCacheTime').click(() => false);
}

function toggleCacheTime() {
  if ($('#pwdCacheRadios1').prop('checked')) {
    $('#pwdCacheTime').prop('disabled', false);
  } else {
    $('#pwdCacheTime').prop('disabled', true);
  }
}

function onSave() {
  if (!validate()) {
    return false;
  }
  const update = {
    security: {
      display_decrypted: $('input:radio[name="decryptRadios"]:checked').val(),
      password_cache: $('input:radio[name="pwdCacheRadios"]:checked').val() === 'true',
      password_timeout: $('#pwdCacheTime').val(),
      hide_armored_header: $('input:checkbox[name="hideArmoredHeader"]').is(':checked')
    }
  };
  port.send('set-prefs', {prefs: update})
  .then(() => {
    normalize();
    $('#secReloadInfo').show();
  });
  return false;
}

function validate() {
  // password timeout betweet 1-999
  const pwdCacheTime = $('#pwdCacheTime');
  const timeout = parseInt(pwdCacheTime.val());
  if (timeout >= 1 && timeout <= 999) {
    pwdCacheTime.val(timeout);
    return true;
  } else {
    pwdCacheTime
    .addClass('is-invalid');
    return false;
  }
}

function normalize() {
  $('#security #secBtnSave').prop('disabled', true);
  $('#security #secBtnCancel').prop('disabled', true);
  $('#security input').removeClass('is-invalid');
  $('#secReloadInfo').hide();
}

function onCancel() {
  normalize();
  loadPrefs();
  return false;
}

function loadPrefs() {
  port.send('get-prefs')
  .then(prefs => {
    $('input:radio[name="decryptRadios"]').filter(function() {
      return $(this).val() === prefs.security.display_decrypted;
    }).prop('checked', true);
    $('input:radio[name="pwdCacheRadios"]').filter(function() {
      return $(this).val() === (prefs.security.password_cache ? 'true' : 'false');
    }).prop('checked', true);
    $('#pwdCacheTime').val(prefs.security.password_timeout);
    toggleCacheTime();
    $('input:checkbox[name="hideArmoredHeader"]').prop('checked', prefs.security.hide_armored_header);
  });
}
