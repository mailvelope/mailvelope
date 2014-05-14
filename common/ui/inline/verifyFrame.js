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
    this._vDialog = null;
    // verify popup active
    this._vPopup = false;
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
    var url;
    if (mvelo.crx) {
      url = mvelo.extension.getURL('common/ui/inline/dialogs/verifyInline.html?id=' + this.id);
    } else if (mvelo.ffa) {
      url = 'about:blank?mvelo=verifyInline&id=' + this.id;
    }
    this._vDialog.attr('src', url);
    this._eFrame.append(this._vDialog);
    this._setFrameDim();
    this._vDialog.fadeIn();
  };

  verifyFrame.prototype._popupDialog = function () {
    this._port.postMessage({
      event: 'vframe-display-popup',
      sender: this._ctrlName
    });
    this._vPopup = true;
  };

  verifyFrame.prototype._removeDialog = function () {
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
  };

  verifyFrame.prototype._getArmoredMessage = function() {
    var sel = document.defaultView.getSelection();
    sel.selectAllChildren(this._pgpElement.get(0));
    var msg = sel.toString();
    sel.removeAllRanges();
    return msg;
  };

  verifyFrame.prototype._setFrameDim = function() {
    var pgpElementPos = this._pgpElement.position();
    this._eFrame.width(this._pgpElement.width() - 2);
    if (this._vDialog) {
      this._eFrame.height(this._pgpEnd.position().top + this._pgpEnd.height() - pgpElementPos.top - 2);
      this._eFrame.css('top', pgpElementPos.top + this._pgpElementAttr.marginTop + this._pgpElementAttr.paddingTop);
    } else {
      this._eFrame.height('128px');
      this._eFrame.css('top', (this._pgpEnd.position().top + this._pgpEnd.height() - pgpElementPos.top - 2) - 128);
    }
  },

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
