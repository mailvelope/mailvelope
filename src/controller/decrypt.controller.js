/**
 * Copyright (C) 2015-2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from '../lib/lib-mvelo';
import {prefs} from '../modules/prefs';
import * as model from '../modules/pgpModel';
import {parseMessage} from '../modules/mime';
import * as sub from './sub.controller';
import * as uiLog from '../modules/uiLog';
import {triggerSync} from './sync.controller';

export default class DecryptController extends sub.SubController {
  constructor(port) {
    super(port);
    if (!port) {
      this.mainType = 'decryptCont';
      this.id = mvelo.util.getHash();
    }
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

  async onDframeDisplayPopup() {
    this.decryptPopup = await mvelo.windows.openPopup(`components/decrypt-popup/decryptPopup.html?id=${this.id}`, {width: 742, height: 550});
    this.decryptPopup.addRemoveListener(() => {
      this.ports.dFrame.emit('dialog-cancel');
      this.decryptPopup = null;
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

  async decrypt(armored, keyringId) {
    try {
      const {data, signatures} = await model.decryptMessage({
        armored,
        keyringId,
        unlockKey: this.unlockKey.bind(this),
        options: this.options
      });
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
      if (this.ports.dDialog && signatures) {
        this.ports.dDialog.emit('signature-verification', {signers: signatures});
      }
      await parseMessage(data, handlers, 'html');
      if (this.ports.decryptCont) {
        this.ports.decryptCont.emit('decrypt-done');
      }
    } catch (error) {
      if (error.code === 'PWD_DIALOG_CANCEL') {
        if (this.ports.dFrame) {
          return this.dialogCancel();
        }
      }
      if (this.ports.dDialog) {
        this.ports.dDialog.emit('error-message', {error: error.message});
      }
      if (this.ports.decryptCont) {
        let err = error;
        switch (error.code) {
          case 'ARMOR_PARSE_ERROR':
          case 'PWD_DIALOG_CANCEL':
          case 'NO_KEY_FOUND':
            err = mvelo.util.mapError(err);
            break;
          default:
            err = {
              // don't expose internal errors to API
              code: 'DECRYPT_ERROR',
              message: 'Generic decrypt error'
            };
        }
        this.ports.decryptCont.emit('error-message', {error: err});
      }
    }
    this.ports.dPopup && this.ports.dPopup.emit('show-message');
  }

  async unlockKey(message) {
    const pwdControl = sub.factory.get('pwdDialog');
    message.reason = 'PWD_DIALOG_REASON_DECRYPT';
    message.openPopup = this.ports.decryptCont || prefs.security.display_decrypted == mvelo.DISPLAY_INLINE;
    message.beforePasswordRequest = id => this.ports.dPopup && this.ports.dPopup.emit('show-pwd-dialog', {id});
    message = await pwdControl.unlockKey(message);
    triggerSync(message);
    return message;
  }
}
