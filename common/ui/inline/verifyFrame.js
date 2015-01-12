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

'use strict';

var mvelo = mvelo || {};

mvelo.VerifyFrame = function(prefs) {
  mvelo.ExtractFrame.call(this, prefs);
  this._displayMode = prefs.security.display_decrypted;
  this._vDialog = null;
  // verify popup active
  this._vPopup = false;
  this._ctrlName = 'vFrame-' + this.id;
  this._typeRegex = /-----BEGIN PGP SIGNED MESSAGE-----[\s\S]+?-----END PGP SIGNATURE-----/;
  this._pgpStartRegex = /BEGIN\sPGP\sSIGNED/;
  this._sigHeight = 128;
};

mvelo.VerifyFrame.prototype = Object.create(mvelo.ExtractFrame.prototype);
mvelo.VerifyFrame.prototype.parent = mvelo.ExtractFrame.prototype;

mvelo.VerifyFrame.prototype._init = function(pgpEnd) {
  this.parent._init.call(this, pgpEnd);
  this._calcSignatureHeight();
};

mvelo.VerifyFrame.prototype._renderFrame = function() {
  this.parent._renderFrame.call(this);
  this._eFrame.addClass('m-verify');
  this._eFrame.removeClass('m-large');
};

mvelo.VerifyFrame.prototype._calcSignatureHeight = function() {
  var msg = this._getArmoredMessage();
  msg = msg.split('\n');
  for (var i = 0; i < msg.length; i++) {
    if (/-----BEGIN\sPGP\sSIGNATURE-----/.test(msg[i])) {
      var height = this._pgpEnd.position().top + this._pgpEnd.height() - this._pgpElement.position().top - 2;
      this._sigHeight = parseInt(height / msg.length * (msg.length - i), 10);
      break;
    }
  }
};

mvelo.VerifyFrame.prototype._clickHandler = function() {
  this.parent._clickHandler.call(this);
  if (this._displayMode == mvelo.DISPLAY_INLINE) {
    this._inlineDialog();
  } else if (this._displayMode == mvelo.DISPLAY_POPUP) {
    this._popupDialog();
  }
  return false;
};

mvelo.VerifyFrame.prototype._inlineDialog = function() {
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

mvelo.VerifyFrame.prototype._popupDialog = function() {
  this._port.postMessage({
    event: 'vframe-display-popup',
    sender: this._ctrlName
  });
  this._vPopup = true;
};

mvelo.VerifyFrame.prototype._removeDialog = function() {
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

mvelo.VerifyFrame.prototype._getArmoredMessage = function() {
  var msg;
  // selection method does not work in Firefox if pre element without linebreaks with <br>
  if (this._pgpElement.is('pre') && !this._pgpElement.find('br').length) {
    msg = this._pgpElement.text();
  } else {
    var sel = document.defaultView.getSelection();
    sel.selectAllChildren(this._pgpElement.get(0));
    msg = sel.toString();
    sel.removeAllRanges();
  }
  return msg;
};

mvelo.VerifyFrame.prototype._setFrameDim = function() {
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
},

mvelo.VerifyFrame.prototype._registerEventListener = function() {
  this.parent._registerEventListener.call(this);
  var that = this;
  this._port.onMessage.addListener(function(msg) {
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
