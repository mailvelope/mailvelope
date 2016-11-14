/**
 * Copyright (C) 2012-2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

'use strict';

import mvelo from '../mvelo';
import $ from 'jquery';

import ExtractFrame from './extractFrame';

export default class DecryptFrame extends ExtractFrame {
  constructor(prefs) {
    super(prefs);
    this._displayMode = prefs.security.display_decrypted;
    this._dDialog = null;
    // decrypt popup active
    this._dPopup = false;
    this._ctrlName = 'dFrame-' + this.id;
    this._typeRegex = /-----BEGIN PGP MESSAGE-----[\s\S]+?-----END PGP MESSAGE-----/;
  }

  _renderFrame() {
    super._renderFrame();
    this._eFrame.addClass('m-decrypt');
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
    this._dDialog = $('<iframe/>', {
      id: 'dDialog-' + this.id,
      'class': 'm-frame-dialog',
      frameBorder: 0,
      scrolling: 'no'
    });
    var url;
    if (mvelo.crx) {
      url = mvelo.extension.getURL('components/decrypt-inline/decryptInline.html?id=' + this.id);
    } else if (mvelo.ffa) {
      url = 'about:blank?mvelo=decryptInline&id=' + this.id;
    }
    this._dDialog.attr('src', url);
    this._eFrame.append(this._dDialog);
    this._setFrameDim();
    this._dDialog.fadeIn();
  }

  _popupDialog() {
    this._port.postMessage({
      event: 'dframe-display-popup',
      sender: this._ctrlName
    });
    this._dPopup = true;
  }

  _removeDialog() {
    // check if dialog is active
    if (!this._dDialog && !this._dPopup) {
      return;
    }
    if (this._displayMode === mvelo.DISPLAY_INLINE) {
      this._dDialog.fadeOut();
      // removal triggers disconnect event
      this._dDialog.remove();
      this._dDialog = null;
    } else {
      this._dPopup = false;
    }
    this._eFrame.addClass('m-cursor');
    this._toggleIcon();
    this._eFrame.on('click', this._clickHandler.bind(this));
  }

  _registerEventListener() {
    super._registerEventListener();
    this._port.onMessage.addListener(msg => {
      //console.log('dFrame-%s event %s received', that.id, msg.event);
      switch (msg.event) {
        case 'remove-dialog':
        case 'dialog-cancel':
          this._removeDialog();
          break;
        case 'get-armored':
          this._port.postMessage({
            event: 'set-armored',
            data: this._getPGPMessage(),
            sender: this._ctrlName
          });
          break;
      }
    });
  }
}
