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

'use strict';

var mvelo = mvelo || null;

requirejs.config({
  baseUrl: 'lib',
  paths: {
    jquery: '../common/dep/jquery.min',
    openpgp: '../dep/openpgp',
    mvelo: '../common/ui/mvelo',
    parser_rules: '../common/dep/wysihtml5/js/advanced_parser_rules',
    dompurify: '../common/dep/purify'
  },
  shim: {
    'mvelo': {
      exports: 'mvelo'
    },
    'parser_rules': {
      exports: 'wysihtml5ParserRules'
    }
    /*
    'wysihtml5': {
      deps: ['parser_rules', 'jquery'],
      exports: 'wysihtml5',
      init: function() {
        var element = $('<textarea/>').appendTo($('body'));
        return new wysihtml5.Editor(element.get(0), {
          parserRules:  wysihtml5ParserRules
        });
      }
    }
    */
  }
});

define([
  "common/controller/main.controller",
  "common/controller/sub.controller",
  "common/pgpViewModel",
  "common/prefs",
  "openpgp",
  "jquery"
], function(controller, subController, model, prefs, openpgp, $) {

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

  function initScriptInjection() {
    if (injectOptimized && csCode === '') {
      // load content script
      $.get(chrome.runtime.getURL('common/ui/inline/cs-mailvelope.js'), function(csmSrc) {
        $.get(chrome.runtime.getURL('common/dep/jquery.min.js'), function(jquerySrc) {
          csCode = jquerySrc + csmSrc;
        });
      });
    }

    // load framestyles and replace path
    if (framestyles === '') {
      $.get(chrome.runtime.getURL('common/ui/inline/framestyles.css'), function(data) {
        framestyles = data;
        var token = /\.\.\/\.\./g;
        framestyles = framestyles.replace(token, chrome.runtime.getURL('common'));
      });
    }

    var filterURL = controller.getWatchListFilterURLs();

    filterURL = filterURL.map(function(host) {
      return '*://' + host + '/*';
    });

    var filterType = ["main_frame", "sub_frame"];

    var requestFilter = {
      urls: filterURL,
      types: filterType
    };
    chrome.webRequest.onCompleted.removeListener(watchListRequestHandler);
    if (filterURL.length !== 0) {
      chrome.webRequest.onCompleted.addListener(watchListRequestHandler, requestFilter);
    }
  }

  function watchListRequestHandler(details) {
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
            // open injection time slot
            injectOpen = true;
          });
        } else {
          chrome.tabs.executeScript(details.tabId, {file: "common/dep/jquery.min.js", allFrames: true}, function() {
            chrome.tabs.executeScript(details.tabId, {file: "common/ui/inline/cs-mailvelope.js", allFrames: true}, function() {
              chrome.tabs.insertCSS(details.tabId, {code: framestyles, allFrames: true});
              // open injection time slot
              injectOpen = true;
            });
          });
        }
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
      if (!document.mveloBootstrap) { \
        var hosts = " + JSON.stringify(frameHosts) + "; \
        var match = hosts.some(function(host) { \
          return host === document.location.host; \
        }); \
        if (match) { \
          chrome.runtime.sendMessage({event: 'get-cs'}, function(response) { \
            eval(response.code); \
          }); \
        } \
        document.mveloBootstrap = true;\
      } \
    ";
    return bootstrapSrc;
  }

  function migrate() {
    model.migrate08();
  }

  init();

});
