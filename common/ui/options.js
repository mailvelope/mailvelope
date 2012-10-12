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
  
  function init() {
    iframeEvents = $('#optionsIframe');
  	window.addEventListener("message", receiveMessage);
    initMessageListener();
    $('#optionsIframe').attr('src', mvelo.extension.getURL('common/ui/keyRing.html'));
  }

  function receiveMessage(event) {
    var result;
    var error;
    var data = JSON.parse(event.data);
    switch (data.event) {
      case 'viewmodel':
        mvelo.extension.sendMessage(data, function(response) {
          console.log('response received in options.js', response.result);
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
          message: data.message,
          id: data.id
        });
        break;
      case 'init':
        // provides reference to iframe window
        console.log('init event');
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
        iframeWindow.postMessage(JSON.stringify({
          event: "add-watchlist-item",
          site: request.site,
          hosts: request.hosts
        }), '*');
        break;
      case 'remove-watchlist-item':
        iframeWindow.postMessage(JSON.stringify({
          event: "remove-watchlist-item",
          site: request.site
        }), '*');
        break;
      case 'options-response':
        console.log('options.js options-response');
        iframeWindow.postMessage(JSON.stringify({
          event: "message-response",
          message: request.message,
          id: request.id
        }), '*');
        break;
    }
  } 
  
  $(document).ready(init);

}());