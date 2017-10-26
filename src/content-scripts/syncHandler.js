/**
 * Copyright (C) 2015-2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from '../mvelo';
import {postMessage} from './clientAPI';


export default class SyncHandler {
  /**
   * @param {string} keyringId - the keyring to use for this operation
   * @constructor
   */
  constructor(keyringId) {
    this.keyringId = keyringId;
    this.id = mvelo.util.getHash();
    this.name = `syncHandler-${this.id}`;
    this.port = mvelo.runtime.connect({name: this.name});
    this.registerEventListener();

    this.port.postMessage({event: 'init', sender: this.name, keyringId: this.keyringId});
  }

  syncDone(data) {
    //console.log('mvelo.SyncHandler.prototype.restoreDone()', restoreBackup);
    this.port.postMessage({event: 'sync-done', sender: this.name, data});
  }

  /**
   * @returns {mvelo.SyncHandler}
   */
  registerEventListener() {
    this.port.onMessage.addListener(msg => {
      switch (msg.event) {
        case 'sync-event':
          postMessage('sync-event', null, msg, null);
          break;
        default:
          console.log('unknown event', msg);
      }
    });
    // workaround for https://bugs.chromium.org/p/chromium/issues/detail?id=655932
    window.addEventListener('beforeunload', () => {
      this.port.disconnect();
    });
  }
}
