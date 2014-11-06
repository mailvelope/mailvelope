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

var keyRing = {};

(function(exports, $) {
  // counter for method ids
  var id = 0;
  // callbacks are stored with id as key and used when message is received
  var callbacks = {};
  // event controller
  var event = $('<div/>');
  // l10n messages
  var l10n = {};

  function init() {
    window.addEventListener("message", receiveMessage);
    // init event once page is ready
    parent.postMessage(JSON.stringify({
      event: "init"
    }), '*');
    localizeHTML();
    keyRing.getL10nMessages(Object.keys(l10n), function(result) {
      keyRing.l10n = result;
      event.triggerHandler('ready');
    });
    sendMessage({
      event: "get-version"
    }, function(version) {
      $('#version').text(version);
    });
    migrate08();

    // Disable submitting of forms by for example pressing enter
    $("form").submit(function (e) { e.preventDefault(); });

    // Enabling selection of the elements in settings navigation
    $(".list-group-item").on("click", function() {
      var self = $(this);
      if(!self.hasClass("disabled")) {
        self.parent().find(".list-group-item").each(function () {
          $(this).removeClass("active");
        });
        self.addClass("active");
      }
    });
  }

  function localizeHTML() {
    if (mvelo.crx) {
      var ids = [];
      var lElements = $('[data-l10n-id]');
      lElements.each(function() {
        ids.push($(this).data('l10n-id'));
      });
      keyRing.getL10nMessages(ids, function(result) {
        lElements.each(function() {
          var jqElem = $(this);
          jqElem.text(result[jqElem.data('l10n-id')]);
        });
      });
    }
  }

  exports.viewModel = function(method, args, callback) {
    //console.log('keyRing viewModel() called');
    id++;
    if (typeof args === 'function') {
      callback = args;
      args = undefined;
    }
    if (callback !== undefined) {
      callbacks[id] = callback;
    }
    parent.postMessage(JSON.stringify({
      event: "viewmodel",
      method: method,
      args: args,
      id: id,
      callback: (callback !== undefined)
    }), '*');
  };

  function sendMessage(message, callback) {
    id++;
    if (callback !== undefined) {
      callbacks[id] = callback;
    }
    parent.postMessage(JSON.stringify({
      event: "message",
      message: message,
      id: id,
      callback: (callback !== undefined)
    }), '*');
  }

  exports.sendMessage = sendMessage;

  exports.copyToClipboard = function(text) {
    parent.postMessage(JSON.stringify({
      event: "copyToClipboard",
      text: text
    }), '*');
  };

  exports.getL10nMessages = function(ids, callback) {
    id++;
    callbacks[id] = callback;
    parent.postMessage(JSON.stringify({
      event: "get-l10n-messages",
      ids: ids,
      id: id
    }), '*');
  };

  exports.registerL10nMessages = function(ids) {
    ids.forEach(function(id) {
      keyRing.l10n[id] = true;
    });
  };

  exports.event = event;
  exports.l10n = l10n;

  function receiveMessage(msg) {
    //console.log('key ring receiveMessage', JSON.stringify(msg));
    var data = JSON.parse(msg.data);
    switch (data.event) {
      case 'viewmodel-response':
        if (callbacks[data.id]) {
          //console.log('keyRing viewmodel-response', data);
          callbacks[data.id](data.result, data.error);
          delete callbacks[data.id];
        }
        break;
      case 'message-response':
        if (callbacks[data.id]) {
          callbacks[data.id](data.message);
          delete callbacks[data.id];
        }
        break;
      case 'l10n-messages-response':
        callbacks[data.id](data.result);
        delete callbacks[data.id];
        break;
      case 'add-watchlist-item':
        $('#navList a[href="#watchList"]').get(0).click();
        watchList.addSite(data.site, data.hosts);
        break;
      case 'remove-watchlist-item':
        $('#navList a[href="#watchList"]').get(0).click();
        watchList.removeSite(data.site);
        break;
      case 'import-key':
        $('#navList a[href="#importKey"]').get(0).click();
        keyRing.importKey(data.armored, function(result) {
          sendMessage({
            event: "import-key-result",
            result: result,
            id: data.id
          });
        });
        break;
    }

  }

  $(document).ready(init);

  function migrate08() {
    keyRing.viewModel('getPreferences', function(prefs) {
      if (mvelo.crx && prefs.migrate08 && prefs.migrate08.done && $('#migNavEntry').length) {
        if (prefs.migrate08.err.length) {
          $('#migNavEntry').show();
          prefs.migrate08.err.forEach(function(error) {
            $('#migrationAlert').showAlert('Import Error', error.message, 'danger', true);
          });
          var armored = prefs.migrate08.keys.reduce(function(prev, curr) {
            return prev + curr + '\n\n';
          }, '');
          $('#errorKeys').val(armored);
        }
      }
    });
  }

}(keyRing, jQuery));
