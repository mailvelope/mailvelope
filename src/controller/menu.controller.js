/**
 * Copyright (C) 2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from '../lib/lib-mvelo';
import * as sub from './sub.controller';
import * as prefs from '../modules/prefs';
import * as uiLog from '../modules/uiLog';
import {getById as keyringById} from '../modules/keyring';

export default class MenuController extends sub.SubController {
  constructor(port) {
    super(port);
    this.singleton = true;
    // register event handlers
    this.on('browser-action', this.onBrowserAction);
    this.on('get-prefs', () => prefs.prefs);
    this.on('get-ui-log', ({securityLogLength}) => uiLog.getLatest(securityLogLength));
    this.on('get-is-setup-done', this.getIsSetupDone);
  }

  onBrowserAction({action}) {
    switch (action) {
      case 'reload-extension':
        this.reloadFrames();
        break;
      case 'activate-tab':
        this.addToWatchList();
        break;
      case 'options':
        this.openApp('/dashboard');
        break;
      case 'manage-keys':
        this.openApp('/keyring/display');
        break;
      case 'setup-keys':
        this.openApp('/keyring/setup');
        break;
      case 'encrypt-file':
        this.openApp('/encryption/file-encrypt');
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

  destroyNodes(subControllers) {
    this.postToNodes(subControllers, 'destroy');
  }

  postToNodes(subControllers, event) {
    subControllers.forEach(subContr => {
      subContr.ports[subContr.mainType].emit(event);
    });
  }

  reloadFrames() {
    // close frames
    this.destroyNodes(sub.getByMainType('dFrame'));
    this.destroyNodes(sub.getByMainType('vFrame'));
    this.destroyNodes(sub.getByMainType('eFrame'));
    this.destroyNodes(sub.getByMainType('imFrame'));
  }

  getIsSetupDone() {
    const keyringId = sub.getActiveKeyringId();
    const hasPrivateKey = keyringById(keyringId).hasPrivateKey();
    return {'isSetupDone': hasPrivateKey};
  }

  addToWatchList() {
    mvelo.tabs.getActive()
    .then(tab => {
      if (!tab) {
        throw new Error('No tab found');
      }
      const site = mvelo.util.getDomain(tab.url);
      const slotId = mvelo.util.getHash();
      sub.setAppDataSlot(slotId, site);
      mvelo.tabs.loadAppTab(`?slotId=${slotId}#/settings/watchlist/push`);
    });
  }
}
