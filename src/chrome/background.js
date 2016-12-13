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

'use strict';

var mvelo = require('./lib/lib-mvelo');
var controller = require('../controller/main.controller');

// content script coding as string
var csCode = '';
// framestyles as string
var framestyles = '';
// watchlist match patterns as regex
let watchlistRegex = [];

function init() {
  controller.extend({
    initScriptInjection: initScriptInjection,
    activate: function() {},
    deactivate: function() {}
  });
  controller.init();
  initConnectionManager();
  //initContextMenu();
  initScriptInjection();
  initMessageListener();
}

init();

function initConnectionManager() {
  // store incoming connections by name and id
  chrome.runtime.onConnect.addListener(function(port) {
    //console.log('ConnectionManager: onConnect:', port);
    controller.portManager.addPort(port);
    port.onMessage.addListener(controller.portManager.handlePortMessage);
    // update active ports on disconnect
    port.onDisconnect.addListener(controller.portManager.removePort);
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
  if (csCode === '') {
    return mvelo.data.load('content-scripts/cs-mailvelope.js').then(function(csmSrc) {
      csCode = csmSrc;
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

    watchlistRegex = filterURL.map((host) => mvelo.util.matchPattern2RegEx(host));

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
      let injections = [];
      tabs.forEach(function(tab) {
        injections.push(injectContent(tab));
      });
      resolve(Promise.all(injections));
    });
  });
}

function injectContent(tab) {
  return new Promise(function(resolve) {
    chrome.tabs.executeScript(tab.id, {code: csBootstrap(), allFrames: true}, () => {
      chrome.tabs.insertCSS(tab.id, {code: framestyles, allFrames: true});
      resolve();
    });
  });
}

function watchListRequestHandler(details) {
  if (details.tabId === -1) {
    // request is not related to a tab
    return;
  }
  // check if host is active in watchlist
  let host = mvelo.util.getHost(details.url);
  let valid = watchlistRegex.some(hostRegex => hostRegex.test(host));
  if (!valid) {
    return;
  }
  chrome.tabs.executeScript(details.tabId, {file: "content-scripts/cs-mailvelope.js", frameId: details.frameId}, () => {
    // prevent error logging
    chrome.runtime.lastError;
    chrome.tabs.insertCSS(details.tabId, {code: framestyles, frameId: details.frameId}, () => {
      // prevent error logging
      chrome.runtime.lastError;
    });
  });
}

function csBootstrap() {
  return `
    if (!window.mveloBootstrap) {
      var hosts = ${JSON.stringify(watchlistRegex.map(hostRegex => hostRegex.source))};
      var hostsRegex = hosts.map(host => new RegExp(host));
      var match = hostsRegex.some(hostRegex => hostRegex.test(document.location.host));
      if (match) {
        chrome.runtime.sendMessage({event: 'get-cs'}, function(response) {
          eval(response.code);
        });
        window.mveloBootstrap = true;
      }
    }`;
}
