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

var mvelo = mvelo || null;
var options = options || null;

(function(options) {

  function init() {
    loadPrefs();
    $('#keyserverInputHkpUrl').on('change', function() {
      $('#keyserverBtnSave').prop("disabled", false);
      $('#keyserverBtnCancel').prop("disabled", false);
    });
    $('#keyserverBtnSave').click(onSave);
    $('#keyserverBtnCancel').click(onCancel);
  }

  function onSave() {
    var hkpBaseUrl = $('#keyserverInputHkpUrl').val();
    validate(hkpBaseUrl).then(function() {
      // valid key server url
      var update = {
        keyserver: {
          hkp_base_url: hkpBaseUrl
        }
      };
      mvelo.extension.sendMessage({event: 'set-prefs', data: update}, function() {
        normalize();
        options.event.triggerHandler('hkp-url-update');
      });

    }).catch(function() {
      // TODO: change text
      $('#keyserverAlert').showAlert(options.l10n.key_import_error, options.l10n.key_import_too_big, 'danger', true);
    });

    return false;
  }

  function onCancel() {
    normalize();
    loadPrefs();
    return false;
  }

  function validate(hkpBaseUrl) {
    var uri = hkpBaseUrl + '/pks/lookup?op=get&options=mr&search=0x360E65AE21F4E07C';
    return new Promise(function(resolve, reject) {
      $.get(uri, function(data, statusText, xhr) {
        if (xhr.status === 200 || xhr.status === 404) {
          resolve();
        } else {
          reject();
        }

      }).fail(reject);
    });
  }

  function normalize() {
    $('#keyserver .form-group button').prop('disabled', true);
    $('#keyserver .control-group').removeClass('error');
    $('#keyserver .help-inline').addClass('hide');
  }

  function loadPrefs() {
    options.pgpModel('getPreferences').then(function(prefs) {
      $('#keyserverInputHkpUrl').val(prefs.keyserver.hkp_base_url);
    });
  }

  options.event.on('ready', init);

}(options));
