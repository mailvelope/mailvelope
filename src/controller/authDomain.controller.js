/**
 * Copyright (C) 2015-2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from '../lib/lib-mvelo';
import {getUUID, PromiseQueue} from '../lib/util';
import {getWatchList, setWatchList} from '../modules/prefs';
import {initScriptInjection, watchlistRegex} from '../lib/inject';
import * as uiLog from '../modules/uiLog';
import * as sub from './sub.controller';

export default class AuthDomainController extends sub.SubController {
  constructor(port) {
    if (port) {
      throw new Error('Do not instantiate AuthDomainController with a port');
    }
    super(null);
    this.persistent = true;
    this.mainType = 'authDomainDialog';
    this.id = getUUID();
    this.queue = new PromiseQueue();
    this.resolve = null;
    this.popup = null;
    this.options = {};
    this.on('auth-domain-dialog-ok', this.onOk);
    this.on('auth-domain-dialog-cancel', this.closePopup);
    this.on('auth-domain-dialog-init', this.onInitPopup);
    this.on('auth-domain-user-input', msg => uiLog.push(msg.source, msg.type));
  }

  async authorizeDomain(options) {
    if (this.options.hostname === options.hostname) {
      return;
    }
    await this.queue.push(this, 'authorize', [options]);
  }

  async authorize(options) {
    const match = watchlistRegex.some(urlRegex => urlRegex.test(options.url));
    if (match) {
      return;
    }
    this.options = options;
    this.popup = await mvelo.windows.openPopup(`components/auth-domain/authDomain.html?id=${this.id}`, {width: 742, height: 385}, options.tabId);
    this.popup.addRemoveListener(() => {
      this.popup = null;
    });
    return new Promise(resolve => this.resolve = resolve);
  }

  onInitPopup() {
    this.emit('set-frame', {hostname: this.options.hostname, urlPattern: `${this.options.protocol}//*.${this.options.hostname}`, api: this.options.api});
  }

  async onOk() {
    const authDomainList = await getWatchList();
    await setWatchList([...authDomainList, {site: this.options.hostname, active: true, https_only: this.options.protocol === 'https:' ? true : false, frames: [{scan: true, frame: `*.${this.options.hostname}`, api: this.options.api}]}]);
    await initScriptInjection();
    this.closePopup();
  }

  closePopup() {
    if (this.popup) {
      this.popup.close();
      this.popup = null;
      this.options = {};
    }
    this.resolve();
  }
}
