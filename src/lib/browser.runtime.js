/**
 * Copyright (C) 2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from './lib-mvelo';
import defaults from '../res/defaults.json';
import {c1und1} from '../modules/certs';

export let gpgme = null;

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
export function initNativeMessaging() {
  return new Promise(resolve => {
    // resolve after timeout of 500 ms
    window.setTimeout(resolve, 500);
    initGpgme()
    .then(resolve);
  });
}

/**
 * Register runtime event handlers
 */
function registerRuntimeHandler() {
  // listen to the installation event
  chrome.runtime.onInstalled.addListener(details => {
    if (details.reason == "install") {
      // when the plugin is installed, open the install landing page
      openInstallLandingPage();
    }
  });
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

/**
 * Check for GPGME installation and connect
 */
async function initGpgme() {
  // TODO: call gpgme.connect()
  gpgme = {
    generateKey() {},
    encrypt() {},
    decrypt() {},
    sign() {},
    verify() {},
    keyring: {
      async getPublicKeys() {
        return [{armor: c1und1, secret: false}, {armor: gpgPubKey, secret: true}];
      },
      getDefaultKey() {},
      deleteKey() {},
      importKey() {}
    }
  };
}

const gpgPubKey =
`-----BEGIN PGP PUBLIC KEY BLOCK-----
Version: Mailvelope v2.2.0 build: 2018-04-25T14:38:22
Comment: https://www.mailvelope.com

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
IGzQTLsbJq1bdsi6KZfRp16WXhcx
=TEmh
-----END PGP PUBLIC KEY BLOCK-----
`;
