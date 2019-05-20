/**
 * Copyright (C) 2015-2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from '../lib/lib-mvelo';
import * as l10n from '../lib/l10n';
import {getHash, mapError} from '../lib/util';
import {DISPLAY_INLINE} from '../lib/constants';
import {prefs} from '../modules/prefs';
import * as model from '../modules/pgpModel';
import {parseMessage} from '../modules/mime';
import * as sub from './sub.controller';
import * as uiLog from '../modules/uiLog';
import {triggerSync} from './sync.controller';
import {getPreferredKeyringId} from '../modules/keyring';

export default class DecryptController extends sub.SubController {
  constructor(port) {
    super(port);
    if (!port) {
      this.mainType = 'decryptCont';
      this.id = getHash();
    }
    this.decryptPopup = null;
    this.options = {};
    this.keyringId = getPreferredKeyringId();
    // register event handlers
    this.on('decrypt-dialog-cancel', this.dialogCancel);
    this.on('decrypt-message-init', this.onDecryptMessageInit);
    this.on('dframe-display-popup', this.onDframeDisplayPopup);
    this.on('set-armored', this.onSetArmored);
    this.on('decrypt-inline-user-input', msg => uiLog.push(msg.source, msg.type));
  }

  onDecryptMessageInit() {
    if (this.mainType === 'dFrame' && (!this.ports.dPopup && prefs.security.display_decrypted !== DISPLAY_INLINE)) {
      this.ports.dDialog.emit('error-message', {error: l10n.get('decrypt_no_popup_error')});
    } else {
      const port = this.ports.dFrame || this.ports.decryptCont;
      // get armored message
      port && port.emit('get-armored');
    }
  }

  async onDframeDisplayPopup() {
    this.decryptPopup = await mvelo.windows.openPopup(`components/decrypt-message/decryptMessage.html?id=${this.id}&embedded=false`, {width: 742, height: 550});
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
        senderAddress: this.options.senderAddress
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
            err = mapError(err);
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

  async unlockKey({key, message}) {
    const pwdControl = sub.factory.get('pwdDialog');
    const openPopup = this.ports.decryptCont || (!this.ports.dPopup && this.ports.dDialog) || prefs.security.display_decrypted == DISPLAY_INLINE;
    const beforePasswordRequest = id => this.ports.dPopup && this.ports.dPopup.emit('show-pwd-dialog', {id});
    const unlockedKey = await pwdControl.unlockKey({
      key,
      message,
      reason: 'PWD_DIALOG_REASON_DECRYPT',
      openPopup,
      beforePasswordRequest
    });
    triggerSync({keyringId: this.keyringId, key: unlockedKey.key, password: unlockedKey.password});
    if (this.decryptPopup) {
      this.ports.dDialog.emit('hide-pwd-dialog');
    }
    return unlockedKey.key;
  }
}
