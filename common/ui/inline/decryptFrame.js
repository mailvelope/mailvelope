/**
 * Mailvelope - secure email with OpenPGP encryption for Webmail
 * Copyright (C) 2012-2015 Mailvelope GmbH
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

'use strict';

var mvelo = mvelo || {};

mvelo.DecryptFrame = function(prefs) {
  mvelo.ExtractFrame.call(this, prefs);
  this._displayMode = prefs.security.display_decrypted;
  this._dDialog = null;
  // decrypt popup active
  this._dPopup = false;
  this._ctrlName = 'dFrame-' + this.id;
  this._typeRegex = /-----BEGIN PGP MESSAGE-----[\s\S]+?-----END PGP MESSAGE-----/;
};

mvelo.DecryptFrame.prototype = Object.create(mvelo.ExtractFrame.prototype);
mvelo.DecryptFrame.prototype.parent = mvelo.ExtractFrame.prototype;

mvelo.DecryptFrame.prototype._renderFrame = function() {
  this.parent._renderFrame.call(this);
  this._eFrame.addClass('m-decrypt');
};

mvelo.DecryptFrame.prototype._clickHandler = function() {
  this.parent._clickHandler.call(this);
  if (this._displayMode == mvelo.DISPLAY_INLINE) {
    this._inlineDialog();
  } else if (this._displayMode == mvelo.DISPLAY_POPUP) {
    this._popupDialog();
  }
  return false;
};

mvelo.DecryptFrame.prototype._inlineDialog = function() {
  this._dDialog = $('<iframe/>', {
    id: 'dDialog-' + this.id,
    'class': 'm-frame-dialog',
    frameBorder: 0,
    scrolling: 'no'
  });
  var url;
  if (mvelo.crx) {
    url = mvelo.extension.getURL('common/ui/inline/dialogs/decryptInline.html?id=' + this.id);
  } else if (mvelo.ffa) {
    url = 'about:blank?mvelo=decryptInline&id=' + this.id;
  }
  this._dDialog.attr('src', url);
  this._eFrame.append(this._dDialog);
  this._setFrameDim();
  this._dDialog.fadeIn();
};

mvelo.DecryptFrame.prototype._popupDialog = function() {
  this._port.postMessage({
    event: 'dframe-display-popup',
    sender: this._ctrlName
  });
  this._dPopup = true;
};

mvelo.DecryptFrame.prototype._removeDialog = function() {
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

mvelo.DecryptFrame.prototype._registerEventListener = function() {
  this.parent._registerEventListener.call(this);
  var that = this;
  this._port.onMessage.addListener(function(msg) {
    //console.log('dFrame-%s event %s received', that.id, msg.event);
    switch (msg.event) {
      case 'remove-dialog':
      case 'dialog-cancel':
        that._removeDialog();
        break;
      case 'get-armored':
        that._port.postMessage({
          event: 'set-armored',
          data: that._getArmoredMessage(),
          sender: that._ctrlName
        });
        break;
    }
  });
};
