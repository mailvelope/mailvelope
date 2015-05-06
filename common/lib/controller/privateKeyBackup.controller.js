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

  var sub = require('./sub.controller');
  var uiLog = require('../uiLog');

  function PrivateKeyBackupController(port) {
    sub.SubController.call(this, port);
    if (!port) {
      this.mainType = 'keyGenCont';
      this.id = this.mvelo.util.getHash();
    }
    this.done = null;
    this.keyring = require('../keyring');
  }

  PrivateKeyBackupController.prototype = Object.create(sub.SubController.prototype);

  PrivateKeyBackupController.prototype.handlePortMessage = function(msg) {
    var that = this;
    switch (msg.event) {
      case 'open-security-settings':
        var hash = "#securitysettings";
        this.mvelo.tabs.loadOptionsTab(hash, function(old, tab) {
          if (old) {
            that.mvelo.tabs.sendMessage(tab, {
              event: "reload-options",
              hash: hash
            });
          }
        });
        break;
      case 'is-key-gen-valid':
        this.ports.keyGenDialog.postMessage({event: 'is-dialog-valide'});
        break;
      case 'key-gen-valid':
        this.ports.keyGenCont.postMessage({event: 'key-gen-valid'});
        break;
      case 'key-gen-invalid':
        this.ports.keyGenCont.postMessage({event: 'key-gen-invalid', error: 'key-gen-invalid'});
        break;
      case 'dialog-init':
        this.ports.keyGenCont.postMessage({event: 'dialog-done'});
        break;
      default:
        console.log('unknown event', msg);
    }
  };

  exports.PrivateKeyBackupController = PrivateKeyBackupController;

});
