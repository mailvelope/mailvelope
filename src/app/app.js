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

import mvelo from '../mvelo';
import $ from 'jquery';

import event from './util/event';
import * as l10n from '../lib/l10n';
import './settings/general';
import './settings/keyserver';
import './settings/security';
import {startSecurityLogMonitoring} from './settings/securityLog';
import {addToWatchList} from './settings/watchList';
import {deleteKeyring, importKeyComp} from './keyring/keyRing';
import './fileEncrypt/encryptFile';

import './app.css';

var currentKeyringId = null;
export {currentKeyringId as keyringId};
var currentPrimaryKeyId = null;
export {currentPrimaryKeyId as primaryKeyId};

const DEMAIL_SUFFIX = 'de-mail.de';
export let isDemail = false; // is current keyring created by de-mail
export let queryString = {};

var keyringTmpl;
var $keyringList;

l10n.register([
  'keygrid_user_email'
]);

function init() {
  if (document.body.dataset.mvelo) {
    return;
  }
  document.body.dataset.mvelo = true;
  initMessageListener();

  mvelo.appendTpl($('body'), mvelo.extension.getURL('app/settings/tpl/main.html'))
  .then(function() {
    // load all html templates into the DOM
    return window.Promise.all([
      mvelo.appendTpl($('#general'), mvelo.extension.getURL('app/settings/tpl/general.html')),
      mvelo.appendTpl($('#security'), mvelo.extension.getURL('app/settings/tpl/security.html')),
      mvelo.appendTpl($('#watchList'), mvelo.extension.getURL('app/settings/tpl/watchList.html')),
      mvelo.appendTpl($('#watchList'), mvelo.extension.getURL('app/settings/tpl/watchListEditor.html')),
      mvelo.appendTpl($('#securityLog'), mvelo.extension.getURL('app/settings/tpl/securityLog.html')),
      mvelo.appendTpl($('#keyserver'), mvelo.extension.getURL('app/settings/tpl/keyserver.html')),
      mvelo.appendTpl($('#displayKeys'), mvelo.extension.getURL('app/keyring/tpl/displayKeys.html')),
      mvelo.appendTpl($('#setupProvider'), mvelo.extension.getURL('app/keyring/tpl/setupProvider.html')),
      mvelo.appendTpl($('#encrypting'), mvelo.extension.getURL('app/fileEncrypt/encrypt.html'))
    ]);
  })
  .then(function() {
    // load language strings from json files
    return l10n.mapToLocal();
  })
  .then(function() {
    // set localized strings
    mvelo.l10n.localizeHTML();
  })
  .then(initUI)
  .then(function() {
    // fire ready event for sub views to listen to
    event.triggerHandler('ready');
    sendMessage({ event: 'options-ready'});
  });
}

/**
 * Is executed once after all templates hasve been loaded
 */
function initUI() {
  return new Promise(function(resolve) {
    mvelo.extension.sendMessage({
      event: 'get-version'
    }, function(version) {
      $('#version').text('v' + version);
    });
    mvelo.extension.sendMessage({event: 'get-active-keyring'}, resolve);
  })
  .then(function(data) {
    return initKeyRing(data);
  })
  .then(function() {
    return keyring('getPrivateKeys');
  })
  .then(function(privateKeys) {
    return showSetupView(privateKeys);
  })
  .then(function() {
    return getAllKeyringAttr();
  })
  .then(function(keyRingAttr) {
    return switchOptionsUI(keyRingAttr);
  });
}

function initKeyRing(data) {
  queryString = jQuery.parseQuerystring();
  currentKeyringId = data || mvelo.LOCAL_KEYRING_ID;
  if (queryString.krid) {
    currentKeyringId = queryString.krid;
  }

  setKeyRing(currentKeyringId);
}

function showSetupView(privateKeys) {
  // No private key yet? Navigate to setup tab
  if (!privateKeys.length) {
    $('.keyring_setup_message').addClass('active');

    $('#setupProviderButton')
      .tab('show') // Activate setup tab
      .addClass('active')
      .siblings('a.list-group-item').removeClass('active') // Activate setup navigation
    ;
  } else {
    $('#displayKeysButton')
      .tab('show') // Activate display keys tab
      .addClass('active')
      .siblings('a.list-group-item').removeClass('active') // Activate display keys navigation
    ;
    $('.keyring_setup_message').removeClass('active');
  }

  mvelo.util.showSecurityBackground();

  $keyringList = $('#keyringList');
  if (keyringTmpl === undefined) {
    keyringTmpl = $keyringList.html();
    $keyringList.empty();
  }

  // Disable submitting of forms by for example pressing enter
  $('form').submit(function(e) { e.preventDefault(); });

  // Enabling selection of the elements in settings navigation
  $('.list-group-item').on('click', function() {
    window.location.hash = $(this).attr('href');
    var self = $(this);
    if (!self.hasClass('disabled')) {
      self.parent().find('.list-group-item').each(function() {
        $(this).removeClass('active');
      });
      self.addClass('active');
    }
  });

  // Activate tab after switch from links to tabs outside
  $('[data-toggle="tab"]:not(.list-group-item)').on('click', function() {
    window.location.hash = $(this).attr('href');
    var id = $(this).attr('href'),
      tabTrigger = $('.list-group a[href="' + id + '"]');

    if (id && tabTrigger) {
      tabTrigger.siblings('a.list-group-item').removeClass('active');
      tabTrigger.addClass('active');
    }
  });
}

function switchOptionsUI(keyRingAttr) {
  initKeyringSelection(keyRingAttr);

  switch (window.location.hash) {
    case '#securityLog':
      $('#settingsButton').tab('show');
      startSecurityLogMonitoring();
      break;
    case '#general':
    case '#security':
    case '#watchList':
    case '#backup':
      $('#settingsButton').tab('show');
      activateTabButton(window.location.hash);
      break;
    case '#displayKeys':
    case '#importKey':
    case '#exportKeys':
    case '#generateKey':
    case '#setupProvider':
      $('#keyringButton').tab('show');
      activateTabButton(window.location.hash);
      break;
    case '#encrypting':
    case '#file_encrypting':
    case '#file_decrypting':
      $('#encryptingButton').tab('show');
      activateTabButton(window.location.hash);
      break;
    default:
      if (window.location.hash == '#settings') {
        $('#settingsButton').tab('show');
      } else if (window.location.hash == '#keyring') {
        $('#keyringButton').tab('show');
      } else {
        //console.log((window.location.hash) ? window.location.hash : 'no hash found');
        window.location.hash = 'displayKeys';
        $('#keyringButton').tab('show');
      }
  }
  activateTabButton(window.location.hash);
}

function initKeyringSelection(data) {
  if (data === undefined) {
    return false;
  }

  var keyringHTML;
  var keyringName;

  for (let keyringId in data) {
    keyringName = splitKeyringId(keyringId);
    keyringHTML = $.parseHTML(keyringTmpl);

    var obj = data[keyringId];
    if (obj.hasOwnProperty('primary_key')) {
      if (currentKeyringId === keyringId) {
        currentPrimaryKeyId = obj.primary_key;
      }
      $(keyringHTML).find('.keyRingName').attr('data-primarykeyid', obj.primary_key);
    }
    if (obj.hasOwnProperty('logo_data_url')) {
      $(keyringHTML).find('.keyRingName').attr('data-providerlogo', obj.logo_data_url);
    }

    if (keyringId === mvelo.LOCAL_KEYRING_ID) {
      keyringName = 'Mailvelope';
      $(keyringHTML).find('.deleteKeyRing').hide();
    }

    $(keyringHTML).find('.keyRingName').text(keyringName);
    $(keyringHTML).find('.keyRingName').attr('data-keyringid', keyringId);
    $(keyringHTML).find('.deleteKeyRing').attr('data-keyringid', keyringId);
    $keyringList.append(keyringHTML);
  }

  $keyringList.find('.keyRingName').on('click', switchKeyring);
  $keyringList.find('.deleteKeyRing').on('click', deleteKeyring);

  setKeyRing(currentKeyringId);
}

function activateTabButton(hash) {
  if (!hash) {
    return;
  }

  var name = hash + 'Button';
  $(name)
    .tab('show')
    .addClass('active')
    .siblings('a.list-group-item').removeClass('active')
  ;
}

function setKeyRing(keyringId) {
  var primaryKeyId = $('a[data-keyringid="' + keyringId + '"]').attr('data-primarykeyid');
  var providerLogo = $('a[data-keyringid="' + keyringId + '"]').attr('data-providerlogo');

  var keyringName;
  if (keyringId === mvelo.LOCAL_KEYRING_ID) {
    keyringName = 'Mailvelope';
  } else if (keyringId) {
    keyringName = splitKeyringId(keyringId);
  }

  $('#keyringSwitcherLabel').text(keyringName);
  currentKeyringId = keyringId;

  if (primaryKeyId) {
    currentPrimaryKeyId = primaryKeyId;
    $('.keyring_setup_message').removeClass('active');
  } else {
    $('.keyring_setup_message').addClass('active');
  }

  var $logoArea = $('.third-party-logo');
  if (providerLogo) {
    $logoArea.css({
      'background-image': 'url(' + providerLogo + ')',
      'background-repeat': 'no-repeat',
      'background-position': 'right top'
    });
  } else {
    $logoArea.css('background-image', 'none');
  }

  isDemail = keyringId.includes(DEMAIL_SUFFIX);
}

function switchKeyring() {
  var keyringId = $(this).attr('data-keyringid');
  setKeyRing(keyringId);

  mvelo.util.showLoadingAnimation();
  event.triggerHandler('keygrid-reload');
}

function initMessageListener() {
  mvelo.extension.onMessage.addListener(
    function(request, sender, sendResponse) {
      return handleRequests(request, sender, sendResponse);
    }
  );
}

function splitKeyringId(keyringId) {
  return keyringId.split(mvelo.KEYRING_DELIMITER)[0] + ' (' + keyringId.split(mvelo.KEYRING_DELIMITER)[1] + ')';
}

function handleRequests(request, sender, sendResponse) {
  switch (request.event) {
    case 'add-watchlist-item':
      $('#settingsButton').trigger('click');
      $('#watchListButton').trigger('click');
      addToWatchList(request.site);
      break;
    case 'reload-options':
      if (request.hash === '#showlog') {
        $('#settingsButton').trigger('click');
        $('#securityLogButton').trigger('click');
      } else {
        reloadOptions();
      }
      break;
    case 'import-key':
      $('#keyringButton').trigger('click');
      $('#importKeyButton').trigger('click');
      importKeyComp.importKey(request.armored)
      .then(result => sendResponse({result, id: request.id}))
      return true;
    default:
    // TODO analyse message events
    //console.log('unknown event:', request);
  }
}

export function reloadOptions() {
  document.location.reload();
}

export function getAllKeyringAttr() {
  return sendMessage({ event: 'get-all-keyring-attr'});
}

export function getAllKeyUserId() {
  return sendMessage({ event: 'get-all-key-userid'});
}

export function pgpModel(method, args) {
  return sendMessage({
    event: 'pgpmodel',
    method: method,
    args: args
  });
}

export function keyring(method, args) {
  return sendMessage({
    event: 'keyring',
    method: method,
    args: args,
    keyringId: currentKeyringId
  });
}

export function copyToClipboard(text) {
  var copyFrom = $('<textarea />');
  $('body').append(copyFrom);
  copyFrom.hide();
  copyFrom.text(text);
  copyFrom.select();
  document.execCommand('copy');
  copyFrom.remove();
}

export function openTab(url) {
  return sendMessage({event: 'open-tab', url: url});
}

function sendMessage(options) {
  return new Promise(function(resolve, reject) {
    mvelo.extension.sendMessage(options, function(data) {
      data = data || {};
      if (data.error) {
        reject(data.error);
      } else {
        resolve(data.result);
      }
    });
  });
}

// Update visibility of setup alert box
event.on('keygrid-reload', function() {
  keyring('getPrivateKeys')
    .then(function(result) {
      if (!result.length) {
        $('.keyring_setup_message').addClass('active');
      } else {
        $('.keyring_setup_message').removeClass('active');
      }
    });
});

$(document).ready(init);

