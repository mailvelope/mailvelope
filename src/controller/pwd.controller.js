/**
 * Copyright (C) 2015-2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from '../lib/lib-mvelo';
import * as l10n from '../lib/l10n';
import {PromiseQueue, getUUID, MvError} from '../lib/util';
import * as prefs from '../modules/prefs';
import {SubController} from './sub.controller';
import * as uiLog from '../modules/uiLog';
import {getUserInfo} from '../modules/key';
import * as pwdCache from '../modules/pwdCache';

export default class PwdController extends SubController {
  constructor() {
    super();
    this.persistent = true;
    this.mainType = 'pwdDialog';
    this.id = getUUID();
    this.queue = new PromiseQueue();
    this.pwdPopup = null;
    this.receivedPortMsg = false;
    this.options = null;
    this.passwordRequest = null;
    // register event handlers
    this.on('pwd-dialog-init', this.onPwdDialogInit);
    this.on('pwd-dialog-cancel', this.onCancel);
    this.on('pwd-dialog-ok', this.onOk);
    this.on('pwd-user-input', msg => uiLog.push(msg.source, msg.type));
  }

  async onPwdDialogInit() {
    // pass over keyId and userId to dialog
    const {userId} = await getUserInfo(this.options.key, {allowInvalid: true});
    this.ports.pwdDialog.emit('set-init-data', {
      userId,
      keyId: this.options.key.getKeyID().toHex().toUpperCase(),
      cache: prefs.prefs.security.password_cache,
      reason: this.options.reason
    });
  }

  async onOk(msg) {
    try {
      this.options.password = msg.password;
      if (msg.cache != prefs.prefs.security.password_cache) {
        // update pwd cache status
        await prefs.update({security: {password_cache: msg.cache}});
      }
      const key = await pwdCache.unlock(this.options);
      this.receivedPortMsg = true;
      this.closePopup();
      this.passwordRequest.resolve({key, password: this.options.password});
    } catch (err) {
      if (err.code == 'WRONG_PASSWORD') {
        this.ports.pwdDialog.emit('wrong-password');
      } else {
        if (this.ports.dDialog) {
          this.ports.dDialog.emit('error-message', {error: err.message});
        }
        this.closePopup();
        this.passwordRequest.reject(err);
      }
    }
  }

  onCancel() {
    this.receivedPortMsg = true;
    this.closePopup();
    this.passwordRequest.reject(new MvError(l10n.get('pwd_dialog_cancel'), 'PWD_DIALOG_CANCEL'));
  }

  closePopup() {
    if (this.pwdPopup) {
      this.pwdPopup.close();
      this.pwdPopup = null;
    }
  }

  async unlockKey(options) {
    const result = await this.queue.push(this, 'unlock', [options]);
    return result;
  }

  /**
   * @param {Object} options
   * @param {openpgp.key.Key} options.key - key to unlock
   * @param {String} [options.reason] - optional explanation for password dialog
   * @param {Boolean} [options.openPopup=true] - password popup required (false if dialog appears integrated)
   * @param {Function} [options.beforePasswordRequest] - called before password entry required
   * @param {String} [options.password] - password to unlock key
   * @param {Boolean} [options.noCache] - bypass cache
   * @return {Promise<Object, Error>} - resolves with unlocked key and password {key: openpgp.key.Key, password: String}
   */
  async unlock(options) {
    this.options = options;
    this.options.reason ??= '';
    this.options.openPopup ??= true;
    const cacheEntry = await pwdCache.get(this.options.key.getFingerprint(), options.message);
    if (cacheEntry && !options.noCache) {
      if (cacheEntry.key) {
        return cacheEntry;
      }
      // password is in cache
      this.options.password = cacheEntry.password;
    }
    if (this.keyIsDecrypted(this.options) && !options.noCache) {
      // secret-key data is not encrypted, nothing to do
      return {key: this.options.key, password: this.options.password};
    }
    if (this.options.password) {
      // secret-key data is encrypted, but we have password
      const key = await pwdCache.unlock(this.options);
      return {key, password: this.options.password};
    }
    this.passwordRequest = Promise.withResolvers();
    if (this.options.beforePasswordRequest) {
      this.options.beforePasswordRequest(this.id);
    }
    if (this.options.openPopup) {
      setTimeout(async () => {
        const popup = await mvelo.windows.openPopup(`components/enter-password/passwordDialog.html?id=${this.id}`, {width: 580, height: 490});
        this.receivedPortMsg = false;
        this.pwdPopup = popup;
        popup.addRemoveListener(() => {
          if (!this.receivedPortMsg) {
            this.pwdPopup = null;
            this.onCancel();
          }
        });
      }, 50);
    }
    return this.passwordRequest.promise;
  }

  /**
   * Check if key is decrypted. As openpgp.decryptKey always decrypts all key packets, we only check the primary key status.
   * @param  {openpgp.key.Key} options.key
   * @return {Boolean}
   */
  keyIsDecrypted({key}) {
    return key.isDecrypted();
  }
}
