/**
 * Copyright (C) 2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from '../lib/lib-mvelo';
import {getHash} from '../lib/util';
import * as sub from './sub.controller';
import * as prefs from '../modules/prefs';
import {getAll as getAllKeyring} from '../modules/keyring';
import {ci} from '../lib/analytics';

export default class MenuController extends sub.SubController {
  constructor(port) {
    super(port);
    this.singleton = true;
    // register event handlers
    this.on('browser-action', this.onBrowserAction);
    this.on('get-prefs', () => prefs.prefs);
    this.on('get-is-setup-done', this.getIsSetupDone);
    this.on('get-is-bg-customized', this.getIsBGCustomized);
    this.on('grant-consent', ({campaignId}) => ci.grantCampaign(campaignId));
    this.on('deny-consent', ({campaignId}) => ci.denyCampaign(campaignId));
    this.on('get-consent', ({campaignId}) => ci.isCampaignCurrentlyGranted(campaignId));
    this.on('has-granted-or-denied-consent', this.hasGrantedOrDeniedConsent);
  }

  async hasGrantedOrDeniedConsent({campaignId}) {
    if (ci.campaignConsents.indexOf(campaignId) === -1) {
      return false;
    }
    return true;
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
      case 'setup-keys':
        this.openApp('/keyring/setup');
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
      case 'setup-new-bg':
        this.cleanupPrefs();
        this.openApp('/settings/security-background');
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

  getIsBGCustomized() {
    // check for old security bg values in local storage
    return {isBGCustomized: !Object.keys(prefs.prefs.security).some(key => key.includes('secureBgnd'))};
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
      const slotId = getHash();
      sub.setAppDataSlot(slotId, {domain, protocol});
      mvelo.tabs.loadAppTab(`?slotId=${slotId}#/settings/watchlist/push`);
    });
  }
}
