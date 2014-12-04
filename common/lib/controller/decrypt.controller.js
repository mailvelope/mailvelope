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
    this.attachments = {};
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
              openPopup: this.prefs.data().security.display_decrypted == this.mvelo.DISPLAY_INLINE
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
            if (this.prefs.data().security.display_decrypted == this.mvelo.DISPLAY_POPUP) {
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
      case 'get-attachment':
        console.log("Get Attachment: "+JSON.stringify(msg.event));
        if(this.mvelo.ffa) {
          var attachmentId = msg.attachmentId;
          var attachment = that.attachments[attachmentId];
          this.mvelo.util.saveAsAttachment(attachment[0], attachment[1]);
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
            if (parsed && parsed.length > 0) {
              var htmlParts = [];
              that.filterBodyParts(parsed, 'html', htmlParts);
              if (htmlParts.length) {
                that.mvelo.util.parseHTML(htmlParts[0].content, function (sanitized) {
                  port.postMessage({event: 'decrypted-message', message: sanitized});
                });
              } else {
                var textParts = [];
                that.filterBodyParts(parsed, 'text', textParts);
                if (textParts.length) {
                  var text = that.mvelo.encodeHTML(textParts[0].content);
                  text = text.replace(/\n/g, '<br>');
                  port.postMessage({event: 'decrypted-message', message: text});
                }
              }
              var attachmentParts = [];
              that.filterBodyParts(parsed, 'attachment', attachmentParts);
              attachmentParts.forEach(function(part) {
                if (that.mvelo.ffa) {
                  part.attachmentId = (new Date()).getTime();
                  that.attachments[part.attachmentId] = [part.filename, part.content];
                }
                port.postMessage({event: 'add-decrypted-attachment', message: part});
              });
            } else {
              port.postMessage({event: 'error-message', error: 'No content found in PGP/MIME.'});
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
            msgText = msgText.replace(/\n/g, '<br>');
            port.postMessage({event: 'decrypted-message', message: msgText});
          }
        }
      }
    });
  };

  // attribution: https://github.com/whiteout-io/mail-html5
  DecryptController.prototype.filterBodyParts = function(bodyParts, type, result) {
    var that = this;
    result = result || [];
    bodyParts.forEach(function(part) {
      if (part.type === type) {
        result.push(part);
      } else if (Array.isArray(part.content)) {
        that.filterBodyParts(part.content, type, result);
      }
    });
    return result;
  };

  exports.DecryptController = DecryptController;

});