/**
 * Copyright (C) 2015-2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from '../lib/lib-mvelo';
import {getHash} from '../lib/util';
import {getWatchList, setWatchList} from '../modules/prefs';
import {initScriptInjection} from '../lib/inject';
import * as uiLog from '../modules/uiLog';
import * as sub from './sub.controller';

export default class AuthDomainController extends sub.SubController {
  constructor(port) {
    super(port);
    if (!port) {
      this.mainType = 'authDomainDialog';
      this.id = getHash();
    }
    this.popup = null;
    this.options = {};
    this.on('auth-domain-dialog-ok', this.onOk);
    this.on('auth-domain-dialog-cancel', this.closePopup);
    this.on('auth-domain-dialog-init', this.onInitPopup);
    this.on('auth-domain-user-input', msg => uiLog.push(msg.source, msg.type));
  }

  async setFrame(options) {
    this.options = options;
    this.popup = await mvelo.windows.openPopup(`components/auth-domain/authDomain.html?id=${this.id}`, {width: 742, height: 385}, options.tabId);
    this.popup.addRemoveListener(() => {
      this.popup = null;
    });
  }

  onInitPopup() {
    this.emit('set-frame', {hostname: this.options.hostname, urlPattern: `${this.options.protocol}//*.${this.options.hostname}`, api: this.options.api});
  }

  async onOk() {
    const authDomainList = await getWatchList();
    await setWatchList([...authDomainList, {site: this.options.hostname, active: true, https_only: this.options.protocol === 'https:' ? true : false, frames: [{scan: true, frame: `*.${this.options.hostname}`, api: this.options.api}]}]);
    initScriptInjection();
    this.closePopup();
  }

  closePopup() {
    if (this.popup) {
      this.popup.close();
      this.popup = null;
    }
  }
}
