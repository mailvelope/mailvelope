/**
 * Mailvelope - secure email with OpenPGP encryption for Webmail
 * Copyright (C) 2012  Thomas Oberndörfer
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License version 3
 * as published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

var DecryptFrame = DecryptFrame || (function() {

  var decryptFrame = function (prefs) {
    ExtractFrame.call(this, prefs);
    this._displayMode = prefs.security.display_decrypted;
    this._dDialog = null;
    // decrypt popup active
    this._dPopup = false;
    this._ctrlName = 'dFrame-' + this.id;
    this._typeRegex = /-----BEGIN PGP MESSAGE-----[\s\S]+?-----END PGP MESSAGE-----/;
  }

  decryptFrame.prototype = Object.create(ExtractFrame.prototype);
  decryptFrame.prototype.parent = ExtractFrame.prototype;

  decryptFrame.prototype._renderFrame = function() {
    this.parent._renderFrame.call(this);
    this._eFrame.addClass('m-decrypt');
  }

  decryptFrame.prototype._clickHandler = function() {
    this.parent._clickHandler.call(this);
    if (this._displayMode == mvelo.DISPLAY_INLINE) {
      this._inlineDialog();
    } else if (this._displayMode == mvelo.DISPLAY_POPUP) {
      this._popupDialog();
    }
    return false;
  }

  decryptFrame.prototype._inlineDialog = function() {
    this._dDialog = $('<iframe/>', {
      id: 'dDialog-' + this.id,
      'class': 'm-frame-dialog',
      frameBorder: 0, 
      scrolling: 'no'
    });
    var path = 'common/ui/inline/dialogs/decryptInline.html?id=' + this.id;
    var url = mvelo.extension.getURL(path);
    if (mvelo.ffa) {
      url = 'about:blank';
    }
    this._dDialog.attr('src', url);
    this._eFrame.append(this._dDialog);
    this._setFrameDim();
    this._dDialog.fadeIn();
  }

  decryptFrame.prototype._popupDialog = function() {
    this._port.postMessage({
      event: 'dframe-display-popup', 
      sender: this._ctrlName
    });
    this._dPopup = true;
  }

  decryptFrame.prototype._removeDialog = function() {
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

  decryptFrame.prototype._registerEventListener = function() {
    this.parent._registerEventListener.call(this);
    var that = this;
    this._port.onMessage.addListener(function(msg) {
      //console.log('dFrame-%s event %s received', that.id, msg.event);
      switch (msg.event) {
        case 'remove-dialog':
        case 'dialog-cancel':
          that._removeDialog();
          break;
        case 'armored-message':
          that._port.postMessage({
            event: 'dframe-armored-message', 
            data: that._getArmoredMessage(),
            sender: that._ctrlName
          });
          break;
      }
    });
  }

  return decryptFrame;

}());
