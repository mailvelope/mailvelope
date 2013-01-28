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

(function() {

  // window of options iframe
  var iframeWindow;
  // jquery object for event handling
  var iframeEvents;

  var hashMap = {
    "#home": "common/ui/keyRing.html",
    "#help": "common/doc/help.html"
  }
  
  function init() {
    iframeEvents = $('#optionsIframe');
  	window.addEventListener("message", receiveMessage);
    initMessageListener();
    var hash = location.hash || '#home';
    $('#optionsIframe').attr('src', mvelo.extension.getURL(hashMap[hash]));
  }

  function receiveMessage(event) {
    var result;
    var error;
    var data = JSON.parse(event.data);
    switch (data.event) {
      case 'viewmodel':
        mvelo.extension.sendMessage(data, function(response) {
          if (data.callback) {
            var respObj = {
              event: "viewmodel-response",
              result: response.result,
              error: response.error,
              id: data.id
            };
            event.source.postMessage(JSON.stringify(respObj), '*');
          }    
        });  
        break;
      case 'message':
        mvelo.extension.sendMessage({ 
          event: data.message.event, 
          message: data.message
        }, function(response) {
          if (data.callback) {
            var respObj = {
              event: "message-response",
              message: response,
              id: data.id
            };
            event.source.postMessage(JSON.stringify(respObj), '*');
          }
        });
        break;
      case 'init':
        // provides reference to iframe window
        iframeWindow = event.source;
        iframeEvents.triggerHandler('iframeLoaded');
        break;
      case 'copyToClipboard':
        var copyFrom = $('<textarea/>');
        copyFrom.val(data.text);
        $('body').append(copyFrom);
        copyFrom.select();
        document.execCommand('copy');
        copyFrom.remove();
        break;
    }
  }

  function initMessageListener() {
    mvelo.extension.onMessage.addListener(
      function(request, sender, sendResponse) {
        if (iframeWindow) {
          // iframe ready, process event
          handleRequests(request, sender, sendResponse);
        } else {
          // iframe not ready, bind handler
          iframeEvents.one('iframeLoaded', handleRequests.bind(undefined, request, sender, sendResponse));
        }
      }
    );
  }

  function handleRequests(request, sender, sendResponse) {
    switch (request.event) {
      case 'add-watchlist-item':
        postWatchlistEvent("add-watchlist-item", request);
        break;
      case 'remove-watchlist-item':
        postWatchlistEvent("remove-watchlist-item", request);
        break;
      case 'options-response':
        iframeWindow.postMessage(JSON.stringify({
          event: "message-response",
          message: request.message,
          id: request.id
        }), '*');
        break;
      case 'reload-options':
        reloadOptions(request.hash);
        break;
    }
  }

  function reloadOptions(hash, callback) {
    $('#optionsIframe').one('load', callback);
    $('#optionsIframe').attr('src', mvelo.extension.getURL(hashMap[hash]));
  }

  function postWatchlistEvent(event, request) {
    if (request.old) {
      reloadOptions('#home', function() {
        iframeWindow.postMessage(JSON.stringify({
          event: event,
          site: request.site,
          hosts: request.hosts
        }), '*');
      });
    } else {
      iframeWindow.postMessage(JSON.stringify({
        event: event,
        site: request.site,
        hosts: request.hosts
      }), '*');
    }
  } 
  
  $(document).ready(init);

}());