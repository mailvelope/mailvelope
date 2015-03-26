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

'use strict';

var mvelo = mvelo || null;
var options = options || null;

(function(options) {

  var bgndColor;

  function init() {
    loadPrefs();
    $('#secReloadInfo').hide();
    $('#security input').on('input change', function() {
      $('#security .form-group button').prop('disabled', false);
      $('#secReloadInfo').hide();
    });
    $('input:radio[name="editorModeRadios"]').on('change', editorModeWarning);
    $('input:radio[name="pwdCacheRadios"]').on('change', toggleCacheTime);
    $('#secBtnSave').click(onSave);
    $('#secBtnCancel').click(onCancel);
    // https://bugzilla.mozilla.org/show_bug.cgi?id=213519
    $('#pwdCacheTime').click(function() {
      return false;
    });
    $('#scaling').on("input", previewSecurityBgnd);
    $('#angle').on("input", previewSecurityBgnd);
    $('#whitespace').on("input", previewSecurityBgnd);
    getSecurityBgndConfig();
  }

  function getSecurityBgndConfig() {
    mvelo.extension.sendMessage({event: "get-security-background"}, function(background) {
      bgndColor = background.color; //"#f5f5f5";
      $("#angle").val(background.angle);
      $("#scaling").val(background.scaling * 10);

      previewSecurityBgnd();
    });
  }

  function previewSecurityBgnd() {
    var scale = $('#scaling').val();
    var rotationDeg = $('#angle').val();

    var secBgndIcon = mvelo.util.generateSecurityBackground(rotationDeg, scale / 10);

    $("#previewArea").css("background-color", bgndColor + " !important;");
    $("#previewArea").css("background-position", "-20px -20px !important;");
    $("#previewArea").css("background-image", "url(data:image/svg+xml;base64," + btoa(secBgndIcon) + ")");
  }

  function editorModeWarning() {
    if ($('#editorModeRadios2').prop('checked')) {
      $('#editorModeWarn').show();
    } else {
      $('#editorModeWarn').hide();
    }
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
    var update = {
      security: {
        display_decrypted: $('input:radio[name="decryptRadios"]:checked').val(),
        editor_mode: $('input:radio[name="editorModeRadios"]:checked').val(),
        secureBgndAngle: $("#angle").val(),
        secureBgndScaling: ($("#scaling").val() / 10),
        password_cache: $('input:radio[name="pwdCacheRadios"]:checked').val() === 'true',
        password_timeout: $('#pwdCacheTime').val()
      }
    };
    mvelo.extension.sendMessage({ event: 'set-prefs', data: update }, function() {
      options.event.triggerHandler('prefs-security-update');
      normalize();
      $('#secReloadInfo').show();
      mvelo.util.showSecurityBackground();
    });
    return false;
  }

  function validate() {
    // password timeout betweet 1-999
    if ($('input:radio[name="pwdCacheRadios"]:checked').val() === 'true') {
      var pwdCacheTime = $('#pwdCacheTime');
      var timeout = parseInt(pwdCacheTime.val());
      if (timeout >= 1 && timeout <= 999) {
        return true;
      } else {
        pwdCacheTime.closest('.control-group').addClass('error')
                                              .find('span.help-inline').removeClass('hide');
        return false;
      }
    }
    return true;
  }

  function normalize() {
    $('#security #secBtnSave').prop('disabled', true);
    $('#security #secBtnCancel').prop('disabled', true);
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
    options.pgpModel('getPreferences', function(err, prefs) {
      $('input:radio[name="decryptRadios"]').filter(function() {
        return $(this).val() === prefs.security.display_decrypted;
      }).prop('checked', true);
      $('#secCode').val(prefs.security.secure_code);
      $('#secColor').val(prefs.security.secure_color);
      $('input:radio[name="editorModeRadios"]').filter(function() {
        return $(this).val() === prefs.security.editor_mode;
      }).prop('checked', true);
      $('input:radio[name="pwdCacheRadios"]').filter(function() {
        return $(this).val() === (prefs.security.password_cache ? 'true' : 'false');
      }).prop('checked', true);
      $('#pwdCacheTime').val(prefs.security.password_timeout);
      editorModeWarning();
      toggleCacheTime();
    });
  }

  options.event.on('ready', init);

}(options));
