/**
 * Mailvelope - secure email with OpenPGP encryption for Webmail
 * Copyright (C) 2015 Mailvelope GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License version 3
 * as published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

'use strict';


var keyringMod = require('./keyring');
var syncCtrl = require('../controller/sync.controller');

var INSERT = 'INSERT';
var DELETE = 'DELETE';
var UPDATE = 'UPDATE';

function KeyringSync(keyringId) {
  this.keyringId = keyringId;
  this.SYNC_DATA = 'sync_data';
  this.data = keyringMod.getKeyringAttr(this.keyringId, this.SYNC_DATA);
  this.muted = false;
}

KeyringSync.prototype.activate = function() {
  if (!this.data) {
    this.data = {
      eTag: '',
      changeLog: {},
      modified: false
    };
  }
  return this.save();
};

KeyringSync.prototype.add = function(keyid, type) {
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
  keyid = keyid.toLowerCase();
  this.data.changeLog[keyid] = {
    type: type,
    time: Math.floor(Date.now() / 1000)
  };
};

KeyringSync.prototype.save = function() {
  return Promise.resolve()
  .then(() => {
    if (!this.data) {
      return;
    }
    return keyringMod.setKeyringAttr(this.keyringId, {[this.SYNC_DATA]: this.data});
  })
};

KeyringSync.prototype.commit = function() {
  return Promise.resolve()
  .then(() => {
    if (!this.data || this.muted) {
      return;
    }
    return this.save()
    .then(() => syncCtrl.triggerSync({keyringId: this.keyringId}));
  });
};

KeyringSync.prototype.merge = function(update) {
  if (!this.data) {
    return;
  }
  for (var fingerprint in update) {
    if (!this.data.changeLog[fingerprint] || (this.data.changeLog[fingerprint].time < update[fingerprint].time)) {
      this.data.changeLog[fingerprint] = update[fingerprint];
    }
  }
};

KeyringSync.prototype.getDeleteEntries = function() {
  var result = [];
  for (var fingerprint in this.data.changeLog) {
    if (this.data.changeLog[fingerprint].type === DELETE) {
      result.push(fingerprint);
    }
  }
  return result;
};

KeyringSync.prototype.mute = function(muted) {
  this.muted = muted;
};

exports.KeyringSync = KeyringSync;
exports.INSERT = INSERT;
exports.DELETE = DELETE;
exports.UPDATE = UPDATE;
