/**
 * Copyright (C) 2012-2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import {DISPLAY_INLINE, DISPLAY_POPUP} from '../lib/constants';
import {deDup} from '../lib/util';
import {prefs} from './main';

import ExtractFrame from './extractFrame';

export default class DecryptFrame extends ExtractFrame {
  constructor() {
    super();
    this.dDialog = null;
    // decrypt popup active
    this.dPopup = false;
    this.ctrlName = `dFrame-${this.id}`;
  }

  renderFrame() {
    super.renderFrame();
    this.eFrame.classList.add('m-decrypt');
  }

  registerEventListener() {
    super.registerEventListener();
    this.port.on('remove-dialog', this.removeDialog);
    this.port.on('dialog-cancel', this.removeDialog);
    this.port.on('get-armored', this.onArmored);
  }

  async onArmored() {
    let sender = await this.getEmailSender();
    sender = sender.map(person => person.email);
    sender = deDup(sender);
    this.port.emit('set-armored', {
      data: this.getPGPMessage(),
      options: {senderAddress: sender}
    });
  }

  clickHandler(ev) {
    super.clickHandler(undefined, ev);
    if (prefs.security.display_decrypted == DISPLAY_INLINE) {
      this.inlineDialog();
    } else if (prefs.security.display_decrypted == DISPLAY_POPUP) {
      this.popupDialog();
    }
  }

  inlineDialog() {
    this.dDialog = document.createElement('iframe');
    this.dDialog.id = `dDialog-${this.id}`;
    this.dDialog.src = chrome.runtime.getURL(`components/decrypt-message/decryptMessage.html?id=${this.id}`);
    this.dDialog.frameBorder = 0;
    this.dDialog.scrolling = 'no';
    this.dDialog.classList.add('m-frame-dialog');
    this.eFrame.append(this.dDialog);
    this.setFrameDim();
    this.dDialog.classList.add('m-show');
  }

  popupDialog() {
    this.port.emit('dframe-display-popup');
    this.dPopup = true;
  }

  removeDialog() {
    // check if dialog is active
    if (!this.dDialog && !this.dPopup) {
      return;
    }
    if (prefs.security.display_decrypted === DISPLAY_INLINE) {
      this.dDialog.classList.remove('m-show');
      // removal triggers disconnect event
      this.dDialog.remove();
      this.dDialog = null;
    } else {
      this.dPopup = false;
    }
    this.eFrame.classList.add('m-cursor');
    this.toggleIcon();
    this.eFrame.addEventListener('click', this.clickHandler);
  }
}
