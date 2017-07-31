/**
 * Copyright (C) 2015-2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

'use strict';


import {SubController} from './sub.controller';
import * as uiLog from '../modules/uiLog';

export default class VerifyController extends SubController {
  constructor(port) {
    super(port);
    this.verifyPopup = null;
  }

  handlePortMessage(msg) {
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
  }

  closePopup() {
    if (this.verifyPopup) {
      try {
        this.verifyPopup.close();
      } catch (e) {}
      this.verifyPopup = null;
    }
  }
}
