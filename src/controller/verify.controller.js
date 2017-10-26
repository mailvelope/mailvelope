/**
 * Copyright (C) 2015-2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from '../lib/lib-mvelo';
import {SubController} from './sub.controller';
import * as uiLog from '../modules/uiLog';
import {readCleartextMessage, verifyMessage} from '../modules/pgpModel';

export default class VerifyController extends SubController {
  constructor(port) {
    super(port);
    this.verifyPopup = null;
  }

  handlePortMessage(msg) {
    switch (msg.event) {
      case 'verify-inline-init':
      case 'verify-popup-init':
        // get armored message from vFrame
        this.ports.vFrame.postMessage({event: 'armored-message'});
        break;
      case 'vframe-display-popup':
        // prevent two open modal dialogs
        if (mvelo.windows.modalActive) {
          // password dialog or modal dialog already open
          this.ports.vFrame.postMessage({event: 'remove-dialog'});
        } else {
          mvelo.windows.openPopup(`components/verify-popup/verifyPopup.html?id=${this.id}`, {width: 742, height: 550, modal: true})
          .then(popup => {
            this.verifyPopup = popup;
            popup.addRemoveListener(() => {
              this.ports.vFrame.postMessage({event: 'remove-dialog'});
              this.verifyPopup = null;
            });
          });
        }
        break;
      case 'vframe-armored-message': {
        let result;
        try {
          result = readCleartextMessage(msg.data, mvelo.LOCAL_KEYRING_ID);
        } catch (e) {
          this.ports.vDialog.postMessage({
            event: 'error-message',
            error: e.message
          });
          return;
        }
        verifyMessage(result.message, result.signers)
        .then(verified => this.ports.vDialog.postMessage({
          event: 'verified-message',
          message: result.message.getText(),
          signers: verified
        }))
        .catch(err => this.ports.vDialog.postMessage({
          event: 'error-message',
          error: err.message
        }));
        break;
      }
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
      this.verifyPopup.close();
      this.verifyPopup = null;
    }
  }
}
