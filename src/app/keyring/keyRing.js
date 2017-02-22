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
import * as l10n from '../../lib/l10n';
import React from 'react';
import ReactDOM from 'react-dom';

import KeyDetails from './components/KeyDetails';
import KeyringBackup from './components/KeyringBackup';
import GenerateKey from './GenerateKey';
import ImportKey from './importKey';

import './keyRing.css';


l10n.register([
  'keygrid_delete_confirmation',
  'keygrid_primary_label'
]);

var keyTmpl;
var $tableBody;
var tableRow;
var filterType = 'allkeys';
var isKeygridLoaded = false;

const state = {keys: null};

export var importKeyComp = null;

function init() {
  //Init templates
  if (keyTmpl === undefined) {
    keyTmpl = $('#keyRingTable tbody').html();
  }
  $('#exportMenuBtn').on('click', openExportKeyringDialog);
  $('#keyringFilterBtn').on('change', function() {
    filterType = $(this).val();
    filterKeys();
  });
  $('#uploadKeyAcceptBtn').click(uploadToKeyServer);
  $('#uploadKeyRefuseBtn').click(dismissKeyUpload);

  if (!isKeygridLoaded) {
    reload();
    isKeygridLoaded = true;
  }
}

function uploadToKeyServer() {
  // hide success/error alerts
  $('#keyUploadErrorAlert').addClass('hidden');
  $('#keyUploadSuccessAlert').addClass('hidden');
  // show progress bar
  $('#keyUploadProgressBar .progress-bar').css('width', '100%');
  $('#keyUploadProgressBar').removeClass('hidden');
  // send upload event to background script
  mvelo.extension.sendMessage({
    event: 'upload-primary-public-key'
  }, function(response) {
    // hide progress bar
    $('#keyUploadProgressBar').addClass('hidden');
    if (response.error) {
      $('#keyUploadErrorAlert').removeClass('hidden');
    } else {
      $('#keyUploadSuccessAlert').removeClass('hidden');
      dismissKeyUpload();
    }
  });
}

function dismissKeyUpload() {
  $('#keyUploadErrorAlert').addClass('hidden');
  $('#uploadKeyAlert').addClass('hidden');
  var update = {
    keyserver: {dismiss_key_upload: true}
  };
  mvelo.extension.sendMessage({event: 'set-prefs', data: update});
}

function reload() {
  $tableBody = $('#keyRingTable tbody');

  app.getAllKeyringAttr()
  .then(function(result) {
    if (result) {
      app.primaryKeyId = null;
      for (var keyRingId in result) {
        var obj = result[keyRingId];
        if (obj.hasOwnProperty('primary_key')) {
          if (app.keyringId === keyRingId) {
            app.primaryKeyId = obj.primary_key;
          }
        }
      }
    }

    app.keyring('getKeys')
      .then(initKeyringTable);

    app.pgpModel('getPreferences').then(function(prefs) {
      if (!prefs.keyserver.dismiss_key_upload &&
          app.keyringId === mvelo.LOCAL_KEYRING_ID) {
        $('#uploadKeyAlert').removeClass('hidden');
      } else {
        $('#uploadKeyAlert').addClass('hidden');
      }
    });

    ReactDOM.render(React.createElement(GenerateKey, {demail: app.isDemail, name: app.queryString.fname, email: app.queryString.email}), $('#generateKey').get(0));
    ReactDOM.render(React.createElement(ImportKey, {ref: comp => importKeyComp = comp}), $('#importKey').get(0));
  });
}

function initKeyringTable(keys) {
  var $displayKeys = $('#displayKeys');
  state.keys = keys;
  if (!keys) {
    mvelo.util.hideLoadingAnimation($displayKeys);
  }
  $tableBody.empty();
  keys.forEach(function(key) {
    tableRow = $.parseHTML(keyTmpl);
    $(tableRow).attr('data-keyfingerprint', key.fingerprint);
    $(tableRow).attr('data-keytype', key.type);
    $(tableRow).find('td:nth-child(2)').text(key.name);
    if (app.primaryKeyId === key.id) {
      $(tableRow).find('td:nth-child(2)').append('&nbsp;&nbsp;<span class="label label-warning" data-l10n-id="keygrid_primary_label"></span>');
    }
    $(tableRow).find('td:nth-child(3)').text(key.email);
    $(tableRow).find('td:nth-child(4)').text(key.id);
    $(tableRow).find('td:nth-child(5)').text(key.crDate.substr(0, 10));
    if (key.type === 'private') {
      $(tableRow).find('.publicKey').remove();
    } else {
      $(tableRow).find('.keyPair').remove();
    }
    $tableBody.append(tableRow);
    filterKeys();
  });
  mvelo.l10n.localizeHTML(null, '#keyRingTable tbody');
  $tableBody.find('tr').on('click', openKeyDetails);
  $tableBody.find('tr').hover(function() {
    $(this).find('.actions').css('visibility', 'visible');
  }, function() {
    $(this).find('.actions').css('visibility', 'hidden');
  });
  $tableBody.find('.keyDeleteBtn').on('click', deleteKeyEntry);
  $.bootstrapSortable();
  mvelo.util.hideLoadingAnimation($displayKeys);
}

function filterKeys() {
  $tableBody.children().show();
  switch (filterType) {
    case 'publickeys':
      $tableBody.children().get().forEach(function(tableRow) {
        if ($(tableRow).attr('data-keytype') !== 'public') {
          $(tableRow).hide();
        }
      });
      break;
    case 'keypairs':
      $tableBody.children().get().forEach(function(tableRow) {
        if ($(tableRow).attr('data-keytype') !== 'private') {
          $(tableRow).hide();
        }
      });
      break;
    default:
      //console.log('unknown filter');
      break;
  }
}

function openKeyDetails() {
  const fingerprint = $(this).attr('data-keyfingerprint');
  const key = state.keys.find(key => key.fingerprint === fingerprint);
  const keyDetailsNode = $('#keyDetails').get(0);

  app.keyring('getKeyDetails', [fingerprint])
    .then(details => {
      ReactDOM.render(React.createElement(KeyDetails, {
        keyDetails: Object.assign(key, details),
        onSetPrimaryKey: setPrimaryKey.bind(null, key.id),
        isPrimary: app.primaryKeyId === key.id,
        onHide: () => ReactDOM.unmountComponentAtNode(keyDetailsNode)
      }), keyDetailsNode);
    });
}

function setPrimaryKey(primaryKeyId) {
  setKeyringAttr(app.keyringId, {
    primary_key: primaryKeyId
  });
  app.primaryKeyId = primaryKeyId;
  event.triggerHandler('keygrid-reload');
}

function openExportKeyringDialog() {
  const keyringBackupNode = $('#keyringBackup').get(0);
  let keys = [];
  let all = false;
  let type = 'pub';
  switch (filterType) {
    case 'allkeys':
      all = true;
      type = 'all';
      break;
    case 'publickeys':
      keys = state.keys.filter(key => key.type === 'public');
      break;
    case 'keypairs':
      keys = state.keys.filter(key => key.type === 'private');
      type = 'all';
      break;
    default:
      //console.log('unknown filter');
      break;
  }
  ReactDOM.render(React.createElement(KeyringBackup, {
    onHide: () => ReactDOM.unmountComponentAtNode(keyringBackupNode),
    keyids: keys.map(key => key.fingerprint),
    all,
    type
  }), keyringBackupNode);
}

function deleteKeyEntry() {
  var $entryForRemove;
  var confirmResult = confirm(l10n.map.keygrid_delete_confirmation);
  if (confirmResult) {
    $entryForRemove = $(this).parent().parent().parent();
    app.keyring('removeKey', [$entryForRemove.attr('data-keyfingerprint'), $entryForRemove.attr('data-keytype')]);
    event.triggerHandler('keygrid-reload');
  }
  return false;
}

export function deleteKeyring() {
  var keyRingId = $(this).attr('data-keyringid');
  if (confirm('Do you want to remove the keyring with id: ' + keyRingId + ' ?')) {
    mvelo.extension.sendMessage({
      event: 'delete-keyring',
      keyringId: keyRingId
    }, function() {
      app.reloadOptions();
    });
  }
}

function setKeyringAttr(keyRingId, keyRingAttr) {
  mvelo.extension.sendMessage({
    event: 'set-keyring-attr',
    keyringId: keyRingId,
    keyringAttr: keyRingAttr
  });
}

event.on('ready', init);

event.on('keygrid-reload', reload);
