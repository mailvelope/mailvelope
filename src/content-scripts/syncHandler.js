/**
 * Copyright (C) 2015-2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

'use strict';

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
    this.name = 'syncHandler-' + this.id;
    this.port = mvelo.extension.connect({name: this.name});
    this.registerEventListener();

    this.port.postMessage({event: 'init', sender: this.name, keyringId: this.keyringId});
  }

  syncDone(data) {
    //console.log('mvelo.SyncHandler.prototype.restoreDone()', restoreBackup);
    this.port.postMessage({event: 'sync-done', sender: this.name, data: data});
  }

  /**
   * @returns {mvelo.SyncHandler}
   */
  registerEventListener() {
    this.port.onMessage.addListener(function(msg) {
      switch (msg.event) {
        case 'sync-event':
          postMessage('sync-event', null, msg, null);
          break;
        default:
          console.log('unknown event', msg);
      }
    });
    return this;
  }
}
