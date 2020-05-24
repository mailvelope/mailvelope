/**
 * Copyright (C) 2012-2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import {DISPLAY_INLINE, DISPLAY_POPUP} from '../lib/constants';
import {deDup} from '../lib/util';
import * as l10n from '../lib/l10n';
import {prefs} from './main';

import ExtractFrame from './extractFrame';

l10n.register([
  'decrypt_frame_help_text'
]);

l10n.mapToLocal();

export default class DecryptFrame extends ExtractFrame {
  constructor() {
    super();
    this.dDialog = null;
    // decrypt popup active
    this.dPopup = false;
    this.ctrlName = `dFrame${this.currentProvider.integration ? 'Gmail' : ''}-${this.id}`;
  }

  renderFrame() {
    super.renderFrame();
    const para = document.createElement('p');
    para.textContent = l10n.map.decrypt_frame_help_text;
    this.eFrame.dataset.mvControllerType = 'dFrame';
    this.eFrame.append(para);
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
    const armored = this.getPGPMessage();
    if (this.currentProvider.integration) {
      const integrationMsgData = this.currentProvider.integration.getMsgByControllerId(this.id);
      if (integrationMsgData) {
        const {msgId, att: encAttFileNames} = integrationMsgData;
        this.port.emit('set-data', {userInfo: this.currentProvider.integration.getUserInfo(), msgId, encAttFileNames, armored, sender, gmailCtrlId: this.currentProvider.integration.id});
        return;
      }
    }
    this.port.emit('set-armored', {
      data: armored,
      options: {senderAddress: sender}
    });
  }

  clickHandler(ev) {
    super.clickHandler(undefined, ev);
    if (prefs.security.display_decrypted == DISPLAY_POPUP) {
      this.popupDialog();
    }
  }

  onShow() {
    super.onShow();
    if (prefs.security.display_decrypted == DISPLAY_INLINE && !this.dDialog) {
      this.inlineDialog();
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
    if (!this.dPopup) {
      return;
    }
    this.dPopup = false;
    this.eFrame.classList.add('m-cursor');
    this.toggleIcon();
    this.eFrame.addEventListener('click', this.clickHandler);
  }

  setFrameDim() {
    if (this.dDialog === null) {
      super.setFrameDim();
    } else {
      const {height} = this.pgpRange.getBoundingClientRect();
      let {width} = this.pgpElement.parentElement.getBoundingClientRect();
      // less 1px border and 2 pixel box-shadow
      width -= 3;
      this.eFrame.style.width = `${width}px`;
      // set absolute dims for performance reasons
      this.dDialog.style.width = `${width}px`;
      this.dDialog.style.height = `${height}px`;
    }
  }
}
