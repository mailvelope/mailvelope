/**
 * Copyright (C) 2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from '../lib/lib-mvelo';
import * as sub from './sub.controller';
import {getHostname} from '../modules/pgpModel';
import * as prefs from '../modules/prefs';
import * as uiLog from '../modules/uiLog';
import * as keyring from '../modules/keyring';

export default class MenuController extends sub.SubController {
  constructor(port) {
    super(port);
    this.singleton = true;
    // register event handlers
    this.on('browser-action', this.onBrowserAction);
    this.on('get-prefs', () => prefs.prefs);
    this.on('get-ui-log', ({securityLogLength}) => uiLog.getLatest(securityLogLength));
    this.on('get-is-setup-done', this.getIsSetupDone);
    this.on('activate', this.onActivate);
    this.on('deactivate', this.onDeactivate);
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
    const hasPrivateKey = keyring.getById(keyringId).hasPrivateKey();
    return {'isSetupDone': hasPrivateKey};
  }

  addToWatchList() {
    let tab;
    mvelo.tabs.getActive()
    .then(active => {
      tab = active;
      if (!tab) {
        throw new Error('No tab found');
      }
      const options = {};
      options.contentScriptFile = ['content-scripts/addToWatchList.js'];
      // inject scan script
      return mvelo.tabs.attach(tab, options);
    })
    .then(scannedHosts => {
      // scanned hosts from iframes currently not used
      if (scannedHosts.length === 0) {
        return;
      }
      const site = getHostname(tab.url);
      const slotId = mvelo.util.getHash();
      sub.setAppDataSlot(slotId, site);
      mvelo.tabs.loadAppTab(`?slotId=${slotId}#/settings/watchlist/push`);
    });
  }

  onActivate() {
    prefs.update({main_active: true})
    .then(() => {
      this.postToNodes(sub.getByMainType('mainCS'), 'on');
    });
  }

  onDeactivate() {
    prefs.update({main_active: false})
    .then(() => {
      this.postToNodes(sub.getByMainType('mainCS'), 'off');
      this.reloadFrames();
    });
  }
}
