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
    // register event handlers
    this.on('verify-inline-init', this.onVerifyInit);
    this.on('verify-popup-init', this.onVerifyInit);
    this.on('vframe-display-popup', this.onDisplayPopup);
    this.on('vframe-armored-message', this.onArmoredMessage);
    this.on('verify-dialog-cancel', this.onCancel);
    this.on('verify-user-input', msg => uiLog.push(msg.source, msg.type));
  }

  onVerifyInit() {
    this.ports.vFrame.emit('armored-message');
  }

  onDisplayPopup() {
    mvelo.windows.openPopup(`components/verify-popup/verifyPopup.html?id=${this.id}`, {width: 742, height: 550})
    .then(popup => {
      this.verifyPopup = popup;
      popup.addRemoveListener(() => {
        this.ports.vFrame.emit('remove-dialog');
        this.verifyPopup = null;
      });
    });
  }

  onArmoredMessage(msg) {
    let result;
    try {
      result = readCleartextMessage(msg.data, mvelo.LOCAL_KEYRING_ID);
    } catch (e) {
      this.ports.vDialog.emit('error-message', {error: e.message});
      return;
    }
    verifyMessage(result.message, result.signers)
    .then(verified => this.ports.vDialog.emit('verified-message', {
      message: result.message.getText(),
      signers: verified
    }))
    .catch(err => this.ports.vDialog.emit('error-message', {error: err.message}));
  }

  onCancel() {
    if (this.ports.vFrame) {
      this.ports.vFrame.emit('remove-dialog');
    }
    this.closePopup();
  }

  closePopup() {
    if (this.verifyPopup) {
      this.verifyPopup.close();
      this.verifyPopup = null;
    }
  }
}
