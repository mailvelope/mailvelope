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

var VerifyFrame = VerifyFrame || (function () {

  var verifyFrame = function (prefs) {
    ExtractFrame.call(this, prefs);
    this._displayMode = prefs.security.display_decrypted;
    this._dDialog = null;
    // verify popup active
    this._dPopup = false;
    this._ctrlName = 'vFrame-' + this.id;
    this._typeRegex = /-----BEGIN PGP SIGNED MESSAGE-----[\s\S]+?-----END PGP SIGNATURE-----/;
  };

  verifyFrame.prototype = Object.create(ExtractFrame.prototype);
  verifyFrame.prototype.parent = ExtractFrame.prototype;

  verifyFrame.prototype._renderFrame = function () {
    this.parent._renderFrame.call(this);
    this._eFrame.addClass('m-verify');
  };

  verifyFrame.prototype._clickHandler = function () {
    this.parent._clickHandler.call(this);
    if (this._displayMode == mvelo.DISPLAY_INLINE) {
      this._inlineDialog();
    } else if (this._displayMode == mvelo.DISPLAY_POPUP) {
      this._popupDialog();
    }
    return false;
  };

  verifyFrame.prototype._inlineDialog = function () {
    this._vDialog = $('<iframe/>', {
      id: 'vDialog-' + this.id,
      'class': 'm-frame-dialog',
      frameBorder: 0,
      scrolling: 'no'
    });
    var path = 'common/ui/inline/dialogs/verifyInline.html?id=' + this.id;
    var url = mvelo.extension.getURL(path);
    if (mvelo.ffa) {
      url = 'about:blank';
    }
    this._vDialog.attr('src', url);
    this._eFrame.append(this._vDialog);
    this._vDialog.fadeIn();
  };

  verifyFrame.prototype._popupDialog = function () {
    this._port.postMessage({
      event: 'vframe-display-popup',
      sender: this._ctrlName
    });
    this._dPopup = true;
  };

  verifyFrame.prototype._removeDialog = function () {
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
  };

  verifyFrame.prototype._registerEventListener = function () {
    this.parent._registerEventListener.call(this);
    var that = this;
    this._port.onMessage.addListener(function (msg) {
      //console.log('dFrame-%s event %s received', that.id, msg.event);
      switch (msg.event) {
        case 'remove-dialog':
          that._removeDialog();
          break;
        case 'armored-message':
          that._port.postMessage({
            event: 'vframe-armored-message',
            data: that._getArmoredMessage(),
            sender: that._ctrlName
          });
          break;
      }
    });
  };

  return verifyFrame;

}());
