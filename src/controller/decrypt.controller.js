/**
 * Copyright (C) 2015-2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from '../lib/lib-mvelo';
import {prefs} from '../modules/prefs';
import * as model from '../modules/pgpModel';
import * as sub from './sub.controller';
import * as uiLog from '../modules/uiLog';
import {triggerSync} from './sync.controller';
import mailreader from 'mailreader-parser';

export default class DecryptController extends sub.SubController {
  constructor(port) {
    super(port);
    if (!port) {
      this.mainType = 'decryptCont';
      this.id = mvelo.util.getHash();
    }
    this.pwdControl = null;
    this.decryptPopup = null;
    this.options = {};
    this.keyringId = mvelo.LOCAL_KEYRING_ID;
    // register event handlers
    this.on('decrypt-dialog-cancel', this.dialogCancel);
    this.on('decrypt-message-init', this.onDecryptMessageInit);
    this.on('dframe-display-popup', this.onDframeDisplayPopup);
    this.on('set-armored', this.onSetArmored);
    this.on('decrypt-inline-user-input', msg => uiLog.push(msg.source, msg.type));
  }

  onDecryptMessageInit() {
    const port = this.ports.dFrame || this.ports.decryptCont;
    // get armored message
    port && port.emit('get-armored');
  }

  onDframeDisplayPopup() {
    mvelo.windows.openPopup(`components/decrypt-popup/decryptPopup.html?id=${this.id}`, {width: 742, height: 550})
    .then(popup => {
      this.decryptPopup = popup;
      popup.addRemoveListener(() => {
        this.ports.dFrame.emit('dialog-cancel');
        this.decryptPopup = null;
      });
    });
  }

  onSetArmored(msg) {
    this.options = msg.options;
    if (msg.keyringId) {
      this.keyringId = msg.keyringId;
    }
    this.decrypt(msg.data, this.keyringId);
  }

  dialogCancel() {
    // forward event to decrypt frame
    this.ports.dFrame.emit('dialog-cancel');
    if (this.decryptPopup) {
      this.decryptPopup.close();
      this.decryptPopup = null;
    }
  }

  decrypt(armored, keyringId) {
    model.readMessage({armoredText: armored, keyringId})
    .then(message => this.prepareKey(message))
    .then(message => {
      triggerSync(message);
      return this.decryptMessage(message);
    })
    .then(content => {
      const ports = this.ports;
      const handlers = {
        noEvent: true,
        onMessage(msg) {
          this.noEvent = false;
          ports.dDialog.emit('decrypted-message', {message: msg});
        },
        onAttachment(attachment) {
          this.noEvent = false;
          ports.dDialog.emit('add-decrypted-attachment', {attachment});
        }
      };
      if (this.ports.dDialog && content.signatures) {
        this.ports.dDialog.emit('signature-verification', {signers: content.signatures});
      }
      return this.parseMessage(content.data, handlers, 'html');
    })
    .then(() => {
      if (this.ports.decryptCont) {
        this.ports.decryptCont.emit('decrypt-done');
      }
    })
    .catch(error => {
      if (error.code === 'PWD_DIALOG_CANCEL') {
        if (this.ports.dFrame) {
          return this.dialogCancel();
        }
      }
      if (this.ports.dDialog) {
        this.ports.dDialog.emit('error-message', {error: error.message});
      }
      if (this.ports.decryptCont) {
        error = error || {};
        switch (error.code) {
          case 'ARMOR_PARSE_ERROR':
          case 'PWD_DIALOG_CANCEL':
          case 'NO_KEY_FOUND':
            error = mvelo.util.mapError(error);
            break;
          default:
            error = {
              // don't expose internal errors to API
              code: 'DECRYPT_ERROR',
              message: 'Generic decrypt error'
            };
        }
        this.ports.decryptCont.emit('error-message', {error});
      }
    })
    .then(() => {
      this.ports.dPopup && this.ports.dPopup.emit('show-message');
    });
  }

  prepareKey(message) {
    this.pwdControl = sub.factory.get('pwdDialog');
    message.reason = 'PWD_DIALOG_REASON_DECRYPT';
    if (message.openPopup === undefined) {
      message.openPopup = this.ports.decryptCont || prefs.security.display_decrypted == mvelo.DISPLAY_INLINE;
    }
    if (!message.beforePasswordRequest) {
      message.beforePasswordRequest = id => this.ports.dPopup && this.ports.dPopup.emit('show-pwd-dialog', {id});
    }
    message.keyringId = this.keyringId;
    return this.pwdControl.unlockKey(message);
  }

  decryptMessage(message) {
    message.options = message.options || this.options;
    return model.decryptMessage(message, this.keyringId);
  }

  // attribution: https://github.com/whiteout-io/mail-html5
  filterBodyParts(bodyParts, type, result) {
    result = result || [];
    bodyParts.forEach(part => {
      if (part.type === type) {
        result.push(part);
      } else if (Array.isArray(part.content)) {
        this.filterBodyParts(part.content, type, result);
      }
    });
    return result;
  }

  /**
   * handlers: onAttachment, onMessage
   */
  parseMessage(rawText, handlers, encoding) {
    if (/^\s*(MIME-Version|Content-Type|Content-Transfer-Encoding|From|Date):/.test(rawText)) {
      return this.parseMIME(rawText, handlers, encoding);
    } else {
      return this.parseInline(rawText, handlers, encoding);
    }
  }

  parseMIME(rawText, handlers, encoding) {
    return new Promise(resolve => {
      // mailreader expects rawText in pseudo-binary
      rawText = unescape(encodeURIComponent(rawText));
      mailreader.parse([{raw: rawText}], parsed => {
        if (parsed && parsed.length > 0) {
          const htmlParts = [];
          const textParts = [];
          if (encoding === 'html') {
            this.filterBodyParts(parsed, 'html', htmlParts);
            if (htmlParts.length) {
              const sanitized = mvelo.util.sanitizeHTML(htmlParts.map(part => part.content).join('\n<hr>\n'));
              handlers.onMessage(sanitized);
            } else {
              this.filterBodyParts(parsed, 'text', textParts);
              if (textParts.length) {
                handlers.onMessage(textParts.map(part => mvelo.util.text2html(part.content)).join('<hr>'));
              }
            }
          } else if (encoding === 'text') {
            this.filterBodyParts(parsed, 'text', textParts);
            if (textParts.length) {
              handlers.onMessage(textParts.map(part => part.content).join('\n\n'));
            } else {
              this.filterBodyParts(parsed, 'html', htmlParts);
              if (htmlParts.length) {
                handlers.onMessage(htmlParts.map(part => mvelo.util.html2text(part.content)).join('\n\n'));
              }
            }
          }
          const attachmentParts = [];
          this.filterBodyParts(parsed, 'attachment', attachmentParts);
          attachmentParts.forEach(part => {
            part.filename = mvelo.util.encodeHTML(part.filename);
            part.content = mvelo.util.ab2str(part.content.buffer);
            handlers.onAttachment(part);
          });
        }
        if (handlers.noEvent) {
          handlers.onMessage('');
        }
        resolve();
      });
    });
  }

  parseInline(rawText, handlers, encoding) {
    return new Promise(resolve => {
      if (/(<\/a>|<br>|<\/div>|<\/p>|<\/b>|<\/u>|<\/i>|<\/ul>|<\/li>)/.test(rawText)) {
        // legacy html mode
        if (encoding === 'html') {
          const sanitized = mvelo.util.sanitizeHTML(rawText);
          handlers.onMessage(sanitized);
          resolve();
        } else if (encoding === 'text') {
          handlers.onMessage(mvelo.util.html2text(rawText));
          resolve();
        }
      } else {
        // plain text
        if (encoding === 'html') {
          handlers.onMessage(mvelo.util.text2html(rawText));
        } else if (encoding === 'text') {
          handlers.onMessage(rawText);
        }
        resolve();
      }
    });
  }
}
