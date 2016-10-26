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
import * as app from '../app';
import event from '../util/event';
import * as l10n from '../util/l10n';


var publicKeyRegex = /-----BEGIN PGP PUBLIC KEY BLOCK-----[\s\S]+?-----END PGP PUBLIC KEY BLOCK-----/g;
var privateKeyRegex = /-----BEGIN PGP PRIVATE KEY BLOCK-----[\s\S]+?-----END PGP PRIVATE KEY BLOCK-----/g;

var KEY_ID_REGEX = /^([0-9a-f]{8}|[0-9a-f]{16}|[0-9a-f]{40})$/i;
var HKP_SERVER_BASE_URL;
var MAX_KEY_IMPORT_SIZE = 10000000;

l10n.register([
  "key_import_error",
  "key_import_too_big",
  "key_import_invalid_text",
  "key_import_exception",
  "alert_header_warning",
  "alert_header_success",
  "key_import_hkp_search_ph"
]);

function init() {
  $('#selectFileButton').on('click', function() {
    $('#impKeyFilepath').click();
  });

  $('#impKeySubmit').click(function() {
    var keyText = $('#newKey').val();
    onImportKey(keyText);
  });

  $('#impKeySubmit, #impKeyClear').prop('disabled', true);
  $('#newKey').on('input', function() {
    $('#impKeySubmit, #impKeyClear').prop('disabled', !$(this).val());
  });

  $('#impKeyClear').click(onClear);
  $('#impKeyFilepath').change(onChangeFile);

  hkpUrlLoad();
  $('#keySearchInput').attr('placeholder', l10n.map.key_import_hkp_search_ph);
  $('#keySearchForm').submit(onSearchKey);
}

function hkpUrlLoad() {
  app.pgpModel('getPreferences').then(function(prefs) {
    HKP_SERVER_BASE_URL = prefs.keyserver.hkp_base_url;
  });
}

function onSearchKey() {
  var q = $('#keySearchInput').val();
  q = KEY_ID_REGEX.test(q) ? ('0x' + q) : q; // prepend '0x' to query for key IDs
  var url = HKP_SERVER_BASE_URL + '/pks/lookup?op=index&search=' + window.encodeURIComponent(q);
  app.openTab(url);
}

function onImportKey(keyText, callback) {
  clearAlert();

  if (keyText.length > MAX_KEY_IMPORT_SIZE) {
    $('#importAlert').showAlert(l10n.map.key_import_error, l10n.map.key_import_too_big, 'danger', true);
    return;
  }

  // find all public and private keys in the textbox
  var publicKeys = keyText.match(publicKeyRegex);
  var privateKeys = keyText.match(privateKeyRegex);

  var keys = [];

  if (publicKeys) {
    publicKeys.forEach(function(pub) {
      pub = mvelo.util.decodeQuotedPrint(pub);
      keys.push({type: 'public', armored: pub});
    });
  }

  if (privateKeys) {
    privateKeys.forEach(function(priv) {
      priv = mvelo.util.decodeQuotedPrint(priv);
      keys.push({type: 'private', armored: priv});
    });
  }

  if (keys.length === 0) {
    $('#importAlert').showAlert(l10n.map.key_import_error, l10n.map.key_import_invalid_text, 'danger', true);
    return;
  }

  app.keyring('importKeys', [keys])
  .then(function(result) {
    var success = false;
    result.forEach(function(imported) {
      var heading;
      var type = imported.type;
      switch (imported.type) {
        case 'success':
          heading = l10n.map.alert_header_success;
          success = true;
          break;
        case 'warning':
          heading = l10n.map.alert_header_warning;
          break;
        case 'error':
          heading = l10n.map.key_import_error;
          type = 'danger';
          break;
      }
      $('#importAlert').showAlert(heading, imported.message, type, true);
    });
    if (callback) {
      callback(result);
    }
    importDone(success);
  })
  .catch(function(error) {
    $('#importAlert').showAlert(l10n.map.key_import_error, error.type === 'error' ? error.message : l10n.map.key_import_exception, 'danger', true);
    if (callback) {
      callback([{type: 'error'}]);
    }
  });
}

export function importKey(armored, callback) {
  onClear();
  $('#newKey').val(armored);
  $('#newKey').triggerHandler('input');
  onImportKey(armored, callback);
}

function onChangeFile(event) {
  clearAlert();
  var reader = new FileReader();
  var file = event.target.files[0];
  reader.onloadend = function(ev) {
    onImportKey(ev.target.result);
  };

  if (file.size > MAX_KEY_IMPORT_SIZE) {
    $('#importAlert').showAlert(l10n.map.key_import_error, l10n.map.key_import_too_big, 'danger', true);
    return;
  }
  reader.readAsText(file);
}

function importDone(success) {
  if (success) {
    // refresh grid
    event.triggerHandler('keygrid-reload');
  }
}

function onClear() {
  $('#impKeySubmit, #impKeyClear').prop('disabled', true);
  $('#importKey form').trigger('reset');
  clearAlert();
}

function clearAlert() {
  $('#importAlert').empty();
}

event.on('ready', init);
event.on('hkp-url-update', hkpUrlLoad);
event.on('keygrid-reload', () => {
  if (app.isDemail) {
    $('#keySearchForm').hide();
  } else {
    $('#keySearchForm').show();
  }
});
