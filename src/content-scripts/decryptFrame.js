/**
 * Copyright (C) 2012-2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import {DISPLAY_INLINE, DISPLAY_POPUP} from '../lib/constants';
import {deDup} from '../lib/util';
import $ from 'jquery';
import {prefs} from './main';

import ExtractFrame from './extractFrame';

export default class DecryptFrame extends ExtractFrame {
  constructor() {
    super();
    this.dDialog = null;
    // decrypt popup active
    this.dPopup = false;
    this.ctrlName = `dFrame-${this.id}`;
    this.typeRegex = /-----BEGIN PGP MESSAGE-----[\s\S]+?-----END PGP MESSAGE-----/;
  }

  renderFrame() {
    super.renderFrame();
    this.$eFrame.addClass('m-decrypt');
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

  clickHandler() {
    super.clickHandler();
    if (prefs.security.display_decrypted == DISPLAY_INLINE) {
      this.inlineDialog();
    } else if (prefs.security.display_decrypted == DISPLAY_POPUP) {
      this.popupDialog();
    }
    return false;
  }

  inlineDialog() {
    this.dDialog = $('<iframe/>', {
      id: `dDialog-${this.id}`,
      'class': 'm-frame-dialog',
      frameBorder: 0,
      scrolling: 'no'
    });
    const url = chrome.runtime.getURL(`components/decrypt-message/decryptMessage.html?id=${this.id}`);
    this.dDialog.attr('src', url);
    this.$eFrame.append(this.dDialog);
    this.setFrameDim();
    this.dDialog.fadeIn();
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
      this.dDialog.fadeOut();
      // removal triggers disconnect event
      this.dDialog.remove();
      this.dDialog = null;
    } else {
      this.dPopup = false;
    }
    this.$eFrame.addClass('m-cursor');
    this.toggleIcon();
    this.$eFrame.on('click', this.clickHandler.bind(this));
  }
}
