/**
 * Mailvelope - secure email with OpenPGP encryption for Webmail
 * Copyright (C) 2014  Thomas Oberndörfer
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

  function VerifyController(port) {
    sub.SubController.call(this, port);
    this.verifyPopup = null;
  }

  VerifyController.prototype = Object.create(sub.SubController.prototype);

  VerifyController.prototype.handlePortMessage = function(msg) {
    var that = this;
    switch (msg.event) {
      case 'verify-inline-init':
      case 'verify-popup-init':
        // get armored message from vFrame
        this.ports.vFrame.postMessage({event: 'armored-message'});
        break;
      case 'vframe-display-popup':
        // prevent two open modal dialogs
        if (this.mvelo.windows.modalActive) {
          // password dialog or modal dialog already open
          this.ports.vFrame.postMessage({event: 'remove-dialog'});
        } else {
          this.mvelo.windows.openPopup('common/ui/modal/verifyPopup.html?id=' + this.id, {width: 742, height: 550, modal: true}, function(window) {
            that.verifyPopup = window;
          });
        }
        break;
      case 'vframe-armored-message':
        var result;
        try {
          result = this.model.readCleartextMessage(msg.data, this.mvelo.LOCAL_KEYRING_ID);
        } catch (e) {
          this.ports.vDialog.postMessage({
            event: 'error-message',
            error: e.message
          });
          return;
        }
        this.model.verifyMessage(result.message, result.signers, function(err, verified) {
          if (err) {
            that.ports.vDialog.postMessage({
              event: 'error-message',
              error: err.message
            });
          } else {
            that.ports.vDialog.postMessage({
              event: 'verified-message',
              message: result.message.getText(),
              signers: verified
            });
          }
        });
        break;
      case 'verify-dialog-cancel':
        if (this.ports.vFrame) {
          this.ports.vFrame.postMessage({
            event: 'remove-dialog'
          });
        }
        if (this.verifyPopup) {
          this.verifyPopup.close();
          this.verifyPopup = null;
        }
        break;
      default:
        console.log('unknown event', msg);
    }
  };

  exports.VerifyController = VerifyController;

});
