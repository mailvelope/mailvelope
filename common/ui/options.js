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

/**
 * Listens for events from options UI in sandbox, forwards requests to pgpModel.js
 */

'use strict';

var mvelo = mvelo || null;
var options = {};

(function(exports, $) {
  // event controller
  var event = $('<div/>');
  // l10n messages
  var l10n = {};
  var keyringTmpl;
  var $keyringList;
  var mail123Suffix = "123mail.zt";

  function init() {
    initMessageListener();

    window.Promise.resolve(
      mvelo.appendTpl($('body'), mvelo.extension.getURL('common/ui/settings/tpl/main.html'))
    ).then(function() {
      window.Promise.all([
        mvelo.appendTpl($('#general'), mvelo.extension.getURL('common/ui/settings/tpl/general.html')),
        mvelo.appendTpl($('#security'), mvelo.extension.getURL('common/ui/settings/tpl/security.html')),
        mvelo.appendTpl($('#watchList'), mvelo.extension.getURL('common/ui/settings/tpl/watchList.html')),
        mvelo.appendTpl($('#watchList'), mvelo.extension.getURL('common/ui/settings/tpl/watchListEditor.html')),
        mvelo.appendTpl($('#displayKeys'), mvelo.extension.getURL('common/ui/keyring/tpl/displayKeys.html')),
        mvelo.appendTpl($('#displayKeys'), mvelo.extension.getURL('common/ui/keyring/tpl/keyEditor.html')),
        mvelo.appendTpl($('#importKey'), mvelo.extension.getURL('common/ui/keyring/tpl/importKey.html')),
        mvelo.appendTpl($('#exportsKey'), mvelo.extension.getURL('common/ui/keyring/tpl/exportKeys.html')),
        mvelo.appendTpl($('#setupProvider'), mvelo.extension.getURL('common/ui/keyring/tpl/setupProvider.html')),
        mvelo.appendTpl($('#generateKey'), mvelo.extension.getURL('common/ui/keyring/tpl/generateKey.html'))
      ]).then(initUI);
    });
  }

  function initUI() {
    mvelo.extension.sendMessage({
      event: "get-version"
    }, function(version) {
      $('#version').text('v' + version);
    });

    var qs = jQuery.parseQuerystring();
    var krid = decodeURIComponent(qs.krid);
    if (qs.hasOwnProperty("krid")) {
      setKeyRing(krid, krid.split(mvelo.KEYRING_DELIMITER)[0] + " (" + krid.split(mvelo.KEYRING_DELIMITER)[1] + ")");
    } else {
      // Setting the default keyring to mailvelope
      setKeyRing(mvelo.LOCAL_KEYRING_ID, "Mailvelope", "mailvelope");
    }

    if (qs.hasOwnProperty("email")) {
      $("#genKeyEmail").val(decodeURIComponent(qs.email));
    }

    if (qs.hasOwnProperty("fname")) {
      $("#genKeyName").val(decodeURIComponent(qs.fname));
    }

    // No private key yet? Navigate to setup tab
    options.keyring('getPrivateKeys', function(err, data) {
      if (!data.length) {
        $('.keyring_setup_message').addClass('active');
        // Activate setup tab
        $('a[href="#setupProvider"]').tab('show');
        // Activate setup navigation
        $('a[href="#setupProvider"]').siblings('a.list-group-item').removeClass('active');
        $('a[href="#setupProvider"]').addClass('active');
      }
      else {
        // Activate display keys tab
        $('a[href="#displayKeys"]').tab('show');
        // Activate display keys navigation
        $('a[href="#displayKeys"]').siblings('a.list-group-item').removeClass('active');
        $('a[href="#displayKeys"]').addClass('active');
      }
    });

    registerL10nMessages([
      "keygrid_user_email"
    ]);

    customize123Mail(krid);

    mvelo.l10n.localizeHTML();
    mvelo.util.showSecurityBackground();

    $keyringList = $("#keyringList");
    if (keyringTmpl === undefined) {
      keyringTmpl = $keyringList.html();
      $keyringList.empty();
    }

    // Disable submitting of forms by for example pressing enter
    $("form").submit(function(e) { e.preventDefault(); });

    // Enabling selection of the elements in settings navigation
    $(".list-group-item").on("click", function() {
      var self = $(this);
      if (!self.hasClass("disabled")) {
        self.parent().find(".list-group-item").each(function() {
          $(this).removeClass("active");
        });
        self.addClass("active");
      }
    });

    // Activate tab after switch from links to tabs outside
    $('[data-toggle="tab"]:not(.list-group-item)').on('click', function() {
      var id = $(this).attr('href'),
      tabTrigger = $('.list-group a[href="' + id + '"]');

      if (id && tabTrigger) {
        tabTrigger.siblings('a.list-group-item').removeClass('active');
        tabTrigger.addClass('active');
      }
    });

    getAllKeyringAttr(function(data) {
      if (data === undefined) {
        return false;
      }

      var keyringHTML;
      var keyringName;

      for (var keyRingId in data) {
        keyringName = keyRingId.split(mvelo.KEYRING_DELIMITER)[0] + " (" + keyRingId.split(mvelo.KEYRING_DELIMITER)[1] + ")";
        keyringHTML = $.parseHTML(keyringTmpl);

        var obj = data[keyRingId];
        if (obj.hasOwnProperty("primary_key")) {
          if (exports.keyringId === keyRingId) {
            exports.primaryKeyId = obj.primary_key;
          }
          $(keyringHTML).find(".keyRingName").attr("primaryKeyId", obj.primary_key);
        }
        if (obj.hasOwnProperty("logo_data_url")) {
          $(keyringHTML).find(".keyRingName").attr("providerLogo", obj.logo_data_url);
        }

        if (keyRingId === mvelo.LOCAL_KEYRING_ID) {
          keyringName = "Mailvelope";
          $(keyringHTML).find(".deleteKeyRing").hide();
        }

        $(keyringHTML).find(".keyRingName").text(keyringName);
        $(keyringHTML).find(".keyRingName").attr("keyringId", keyRingId);
        $(keyringHTML).find(".deleteKeyRing").attr("keyringId", keyRingId);
        $keyringList.append(keyringHTML);
      }

      $keyringList.find(".keyRingName").on("click", switchKeyring);
      $keyringList.find(".deleteKeyRing").on("click", exports.deleteKeyring);
    });

    getL10nMessages(Object.keys(l10n), function(result) {
      exports.l10n = result;
      event.triggerHandler('ready');
    });
  }

  function setKeyRing(keyringId, keyringName, providerLogo, primaryKeyId) {
    var $settingsArea = $("#settingsArea");
    $("#keyringSwitcherLabel").text(keyringName);
    exports.keyringId = keyringId;

    if (primaryKeyId !== undefined) {
      exports.primaryKeyId = primaryKeyId;
    }

    $settingsArea.css("background", "none");
    if (providerLogo) {
      $settingsArea.css("background", "url(" + providerLogo + ") no-repeat top+10px right+10px");
    }
  }

  function switchKeyring() {
    var keyringId = $(this).attr("keyringId");
    setKeyRing(
      keyringId,
      $(this).text(),
      $(this).attr("providerLogo"),
      $(this).attr("primaryKeyId")
    );

    $("#genKeyEmailLabel").removeAttr("data-l10n-id");

    customize123Mail(keyringId);

    mvelo.util.showLoadingAnimation();
    options.event.triggerHandler('keygrid-reload');

    $('#displayKeysButton').get(0).click();
  }

  function customize123Mail(keyringId) {
    if ((keyringId.indexOf(mail123Suffix) > 3)) {
      $("#genKeyEmailLabel").text("123Mail");
    } else {
      $("#genKeyEmailLabel").text(exports.l10n.keygrid_user_email);
    }
  }

  function initMessageListener() {
    mvelo.extension.onMessage.addListener(
      function(request, sender, sendResponse) {
        handleRequests(request, sender, sendResponse);
      }
    );
  }

  function handleRequests(request, sender, sendResponse) {
    switch (request.event) {
      case 'add-watchlist-item':
        $('#showKeySettings a').get(0).click();
        $('#settingsList a[href="#watchList"]').get(0).click();
        options.addToWatchList(request.site);
        break;
      case 'remove-watchlist-item':
        $('#showKeySettings a').get(0).click();
        $('#settingsList a[href="#watchList"]').get(0).click();
        options.removeFromWatchList(request.site);
        break;
      case 'reload-options':
        options.reloadOptions();
        break;
      case 'import-key':
        $('#showKeyRing a').get(0).click();
        $('a[href="#importKey"]').get(0).click();
        options.importKey(request.armored);
        break;
      default:
        // TODO analyse message events
        //console.log('unknown event:', request);
    }
  }

  function reloadOptions() {
    document.location.reload();
  }

  function getAllKeyringAttr(callback) {
    mvelo.extension.sendMessage({
      event: 'get-all-keyring-attr'
    }, function(data) {
      callback(data);
    });
  }

  function pgpModel(method, args, callback) {
    if (typeof args === 'function') {
      callback = args;
      args = undefined;
    }
    mvelo.extension.sendMessage({
      event: 'pgpmodel',
      method: method,
      args: args
    }, function(data) {
      callback(data.error, data.result);
    });
  }

  function keyring(method, args, callback) {
    if (typeof args === 'function') {
      callback = args;
      args = undefined;
    }
    mvelo.extension.sendMessage({
      event: 'keyring',
      method: method,
      args: args,
      keyringId: options.keyringId
    }, function(data) {
      callback(data.error, data.result);
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
  exports.pgpModel = pgpModel;
  exports.keyring = keyring;
  exports.copyToClipboard = copyToClipboard;
  exports.getL10nMessages = getL10nMessages;
  exports.registerL10nMessages = registerL10nMessages;

  exports.event = event;
  exports.l10n = l10n;

  // Update visibility of setup alert box
  options.event.on('keygrid-reload', function() {
    options.keyring('getPrivateKeys', function(err, data) {
      if (!data.length) {
        $('.keyring_setup_message').addClass('active');
      }
      else {
        $('.keyring_setup_message').removeClass('active');
      }
    });
  });

  $(document).ready(init);

}(options, jQuery));
