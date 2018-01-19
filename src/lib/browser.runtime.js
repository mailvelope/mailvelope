/**
 * Copyright (C) 2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from './lib-mvelo';
import defaults from '../res/defaults.json';

/**
 * Initialize browser runtime features.
 */
export function initBrowserRuntime() {
  initInstall();
}

/**
 * Listen to the installation event.
 * When the plugin is installed, open the install landing page.
 */
function initInstall() {
  chrome.runtime.onInstalled.addListener(details => {
    if (details.reason == "install") {
      openInstallLandingPage();
    }
  });
}

/**
 * Open the install landing page.
 * The landing page shouldn't start for the sites that are using the mailvelope API.
 */
function openInstallLandingPage() {
  // Retrieve all the sites that use the mailvelope API.
  const filteredSitesPatterns = defaults.watch_list.reduce((result, site) => {
    site.active && site.frames && site.frames.forEach(frame => {
      frame.scan && frame.api && result.push(`*://${frame.frame}/*`);
    });
    return result;
  }, []);

  // Check if a tab is open on one of these sites.
  return mvelo.tabs.query(filteredSitesPatterns)
  // If no match, open the install landing page.
  .then(match => {
    if (!match.length) {
      mvelo.tabs.loadTab({path: '/components/install-landing-page/installLandingPage.html'});
    }
  });
}
