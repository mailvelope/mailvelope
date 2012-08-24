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

(function() {
  // ports to decrypt frames
  var dFramePorts = {};
  // ports to decrypt dialogs
  var dDialogPorts = {};
  // decrypt message buffer
  var dMessageBuffer = {};
  // ports to encrypt frames
  var eFramePorts = {};
  // ports to encrypt dialogs
  var eDialogPorts = {};
  // recipients of encrypted mail
  var eRecipientBuffer = {};
  // inject content script only once per time slot
  var injectTimeSlot = 600;
  // injection time slot currently open
  var injectOpen = true;
  // optimized cs injection variant, bootstrap code injected that loads cs
  var injectOptimized = true;
  // keep reloaded iframes 
  var frameUrls = [];
  // content script coding as string
  var csCode = '';
  var scannedHosts = [];
  
  function init() {
    openpgp.init();
    defaults.init(function() {
      initConnectionManager();
      initContextMenu();
      initScriptInjection();
      initMessageListener();
    });
  }
  
  function initConnectionManager() {
    // store incoming connections by name and id
    chrome.extension.onConnect.addListener(function(port) {
      //console.log('ConnectionManager: onConnect:', port);
      var sender = parseName(port.name);
      switch (sender.name) {
        case 'dFrame':
          dFramePorts[sender.id] =  port;
          break;
        case 'dDialog':
          dDialogPorts[sender.id] =  port;
          break;
        case 'eFrame':
          eFramePorts[sender.id] =  port;
          break;
        case 'eDialog':
          eDialogPorts[sender.id] =  port;
          break;
        default:
          console.log('unknown port');
      }
      port.onMessage.addListener(portMessageListener);
      // update active ports on disconnect
      port.onDisconnect.addListener(function(port){
        //console.log('ConnectionManager: delete port', port);
        var sender = parseName(port.name);
        switch (sender.name) {
          case 'dFrame':
            delete dFramePorts[sender.id];
            break;
          case 'dDialog':
            delete dDialogPorts[sender.id];
            break;
          case 'eFrame':
            delete eFramePorts[sender.id];
            break;
          case 'eDialog':
            delete eDialogPorts[sender.id];
            break;
          default:
            console.log('unknown port');
        }
        // always delete message buffer
        delete dMessageBuffer[sender.id];
      });
    }); 
  }
  
  function onBrowserAction(action) {
    switch (action) {
      case 'reload':
        // close frames
        for (id in dFramePorts) {
          if (dFramePorts.hasOwnProperty(id)) {
            //console.log('post message destroy to dFrame%s', id);
            dFramePorts[id].postMessage({event: 'destroy'});
          }
        }
        for (id in eFramePorts) {
          if (eFramePorts.hasOwnProperty(id)) {
            //console.log('post message destroy to eFrame%s', id);
            eFramePorts[id].postMessage({event: 'destroy'});
          }
        }
        break;
      case 'add':
        addToWatchList();
        break;
      case 'remove':
        removeFromWatchList();
        break;
      case 'options':
        chrome.tabs.create({url:"options.html"});
        break;
      default:
        console.log('unknown browser action');
    }
  }
  
  function portMessageListener(msg) {
    console.log('bg messageListener:', msg);
    var id = parseName(msg.sender).id;
    switch (msg.event) {
      case 'decrypt-dialog-cancel':
        // forward event to decrypt frame
        dFramePorts[id].postMessage(msg);
        break;
      case 'encrypt-dialog-cancel':
        // forward event to encrypt frame
        eFramePorts[id].postMessage(msg);
        break;
      case 'decrypt-dialog-init':
        // get armored message from dFrame
        dFramePorts[id].postMessage({event: 'armored-message'});
        break;
      case 'dframe-armored-message':
        var message;
        try {
          message = pgpvm.readMessage(msg.data);
          // add message in buffer
          dMessageBuffer[id] = message;
          // pass over keyid and userid to dialog
          dDialogPorts[id].postMessage({event: 'message-userid', userid: message.userid, keyid: message.keyid});
        } catch (e) {
          dDialogPorts[id].postMessage({event: 'message-userid', error: e});
        }
        break;
      case 'decrypt-dialog-ok':
        var decryptedMsg, decryptError;
        try {
          decryptedMsg = pgpvm.decryptMessage(dMessageBuffer[id], msg.password);
        } catch (e) {
          decryptError = e;
        }
        dDialogPorts[id].postMessage({event: 'decrypted-message', message: decryptedMsg, error: decryptError}); 
        break;
      case 'encrypt-dialog-init':
        eFramePorts[id].postMessage({event: 'recipient-proposal'});
        break;
      case 'eframe-recipient-proposal':
        var emails = pgpvm.deDup(msg.data);
        var keys = pgpvm.getKeyUserIDs(emails);
        eDialogPorts[id].postMessage({event: 'public-key-userids', keys: keys});
        break;
      case 'encrypt-dialog-ok':
        // add recipients to buffer
        eRecipientBuffer[id] = msg.recipient;
        // get email text from eFrame
        eFramePorts[id].postMessage({event: 'email-text', type: msg.type});
        break;
      case 'eframe-email-text':
        var encryptedMsg = pgpvm.encryptMessage(msg.data, eRecipientBuffer[id]);
        eFramePorts[id].postMessage({event: 'encrypted-message', message: encryptedMsg});
        break;
      case 'eframe-textarea-element':
        var defaultEncoding = {};
        if (msg.data) {
          defaultEncoding.type = 'text';
          defaultEncoding.editable = false;
        } else {
          defaultEncoding.type = 'html';
          defaultEncoding.editable = true;
        }
        eDialogPorts[id].postMessage({event: 'encoding-defaults', defaults: defaultEncoding});
        break;
      default:
        console.log('unknown event', msg);
    }
  }

  function initMessageListener() {
    chrome.extension.onMessage.addListener(
      function(request, sender, sendResponse) {
        switch (request.event) {
          case 'browser-action':
            onBrowserAction(request.action);
            break;
          // for content scripts requesting code
          case 'get-cs':
            sendResponse({code: csCode});
            break;
          case 'iframe-scan-result':
            //console.log('hosts: ', request.result);
            scannedHosts = scannedHosts.concat(request.result);
            break;
          case 'set-watch-list':
            pgpvm.setWatchList(request.message.data);
            initScriptInjection();
            break;
          case 'get-tabid':
            sendResponse({tabid: sender.tab.id});
            break;
          default:
          console.log('unknown event');
        }
      }
    );
  } 

  function initContextMenu() {
    chrome.contextMenus.create({
      "title": "Encrypt",
      "contexts": ["page", "frame", "selection", "link", "editable"],
      "onclick": onContextMenuEncrypt
    });
  }

  function onContextMenuEncrypt(info) {
    //console.log(info);
    chrome.tabs.getSelected(null, function(tab) {
      chrome.tabs.sendMessage(tab.id, {event: "context-encrypt"});
    });
  }

  function initScriptInjection() {
    
    if (injectOptimized && csCode === '') {
      // load content script
      $.get(chrome.extension.getURL('content_scripts/build/cs-mailvelope.js'), function(data) {
        csCode = data;
      });
    }

    var filterURL = pgpvm.getWatchListFilterURLs();
    
    var filterType = ["main_frame", "sub_frame"];

    var requestFilter = {
      urls: filterURL,
      types: filterType
    }
    chrome.webRequest.onCompleted.removeListener(watchListRequestHandler);
    if (filterURL.length !== 0) {
      chrome.webRequest.onCompleted.addListener(watchListRequestHandler, requestFilter);
    }
  }

  function watchListRequestHandler(details) {
    // store frame URL
    frameUrls.push(details.url);
    if (injectOpen || details.type === "main_frame") {
      setTimeout(function() {
        //console.log('cs injected');
        var scriptDetails;
        if (injectOptimized) {
          scriptDetails = {code: csBootstrap(), allFrames: true}
        } else {
          scriptDetails = {file: "content_scripts/build/cs-mailvelope.js", allFrames: true}
        }
        chrome.tabs.executeScript(details.tabId, scriptDetails, function() {
          chrome.tabs.insertCSS(details.tabId, {file: "content_scripts/framestyles.css", allFrames: true});
          // open injection time slot
          injectOpen = true;
        });
        // reset buffer after injection
        frameUrls.length = 0;
      }, injectTimeSlot);
      // close injection time slot
      injectOpen = false;
    }
  }

  function csBootstrap() {
    return " \
      if (!document.mailvelopeControl) { \
        var urls = " + JSON.stringify(frameUrls) + "; \
        var match = urls.some(function(url) { \
          return url === document.location.href; \
        }); \
        if (match) { \
          chrome.extension.sendMessage({event: 'get-cs'}, function(response) { \
            eval(response.code); \
          }); \
        } \
      } \
    ";
  }

  function addToWatchList() {
    var scanScript = {
      code: " \
        var hosts = $('iframe').get().map(function(element) { \
          return $('<a/>').attr('href', element.src).prop('hostname'); \
        }); \
        hosts.push(document.location.hostname); \
        chrome.extension.sendMessage({ \
          event: 'iframe-scan-result', \
          result: hosts \
        }); \
      ", 
      allFrames: true
    }

    // get selected tab, "*://*/*" filters out non-http(s)
    chrome.tabs.query({active: true, currentWindow: true, url: "*://*/*"}, function(tabs) {
      if (tabs.length !== 0) {
        // reset scanned hosts buffer
        scannedHosts.length = 0;
        // inject scan script
        chrome.tabs.executeScript(tabs[0].id, {file: "lib/jquery-1.8.0.min.js", allFrames: true}, function() {
          chrome.tabs.executeScript(tabs[0].id, scanScript, function() {
            if (scannedHosts.length === 0) return;
            // remove duplicates and add wildcards
            var hosts = pgpvm.reduceHosts(scannedHosts);
            var site = pgpvm.getHostname(tabs[0].url);
            scannedHosts.length = 0;
            loadOptionsTab(function(tabid) {
              sendToWatchList(tabid, site, hosts);
            });
          });
        });
      }
    });
  }

  function loadOptionsTab(callback) {
    // check if options tab already exists
    chrome.tabs.query({url: chrome.extension.getURL('options.html'), currentWindow: true}, function(tabs) {
      if (tabs.length === 0) {
        // if not existent, create tab
        chrome.tabs.create({url:"options.html"}, function(tab) {
          // wait for tab to be loaded
          chrome.tabs.query({url: chrome.extension.getURL('options.html'), currentWindow: true, status: 'complete'}, function(tabs) {
            //console.log('load options completed ', Date.now());
            callback(tab.id);
          });
        });          
      } else {
        // if existent, set as active tab
        chrome.tabs.update(tabs[0].id, { active: true }, function(tab) {
          callback(tab.id);
        });
      }  
    });
  }

  function sendToWatchList(tabid, site, hosts) {
    //console.log('send message: ', tabid, site, hosts, Date.now());
    chrome.tabs.sendMessage(tabid, {
      event: "add-watchlist-item",
      site: site,
      hosts: hosts
    });
  }

  function removeFromWatchList() {
    // get selected tab
    chrome.tabs.query({active: true, currentWindow: true, url: "*://*/*"}, function(tabs) {
      if (tabs.length !== 0) {
        var site = pgpvm.getHostname(tabs[0].url);
        loadOptionsTab(function(tabid) {
          chrome.tabs.sendMessage(tabid, {
            event: "remove-watchlist-item",
            site: site
          });
        });
      }
    });
  }

  function parseName(nameStr) {
    var pair = nameStr.split('-');
    return { name: pair[0], id: pair[1] };
  }
  
  init();
  
}())