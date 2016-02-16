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

/**
 * Listens for events from options UI in sandbox, forwards requests to pgpModel.js
 */

'use strict';

var mvelo = mvelo || null;
var options = {};

(function(exports, $) {
  // event controller
  var event = $('<div/>');
  var l10n = {};
  var keyringTmpl;
  var $keyringList;
  var keyringId = null;
  var demailSuffix = 'de-mail.de';

  function init() {
    if (document.body.dataset.mvelo) {
      return;
    }
    document.body.dataset.mvelo = true;
    initMessageListener();

    mvelo.appendTpl($('body'), mvelo.extension.getURL('common/ui/settings/tpl/main.html'))
      .then(function() {
        window.Promise.all([
          mvelo.appendTpl($('#general'), mvelo.extension.getURL('common/ui/settings/tpl/general.html')),
          mvelo.appendTpl($('#security'), mvelo.extension.getURL('common/ui/settings/tpl/security.html')),
          mvelo.appendTpl($('#watchList'), mvelo.extension.getURL('common/ui/settings/tpl/watchList.html')),
          mvelo.appendTpl($('#watchList'), mvelo.extension.getURL('common/ui/settings/tpl/watchListEditor.html')),
          mvelo.appendTpl($('#securityLog'), mvelo.extension.getURL('common/ui/settings/tpl/securityLog.html')),
          mvelo.appendTpl($('#displayKeys'), mvelo.extension.getURL('common/ui/keyring/tpl/displayKeys.html')),
          mvelo.appendTpl($('#displayKeys'), mvelo.extension.getURL('common/ui/keyring/tpl/keyEditor.html')),
          mvelo.appendTpl($('#importKey'), mvelo.extension.getURL('common/ui/keyring/tpl/importKey.html')),
          mvelo.appendTpl($('#exportsKey'), mvelo.extension.getURL('common/ui/keyring/tpl/exportKeys.html')),
          mvelo.appendTpl($('#setupProvider'), mvelo.extension.getURL('common/ui/keyring/tpl/setupProvider.html')),
          mvelo.appendTpl($('#generateKey'), mvelo.extension.getURL('common/ui/keyring/tpl/generateKey.html')),
          mvelo.appendTpl($('#encrypting'), mvelo.extension.getURL('common/ui/fileEncrypt/encrypt.html'))

        ]).then(initUI);
      });
  }

  function initUI() {
    mvelo.extension.sendMessage({
      event: 'get-version'
    }, function(version) {
      $('#version').text('v' + version);
    });

    var qs = jQuery.parseQuerystring();

    mvelo.extension.sendMessage({event: 'get-active-keyring'}, function(data) {
      keyringId = data || mvelo.LOCAL_KEYRING_ID;
      if (qs.hasOwnProperty('krid')) {
        keyringId = decodeURIComponent(qs.krid);
        if (keyringId.indexOf(demailSuffix) > 3) {
          $('#genKeyEmail').attr('disabled', 'disabled');
          $('#genKeyEmailLabel').attr('data-l10n-id', 'key_gen_demail');
        }
      }

      setKeyRing(keyringId);
      setKeyGenDefaults(qs);

      // No private key yet? Navigate to setup tab
      options.keyring('getPrivateKeys')
        .then(function(result) {
          if (!result.length) {
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

          registerL10nMessages([
            'keygrid_user_email',
            'key_gen_demail'
          ]);

          mvelo.l10n.localizeHTML();
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

          options.getAllKeyringAttr()
            .then(function(result) {
              initKeyringSelection(result);

              switch (window.location.hash) {
                case '#securityLog':
                  $('#settingsButton').tab('show');
                  options.startSecurityLogMonitoring();
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

              getL10nMessages(Object.keys(l10n), function(result) {
                exports.l10n = result;
                event.triggerHandler('ready');
              });
            });
        });
    });
  }

  function setKeyGenDefaults(qs) {
    if (qs.hasOwnProperty('email')) {
      var decodedEmail = decodeURIComponent(qs.email);
      $('#genKeyEmail').val(decodedEmail);
    }

    if (qs.hasOwnProperty('fname')) {
      $('#genKeyName').val(decodeURIComponent(qs.fname));
    }
  }

  function initKeyringSelection(data) {
    if (data === undefined) {
      return false;
    }

    var keyringHTML;
    var keyringName;

    for (var keyRingId in data) {
      keyringName = splitKeyringId(keyRingId);
      keyringHTML = $.parseHTML(keyringTmpl);

      var obj = data[keyRingId];
      if (obj.hasOwnProperty('primary_key')) {
        if (exports.keyringId === keyRingId) {
          exports.primaryKeyId = obj.primary_key;
        }
        $(keyringHTML).find('.keyRingName').attr('data-primarykeyid', obj.primary_key);
      }
      if (obj.hasOwnProperty('logo_data_url')) {
        $(keyringHTML).find('.keyRingName').attr('data-providerlogo', obj.logo_data_url);
      }

      if (keyRingId === mvelo.LOCAL_KEYRING_ID) {
        keyringName = 'Mailvelope';
        $(keyringHTML).find('.deleteKeyRing').hide();
      }

      $(keyringHTML).find('.keyRingName').text(keyringName);
      $(keyringHTML).find('.keyRingName').attr('data-keyringid', keyRingId);
      $(keyringHTML).find('.deleteKeyRing').attr('data-keyringid', keyRingId);
      $keyringList.append(keyringHTML);
    }

    $keyringList.find('.keyRingName').on('click', switchKeyring);
    $keyringList.find('.deleteKeyRing').on('click', exports.deleteKeyring);

    setKeyRing(keyringId);
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
    exports.keyringId = keyringId;

    if (primaryKeyId) {
      exports.primaryKeyId = primaryKeyId;
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
  }

  function switchKeyring() {
    var keyringId = $(this).attr('data-keyringid');
    setKeyRing(keyringId);

    $('#genKeyEmailLabel').removeAttr('data-l10n-id');

    mvelo.util.showLoadingAnimation();
    options.event.triggerHandler('keygrid-reload');
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
        options.addToWatchList(request.site);
        break;
      case 'reload-options':
        if (request.hash === '#showlog') {
          $('#settingsButton').trigger('click');
          $('#securityLogButton').trigger('click');
        } else {
          options.reloadOptions();
        }
        break;
      case 'import-key':
        $('#keyringButton').trigger('click');
        $('#importKeyButton').trigger('click');
        options.importKey(request.armored, function(result) {
          sendResponse({
            result: result,
            id: request.id
          });
        });
        return true;
      default:
      // TODO analyse message events
      //console.log('unknown event:', request);
    }
  }

  function reloadOptions() {
    document.location.reload();
  }

  function sendMessage(obj) {
    return new Promise(function(resolve, reject) {
      mvelo.extension.sendMessage(obj, function(data) {
        if (data.error) {
          reject(data.error);
        } else {
          resolve(data.result);
        }
      });
    });
  }

  function getAllKeyringAttr() {
    return sendMessage({ event: 'get-all-keyring-attr'});
  }

  function getAllKeyUserId() {
    return sendMessage({ event: 'get-all-key-userid'});
  }

  function pgpModel(method, args) {
    return sendMessage({
      event: 'pgpmodel',
      method: method,
      args: args
    });
  }

  function keyring(method, args) {
    return sendMessage({
      event: 'keyring',
      method: method,
      args: args,
      keyringId: options.keyringId
    });
  }

  function copyToClipboard(text) {
    var copyFrom = $('<textarea />');
    $('body').append(copyFrom);
    copyFrom.hide();
    copyFrom.text(text);
    copyFrom.select();
    document.execCommand('copy');
    copyFrom.remove();
  }

  function getL10nMessages(ids, callback) {
    mvelo.l10n.getMessages(ids, callback);
  }

  function registerL10nMessages(ids) {
    ids.forEach(function(id) {
      exports.l10n[id] = true;
    });
  }

  exports.reloadOptions = reloadOptions;
  exports.getAllKeyringAttr = getAllKeyringAttr;
  exports.getAllKeyUserId = getAllKeyUserId;
  exports.pgpModel = pgpModel;
  exports.keyring = keyring;
  exports.copyToClipboard = copyToClipboard;
  exports.getL10nMessages = getL10nMessages;
  exports.registerL10nMessages = registerL10nMessages;
  exports.keyringId = keyringId;

  exports.event = event;
  exports.l10n = l10n;

  // Update visibility of setup alert box
  options.event.on('keygrid-reload', function() {
    options.keyring('getPrivateKeys')
      .then(function(result) {
        if (!result.length) {
          $('.keyring_setup_message').addClass('active');
        } else {
          $('.keyring_setup_message').removeClass('active');
        }
      });
  });

  $(document).ready(init);

}(options, jQuery));
