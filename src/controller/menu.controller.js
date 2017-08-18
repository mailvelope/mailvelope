/**
 * Copyright (C) 2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from 'lib-mvelo';
import * as sub from './sub.controller';
import {getHostname} from '../modules/pgpModel';
import * as prefs from '../modules/prefs';
import * as uiLog from '../modules/uiLog';

export default class MenuController extends sub.SubController {
  constructor(port) {
    super(port);
    this.singleton = true;
    // register event handlers
    this.on('browser-action', this.onBrowserAction);
    this.on('get-prefs', () => prefs.prefs);
    this.on('get-ui-log', ({securityLogLength}) => uiLog.getLatest(securityLogLength));
    this.on('get-security-background', prefs.getSecurityBackground);
    this.on('activate', this.onActivate);
    this.on('deactivate', this.onDeactivate);
  }

  onBrowserAction({action}) {
    switch (action) {
      case 'reload':
        this.reloadFrames();
        break;
      case 'add':
        this.addToWatchList();
        break;
      case 'options':
        this.loadOptions('#/keyring');
        break;
      case 'showlog':
        this.loadOptions('#/settings/security-log');
        break;
      default:
        console.log('unknown browser action');
    }
  }

  destroyNodes(subControllers) {
    this.postToNodes(subControllers, {event: 'destroy'});
  }

  postToNodes(subControllers, msg) {
    subControllers.forEach(subContr => {
      subContr.ports[subContr.mainType].postMessage(msg);
    });
  }

  reloadFrames() {
    // close frames
    this.destroyNodes(sub.getByMainType('dFrame'));
    this.destroyNodes(sub.getByMainType('vFrame'));
    this.destroyNodes(sub.getByMainType('eFrame'));
    this.destroyNodes(sub.getByMainType('imFrame'));
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
      mvelo.tabs.loadOptionsTab(`?slotId=${slotId}#/settings/watchlist/push`);
    });
  }

  loadOptions(hash) {
    mvelo.tabs.loadOptionsTab(hash);
  }

  onActivate() {
    prefs.update({main_active: true})
    .then(() => {
      this.postToNodes(sub.getByMainType('mainCS'), {event: 'on'});
    });
  }

  onDeactivate() {
    prefs.update({main_active: false})
    .then(() => {
      this.postToNodes(sub.getByMainType('mainCS'), {event: 'off'});
      this.reloadFrames();
    });
  }
}
