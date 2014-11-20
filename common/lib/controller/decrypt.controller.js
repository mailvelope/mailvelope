/**
 * Mailvelope - secure email with OpenPGP encryption for Webmail
 * Copyright (C) 2014  Thomas Oberndörfer
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

define(function (require, exports, module) {

  var sub = require('./sub.controller');

  function DecryptController(port) {
    sub.SubController.call(this, port);
    this.pwdControl = null;
    this.pwdCache = require('../pwdCache');
    this.decryptPopup = null;
    this.mailreader = require('mailreader-parser');
  }

  DecryptController.prototype = Object.create(sub.SubController.prototype);

  DecryptController.prototype.handlePortMessage = function(msg) {
    var that = this;
    switch (msg.event) {
      // done
      case 'decrypt-dialog-cancel':
        this.dialogCancel();
        break;
      // done
      case 'decrypt-inline-init':
        if (this.mvelo.windows.modalActive) {
          // password dialog or modal dialog already open
          this.ports.dFrame.postMessage({event: 'remove-dialog'});
        } else {
          // get armored message from dFrame
          this.ports.dFrame.postMessage({event: 'armored-message'});
        }
        break;
      // done
      case 'decrypt-popup-init':
        // get armored message from dFrame
        this.ports.dFrame.postMessage({event: 'armored-message'});
        break;
      // done
      case 'dframe-display-popup':
        // decrypt popup potentially needs pwd dialog
        if (this.mvelo.windows.modalActive) {
          // password dialog or modal dialog already open
          this.ports.dFrame.postMessage({event: 'remove-dialog'});
        } else {
          this.mvelo.windows.openPopup('common/ui/modal/decryptPopup.html?id=' + this.id, {width: 742, height: 450, modal: true}, function(window) {
            that.decryptPopup = window;
          });
        }
        break;
      case 'dframe-armored-message':
        try {
          var message = this.model.readMessage(msg.data);
          // password or unlocked key in cache?
          var cacheEntry = this.pwdCache.get(message.key.primaryKey.getKeyId().toHex(), message.keyid);
          if (!cacheEntry) {
            // open password dialog
            this.pwdControl = sub.factory.get('pwdDialog');
            this.pwdControl.unlockKey({
              message: message,
              openPopup: this.prefs.data.security.display_decrypted == this.mvelo.DISPLAY_INLINE
            }, function(err) {
              if (err === 'pwd-dialog-cancel') {
                that.dialogCancel();
                return;
              }
              if (err) {
                throw { message: err };
              }
              // success
              that.decryptMessage(message);
            });
            if (this.prefs.data.security.display_decrypted == this.mvelo.DISPLAY_POPUP) {
              this.ports.dDialog.postMessage({event: 'show-pwd-dialog', id: this.pwdControl.id});
            }
          } else {
            this.pwdCache.unlock(cacheEntry, message, function() {
              that.decryptMessage(message);
            });
          }
        } catch (e) {
          // display error message in decrypt dialog
          this.ports.dDialog.postMessage({event: 'error-message', error: e.message});
        }
        break;
      default:
        console.log('unknown event', msg);
    }
  };

  DecryptController.prototype.dialogCancel = function() {
    // forward event to decrypt frame
    this.ports.dFrame.postMessage({event: 'dialog-cancel'});
    if (this.decryptPopup) {
      this.decryptPopup.close();
      this.decryptPopup = null;
    }
  };

  DecryptController.prototype.decryptMessage = function(message) {
    var that = this;
    this.model.decryptMessage(message, function(err, rawText) {
      var port = that.ports.dDialog;
      if (!port) {
        return;
      }
      if (err) {
        // display error message in decrypt dialog
        port.postMessage({event: 'error-message', error: err.message});
      } else {
        var msgText;
        // decrypted correctly
        if (/^Content-Type:\smultipart\//.test(rawText)) {
          // MIME
          that.mailreader.parse([{raw: rawText}], function(parsed) {
            if (parsed && parsed[0] && parsed[0].content) {
              var html = parsed[0].content.filter(function(entry) {
                return entry.type === 'html';
              });
              if (html.length) {
                that.mvelo.util.parseHTML(html[0].content, function(sanitized) {
                  port.postMessage({event: 'decrypted-message', message: sanitized});
                });
                return;
              }
              var text = parsed[0].content.filter(function(entry) {
                return entry.type === 'text';
              });
              msgText = that.mvelo.encodeHTML(text.length ? text[0].content : rawText);
              port.postMessage({event: 'decrypted-message', message: msgText});
            }
          });
        } else {
          if (/(<\/a>|<br>|<\/div>|<\/p>|<\/b>|<\/u>|<\/i>|<\/ul>|<\/li>)/.test(rawText)) {
            // legacy html mode
            that.mvelo.util.parseHTML(rawText, function(sanitized) {
              port.postMessage({event: 'decrypted-message', message: sanitized});
            });
          } else {
            // plain text
            msgText = that.mvelo.encodeHTML(rawText);
            port.postMessage({event: 'decrypted-message', message: msgText});
          }
        }
      }
    });
  };

  exports.DecryptController = DecryptController;

});