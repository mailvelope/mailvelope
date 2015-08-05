/**
 * Mailvelope - secure email with OpenPGP encryption for Webmail
 * Copyright (C) 2014-2015 Mailvelope GmbH
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
  var uiLog = require('../uiLog');

  function DecryptController(port) {
    sub.SubController.call(this, port);
    this.pwdControl = null;
    this.pwdCache = require('../pwdCache');
    this.decryptPopup = null;
    this.mailreader = require('mailreader-parser');
    this.options = {};
    this.keyringId = this.mvelo.LOCAL_KEYRING_ID;
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
          this.mvelo.windows.openPopup('common/ui/modal/decryptPopup.html?id=' + this.id, {width: 742, height: 550, modal: true}, function(window) {
            that.decryptPopup = window;
          });
        }
        break;
      case 'set-armored':
        this.options = msg.options;
        if (msg.keyringId) {
          this.keyringId = msg.keyringId;
        }
        this.decrypt(msg.data, this.keyringId);
        break;
      case 'decrypt-inline-user-input':
        uiLog.push(msg.source, msg.type);
        break;
      case 'open-security-settings':
        this.openSecuritySettings();
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
    this.model.readMessage(armored, keyringId)
      .then(function(message) {
        return that.prepareKey(message);
      })
      .then(function(message) {
        return that.decryptMessage(message);
      })
      .then(function(content) {
        var handlers = {
          noEvent: true,
          onMessage: function(msg) {
            this.noEvent = false;
            that.ports.dDialog.postMessage({event: 'decrypted-message', message: msg});
          },
          onAttachment: function(part) {
            this.noEvent = false;
            that.ports.dDialog.postMessage({event: 'add-decrypted-attachment', message: part});
          }
        };
        that.parseMessage(content.text, handlers, 'html');
        if (content.signatures) {
          that.ports.dDialog.postMessage({event: 'signature-verification', signers: content.signatures});
        }
      })
      .catch(function(error) {
        if (error.message === 'pwd-dialog-cancel') {
          if (that.ports.dFrame) {
            return that.dialogCancel();
          }
          error.message = that.mvelo.l10n.get('pwd_dialog_cancel');
        }
        if (that.ports.dDialog) {
          that.ports.dDialog.postMessage({event: 'error-message', error: error.message});
        }
      })
      .then(function() {
        if (that.ports.decryptCont) {
          that.ports.decryptCont.postMessage({event: 'decrypt-done'});
        }
      });
  };

  DecryptController.prototype.prepareKey = function(message, openPopup) {
    var that = this;
    this.pwdControl = sub.factory.get('pwdDialog');
    message.reason = 'PWD_DIALOG_REASON_DECRYPT';
    message.openPopup = openPopup !== undefined ? openPopup : this.ports.decryptCont || this.prefs.data().security.display_decrypted == this.mvelo.DISPLAY_INLINE;
    message.beforePasswordRequest = function() {
      if (that.ports.dFrame && that.prefs.data().security.display_decrypted == that.mvelo.DISPLAY_POPUP) {
        that.ports.dDialog.postMessage({event: 'show-pwd-dialog', id: that.pwdControl.id});
      }
    };
    message.keyringId = this.keyringId;
    return this.pwdControl.unlockCachedKey(message);
  };

  DecryptController.prototype.decryptMessage = function(message) {
    var that = this;
    return new Promise(function(resolve, reject) {
      message.options = that.options;
      that.model.decryptMessage(message, that.keyringId, function(err, content) {
        if (err) {
          return reject(err);
        }
        resolve(content);
      });
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
   * handlers: onAttachment, onMessage
   */
  DecryptController.prototype.parseMessage = function(rawText, handlers, encoding) {
    if (/^\s*(MIME-Version|Content-Type|Content-Transfer-Encoding|From|Date):/.test(rawText)) {
      this.parseMIME(rawText, handlers, encoding);
    } else {
      this.parseInline(rawText, handlers, encoding);
    }
  };

  DecryptController.prototype.parseMIME = function(rawText, handlers, encoding) {
    var that = this;
    // mailreader expects rawText in pseudo-binary
    rawText = unescape(encodeURIComponent(rawText));
    this.mailreader.parse([{raw: rawText}], function(parsed) {
      if (parsed && parsed.length > 0) {
        var htmlParts = [];
        var textParts = [];
        if (encoding === 'html') {
          that.filterBodyParts(parsed, 'html', htmlParts);
          if (htmlParts.length) {
            that.mvelo.util.parseHTML(htmlParts[0].content, function(sanitized) {
              handlers.onMessage(sanitized);
            });
          } else {
            that.filterBodyParts(parsed, 'text', textParts);
            if (textParts.length) {
              handlers.onMessage(that.mvelo.util.text2html(textParts[0].content));
            }
          }
        } else if (encoding === 'text') {
          that.filterBodyParts(parsed, 'text', textParts);
          if (textParts.length) {
            handlers.onMessage(textParts[0].content);
          } else {
            that.filterBodyParts(parsed, 'html', htmlParts);
            if (htmlParts.length) {
              handlers.onMessage(that.mvelo.util.html2text(textParts[0].content));
            }
          }
        }
        var attachmentParts = [];
        that.filterBodyParts(parsed, 'attachment', attachmentParts);
        attachmentParts.forEach(function(part) {
          part.filename = that.mvelo.util.encodeHTML(part.filename);
          part.content = that.mvelo.util.ab2str(part.content.buffer);
          handlers.onAttachment(part);
        });
      }
      if (handlers.noEvent) {
        handlers.onMessage('');
      }
    });
  };

  DecryptController.prototype.parseInline = function(rawText, handlers, encoding) {
    if (/(<\/a>|<br>|<\/div>|<\/p>|<\/b>|<\/u>|<\/i>|<\/ul>|<\/li>)/.test(rawText)) {
      // legacy html mode
      if (encoding === 'html') {
        this.mvelo.util.parseHTML(rawText, function(sanitized) {
          handlers.onMessage(sanitized);
        });
      } else if (encoding === 'text') {
        handlers.onMessage(this.mvelo.util.html2text(rawText));
      }
    } else {
      // plain text
      if (encoding === 'html') {
        handlers.onMessage(this.mvelo.util.text2html(rawText));
      } else if (encoding === 'text') {
        handlers.onMessage(rawText);
      }
    }
  };

  exports.DecryptController = DecryptController;

});
