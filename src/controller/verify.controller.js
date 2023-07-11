/**
 * Copyright (C) 2015-2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from '../lib/lib-mvelo';
import {SubController} from './sub.controller';
import * as uiLog from '../modules/uiLog';
import {verifyMessage} from '../modules/pgpModel';
import {getPreferredKeyringId} from '../modules/keyring';
import {lookupKey} from './import.controller';

export default class VerifyController extends SubController {
  constructor(port) {
    super(port);
    this.keyringId = getPreferredKeyringId();
    this.verifyPopup = null;
    this.armored = null;
    // register event handlers
    this.on('decrypt-message-init', this.onVerifyInit);
    this.on('decrypt-message', () => this.onArmoredMessage({data: this.armored}));
    this.on('decrypt-dialog-cancel', this.onCancel);
    this.on('decrypt-inline-user-input', msg => uiLog.push(msg.source, msg.type));
    this.on('vframe-display-popup', this.onDisplayPopup);
    this.on('vframe-armored-message', this.onArmoredMessage);
  }

  onVerifyInit() {
    this.ports.vFrame.emit('armored-message');
  }

  async onDisplayPopup() {
    this.verifyPopup = await mvelo.windows.openPopup(`components/decrypt-message/decryptMessage.html?id=${this.id}&embedded=false`, {width: 742, height: 550});
    this.verifyPopup.addRemoveListener(() => {
      this.ports.vFrame.emit('remove-dialog');
      this.verifyPopup = null;
    });
  }

  async onArmoredMessage({data, sender: [sender]}) {
    this.armored = data;
    this.ports.dDialog.emit('waiting', {waiting: true});
    try {
      const {data, signatures} = await verifyMessage({
        armored: this.armored,
        keyringId: this.keyringId,
        senderAddress: sender,
        lookupKey: rotation => lookupKey({keyringId: this.keyringId, email: sender, rotation})
      });
      this.ports.dDialog.emit('verified-message', {
        message: data,
        signers: signatures
      });
    } catch (e) {
      this.ports.dDialog.emit('error-message', {error: e.message});
    }
    this.ports.dDialog.emit('waiting', {waiting: false});
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
