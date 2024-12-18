/**
 * Copyright (C) 2015-2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import {getUUID} from '../lib/util';
import EventHandler from '../lib/EventHandler';
import {clientPort} from './clientAPI';

export default class SyncHandler {
  /**
   * @param {string} keyringId - the keyring to use for this operation
   * @constructor
   */
  constructor(keyringId) {
    this.keyringId = keyringId;
    this.id = getUUID();
    this.port = EventHandler.connect(`syncHandler-${this.id}`, this);
    this.registerEventListener();
  }

  onConnect() {
    this.port.emit('init', {keyringId: this.keyringId});
  }

  syncDone(data) {
    this.port.emit('sync-done', data);
  }

  registerEventListener() {
    this.port.on('sync-event', data => clientPort.emit('sync-event', data));
    this.port.onConnect.addListener(() => this.onConnect());
    // workaround for https://bugs.chromium.org/p/chromium/issues/detail?id=655932
    window.addEventListener('beforeunload', () => {
      this.port.disconnect();
    });
  }
}
