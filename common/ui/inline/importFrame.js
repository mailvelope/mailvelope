/**
 * Mailvelope - secure email with OpenPGP encryption for Webmail
 * Copyright (C) 2013  Thomas Oberndörfer
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

var ImportFrame = ImportFrame || (function() {

  var importFrame = function (prefs) {
    ExtractFrame.call(this, prefs);
    this._ctrlName = 'imFrame-' + this.id;
    this._typeRegex = /-----BEGIN PGP PUBLIC KEY BLOCK-----[\s\S]+?-----END PGP PUBLIC KEY BLOCK-----/;
  }

  importFrame.prototype = Object.create(ExtractFrame.prototype);
  importFrame.prototype.parent = ExtractFrame.prototype;

  importFrame.prototype._renderFrame = function() {
    this.parent._renderFrame.call(this);
    this._eFrame.addClass('m-import');
  }

  importFrame.prototype._clickHandler = function() {
    var that = this;
    this.parent._clickHandler.call(this, function() {
      that._port.postMessage({
        event: 'imframe-armored-key',
        data: that._getArmoredMessage(),
        sender: that._ctrlName
      });
    });
    return false;
  }

  importFrame.prototype._registerEventListener = function() {
    this.parent._registerEventListener.call(this);
    var that = this;
    this._port.onMessage.addListener(function(msg) {
      switch (msg.event) {
        case 'import-result':
          if (msg.resultType.error) {
            that._eFrame.addClass('m-error');
          } else if (msg.resultType.warning) {
            that._eFrame.addClass('m-warning');
          } else if (msg.resultType.success) {
            that._eFrame.addClass('m-ok');
          }
          break;
      }
    });
  }

  return importFrame;

}());

