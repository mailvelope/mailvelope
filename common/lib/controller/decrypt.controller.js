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

define(function(require, exports, module) {

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
          if (this.ports.dFrame) {
            this.ports.dFrame.postMessage({event: 'remove-dialog'});
          } else if (this.ports.decryptCont) {
            this.ports.decryptCont.postMessage({event: 'error-message', error: 'modal-active'});
          }
        } else {
          var port = this.ports.dFrame || this.ports.decryptCont;
          // get armored message
          port.postMessage({event: 'get-armored'});
        }
        break;
      // done
      case 'decrypt-popup-init':
        // get armored message from dFrame
        this.ports.dFrame.postMessage({event: 'get-armored'});
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
      case 'set-armored':
        this.decrypt(msg.data, msg.keyringId || this.mvelo.LOCAL_KEYRING_ID);
        break;
      case 'get-attachment':
        if (this.mvelo.ffa) {
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

  DecryptController.prototype.decrypt = function(armored, keyringId) {
    var that = this;
    this.readMessage(armored, keyringId).then(function(message) {
      return that.prepareKey(message);
    }).then(function(message) {
      return that.decryptMessage(message);
    }).then(function(rawText) {
      return that.parseMessage(rawText);
    }).catch(function(error) {
      if (error.message === 'pwd-dialog-cancel') {
        if (that.ports.dFrame) {
          return that.dialogCancel();
        }
      }
      if (that.ports.dDialog) {
        that.ports.dDialog.postMessage({event: 'error-message', error: error.message});
      }
    }).then(function() {
      if (that.ports.decryptCont) {
        that.ports.decryptCont.postMessage({event: 'decrypt-done'});
      }
    });
  };

  DecryptController.prototype.readMessage = function(armored, keyringId) {
    var that = this;
    return new Promise(function(resolve, reject) {
      resolve(that.model.readMessage(armored, keyringId));
    });
  };

  DecryptController.prototype.prepareKey = function(message) {
    var that = this;
    return new Promise(function(resolve, reject) {
      // password or unlocked key in cache?
      var cacheEntry = that.pwdCache.get(message.key.primaryKey.getKeyId().toHex(), message.keyid);
      if (!cacheEntry) {
        if (message.key.primaryKey.isDecrypted) {
          // secret-key data is not encrypted, nothing to do
          return resolve(message);
        }
        // open password dialog
        that.pwdControl = sub.factory.get('pwdDialog');
        if (that.ports.dFrame && that.prefs.data().security.display_decrypted == that.mvelo.DISPLAY_POPUP) {
          that.ports.dDialog.postMessage({event: 'show-pwd-dialog', id: that.pwdControl.id});
        }
        resolve(that.pwdControl.unlockKey({
          message: message,
          openPopup: that.ports.decryptCont || that.prefs.data().security.display_decrypted == that.mvelo.DISPLAY_INLINE
        }));
      } else {
        that.pwdCache.unlock(cacheEntry, message, function() {
          return resolve(message);
        });
      }
    });
  };

  DecryptController.prototype.decryptMessage = function(message) {
    var that = this;
    return new Promise(function(resolve, reject) {
      that.model.decryptMessage(message, function(err, rawText) {
        if (err) {
          return reject(err);
        }
        resolve(rawText);
      });
    });
  };

  DecryptController.prototype.parseMessage = function(rawText) {
    var that = this;
    return new Promise(function(resolve, reject) {
      var port = that.ports.dDialog;
      if (!port) {
        throw new Error('No decrypt dialog found');
      }
      that.readMail(rawText, {
        onMessage: function(msg) {
          port.postMessage({event: 'decrypted-message', message: msg});
        },
        onAttachment: function(part) {
          port.postMessage({event: 'add-decrypted-attachment', message: part});
        },
        onError: reject
      });
      resolve();
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

  /**
   * handlers: onError, onAttachment, onMessage
   */
  DecryptController.prototype.readMail = function(rawText, handlers) {
    var that = this;
    if (/^\s*(MIME-Version|Content-Type|Content-Transfer-Encoding):/.test(rawText)) {
      // MIME
      that.mailreader.parse([{raw: rawText}], function(parsed) {
        if (parsed && parsed.length > 0) {
          var htmlParts = [];
          that.filterBodyParts(parsed, 'html', htmlParts);
          if (htmlParts.length) {
            that.mvelo.util.parseHTML(htmlParts[0].content, function(sanitized) {
              handlers.onMessage(sanitized);
            });
          } else {
            var textParts = [];
            that.filterBodyParts(parsed, 'text', textParts);
            if (textParts.length) {
              var text = that.mvelo.util.encodeHTML(textParts[0].content);
              text = text.replace(/\n/g, '<br>');
              handlers.onMessage(text);
            }
          }
          var attachmentParts = [];
          that.filterBodyParts(parsed, 'attachment', attachmentParts);
          attachmentParts.forEach(function(part) {
            if (that.mvelo.ffa) {
              part.attachmentId = (new Date()).getTime();
              that.attachments[part.attachmentId] = [part.filename, part.content];
            }
            handlers.onAttachment(part);
          });
        } else {
          handlers.onError(new Error('No content found in PGP/MIME.'));
        }
      });
    } else {
      if (/(<\/a>|<br>|<\/div>|<\/p>|<\/b>|<\/u>|<\/i>|<\/ul>|<\/li>)/.test(rawText)) {
        // legacy html mode
        that.mvelo.util.parseHTML(rawText, function(sanitized) {
          handlers.onMessage(sanitized);
        });
      } else {
        // plain text
        var msgText = that.mvelo.util.encodeHTML(rawText);
        msgText = msgText.replace(/\n/g, '<br>');
        handlers.onMessage(msgText);
      }
    }
  };

  exports.DecryptController = DecryptController;

});
