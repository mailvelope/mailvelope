/**
 * Mailvelope - secure email with OpenPGP encryption for Webmail
 * Copyright (C) 2015  Thomas Oberndörfer
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

define(function(require, exports, module) {

  var keyringMod = require('./keyring');
  var syncCtrl = require('./sync.controller');

  var INSERT = 'INSERT';
  var DELETE = 'DELETE';
  var UPDATE = 'UPDATE';

  function KeyringSync(keyringId) {
    this.keyringId = keyringId;
    this.data = null;
    this.SYNC_DATA = 'sync_data';
  }

  KeyringSync.prototype.init = function() {
    this.data = this.keyring.getKeyringAttr(this.keyringId, this.SYNC_DATA) || {
      eTag: '',
      changeLog: {},
      modified: false
    };
  };

  KeyringSync.prototype.add = function(keyid, type) {
    if (!this.data) {
      return;
    }
    if (!(type === INSERT || type === DELETE || type === UPDATE)) {
      throw new Error('Unknown log entry type');
    }
    this.modified = true;
    if (type === UPDATE) {
      return;
    }
    keyid = keyid.toLowerCase();
    this.data[keyid] = {
      type: type,
      time: (new Date()).toISOString()
    };
  };

  KeyringSync.prototype.commit = function() {
    var data = {};
    data[this.SYNC_DATA] = this.data;
    this.keyring.setKeyringAttr(this.keyringId, data);
    syncCtrl.getByKeyring(this.keyringId).triggerSync();
  };

  exports.KeyringSync = KeyringSync;
  exports.INSERT = INSERT;
  exports.DELETE = DELETE;

});
