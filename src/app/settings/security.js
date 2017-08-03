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

import './security.css';

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
  'reload_webmail_tab',
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
        <h3>{l10n.map.settings_security}</h3>
        <form className="form">
          <div className="form-group">
            <h4 className="control-label">{l10n.map.security_cache_header}</h4>
            <div className="radio form-inline">
              <label className="radio" id="pwdCacheLabel">
                <input type="radio" name="pwdCacheRadios" id="pwdCacheRadios1" value="true" />
                <span>{l10n.map.security_cache_on}</span>
                <input type="text" maxLength="3" id="pwdCacheTime" className="form-control" />
                <span>{l10n.map.security_cache_time}</span>
                <span className="help-block hide">{l10n.map.security_cache_help}</span>
              </label>
            </div>
            <div className="radio">
              <label className="radio">
                <input type="radio" name="pwdCacheRadios" id="pwdCacheRadios2" value="false" />
                <span>{l10n.map.security_cache_off}</span>
              </label>
            </div>
          </div>
          <div className="form-group" id="securityTokenPanel">
            <h4>{l10n.map.security_background_header}</h4>
            <p>{l10n.map.security_background_text}</p>
            <div id="securityBgndSliders">
              <div className="form-inline">
                <label htmlFor="angle">{l10n.map.security_background_angle}</label>
                <input type="range" min="0" max="360" id="angle" step="2" />
              </div>
              <div className="form-inline">
                <label htmlFor="scaling">{l10n.map.security_background_scaling}</label>
                <input type="range" min="5" max="100" id="scaling" step="1" />
              </div>
              <div className="form-inline">
                <label htmlFor="scaling">{l10n.map.security_background_coloring}</label>
                <input type="range" min="0" max="12" id="coloring" step="1" />
              </div>
            </div>
            <div className="previewContainer">
              <h5><strong>{l10n.map.security_background_preview}</strong></h5>
              <div id="previewArea"></div>
            </div>
          </div>
          <div className="form-group">
            <h4 className="control-label">{l10n.map.security_display_decrypted}</h4>
            <div className="radio">
              <label>
                <input type="radio" name="decryptRadios" id="decryptRadios2" value="popup" />
                <span>{l10n.map.security_display_popup}</span>
              </label>
            </div>
            <div className="radio">
              <label>
                <input type="radio" name="decryptRadios" id="decryptRadios1" value="inline" />
                <span>{l10n.map.security_display_inline}</span>
              </label>
            </div>
          </div>
          <div id="secReloadInfo" className="alert alert-success">{l10n.map.reload_webmail_tab}</div>
          <div className="form-group">
            <button id="secBtnSave" className="btn btn-primary" disabled>{l10n.map.form_save}</button>
            <button id="secBtnCancel" className="btn btn-default" disabled>{l10n.map.form_cancel}</button>
          </div>
        </form>
      </div>
    );
  }
}

var secBackground;

function init() {
  loadPrefs();
  $('#secReloadInfo').hide();
  $('#security input').on('input change', () => {
    $('#security .form-group button').prop('disabled', false);
    $('#secReloadInfo').hide();
  });
  $('input:radio[name="pwdCacheRadios"]').on('change', toggleCacheTime);
  $('#secBtnSave').click(onSave);
  $('#secBtnCancel').click(onCancel);
  // https://bugzilla.mozilla.org/show_bug.cgi?id=213519
  $('#pwdCacheTime').click(() => false);
  $('#scaling').on("input", previewSecurityBgnd);
  $('#angle').on("input", previewSecurityBgnd);
  $('#whitespace').on("input", previewSecurityBgnd);
  $('#coloring').on("input", previewSecurityBgnd);
  getSecurityBgndConfig();
}

function getSecurityBgndConfig() {
  mvelo.extension.sendMessage({event: "get-security-background"}, background => {
    secBackground = background;
    $("#angle").val(background.angle);
    $("#scaling").val(background.scaling * 10);
    $("#coloring").val(background.colorId);

    previewSecurityBgnd();
  });
}

function previewSecurityBgnd() {
  var scaling = parseInt($('#scaling').val()) / 10,
    angle = parseInt($('#angle').val()),
    colorId = parseInt($('#coloring').val()),
    secBgndIcon = mvelo.util.generateSecurityBackground({
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

  var angel = $("#angle").val(),
    scaling = ($("#scaling").val() / 10),
    coloring = $("#coloring").val(),
    iconColor = mvelo.SECURE_COLORS[coloring],
    update = {
      security: {
        display_decrypted: $('input:radio[name="decryptRadios"]:checked').val(),
        secureBgndAngle: angel,
        secureBgndScaling: scaling,
        secureBgndColorId: coloring,
        secureBgndIconColor: iconColor,
        password_cache: $('input:radio[name="pwdCacheRadios"]:checked').val() === 'true',
        password_timeout: $('#pwdCacheTime').val()
      }
    };
  mvelo.extension.sendMessage({event: 'set-prefs', data: update}, () => {
    normalize();
    $('#secReloadInfo').show();
    mvelo.util.showSecurityBackground();
  });
  return false;
}

function validate() {
  // password timeout betweet 1-999
  var pwdCacheTime = $('#pwdCacheTime');
  var timeout = parseInt(pwdCacheTime.val());
  if (timeout >= 1 && timeout <= 999) {
    pwdCacheTime.val(timeout);
    return true;
  } else {
    pwdCacheTime
    .closest('.radio')
    .addClass('has-error')
    .find('span.help-block')
    .removeClass('hide');
    return false;
  }
}

function normalize() {
  $('#security #secBtnSave').prop('disabled', true);
  $('#security #secBtnCancel').prop('disabled', true);
  $('#security .radio').removeClass('has-error');
  $('#security .help-block').addClass('hide');
  $('#secReloadInfo').hide();
}

function onCancel() {
  normalize();
  loadPrefs();
  return false;
}

function loadPrefs() {
  pgpModel('getPreferences')
  .then(prefs => {
    $('input:radio[name="decryptRadios"]').filter(function() {
      return $(this).val() === prefs.security.display_decrypted;
    }).prop('checked', true);
    $('input:radio[name="pwdCacheRadios"]').filter(function() {
      return $(this).val() === (prefs.security.password_cache ? 'true' : 'false');
    }).prop('checked', true);
    $('#pwdCacheTime').val(prefs.security.password_timeout);
    toggleCacheTime();
  });
}
