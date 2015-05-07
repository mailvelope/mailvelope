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

  function PrivateKeyController(port) {
    sub.SubController.call(this, port);
    this.done = null;
    this.keyring = require('../keyring');
  }

  PrivateKeyController.prototype = Object.create(sub.SubController.prototype);

  PrivateKeyController.prototype.generatePublicKey = function() {
    // TODO here generate the key pair
    var keyPair = {};

    if (keyPair) {
      this.ports.keyGenCont.postMessage({event: 'generate-done', publicKey: keyPair});
    } else {
      var error = new Error('Error on generate keyPair');
      error.code = 'KEYPAIR_ERROR';
      this.ports.keyGenCont.postMessage({event: 'generate-done', error: error});
    }
  };

  PrivateKeyController.prototype.handlePortMessage = function(msg) {
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
      case 'generate-key':
        this.ports.keyGenDialog.postMessage({event: 'check-dialog-inputs'});
        break;
      case 'input-check':
        if (msg.isVvalid) {
          this.generatePublicKey();
        } else {
          var error = new Error('The inputs "password" and "confirm" are not valid');
          error.code = 'INPUT_NOT_VALID';
          this.ports.keyGenCont.postMessage({event: 'generate-done', error: error});
        }
        break;
      case 'dialog-init':
        this.ports.keyGenCont.postMessage({event: 'dialog-done'});
        break;
      default:
        console.log('unknown event', msg);
    }
  };

  exports.PrivateKeyController = PrivateKeyController;

});
