/**
 * Copyright (C) 2015-2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from '../lib/lib-mvelo';
import {SubController} from './sub.controller';
import * as uiLog from '../modules/uiLog';
import {verifyMessage} from '../modules/pgpModel';
import {getPreferredKeyringId} from '../modules/keyring';

export default class VerifyController extends SubController {
  constructor(port) {
    super(port);
    this.keyringId = getPreferredKeyringId();
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

  async onArmoredMessage(msg) {
    try {
      const {data, signatures} = await verifyMessage({armored: msg.data, keyringId: this.keyringId});
      this.ports.vDialog.emit('verified-message', {
        message: data,
        signers: signatures
      });
    } catch (e) {
      this.ports.vDialog.emit('error-message', {error: e.message});
    }
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
