/**
 * Copyright (C) 2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from '../lib/lib-mvelo';
import {getUUID} from '../lib/util';
import {SubController, reloadFrames, setAppDataSlot} from './sub.controller';
import * as prefs from '../modules/prefs';
import {hasAnyPrivateKey} from '../modules/keyring';

export default class MenuController extends SubController {
  constructor(port) {
    super(port);
    this.singleton = true;
    // register event handlers
    this.on('browser-action', this.onBrowserAction);
    this.on('get-prefs', () => prefs.prefs);
    this.on('get-is-setup-done', this.getIsSetupDone);
  }

  onBrowserAction({action}) {
    switch (action) {
      case 'reload-extension':
        reloadFrames();
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
        this.openApp('/onboarding');
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

  async getIsSetupDone() {
    return {isSetupDone: await hasAnyPrivateKey()};
  }

  async addToWatchList() {
    const tab = await mvelo.tabs.getActive();
    if (!tab) {
      throw new Error('No tab found');
    }
    const url = new URL(tab.url);
    const domain = mvelo.util.normalizeDomain(url.hostname);
    const slotId = getUUID();
    setAppDataSlot(slotId, {domain, protocol: url.protocol, port: url.port});
    mvelo.tabs.loadAppTab(`?slotId=${slotId}#/settings/watchlist/push`);
  }
}
