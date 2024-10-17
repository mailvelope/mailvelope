/**
 * Copyright (C) 2012-2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from './lib-mvelo';
import {createController} from '../controller/main.controller';
import {str2bool, matchPattern2RegExString, sortAndDeDup} from './util';
import {getWatchList} from '../modules/prefs';

// watchlist match patterns as regex for URL
export let watchlistRegex;

export async function initScriptInjection() {
  try {
    watchlistRegex = [];
    const filterURL = await getWatchListFilterURLs();
    const matchPatterns = filterURL.map(({schemes, host}) => {
      const scheme = schemes.includes('http') ? '*' : 'https';
      // filter out port numbers
      host = host.includes(':') ? host.replace(/:\d{1,5}$/, '') : host;
      return `${scheme}://${host}/*`;
    });
    const originAndPathFilter = {url: filterURL.map(({schemes, host}) => {
      const originAndPathMatches = `^${schemes.includes('http') ? 'https?' : 'https'}:\/\/${matchPattern2RegExString(host)}/.*`;
      watchlistRegex.push(new RegExp(originAndPathMatches));
      return {schemes, originAndPathMatches};
    })};
    if (chrome.webNavigation.onDOMContentLoaded.hasListener(watchListNavigationHandler)) {
      chrome.webNavigation.onDOMContentLoaded.removeListener(watchListNavigationHandler);
    }
    if (matchPatterns.length) {
      chrome.webNavigation.onDOMContentLoaded.addListener(watchListNavigationHandler, originAndPathFilter);
    }
    return injectOpenTabs(matchPatterns);
  } catch (e) {
    console.log('mailvelope initScriptInjection', e);
  }
}

async function getWatchListFilterURLs() {
  const watchList = await getWatchList();
  const schemes = ['http', 'https'];
  let result = [];
  watchList.forEach(site => {
    site.active && site.frames && site.frames.forEach(frame => {
      frame.scan && result.push({schemes: site.https_only ? ['https'] : schemes, host: frame.frame});
    });
  });
  if (result.length !== 0) {
    result = sortAndDeDup(result, (a, b) => a.host.localeCompare(b.host));
  }
  return result;
}

async function injectOpenTabs(filterURL) {
  const tabs = await mvelo.tabs.query(filterURL);
  for (const tab of tabs) {
    chrome.tabs.sendMessage(tab.id, {event: 'reconnect'})
    .catch(() => {});
  }
  for (const tab of tabs) {
    const frames = await chrome.webNavigation.getAllFrames({tabId: tab.id});
    const frameIds = [];
    for (const frame of frames) {
      if (watchlistRegex.some(urlRegex => urlRegex.test(frame.url))) {
        frameIds.push(frame.frameId);
      }
    }
    chrome.scripting.executeScript({
      target: {tabId: tab.id, frameIds},
      files: ['content-scripts/cs-mailvelope.js']
    })
    .catch(() => {});
  }
}

function watchListNavigationHandler(details) {
  if (details.tabId === chrome.tabs.TAB_ID_NONE) {
    // request is not related to a tab
    return;
  }
  chrome.scripting.executeScript({
    target: {tabId: details.tabId, frameIds: [details.frameId]},
    files: ['content-scripts/cs-mailvelope.js']
  })
  .catch(() => {});
}

export function initAuthRequestApi() {
  chrome.webNavigation.onBeforeNavigate.addListener(
    authRequest,
    {url: [
      {urlMatches: `^https:\/\/${matchPattern2RegExString('api.mailvelope.com/authorize-domain')}/.*`}
    ]}
  );
}

async function authRequest({tabId, url}) {
  const tab = await chrome.tabs.get(tabId);
  const tmpApiUrl = new URL(url);
  const api = str2bool(tmpApiUrl.searchParams.get('api') || false);
  const targetUrl = new URL(tab.url);
  let hostname = targetUrl.hostname;
  const protocol = targetUrl.protocol;
  const port = targetUrl.port;
  if (hostname.startsWith('www.')) {
    hostname = hostname.slice(4);
  }
  const authDomainCtrl = await createController('authDomainDialog');
  authDomainCtrl.authorizeDomain({hostname, port, protocol, api, tabId, url: tab.url});
}
