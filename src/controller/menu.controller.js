/**
 * Copyright (C) 2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from '../lib/lib-mvelo';
import {getUUID} from '../lib/util';
import * as sub from './sub.controller';
import * as prefs from '../modules/prefs';
import {getAll as getAllKeyring} from '../modules/keyring';
import {shouldSeeConsentDialog} from '../lib/analytics';

export default class MenuController extends sub.SubController {
  constructor(port) {
    super(port);
    this.singleton = true;
    // register event handlers
    this.on('browser-action', this.onBrowserAction);
    this.on('get-prefs', () => prefs.prefs);
    this.on('get-is-setup-done', this.getIsSetupDone);
    this.on('analytics-consent', this.analyticsConsent);
  }

  onBrowserAction({action}) {
    switch (action) {
      case 'reload-extension':
        sub.reloadFrames();
        break;
      case 'activate-tab':
        this.addToWatchList();
        break;
      case 'dashboard':
        this.openApp('/dashboard');
        break;
      case 'options':
        this.openApp('/settings');
        break;
      case 'manage-keys':
        this.openApp('/keyring');
        break;
      case 'lets-start':
        this.analyticsConsent();
        break;
      case 'encrypt-file':
        this.openApp('/encrypt');
        break;
      case 'security-settings':
        this.openApp('/settings/security');
        break;
      case 'security-logs':
        this.openApp('/settings/security-log');
        break;
      case 'email-providers':
        this.openApp('/settings/watchlist');
        break;
      default:
        console.log('unknown browser action');
    }
  }

  getIsSetupDone() {
    // check if at least one keyring has a private key
    const hasPrivateKey = getAllKeyring().some(keyring => keyring.hasPrivateKey());
    return {isSetupDone: hasPrivateKey};
  }

  async cleanupPrefs() {
    for (const key of Object.keys(prefs.prefs.security).filter(key => key.includes('secureBgnd'))) {
      await prefs.removePreference(['mvelo.preferences', 'security', key]);
      await prefs.init();
    }
  }

  addToWatchList() {
    mvelo.tabs.getActive()
    .then(tab => {
      if (!tab) {
        throw new Error('No tab found');
      }
      const domain = mvelo.util.getDomain(tab.url);
      const protocol = mvelo.util.getProtocol(tab.url);
      const slotId = getUUID();
      sub.setAppDataSlot(slotId, {domain, protocol});
      mvelo.tabs.loadAppTab(`?slotId=${slotId}#/settings/watchlist/push`);
    });
  }

  analyticsConsent() {
    if (shouldSeeConsentDialog()) {
      this.openApp('/analytics-consent');
    } else {
      this.openApp('/keyring/setup');
    }
  }
}
