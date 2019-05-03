/**
 * Copyright (C) 2015-2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import {DISPLAY_INLINE, DISPLAY_POPUP} from '../lib/constants';
import $ from 'jquery';
import ExtractFrame from './extractFrame';
import {prefs} from './main';

export default class VerifyFrame extends ExtractFrame {
  constructor() {
    super();
    this.vDialog = null;
    // verify popup active
    this.vPopup = false;
    this.ctrlName = `vFrame-${this.id}`;
  }

  init(pgpRange) {
    super.init(pgpRange);
  }

  renderFrame() {
    super.renderFrame();
    this.$eFrame.addClass('m-verify');
    this.$eFrame.removeClass('m-large');
  }

  registerEventListener() {
    super.registerEventListener();
    this.port.on('remove-dialog', this.removeDialog);
    this.port.on('armored-message', () => this.port.emit('vframe-armored-message', {data: this.getArmoredMessage()}));
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
    this.vDialog = $('<iframe/>', {
      id: `vDialog-${this.id}`,
      'class': 'm-frame-dialog',
      frameBorder: 0,
      scrolling: 'no'
    });
    const url = chrome.runtime.getURL(`components/verify-inline/verifyInline.html?id=${this.id}`);
    this.vDialog.attr('src', url);
    this.$eFrame.append(this.vDialog);
    this.setFrameDim();
    this.vDialog.fadeIn();
  }

  popupDialog() {
    this.port.emit('vframe-display-popup');
    this.vPopup = true;
  }

  removeDialog() {
    // check if dialog is active
    if (!this.vDialog && !this.vPopup) {
      return;
    }
    if (prefs.security.display_decrypted === DISPLAY_INLINE) {
      this.vDialog.fadeOut();
      // removal triggers disconnect event
      this.vDialog.remove();
      this.vDialog = null;
    } else {
      this.vPopup = false;
    }
    this.$eFrame.addClass('m-cursor');
    this.$eFrame.removeClass('m-open');
    this.$eFrame.on('click', this.clickHandler.bind(this));
  }

  setFrameDim() {
    const boundingRect = this.pgpRange.getBoundingClientRect();
    this.$eFrame.width(boundingRect.width);
    this.$eFrame.height(boundingRect.height);
  }
}
