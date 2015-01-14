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
 * Listens for events from options UI in sandbox, forwards requests to view model pgpViewModel.js
 */

'use strict';

var mvelo = mvelo || null;
var options = {};

(function(exports, $) {
  // event controller
  var event = $('<div/>');
  // l10n messages
  var l10n = {};

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
      mvelo.appendTpl($('#generateKey'), 'keyring/tpl/generateKey.html')
    ]).then(initUI);
  }

  function initUI() {
    mvelo.l10n.localizeHTML();
    mvelo.util.showSecurityBackground();

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
        $('#keyringList a[href="#importKey"]').get(0).click();
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

  exports.viewModel = function(method, args, callback) {
    if (typeof args === 'function') {
      callback = args;
      args = undefined;
    }
    mvelo.extension.sendMessage({
      event: 'viewmodel',
      method: method,
      args: args
    }, callback);
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
