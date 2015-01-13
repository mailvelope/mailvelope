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

  function init() {
    initMessageListener();
    mvelo.extension.sendMessage({
      event: "get-version"
    }, function(version) {
      $('#version').text(version);
    });

    window.Promise.all([
      mvelo.appendTpl($('#general'), 'settings/tpl/general.html'),
      mvelo.appendTpl($('#security'), 'settings/tpl/security.html'),
      mvelo.appendTpl($('#watchList'), 'settings/tpl/watchList.html'),
      mvelo.appendTpl($('#watchList'), 'settings/tpl/watchListEditor.html'),
      mvelo.appendTpl($('#displayKeys'), 'keyring/tpl/displayKeys.html'),
      mvelo.appendTpl($('#displayKeys'), 'keyring/tpl/keyEditor.html'),
      mvelo.appendTpl($('#importKey'), 'keyring/tpl/importKey.html'),
      mvelo.appendTpl($('#exportsKey'), 'keyring/tpl/exportKeys.html'),
      mvelo.appendTpl($('#setupProvider'), 'keyring/tpl/setupProvider.html'),
      mvelo.appendTpl($('#generateKey'), 'keyring/tpl/generateKey.html')
    ]).then(initUI);

    // Setting the default keyring to mailvelope
    setKeyRing(mvelo.LOCAL_KEYRING_ID, "Mailvelope", "mailvelope");
  }

  function initUI() {
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

    exports.getL10nMessages(Object.keys(l10n), function(result) {
      exports.l10n = result;
      event.triggerHandler('ready');
    });

    //deleteKeyring("localhost|#|mailvelope");

    setKeyringAttr(mvelo.LOCAL_KEYRING_ID, {
      primary_key: "03C986E66AFE22EA",
      provider_styling: "mailvelope"
    });

    createKeyring("provider1.de" + mvelo.KEYRING_DELIMITER + "test@provider1.de");
    setKeyringAttr("provider1.de" + mvelo.KEYRING_DELIMITER + "test@provider1.de", {
      primary_key: "03C986E66AFE22EA",
      provider_styling: "provider1SettingsLogo"
    });

    createKeyring("provider2.bg" + mvelo.KEYRING_DELIMITER + "test@provider2.bg");
    setKeyringAttr("provider2.bg" + mvelo.KEYRING_DELIMITER + "test@provider2.bg", {
      primary_key: "03C986E66AFE22EA",
      provider_styling: "provider2SettingsLogo"
    });

    createKeyring("provider3.com" + mvelo.KEYRING_DELIMITER + "test@provider3.com");
    setKeyringAttr("provider3.com" + mvelo.KEYRING_DELIMITER + "test@provider3.com", {
      primary_key: "03C986E66AFE22EA",
      provider_styling: "provider3SettingsLogo"
    });

    createKeyring("provider4.ch" + mvelo.KEYRING_DELIMITER + "test@provider4.ch");
    setKeyringAttr("provider4.ch" + mvelo.KEYRING_DELIMITER + "test@provider4.ch", {
      primary_key: "03C986E66AFE22EA",
      provider_styling: "provider4SettingsLogo"
    });

    getAllKeyringAttr(function(data) {
      if (data === undefined) {
        return false;
      }

      var keyringHTML;
      var keyringName;
      var providerStyling;

      for (var keyRingId in data) {
        keyringName = keyRingId.split(mvelo.KEYRING_DELIMITER)[0] + " (" + keyRingId.split(mvelo.KEYRING_DELIMITER)[1] + ")";
        keyringHTML = $.parseHTML(keyringTmpl);

        //console.log("Attr. for keyring: " + keyRingId);
        var obj = data[keyRingId];
        if (obj.hasOwnProperty("primary_key")) {
          $(keyringHTML).find(".keyRingName").attr("primaryKeyId", obj.primary_key);
        }
        if (obj.hasOwnProperty("provider_styling")) {
          $(keyringHTML).find(".keyRingName").attr("providerStyling", obj.provider_styling);
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
      $keyringList.find(".deleteKeyRing").on("click", deleteKeyring);
    });

  }

  function setKeyRing(keyringId, keyringName, providerStyling) {
    var $settingsArea = $("#settingsArea");
    $("#providerChangerText").text(keyringName);
    exports.keyringId = keyringId;
    exports.providerStyling = providerStyling;

    if (keyringId === mvelo.LOCAL_KEYRING_ID) {
      $settingsArea.removeClass();
      $settingsArea.addClass("tab-content jumbotron");
    } else {
      $settingsArea.removeClass();
      $settingsArea.addClass(providerStyling + " tab-content jumbotron");
    }
  }

  function switchKeyring() {
    setKeyRing($(this).attr("keyringId"), $(this).text(), $(this).attr("providerStyling"));
    options.event.triggerHandler('keygrid-reload');
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
        reloadOptions();
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

  function deleteKeyring() {
    var keyRingId = $(this).attr("keyringId");
    if (confirm("Do you want to remove keyring? " + keyRingId)) {
      mvelo.extension.sendMessage({
        event: 'delete-keyring',
        keyringId: keyRingId
      });
      reloadOptions();
    }
  }

  function createKeyring(keyRingId, callback) {
    mvelo.extension.sendMessage({
      event: 'create-keyring',
      keyringId: keyRingId
    }, function() {
      console.log("Create keyring");
    });
  }

  function setKeyringAttr(keyRingId, keyRingAttr, callback) {
    mvelo.extension.sendMessage({
      event: 'set-keyring-attr',
      keyringId: keyRingId,
      keyringAttr: keyRingAttr
    }, function() {
      console.log("Set keyring attr");
    });
  }

  exports.pgpModel = function(method, args, callback) {
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
  };

  exports.keyring = function(method, args, callback) {
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
  };

  exports.copyToClipboard = function(text) {
    var copyFrom = $('<textarea />');
    $('body').append(copyFrom);
    copyFrom.hide();
    copyFrom.text(text);
    copyFrom.select();
    document.execCommand('copy');
    copyFrom.remove();
  };

  exports.getL10nMessages = function(ids, callback) {
    mvelo.l10n.getMessages(ids, callback);
  };

  exports.registerL10nMessages = function(ids) {
    ids.forEach(function(id) {
      exports.l10n[id] = true;
    });
  };

  exports.event = event;
  exports.l10n = l10n;

  $(document).ready(init);

}(options, jQuery));
