/**
 * Copyright (C) 2015-2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from '../lib/lib-mvelo';
import * as l10n from '../lib/l10n';
import {PromiseQueue, getHash, MvError} from '../lib/util';
import * as prefs from '../modules/prefs';
import {SubController} from './sub.controller';
import * as uiLog from '../modules/uiLog';
import {getUserInfo} from '../modules/key';
import * as pwdCache from '../modules/pwdCache';

export default class PwdController extends SubController {
  constructor(port) {
    if (port) {
      throw new Error('Do not instantiate PwdController with a port');
    }
    super(null);
    this.persistent = true;
    this.mainType = 'pwdDialog';
    this.id = getHash();
    this.queue = new PromiseQueue();
    this.pwdPopup = null;
    this.receivedPortMsg = false;
    this.options = null;
    this.resolve = null;
    this.reject = null;
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
      keyId: this.options.key.primaryKey.getKeyId().toHex().toUpperCase(),
      cache: prefs.prefs.security.password_cache,
      reason: this.options.reason
    });
  }

  onOk(msg) {
    Promise.resolve()
    .then(() => {
      this.options.password = msg.password;
      if (msg.cache != prefs.prefs.security.password_cache) {
        // update pwd cache status
        return prefs.update({security: {password_cache: msg.cache}});
      }
    })
    .then(() => pwdCache.unlock(this.options))
    .then(key => {
      this.receivedPortMsg = true;
      this.closePopup();
      this.resolve({key, password: this.options.password});
    })
    .catch(err => {
      if (err.code == 'WRONG_PASSWORD') {
        this.ports.pwdDialog.emit('wrong-password');
      } else {
        if (this.ports.dDialog) {
          this.ports.dDialog.emit('error-message', {error: err.message});
        }
        this.closePopup();
        this.reject(err);
      }
    });
  }

  onCancel() {
    this.receivedPortMsg = true;
    this.closePopup();
    this.reject(new MvError(l10n.get('pwd_dialog_cancel'), 'PWD_DIALOG_CANCEL'));
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
  unlock(options) {
    this.options = options;
    if (typeof options.reason == 'undefined') {
      this.options.reason = '';
    }
    if (typeof this.options.openPopup == 'undefined') {
      this.options.openPopup = true;
    }
    const cacheEntry = pwdCache.get(this.options.key.primaryKey.getFingerprint(), options.message);
    if (cacheEntry && !options.noCache) {
      return Promise.resolve(cacheEntry);
    } else {
      return new Promise((resolve, reject) => {
        if (this.keyIsDecrypted(this.options) && !options.noCache) {
          // secret-key data is not encrypted, nothing to do
          return resolve({key: this.options.key, password: this.options.password});
        }
        if (this.options.password) {
          // secret-key data is encrypted, but we have password
          return pwdCache.unlock(this.options)
          .then(key => resolve({key, password: this.options.password}));
        }
        if (this.options.beforePasswordRequest) {
          this.options.beforePasswordRequest(this.id);
        }
        if (this.options.openPopup) {
          setTimeout(
            () => mvelo.windows.openPopup(`components/enter-password/passwordDialog.html?id=${this.id}`, {width: 580, height: 480})
            .then(popup => {
              this.receivedPortMsg = false;
              this.pwdPopup = popup;
              popup.addRemoveListener(() => {
                if (!this.receivedPortMsg) {
                  this.pwdPopup = null;
                  this.onCancel();
                }
              });
            }), 50);
        }
        this.resolve = resolve;
        this.reject = reject;
      });
    }
  }

  /**
   * Check if key is decrypted. As openpgp.decryptKey always decrypts all key packets, we only check the primary key status.
   * @param  {openpgp.key.Key} options.key
   * @return {Boolean}
   */
  keyIsDecrypted({key}) {
    return key.primaryKey.isDecrypted();
  }
}
