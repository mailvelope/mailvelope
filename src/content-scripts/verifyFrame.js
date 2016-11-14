/**
 * Copyright (C) 2015-2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

'use strict';

import mvelo from '../mvelo';
import $ from 'jquery';
import ExtractFrame from './extractFrame';


export default class VerifyFrame extends ExtractFrame {
  constructor(prefs) {
    super(prefs);
    this._displayMode = prefs.security.display_decrypted;
    this._vDialog = null;
    // verify popup active
    this._vPopup = false;
    this._ctrlName = 'vFrame-' + this.id;
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
    var msg = this._getArmoredMessage();
    msg = msg.split('\n');
    for (var i = 0; i < msg.length; i++) {
      if (/-----BEGIN\sPGP\sSIGNATURE-----/.test(msg[i])) {
        var height = this._pgpEnd.position().top + this._pgpEnd.height() - this._pgpElement.position().top - 2;
        this._sigHeight = parseInt(height / msg.length * (msg.length - i), 10);
        break;
      }
    }
  }

  _clickHandler() {
    super._clickHandler();
    if (this._displayMode == mvelo.DISPLAY_INLINE) {
      this._inlineDialog();
    } else if (this._displayMode == mvelo.DISPLAY_POPUP) {
      this._popupDialog();
    }
    return false;
  }

  _inlineDialog() {
    this._vDialog = $('<iframe/>', {
      id: 'vDialog-' + this.id,
      'class': 'm-frame-dialog',
      frameBorder: 0,
      scrolling: 'no'
    });
    var url;
    if (mvelo.crx) {
      url = mvelo.extension.getURL('components/verify-inline/verifyInline.html?id=' + this.id);
    } else if (mvelo.ffa) {
      url = 'about:blank?mvelo=verifyInline&id=' + this.id;
    }
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
    if (this._displayMode === mvelo.DISPLAY_INLINE) {
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
    var pgpElementPos = this._pgpElement.position();
    this._eFrame.width(this._pgpElement.width() - 2);
    var height = this._pgpEnd.position().top + this._pgpEnd.height() - pgpElementPos.top - 2;
    var top = pgpElementPos.top + this._pgpElementAttr.marginTop + this._pgpElementAttr.paddingTop;
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
