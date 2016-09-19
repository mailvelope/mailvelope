/**
 * Mailvelope - secure email with OpenPGP encryption for Webmail
 * Copyright (C) 2014-2015 Mailvelope GmbH
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

define(function(require, exports) {

  var sub = require('./sub.controller');
  var uiLog = require('../modules/uiLog');

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
          this.mvelo.windows.openPopup('components/verify-popup/verifyPopup.html?id=' + this.id, {width: 742, height: 550, modal: true}, function(window) {
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
        this.closePopup();
        break;
      case 'verify-user-input':
        uiLog.push(msg.source, msg.type);
        break;
      default:
        console.log('unknown event', msg);
    }
  };

  VerifyController.prototype.closePopup = function() {
    if (this.verifyPopup) {
      try {
        this.verifyPopup.close();
      } catch (e) {}
      this.verifyPopup = null;
    }
  };

  exports.VerifyController = VerifyController;

});
