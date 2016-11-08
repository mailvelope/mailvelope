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


var sub = require('./sub.controller');
var uiLog = require('../modules/uiLog');
var syncCtrl = require('./sync.controller');

function DecryptController(port) {
  sub.SubController.call(this, port);
  this.pwdControl = null;
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
        this.mvelo.windows.openPopup('components/decrypt-popup/decryptPopup.html?id=' + this.id, {width: 742, height: 550, modal: true}, function(window) {
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
    try {
      this.decryptPopup.close();
    } catch (e) {}
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
      syncCtrl.triggerSync(message);
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
      if (that.ports.dDialog && content.signatures) {
        that.ports.dDialog.postMessage({event: 'signature-verification', signers: content.signatures});
      }
      return that.parseMessage(content.text, handlers, 'html');
    })
    .then(function() {
      if (that.ports.decryptCont) {
        that.ports.decryptCont.postMessage({event: 'decrypt-done'});
      }
    })
    .catch(function(error) {
      if (error.code === 'PWD_DIALOG_CANCEL') {
        if (that.ports.dFrame) {
          return that.dialogCancel();
        }
      }
      if (that.ports.dDialog) {
        that.ports.dDialog.postMessage({event: 'error-message', error: error.message});
      }
      if (that.ports.decryptCont) {
        error = error || {};
        switch (error.code) {
          case 'ARMOR_PARSE_ERROR':
          case 'PWD_DIALOG_CANCEL':
          case 'NO_KEY_FOUND':
            error = that.mvelo.util.mapError(error);
            break;
          default:
            error = {
              // don't expose internal errors to API
              code: 'DECRYPT_ERROR',
              message: 'Generic decrypt error'
            };
        }
        that.ports.decryptCont.postMessage({event: 'error-message', error: error});
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
  return this.pwdControl.unlockKey(message);
};

DecryptController.prototype.decryptMessage = function(message) {
  var that = this;
  return new Promise(function(resolve, reject) {
    message.options = message.options || that.options;
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
    return this.parseMIME(rawText, handlers, encoding);
  } else {
    return this.parseInline(rawText, handlers, encoding);
  }
};

DecryptController.prototype.parseMIME = function(rawText, handlers, encoding) {
  var that = this;
  return new Promise(function(resolve) {
    // mailreader expects rawText in pseudo-binary
    rawText = unescape(encodeURIComponent(rawText));
    that.mailreader.parse([{raw: rawText}], function(parsed) {
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
      resolve();
    });
  });
};

DecryptController.prototype.parseInline = function(rawText, handlers, encoding) {
  var that = this;
  return new Promise(function(resolve) {
    if (/(<\/a>|<br>|<\/div>|<\/p>|<\/b>|<\/u>|<\/i>|<\/ul>|<\/li>)/.test(rawText)) {
      // legacy html mode
      if (encoding === 'html') {
        that.mvelo.util.parseHTML(rawText, function(sanitized) {
          handlers.onMessage(sanitized);
          resolve();
        });
      } else if (encoding === 'text') {
        handlers.onMessage(that.mvelo.util.html2text(rawText));
        resolve();
      }
    } else {
      // plain text
      if (encoding === 'html') {
        handlers.onMessage(that.mvelo.util.text2html(rawText));
      } else if (encoding === 'text') {
        handlers.onMessage(rawText);
      }
      resolve();
    }
  });
};

exports.DecryptController = DecryptController;
