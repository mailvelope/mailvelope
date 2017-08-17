/**
 * Copyright (C) 2012-2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from './lib-mvelo';
import {getWatchList, getHostname} from '../modules/pgpModel';
import {prefs} from '../modules/prefs';

// inject content script only once per time slot
const injectTimeSlot = 600;
// injection time slot currently open
let injectOpen = true;
// optimized cs injection variant, bootstrap code injected that loads cs
const injectOptimized = true;
// keep reloaded iframes
const frameHosts = [];
// content script coding as string
let csCode = '';
// framestyles as string
let framestyles = '';

export function initScriptInjection() {
  loadContentCode()
  .then(loadFramestyles)
  .then(initMessageListener)
  .then(getWatchListFilterURLs)
  .then(filterURL => filterURL.map(host => `*://${host}/*`))
  .then(injectOpenTabs)
  .then(filterURL => {
    const filterType = ["main_frame", "sub_frame"];
    const requestFilter = {
      urls: filterURL,
      types: filterType
    };
    chrome.webRequest.onCompleted.removeListener(watchListRequestHandler);
    if (filterURL.length !== 0) {
      chrome.webRequest.onCompleted.addListener(watchListRequestHandler, requestFilter);
    }
  });
}

function loadContentCode() {
  if (injectOptimized && csCode === '') {
    return mvelo.data.load('content-scripts/cs-mailvelope.js').then(csmSrc => {
      csCode = csmSrc;
    });
  }
  return Promise.resolve();
}

function loadFramestyles() {
  // load framestyles and replace path
  if (framestyles === '') {
    return mvelo.data.load('content-scripts/framestyles.css').then(data => {
      framestyles = data;
      const token = /\.\.\//g;
      framestyles = framestyles.replace(token, chrome.runtime.getURL(''));
    });
  }
  return Promise.resolve();
}

function initMessageListener() {
  if (injectOptimized && !chrome.runtime.onMessage.hasListener(sendCode)) {
    chrome.runtime.onMessage.addListener(sendCode);
  }
}

function sendCode(request, sender, sendResponse) {
  if (request.event === 'get-cs') {
    sendResponse({code: csCode});
  }
}

function getWatchListFilterURLs() {
  return getWatchList()
  .then(watchList => {
    let result = [];
    watchList.forEach(site => {
      site.active && site.frames && site.frames.forEach(frame => {
        frame.scan && result.push(frame.frame);
      });
    });
    // add hkp key server to enable key import
    let hkpHost = getHostname(prefs.keyserver.hkp_base_url);
    hkpHost = reduceHosts([hkpHost]);
    result.push(...hkpHost);
    if (result.length !== 0) {
      result = mvelo.util.sortAndDeDup(result);
    }
    return result;
  });
}

function reduceHosts(hosts) {
  const reduced = [];
  hosts.forEach(element => {
    const labels = element.split('.');
    if (labels.length < 2) {
      return;
    }
    if (labels.length <= 3) {
      if (/www.*/.test(labels[0])) {
        labels[0] = '*';
      } else {
        labels.unshift('*');
      }
      reduced.push(labels.join('.'));
    } else {
      reduced.push(`*.${labels.slice(-3).join('.')}`);
    }
  });
  return mvelo.util.sortAndDeDup(reduced);
}

function injectOpenTabs(filterURL) {
  // query open tabs
  return mvelo.tabs.query(filterURL)
  .then(tabs => {
    tabs.forEach(tab => {
      //console.log('tab', tab);
      chrome.tabs.executeScript(tab.id, {code: csBootstrap(), allFrames: true}, () => {
        chrome.tabs.insertCSS(tab.id, {code: framestyles, allFrames: true});
      });
    });
    return filterURL;
  });
}

function watchListRequestHandler(details) {
  if (details.tabId === -1) {
    return;
  }
  // store frame URL
  frameHosts.push(mvelo.util.getHost(details.url));
  if (injectOpen || details.type === "main_frame") {
    setTimeout(() => {
      if (frameHosts.length === 0) {
        // no requests since last inject
        return;
      }
      if (injectOptimized) {
        chrome.tabs.executeScript(details.tabId, {code: csBootstrap(), allFrames: true}, () => {
          chrome.tabs.insertCSS(details.tabId, {code: framestyles, allFrames: true});
        });
      } else {
        chrome.tabs.executeScript(details.tabId, {file: "content-scripts/cs-mailvelope.js", allFrames: true}, () => {
          chrome.tabs.insertCSS(details.tabId, {code: framestyles, allFrames: true});
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
  const bootstrapSrc =
  ` \
    if (!window.mveloBootstrap) { \
      var hosts = ${JSON.stringify(frameHosts)}; \
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
  `;
  return bootstrapSrc;
}
