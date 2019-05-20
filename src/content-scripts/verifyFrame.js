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
    this.typeRegex = /-----BEGIN PGP SIGNED MESSAGE-----[\s\S]+?-----END PGP SIGNATURE-----/;
    this.pgpStartRegex = /BEGIN\sPGP\sSIGNED/;
    this.sigHeight = 128;
  }

  init(pgpEnd) {
    super.init(pgpEnd);
    this.calcSignatureHeight();
  }

  renderFrame() {
    super.renderFrame();
    this.eFrame.addClass('m-verify');
    this.eFrame.removeClass('m-large');
  }

  registerEventListener() {
    super.registerEventListener();
    this.port.on('remove-dialog', this.removeDialog);
    this.port.on('armored-message', () => this.port.emit('vframe-armored-message', {data: this.getArmoredMessage()}));
  }

  calcSignatureHeight() {
    let msg = this.getArmoredMessage();
    msg = msg.split('\n');
    for (let i = 0; i < msg.length; i++) {
      if (/-----BEGIN\sPGP\sSIGNATURE-----/.test(msg[i])) {
        const height = this.pgpEnd.position().top + this.pgpEnd.height() - this.pgpElement.position().top - 2;
        this.sigHeight = parseInt(height / msg.length * (msg.length - i), 10);
        break;
      }
    }
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
    const url = chrome.runtime.getURL(`components/decrypt-message/decryptMessage.html?id=${this.id}`);
    this.vDialog.attr('src', url);
    this.eFrame.append(this.vDialog);
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
    this.eFrame.addClass('m-cursor');
    this.eFrame.removeClass('m-open');
    this.eFrame.on('click', this.clickHandler.bind(this));
  }

  setFrameDim() {
    const pgpElementPos = this.pgpElement.position();
    this.eFrame.width(this.pgpElement.width() - 2);
    const height = this.pgpEnd.position().top + this.pgpEnd.height() - pgpElementPos.top - 2;
    const top = pgpElementPos.top + this.pgpElementAttr.marginTop + this.pgpElementAttr.paddingTop;
    const left = pgpElementPos.left + this.pgpElementAttr.marginLeft + this.pgpElementAttr.paddingLeft;
    this.eFrame.css('left', left);
    if (this.vDialog) {
      this.eFrame.height(height);
      this.eFrame.css('top', top);
    } else {
      this.eFrame.height(this.sigHeight);
      this.eFrame.css('top', top + height - this.sigHeight);
    }
  }
}
