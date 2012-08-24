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

  var pgpvm = chrome.extension.getBackgroundPage().pgpvm;
  // window of options iframe
  var iframeWindow;
  // jquery object for event handling
  var iframeEvents;
  
  function init() {
    iframeEvents = $('#optionsIframe');
  	window.addEventListener("message", receiveMessage);
    initMessageListener();
  }

  function receiveMessage(event) {
    var result;
    var error;
    switch (event.data.event) {
      case 'viewmodel':
        try {
          result = pgpvm[event.data.method].apply(pgpvm, event.data.args);
        } catch (e) {
          error = e;
        }
        if (event.data.callback) {
          event.source.postMessage({
            event: "viewmodel-response",
            result: result,
            error: error,
            id: event.data.id
          }, '*');
        }
        break;
      case 'message':
        chrome.extension.sendMessage({ 
          event: event.data.message.event, 
          message: event.data.message,
          id: event.data.id
        });
        break;
      case 'init':
        // provides reference to iframe window
        iframeWindow = event.source;
        iframeEvents.triggerHandler('iframeLoaded');
        break;
    }
  }

  function initMessageListener() {
    chrome.extension.onMessage.addListener(
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
        iframeWindow.postMessage({
          event: "add-watchlist-item",
          site: request.site,
          hosts: request.hosts
        }, '*');
        break;
      case 'remove-watchlist-item':
        iframeWindow.postMessage({
          event: "remove-watchlist-item",
          site: request.site
        }, '*');
        break;
      case 'options-response':
        iframeWindow.postMessage({
          event: "message-response",
          message: request.message,
          id: request.id
        }, '*');
        break;
    }
  } 
  
  $(document).ready(init);
  
}());