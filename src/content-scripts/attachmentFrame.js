/**
 * Copyright (C) 2012-2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import {FRAME_STATUS, FRAME_ATTACHED, DISPLAY_POPUP, DISPLAY_INLINE} from '../lib/constants';
import {prefs} from './main';
import * as l10n from '../lib/l10n';

import ExtractFrame from './extractFrame';

l10n.register([
  'decrypt_att_frame_help_text'
]);

l10n.mapToLocal();

export default class AttachmentFrame extends ExtractFrame {
  constructor() {
    super();
    this.dDialog = null;
    this.dPopup = false;
    this.ctrlName = `aFrameGmail-${this.id}`;
  }

  init(containerElem) {
    this.pgpRange = containerElem;
    // check if wrapper element already exists
    const wrapper = containerElem.querySelector('.m-extract-wrapper');
    if (wrapper) {
      this.pgpElement = wrapper;
    } else {
      // create container element
      this.pgpElement = document.createElement('div');
      this.pgpElement.classList.add('m-extract-wrapper');
    }
    this.pgpElement.style.display = 'inline-block';
    // set status to attached
    this.pgpElement.dataset[FRAME_STATUS] = FRAME_ATTACHED;
    this.pgpRange.append(this.pgpElement);
  }

  renderFrame() {
    super.renderFrame();
    const para = document.createElement('p');
    para.textContent = l10n.map.decrypt_att_frame_help_text;
    this.eFrame.append(para);
    this.eFrame.classList.add('m-decrypt');
    this.onShow();
  }

  registerEventListener() {
    super.registerEventListener();
    this.port.on('remove-dialog', this.removeDialog);
    this.port.on('dialog-cancel', this.removeDialog);
    this.port.on('get-data', this.onData);
  }

  onData() {
    const {msgId, clipped, armored, clearText, att} = this.currentProvider.integration.getMsgByControllerId(this.id);
    this.port.emit('set-data', {userInfo: this.currentProvider.integration.getUserInfo(), msgId, encAttFileNames: att, armored, clearText, clipped, gmailCtrlId: this.currentProvider.integration.id});
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
    if (!this.dPopup) {
      return;
    }
    this.dPopup = false;
    this.eFrame.classList.add('m-cursor');
    this.toggleIcon();
    this.eFrame.addEventListener('click', this.clickHandler);
  }

  closeFrame(reset, disconnect, ev) {
    super.closeFrame(false, disconnect, ev);
    if (reset) {
      this.pgpElement.remove();
    } else {
      this.currentProvider.integration.onCloseFrame(this.id);
      this.pgpElement.style.display = 'none';
    }
  }

  setFrameDim() {
    if (this.dDialog === null) {
      const width = 500;
      const height = 400;
      this.pgpElement.style.width = `${width}px`;
      this.pgpElement.style.height = `${height}px`;
      this.eFrame.style.width = `${width}px`;
      this.eFrame.style.height = `${height}px`;
    } else {
      const {height} = this.pgpRange.getBoundingClientRect();
      let {width} = this.pgpElement.parentElement.getBoundingClientRect();
      // less 1px border and 2 pixel box-shadow
      width -= 3;
      this.eFrame.style.width = `${width}px`;
      this.eFrame.style.height = `${height}px`;
      // set absolute dims for performance reasons
      this.dDialog.style.width = `${width}px`;
      this.dDialog.style.height = `${height}px`;
    }
  }
}
