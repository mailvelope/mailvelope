/**
 * Copyright (C) 2012-2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from './lib-mvelo';
import browser from 'webextension-polyfill';
import {prefs, getWatchList} from '../modules/prefs';

// framestyles as string
let framestyles = '';

export async function initScriptInjection() {
  try {
    await loadFramestyles();
    const filterURL = await getWatchListFilterURLs();
    const matchPatterns = filterURL.map(({schemes, host}) => `${schemes.indexOf('http') !== -1 ? '*' : 'https'}://${host}/*`);
    const originAndPathFilter = {url: filterURL.map(({schemes, host}) => ({schemes, originAndPathMatches: `^https?:\/\/${mvelo.util.matchPattern2RegExString(host)}/.*`}))};
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

async function getWatchListFilterURLs() {
  const watchList = await getWatchList();
  const schemes = ['http', 'https'];
  let result = [];
  watchList.forEach(site => {
    site.active && site.frames && site.frames.forEach(frame => {
      frame.scan && result.push({schemes: site.https_only ? [schemes[1]] : [...schemes], host: frame.frame});
    });
  });
  // add hkp key server to enable key import
  let hkpHost = mvelo.util.getDomain(prefs.keyserver.hkp_base_url);
  hkpHost = reduceHosts([hkpHost]);
  hkpHost.forEach(host => {
    // add default schemes to key server hosts
    result.push({schemes: [...schemes], host});
  });
  if (result.length !== 0) {
    result = mvelo.util.sortAndDeDup(result, (a, b) => a.host.localeCompare(b.host));
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
  return mvelo.util.sortAndDeDup(reduced);
}

function injectOpenTabs(filterURL) {
  return mvelo.tabs.query(filterURL)
  .then(tabs => tabs.forEach(tab => {
    browser.tabs.executeScript(tab.id, {file: "content-scripts/cs-mailvelope.js", allFrames: true})
    .catch(() => {});
    browser.tabs.insertCSS(tab.id, {code: framestyles, allFrames: true})
    .catch(() => {});
  }));
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
