/**
 * Copyright (C) 2012-2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from './lib-mvelo';
import browser from 'webextension-polyfill';
import {getWatchList, getHostname} from '../modules/pgpModel';
import {prefs} from '../modules/prefs';

// content script coding as string
let csCode = '';
// framestyles as string
let framestyles = '';
// watchlist match patterns as regex
let watchlistRegex = [];

export function initScriptInjection() {
  let matchPatterns;
  let originAndPathFilter;
  loadContentCode()
  .then(loadFramestyles)
  .then(initMessageListener)
  .then(getWatchListFilterURLs)
  .then(filterURL => {
    watchlistRegex = filterURL.map(host => mvelo.util.matchPattern2RegEx(host));
    matchPatterns = filterURL.map(host => `*://${host}/*`);
    const schemes = ['http', 'https'];
    originAndPathFilter = {url: filterURL.map(host => ({schemes,
      originAndPathMatches: `^https?:\/\/${mvelo.util.matchPattern2RegExString(host)}/.*`
    }))}
  })
  .then(() => injectOpenTabs(matchPatterns))
  .then(() => {
    if (matchPatterns.length !== 0 && !browser.webNavigation.onDOMContentLoaded.hasListener(watchListNavigationHandler)) {
      browser.webNavigation.onDOMContentLoaded.addListener(watchListNavigationHandler, originAndPathFilter);
    }
    if (matchPatterns.length === 0 && browser.webNavigation.onDOMContentLoaded.hasListener(watchListNavigationHandler)) {
      browser.webNavigation.onDOMContentLoaded.removeListener(watchListNavigationHandler);
    }
  });
}

function loadContentCode() {
  if (csCode === '') {
    return mvelo.data.load('content-scripts/cs-mailvelope.js').then(csmSrc => csCode = csmSrc);
  }
  return Promise.resolve();
}

function loadFramestyles() {
  // load framestyles and replace path
  if (framestyles === '') {
    return mvelo.data.load('content-scripts/framestyles.css').then(framestylesCSS => {
      // replace relative paths in url('/') with absolute extension paths
      framestyles = framestylesCSS.replace(/url\('\//g, `url('${browser.runtime.getURL('')}`);
    });
  }
  return Promise.resolve();
}

function initMessageListener() {
  if (!chrome.runtime.onMessage.hasListener(sendCode)) {
    // keep chrome namespace as sendResponse not supported in browser.runtime.onMessage
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
  return mvelo.tabs.query(filterURL)
  .then(tabs => {
    const injections = [];
    tabs.forEach(tab => injections.push(injectContent(tab)));
    return Promise.all(injections);
  });
}

function injectContent(tab) {
  return Promise.all([
    browser.tabs.executeScript(tab.id, {code: csBootstrap(), allFrames: true})
    .catch(() => {}),
    browser.tabs.insertCSS(tab.id, {code: framestyles, allFrames: true})
    .catch(() => {})
  ]);
}

function watchListNavigationHandler(details) {
  if (details.tabId === browser.tabs.TAB_ID_NONE) {
    // request is not related to a tab
    return;
  }
  browser.tabs.executeScript(details.tabId, {file: "content-scripts/cs-mailvelope.js", frameId: details.frameId})
  .catch(() => {});
  browser.tabs.insertCSS(details.tabId, {code: framestyles, frameId: details.frameId})
  .catch(() => {});
}

function csBootstrap() {
  const bootstrapSrc =
  ` \
    if (!window.mveloBootstrap) { \
      var hosts = ${JSON.stringify(watchlistRegex.map(hostRegex => hostRegex.source))};
      var hostsRegex = hosts.map(host => new RegExp(host));
      var match = hostsRegex.some(hostRegex => hostRegex.test(document.location.host));
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
