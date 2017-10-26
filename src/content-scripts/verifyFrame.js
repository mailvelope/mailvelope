/**
 * Copyright (C) 2015-2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from '../mvelo';
import $ from 'jquery';
import ExtractFrame from './extractFrame';
import {prefs} from './main';

export default class VerifyFrame extends ExtractFrame {
  constructor() {
    super();
    this._vDialog = null;
    // verify popup active
    this._vPopup = false;
    this._ctrlName = `vFrame-${this.id}`;
    this._typeRegex = /-----BEGIN PGP SIGNED MESSAGE-----[\s\S]+?-----END PGP SIGNATURE-----/;
    this._pgpStartRegex = /BEGIN\sPGP\sSIGNED/;
    this._sigHeight = 128;
  }

  _init(pgpEnd) {
    super._init(pgpEnd);
    this._calcSignatureHeight();
  }

  _renderFrame() {
    super._renderFrame();
    this._eFrame.addClass('m-verify');
    this._eFrame.removeClass('m-large');
  }

  _calcSignatureHeight() {
    let msg = this._getArmoredMessage();
    msg = msg.split('\n');
    for (let i = 0; i < msg.length; i++) {
      if (/-----BEGIN\sPGP\sSIGNATURE-----/.test(msg[i])) {
        const height = this._pgpEnd.position().top + this._pgpEnd.height() - this._pgpElement.position().top - 2;
        this._sigHeight = parseInt(height / msg.length * (msg.length - i), 10);
        break;
      }
    }
  }

  _clickHandler() {
    super._clickHandler();
    if (prefs.security.display_decrypted == mvelo.DISPLAY_INLINE) {
      this._inlineDialog();
    } else if (prefs.security.display_decrypted == mvelo.DISPLAY_POPUP) {
      this._popupDialog();
    }
    return false;
  }

  _inlineDialog() {
    this._vDialog = $('<iframe/>', {
      id: `vDialog-${this.id}`,
      'class': 'm-frame-dialog',
      frameBorder: 0,
      scrolling: 'no'
    });
    const url = mvelo.runtime.getURL(`components/verify-inline/verifyInline.html?id=${this.id}`);
    this._vDialog.attr('src', url);
    this._eFrame.append(this._vDialog);
    this._setFrameDim();
    this._vDialog.fadeIn();
  }

  _popupDialog() {
    this._port.postMessage({
      event: 'vframe-display-popup',
      sender: this._ctrlName
    });
    this._vPopup = true;
  }

  _removeDialog() {
    // check if dialog is active
    if (!this._vDialog && !this._vPopup) {
      return;
    }
    if (prefs.security.display_decrypted === mvelo.DISPLAY_INLINE) {
      this._vDialog.fadeOut();
      // removal triggers disconnect event
      this._vDialog.remove();
      this._vDialog = null;
    } else {
      this._vPopup = false;
    }
    this._eFrame.addClass('m-cursor');
    this._eFrame.removeClass('m-open');
    this._eFrame.on('click', this._clickHandler.bind(this));
  }

  _setFrameDim() {
    const pgpElementPos = this._pgpElement.position();
    this._eFrame.width(this._pgpElement.width() - 2);
    const height = this._pgpEnd.position().top + this._pgpEnd.height() - pgpElementPos.top - 2;
    const top = pgpElementPos.top + this._pgpElementAttr.marginTop + this._pgpElementAttr.paddingTop;
    const left = pgpElementPos.left + this._pgpElementAttr.marginLeft + this._pgpElementAttr.paddingLeft;
    this._eFrame.css('left', left);
    if (this._vDialog) {
      this._eFrame.height(height);
      this._eFrame.css('top', top);
    } else {
      this._eFrame.height(this._sigHeight);
      this._eFrame.css('top', top + height - this._sigHeight);
    }
  }

  _registerEventListener() {
    super._registerEventListener();
    this._port.onMessage.addListener(msg => {
      //console.log('dFrame-%s event %s received', that.id, msg.event);
      switch (msg.event) {
        case 'remove-dialog':
          this._removeDialog();
          break;
        case 'armored-message':
          this._port.postMessage({
            event: 'vframe-armored-message',
            data: this._getArmoredMessage(),
            sender: this._ctrlName
          });
          break;
      }
    });
  }
}
