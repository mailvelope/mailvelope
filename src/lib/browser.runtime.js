/**
 * Copyright (C) 2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from './lib-mvelo';
import defaults from '../res/defaults.json';
import gpgmejs from 'gpgmejs';

export let gpgme = null;

const GPGME_INIT_TIMEOUT = 1000;

/**
 * Initialize browser runtime features.
 */
export function initBrowserRuntime() {
  registerRuntimeHandler();
}

/**
 * Intialize native messaging
 * @return {Promise.<undefined>}
 */
export async function initNativeMessaging() {
  // check for GPGME installation and connect
  try {
    gpgme = await gpgmejs.init({timeout: GPGME_INIT_TIMEOUT});
  } catch (e) {
    console.log('GPGME is not available.', e.message);
  }
}

/**
 * Register runtime event handlers
 */
function registerRuntimeHandler() {
  // listen to the installation event
  chrome.runtime.onInstalled.addListener(details => {
    if (details.reason == 'install') {
      // when the plugin is installed, open the install landing page
      openInstallLandingPage();
    }
  });
  // update Mailvelope only on browser restart for Firefox. On Chrome this is the default behavior.
  chrome.runtime.onUpdateAvailable.addListener(() => {});
}

/**
 * Open the install landing page.
 * The landing page shouldn't start for the sites that are using the mailvelope API.
 */
async function openInstallLandingPage() {
  // retrieve all the sites that use the mailvelope API.
  const filteredSitesPatterns = defaults.watch_list.reduce((result, site) => {
    site.active && site.frames && site.frames.forEach(frame => {
      frame.scan && frame.api && result.push(`*://${frame.frame}/*`);
    });
    return result;
  }, []);

  // check if a tab is open on one of these sites.
  const match = await mvelo.tabs.query(filteredSitesPatterns);
  // if no match, open the install landing page.
  if (!match.length) {
    mvelo.tabs.loadTab({path: '/components/install-landing-page/installLandingPage.html'});
  }
}
