/**
 * Copyright (C) 2012-2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from './lib-mvelo';
import {matchPattern2RegExString, sortAndDeDup} from './util';
import browser from 'webextension-polyfill';
import {prefs, getWatchList} from '../modules/prefs';

// watchlist match patterns as regex for URL
let watchlistRegex;

export async function initScriptInjection() {
  try {
    watchlistRegex = [];
    const filterURL = await getWatchListFilterURLs();
    const matchPatterns = filterURL.map(({schemes, host}) => `${schemes.includes('http') ? '*' : 'https'}://${host}/*`);
    const originAndPathFilter = {url: filterURL.map(({schemes, host}) => {
      const originAndPathMatches = `^${schemes.includes('http') ? 'https?' : 'https'}:\/\/${matchPattern2RegExString(host)}/.*`;
      watchlistRegex.push(new RegExp(originAndPathMatches));
      return {schemes, originAndPathMatches};
    })};
    if (browser.webNavigation.onDOMContentLoaded.hasListener(watchListNavigationHandler)) {
      browser.webNavigation.onDOMContentLoaded.removeListener(watchListNavigationHandler);
    }
    if (matchPatterns.length) {
      browser.webNavigation.onDOMContentLoaded.addListener(watchListNavigationHandler, originAndPathFilter);
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
  // add hkp key server to enable key import
  let hkpHost = mvelo.util.getDomain(prefs.keyserver.hkp_base_url);
  hkpHost = reduceHosts([hkpHost]);
  hkpHost.forEach(host => {
    // add default schemes to key server hosts
    result.push({schemes, host});
  });
  if (result.length !== 0) {
    result = sortAndDeDup(result, (a, b) => a.host.localeCompare(b.host));
  }
  return result;
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
  return sortAndDeDup(reduced);
}

async function injectOpenTabs(filterURL) {
  const tabs = await mvelo.tabs.query(filterURL);
  for (const tab of tabs) {
    const frames = await browser.webNavigation.getAllFrames({tabId: tab.id});
    for (const frame of frames) {
      const match = watchlistRegex.some(urlRegex => urlRegex.test(frame.url));
      if (!match) {
        continue;
      }
      browser.tabs.executeScript(tab.id, {file: 'content-scripts/cs-mailvelope.js', frameId: frame.frameId})
      .catch(() => {});
      browser.tabs.insertCSS(tab.id, {frameId: frame.frameId})
      .catch(() => {});
    }
  }
}

function watchListNavigationHandler(details) {
  if (details.tabId === browser.tabs.TAB_ID_NONE) {
    // request is not related to a tab
    return;
  }
  browser.tabs.executeScript(details.tabId, {file: 'content-scripts/cs-mailvelope.js', frameId: details.frameId})
  .catch(() => {});
  browser.tabs.insertCSS(details.tabId, {frameId: details.frameId})
  .catch(() => {});
}
