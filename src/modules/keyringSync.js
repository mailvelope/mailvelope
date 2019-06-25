/**
 * Copyright (C) 2015-2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import {getKeyringAttr, setKeyringAttr} from './keyring';
import {triggerSync} from '../controller/sync.controller';

export const INSERT = 'INSERT';
export const DELETE = 'DELETE';
export const UPDATE = 'UPDATE';

export class KeyringSync {
  constructor(keyringId) {
    this.keyringId = keyringId;
    this.SYNC_DATA = 'sync_data';
    this.data = getKeyringAttr(this.keyringId, this.SYNC_DATA);
    this.muted = false;
  }

  activate() {
    if (!this.data) {
      this.clear();
    }
    return this.save();
  }

  clear() {
    this.data = {
      eTag: '',
      changeLog: {},
      modified: false
    };
  }

  add(keyFpr, type) {
    if (!this.data || this.muted) {
      return;
    }
    if (!(type === INSERT || type === DELETE || type === UPDATE)) {
      throw new Error('Unknown log entry type');
    }
    this.data.modified = true;
    if (type === UPDATE) {
      return;
    }
    this.data.changeLog[keyFpr] = {
      type,
      time: Math.floor(Date.now() / 1000)
    };
  }

  async save() {
    if (!this.data) {
      return;
    }
    await setKeyringAttr(this.keyringId, {[this.SYNC_DATA]: this.data});
  }

  async commit() {
    if (!this.data || this.muted) {
      return;
    }
    await this.save();
    await triggerSync({keyringId: this.keyringId});
  }

  merge(update) {
    if (!this.data) {
      return;
    }
    for (const fingerprint in update) {
      if (!this.data.changeLog[fingerprint] || (this.data.changeLog[fingerprint].time < update[fingerprint].time)) {
        this.data.changeLog[fingerprint] = update[fingerprint];
      }
    }
  }

  getDeleteEntries() {
    const result = [];
    for (const fingerprint in this.data.changeLog) {
      if (this.data.changeLog[fingerprint].type === DELETE) {
        result.push(fingerprint);
      }
    }
    return result;
  }

  mute(muted) {
    this.muted = muted;
  }
}
