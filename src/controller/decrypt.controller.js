/**
 * Copyright (C) 2015-2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from '../lib/lib-mvelo';
import * as l10n from '../lib/l10n';
import {getUUID, mapError} from '../lib/util';
import {DISPLAY_INLINE} from '../lib/constants';
import {prefs} from '../modules/prefs';
import {getKeyringWithPrivKey} from '../modules/keyring';
import * as model from '../modules/pgpModel';
import {parseMessage} from '../modules/mime';
import * as uiLog from '../modules/uiLog';
import {isCached} from '../modules/pwdCache';
import * as sub from './sub.controller';
import {triggerSync} from './sync.controller';
import {getPreferredKeyringId} from '../modules/keyring';
import {lookupKey} from './import.controller';

export default class DecryptController extends sub.SubController {
  constructor(port) {
    super(port);
    if (!port) {
      this.mainType = 'decryptCont';
      this.id = getUUID();
    }
    this.armored = null;
    this.message = null;
    this.sender = null;
    this.popup = null;
    this.keyringId = getPreferredKeyringId();
    // register event handlers
    this.on('decrypt-dialog-cancel', this.dialogCancel);
    this.on('decrypt-message-init', this.onDecryptMessageInit);
    this.on('decrypt-message', this.onDecrypt);
    this.on('dframe-display-popup', this.onDframeDisplayPopup);
    this.on('set-armored', this.onSetArmored);
    this.on('decrypt-inline-user-input', msg => uiLog.push(msg.source, msg.type));
  }

  async onDecryptMessageInit() {
    if (!this.popup) {
      const tab = await mvelo.tabs.getActive();
      if (tab) {
        this.tabId = tab.id;
      }
    }
    if (this.mainType.includes('Frame') && (!this.popup && prefs.security.display_decrypted !== DISPLAY_INLINE)) {
      this.ports.dDialog.emit('error-message', {error: l10n.get('decrypt_no_popup_error')});
      return;
    }
    const dFrame = Object.keys(this.ports).find(key => key.includes('dFrame'));
    const port = this.ports[dFrame || 'decryptCont'];
    // get armored message
    port && port.emit('get-armored');
  }

  async onDframeDisplayPopup() {
    this.popup = await mvelo.windows.openPopup(`components/decrypt-message/decryptMessage.html?id=${this.id}&embedded=false`, {width: 742, height: 550});
    this.popup.addRemoveListener(() => {
      const frame = Object.keys(this.ports).find(key => key.includes('Frame'));
      const port = this.ports[frame];
      port && port.emit('dialog-cancel');
      this.popup = null;
    });
  }

  onDecrypt() {
    this.decrypt(this.armored, this.keyringId);
  }

  async onSetArmored(msg) {
    if (msg.options && msg.options.senderAddress) {
      this.sender = msg.options.senderAddress;
    }
    if (msg.keyringId ?? msg.allKeyrings) {
      this.keyringId = msg.keyringId;
    }
    this.armored = msg.data;
    if (!this.ports.dFrame || this.popup || await this.canUnlockKey(this.armored, this.keyringId)) {
      await this.decrypt(this.armored, this.keyringId);
    } else {
      this.ports.dDialog.emit('lock');
    }
  }

  async canUnlockKey(armoredMessage, keyringId) {
    try {
      this.message = await model.readMessage({armoredMessage});
      const encryptionKeyIds = this.message.getEncryptionKeyIDs();
      const keyring = getKeyringWithPrivKey(encryptionKeyIds, keyringId);
      if (!keyring) {
        throw model.noKeyFoundError(encryptionKeyIds);
      }
      const key = keyring.getPrivateKeyByIds(encryptionKeyIds);
      const isKeyCached = isCached(key.getFingerprint());
      return isKeyCached;
    } catch (error) {
      if (this.ports.dDialog) {
        this.ports.dDialog.emit('error-message', {error: error.message});
      }
    }
  }

  dialogCancel() {
    const frame = Object.keys(this.ports).find(key => key.includes('Frame'));
    const port = this.ports[frame];
    if (port) {
      port.emit('dialog-cancel');
    }
    if (this.popup) {
      this.popup.close();
      this.popup = null;
    } else {
      this.ports.dDialog.emit('lock');
    }
  }

  async decrypt(armored, keyringId) {
    this.ports.dDialog.emit('waiting', {waiting: true});
    try {
      const {data, signatures} = await model.decryptMessage({
        message: this.message,
        armored,
        keyringId,
        unlockKey: this.unlockKey.bind(this),
        senderAddress: this.sender,
        uiLogSource: 'security_log_viewer',
        lookupKey: keyringId ? rotation => lookupKey({keyringId, email: this.sender, rotation}) : undefined
      });
      this.signatures = signatures;
      const ports = this.ports;
      const handlers = {
        noEvent: true,
        onMessage(msg) {
          this.noEvent = false;
          ports.dDialog.emit('decrypted-message', {message: msg, clearText: false});
        },
        onAttachment(attachment) {
          this.noEvent = false;
          ports.dDialog.emit('add-decrypted-attachment', {attachment});
        }
      };
      if (this.ports.dDialog && signatures) {
        this.ports.dDialog.emit('signature-verification', {signers: signatures});
      }
      parseMessage(data, handlers, 'html');
      if (this.ports.decryptCont) {
        this.ports.decryptCont.emit('decrypt-done');
      }
      this.ports.dDialog.emit('waiting', {waiting: false, unlock: true});
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
      this.ports.dDialog.emit('waiting', {waiting: false});
    }
  }

  async unlockKey({key, message}) {
    const pwdControl = sub.factory.get('pwdDialog');
    const openPopup = this.ports.decryptCont || (!this.popup && this.ports.dDialog);
    const beforePasswordRequest = id => this.popup && this.ports.dDialog.emit('show-pwd-dialog', {id});
    const unlockedKey = await pwdControl.unlockKey({
      key,
      message,
      reason: 'PWD_DIALOG_REASON_DECRYPT',
      openPopup,
      beforePasswordRequest
    });
    if (this.popup) {
      this.ports.dDialog.emit('hide-pwd-dialog');
    }
    triggerSync({keyringId: this.keyringId, key: unlockedKey.key, password: unlockedKey.password});
    return unlockedKey.key;
  }
}
