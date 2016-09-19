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

/* global requirejs */

'use strict';

var mvelo = mvelo || null;

requirejs.config({
  baseUrl: 'lib',
  paths: {
    jquery: '../dep/jquery.min',
    openpgp: '../dep/openpgp',
    mvelo: '../mvelo',
    dompurify: '../dep/purify'
  },
  shim: {
    'mvelo': {
      exports: 'mvelo'
    }
  }
});

define([
  "controller/main.controller",
  "controller/sub.controller",
  "modules/pgpModel"
], function(controller, subController, model) {

  // inject content script only once per time slot
  var injectTimeSlot = 600;
  // injection time slot currently open
  var injectOpen = true;
  // optimized cs injection variant, bootstrap code injected that loads cs
  var injectOptimized = true;
  // keep reloaded iframes
  var frameHosts = [];
  // content script coding as string
  var csCode = '';
  // framestyles as string
  var framestyles = '';

  function init() {
    controller.extend({
      initScriptInjection: initScriptInjection,
      activate: function() {},
      deactivate: function() {}
    });
    model.init();
    migrate();
    initConnectionManager();
    //initContextMenu();
    initScriptInjection();
    initMessageListener();
  }

  function initConnectionManager() {
    // store incoming connections by name and id
    chrome.runtime.onConnect.addListener(function(port) {
      //console.log('ConnectionManager: onConnect:', port);
      subController.addPort(port);
      port.onMessage.addListener(subController.handlePortMessage);
      // update active ports on disconnect
      port.onDisconnect.addListener(subController.removePort);
    });
  }

  function initMessageListener() {
    chrome.runtime.onMessage.addListener(
      function(request, sender, sendResponse) {
        switch (request.event) {
          // for content scripts requesting code
          case 'get-cs':
            sendResponse({code: csCode});
            break;
          default:
            return controller.handleMessageEvent(request, sender, sendResponse);
        }
      }
    );
  }
/*
  function initContextMenu() {
    chrome.contextMenus.create({
      "title": "Encrypt",
      "contexts": ["editable"],
      "onclick": onContextMenuEncrypt
    });
  }

  function onContextMenuEncrypt(info) {
    //console.log(info);
    chrome.tabs.getSelected(null, function(tab) {
      chrome.tabs.sendMessage(tab.id, {event: "context-encrypt"});
    });
  }
*/
  function loadContentCode() {
    if (injectOptimized && csCode === '') {
      return mvelo.data.load('content-scripts/cs-mailvelope.js').then(function(csmSrc) {
        return mvelo.data.load('dep/jquery.min.js').then(function(jquerySrc) {
          csCode = jquerySrc + csmSrc;
        });
      });
    }
    return Promise.resolve();
  }

  function loadFramestyles() {
    // load framestyles and replace path
    if (framestyles === '') {
      return mvelo.data.load('content-scripts/framestyles.css').then(function(data) {
        framestyles = data;
        var token = /\.\.\//g;
        framestyles = framestyles.replace(token, chrome.runtime.getURL(''));
      });
    }
    return Promise.resolve();
  }

  function initScriptInjection() {
    loadContentCode()
    .then(loadFramestyles)
    .then(function() {
      var filterURL = controller.getWatchListFilterURLs();

      filterURL = filterURL.map(function(host) {
        return '*://' + host + '/*';
      });

      injectOpenTabs(filterURL)
      .then(function() {
        var filterType = ["main_frame", "sub_frame"];
        var requestFilter = {
          urls: filterURL,
          types: filterType
        };
        chrome.webRequest.onCompleted.removeListener(watchListRequestHandler);
        if (filterURL.length !== 0) {
          chrome.webRequest.onCompleted.addListener(watchListRequestHandler, requestFilter);
        }
      });
    });
  }

  function injectOpenTabs(filterURL) {
    return new Promise(function(resolve) {
      // query open tabs
      mvelo.tabs.query(filterURL, function(tabs) {
        tabs.forEach(function(tab) {
          //console.log('tab', tab);
          chrome.tabs.executeScript(tab.id, {code: csBootstrap(), allFrames: true}, function() {
            chrome.tabs.insertCSS(tab.id, {code: framestyles, allFrames: true});
          });
        });
        resolve();
      });
    });
  }

  function watchListRequestHandler(details) {
    if (details.tabId === -1) {
      return;
    }
    // store frame URL
    frameHosts.push(model.getHost(details.url));
    if (injectOpen || details.type === "main_frame") {
      setTimeout(function() {
        if (frameHosts.length === 0) {
          // no requests since last inject
          return;
        }
        if (injectOptimized) {
          chrome.tabs.executeScript(details.tabId, {code: csBootstrap(), allFrames: true}, function() {
            chrome.tabs.insertCSS(details.tabId, {code: framestyles, allFrames: true});
          });
        } else {
          chrome.tabs.executeScript(details.tabId, {file: "dep/jquery.min.js", allFrames: true}, function() {
            chrome.tabs.executeScript(details.tabId, {file: "content-scripts/cs-mailvelope.js", allFrames: true}, function() {
              chrome.tabs.insertCSS(details.tabId, {code: framestyles, allFrames: true});
            });
          });
        }
        // open injection time slot
        injectOpen = true;
        // reset buffer after injection
        frameHosts.length = 0;
      }, injectTimeSlot);
      // close injection time slot
      injectOpen = false;
    }
  }

  function csBootstrap() {
    var bootstrapSrc =
    " \
      if (!window.mveloBootstrap) { \
        var hosts = " + JSON.stringify(frameHosts) + "; \
        var match = !hosts.length || hosts.some(function(host) { \
          return host === document.location.host; \
        }); \
        if (match) { \
          chrome.runtime.sendMessage({event: 'get-cs'}, function(response) { \
            eval(response.code); \
          }); \
          window.mveloBootstrap = true; \
        } \
      } \
    ";
    return bootstrapSrc;
  }

  function migrate() {
    model.migrate08();
  }

  init();

});
