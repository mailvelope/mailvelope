/**
 * Copyright (C) 2012-2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import {SECURE_COLORS} from '../../lib/constants';
import $ from 'jquery';
import {port} from '../app';
import * as l10n from '../../lib/l10n';
import {generateSecurityBackground, showSecurityBackground} from '../../lib/util';

l10n.register([
  'settings_security',
  'security_cache_header',
  'security_cache_on',
  'security_cache_time',
  'security_cache_help',
  'security_cache_off',
  'security_background_header',
  'security_background_text',
  'security_background_angle',
  'security_background_scaling',
  'security_background_coloring',
  'security_background_preview',
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
          <div className="form-group">
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
          <div className="form-group" id="securityTokenPanel">
            <h3>{l10n.map.security_background_header}</h3>
            <p>{l10n.map.security_background_text}</p>
            <div className="row align-items-center">
              <div className="col-lg-6">
                <div>
                  <div className="mb-2">
                    <label className="mb-0" htmlFor="angle">{l10n.map.security_background_angle}</label>
                    <input className="custom-range" type="range" min="0" max="360" id="angle" step="2" />
                  </div>
                  <div className="mb-2">
                    <label className="mb-0" htmlFor="scaling">{l10n.map.security_background_scaling}</label>
                    <input className="custom-range" type="range" min="5" max="100" id="scaling" step="1" />
                  </div>
                  <div className="mb-2">
                    <label className="mb-0" htmlFor="scaling">{l10n.map.security_background_coloring}</label>
                    <input className="custom-range" type="range" min="0" max="12" id="coloring" step="1" />
                  </div>
                </div>
              </div>
              <div className="col-lg-6">
                <div className="previewContainer">
                  <h3><strong>{l10n.map.security_background_preview}</strong></h3>
                  <div id="previewArea" className="w-100 border" style={{height: '150px'}}></div>
                </div>
              </div>
            </div>
          </div>
          <div className="form-group">
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
          <div className="form-group">
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

let secBackground;

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
  $('#scaling').on('input', previewSecurityBgnd);
  $('#angle').on('input', previewSecurityBgnd);
  $('#whitespace').on('input', previewSecurityBgnd);
  $('#coloring').on('input', previewSecurityBgnd);
  getSecurityBgndConfig();
}

function getSecurityBgndConfig() {
  port.send('get-security-background')
  .then(background => {
    secBackground = background;
    $('#angle').val(background.angle);
    $('#scaling').val(background.scaling * 10);
    $('#coloring').val(background.colorId);
    previewSecurityBgnd();
  });
}

function previewSecurityBgnd() {
  const scaling = parseInt($('#scaling').val()) / 10;
  const angle = parseInt($('#angle').val());
  const colorId = parseInt($('#coloring').val());
  const secBgndIcon = generateSecurityBackground({
    width: secBackground.width,
    height: secBackground.height,
    scaling,
    angle,
    colorId
  });

  $('#previewArea').css({
    'backgroundColor': secBackground.color,
    'backgroundPosition': '-20px -20px',
    'backgroundImage': `url(data:image/svg+xml;base64,${btoa(secBgndIcon)})`
  });
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
  const angel = $('#angle').val();
  const scaling = ($('#scaling').val() / 10);
  const coloring = $('#coloring').val();
  const iconColor = SECURE_COLORS[coloring];
  const update = {
    security: {
      display_decrypted: $('input:radio[name="decryptRadios"]:checked').val(),
      secureBgndAngle: angel,
      secureBgndScaling: scaling,
      secureBgndColorId: coloring,
      secureBgndIconColor: iconColor,
      password_cache: $('input:radio[name="pwdCacheRadios"]:checked').val() === 'true',
      password_timeout: $('#pwdCacheTime').val(),
      hide_armored_header: $('input:checkbox[name="hideArmoredHeader"]').is(':checked')
    }
  };
  port.send('set-prefs', {prefs: update})
  .then(() => {
    normalize();
    $('#secReloadInfo').show();
    showSecurityBackground(port);
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
