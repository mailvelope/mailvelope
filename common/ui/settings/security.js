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

  options.registerL10nMessages([
    "security_token_title",
    "security_token_info"
  ]);

  var bgndColor;
  var color;
  var scale;
  var rotationDeg;
  var unscaledWidth;
  var unscaledHeight;

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
    $('#secTokenInfo').popover({
      title: options.l10n.security_token_title,
      content: options.l10n.security_token_info
    });
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
      color = background.iconColor; //"#e9e9e9;";
      scale = background.scaling; //1.5;
      rotationDeg = background.angle; //35;
      unscaledWidth =  background.width; //45;
      unscaledHeight = background.height; //25;

      $("#angle").val(rotationDeg);
      $("#scaling").val(scale * 10);

      previewSecurityBgnd();
    });
  }

  function previewSecurityBgnd() {
    scale = $('#scaling').val();
    rotationDeg = $('#angle').val();
    var width =  unscaledWidth * (scale / 10);
    var height = unscaledHeight * (scale / 10);

    var secBgndIcon = '<?xml version="1.0" encoding="UTF-8" standalone="no"?><svg xmlns="http://www.w3.org/2000/svg" id="secBgnd" version="1.1" width="' + width + 'px" height="' + height + 'px" viewBox="0 0 27 27"><path transform="rotate(' + rotationDeg + ' 14 14)" style="fill: ' + color + ';" d="m 13.963649,25.901754 c -4.6900005,0 -8.5000005,-3.78 -8.5000005,-8.44 0,-1.64 0.47,-3.17 1.29,-4.47 V 9.0417546 c 0,-3.9399992 3.23,-7.1499992 7.2000005,-7.1499992 3.97,0 7.2,3.21 7.2,7.1499992 v 3.9499994 c 0.82,1.3 1.3,2.83 1.3,4.48 0,4.65 -3.8,8.43 -8.49,8.43 z m -1.35,-7.99 v 3.33 h 0 c 0,0.02 0,0.03 0,0.05 0,0.74 0.61,1.34 1.35,1.34 0.75,0 1.35,-0.6 1.35,-1.34 0,-0.02 0,-0.03 0,-0.05 h 0 v -3.33 c 0.63,-0.43 1.04,-1.15 1.04,-1.97 0,-1.32 -1.07,-2.38 -2.4,-2.38 -1.32,0 -2.4,1.07 -2.4,2.38 0.01,0.82 0.43,1.54 1.06,1.97 z m 6.29,-8.8699994 c 0,-2.7099992 -2.22,-4.9099992 -4.95,-4.9099992 -2.73,0 -4.9500005,2.2 -4.9500005,4.9099992 V 10.611754 C 10.393649,9.6217544 12.103649,9.0317546 13.953649,9.0317546 c 1.85,0 3.55,0.5899998 4.94,1.5799994 l 0.01,-1.5699994 z" /></svg>';
    //var secBgndIcon = `<?xml version="1.0" encoding="UTF-8" standalone="no"?><svg xmlns="http://www.w3.org/2000/svg" id="secBgnd" version="1.1" width="${width}'px" height="${height}px" viewBox="0 0 27 27"><path transform="rotate(${rotationDeg} 14 14)" style="fill:${color};" d="m 13.963649,25.901754 c -4.6900005,0 -8.5000005,-3.78 -8.5000005,-8.44 0,-1.64 0.47,-3.17 1.29,-4.47 V 9.0417546 c 0,-3.9399992 3.23,-7.1499992 7.2000005,-7.1499992 3.97,0 7.2,3.21 7.2,7.1499992 v 3.9499994 c 0.82,1.3 1.3,2.83 1.3,4.48 0,4.65 -3.8,8.43 -8.49,8.43 z m -1.35,-7.99 v 3.33 h 0 c 0,0.02 0,0.03 0,0.05 0,0.74 0.61,1.34 1.35,1.34 0.75,0 1.35,-0.6 1.35,-1.34 0,-0.02 0,-0.03 0,-0.05 h 0 v -3.33 c 0.63,-0.43 1.04,-1.15 1.04,-1.97 0,-1.32 -1.07,-2.38 -2.4,-2.38 -1.32,0 -2.4,1.07 -2.4,2.38 0.01,0.82 0.43,1.54 1.06,1.97 z m 6.29,-8.8699994 c 0,-2.7099992 -2.22,-4.9099992 -4.95,-4.9099992 -2.73,0 -4.9500005,2.2 -4.9500005,4.9099992 V 10.611754 C 10.393649,9.6217544 12.103649,9.0317546 13.953649,9.0317546 c 1.85,0 3.55,0.5899998 4.94,1.5799994 l 0.01,-1.5699994 z" /></svg>`;

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
