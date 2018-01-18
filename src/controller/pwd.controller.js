/**
 * Copyright (C) 2015-2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from '../lib/lib-mvelo';
import * as prefs from '../modules/prefs';
import {SubController} from './sub.controller';
import * as uiLog from '../modules/uiLog';
import * as openpgp from 'openpgp';
import * as pwdCache from '../modules/pwdCache';

export default class PwdController extends SubController {
  constructor(port) {
    if (port) {
      throw new Error('Do not instantiate PwdController with a port');
    }
    super(null);
    this.mainType = 'pwdDialog';
    this.id = mvelo.util.getHash();
    this.pwdPopup = null;
    this.options = null;
    this.resolve = null;
    this.reject = null;
    // register event handlers
    this.on('pwd-dialog-init', this.onPwdDialogInit);
    this.on('pwd-dialog-cancel', this.onCancel);
    this.on('pwd-dialog-ok', this.onOk);
    this.on('pwd-user-input', msg => uiLog.push(msg.source, msg.type));
  }

  onPwdDialogInit() {
    // pass over keyid and userid to dialog
    this.ports.pwdDialog.emit('set-init-data', {
      userid: this.options.userid,
      keyid: this.options.key.primaryKey.getKeyId().toHex(),
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
      this.options.key = key;
      this.closePopup();
      this.resolve(this.options);
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
    this.closePopup();
    this.reject(new mvelo.Error(mvelo.l10n.getMessage('pwd_dialog_cancel'), 'PWD_DIALOG_CANCEL'));
  }

  closePopup() {
    if (this.pwdPopup) {
      this.pwdPopup.close();
      this.pwdPopup = null;
    }
  }

  /**
   * @param {Object} options
   * @param {openpgp.key.Key} options.key - key to unlock
   * @param {String} options.keyid - keyid of key packet that needs to be unlocked
   * @param {String} options.userid - userid of key that needs to be unlocked
   * @param {String} options.keyringId - keyring assignment of provided key
   * @param {String} [options.reason] - optional explanation for password dialog
   * @param {Boolean} [options.openPopup=true] - password popup required (false if dialog appears integrated)
   * @param {Function} [options.beforePasswordRequest] - called before password entry required
   * @param {String} [options.password] - password to unlock key
   * @param {Boolean} [options.noCache] - bypass cache
   * @return {Promise<Object, Error>} - resolves with unlocked key and password
   */
  unlockKey(options) {
    this.options = options;
    if (typeof options.reason == 'undefined') {
      this.options.reason = '';
    }
    if (typeof this.options.openPopup == 'undefined') {
      this.options.openPopup = true;
    }
    const cacheEntry = pwdCache.get(this.options.key.primaryKey.getKeyId().toHex());
    if (cacheEntry && !options.noCache) {
      this.options.password = cacheEntry.password;
      this.options.key = cacheEntry.key;
      return Promise.resolve(this.options);
    } else {
      return new Promise((resolve, reject) => {
        if (this.keyIsDecrypted(this.options) && !options.noCache) {
          // secret-key data is not encrypted, nothing to do
          return resolve(this.options);
        }
        if (this.options.password) {
          // secret-key data is encrypted, but we have password
          return pwdCache.unlock(this.options)
          .then(key => {
            this.options.key = key;
            resolve(this.options);
          });
        }
        if (this.options.beforePasswordRequest) {
          this.options.beforePasswordRequest(this.id);
        }
        if (this.options.openPopup) {
          mvelo.windows.openPopup(`components/enter-password/pwdDialog.html?id=${this.id}`, {width: 470, height: 445})
          .then(popup => {
            this.pwdPopup = popup;
            popup.addRemoveListener(() => {
              this.pwdPopup = null;
              this.onCancel();
            });
          });
        }
        this.resolve = resolve;
        this.reject = reject;
      });
    }
  }

  keyIsDecrypted(options) {
    const keyPacket = options.key.getKeyPacket([openpgp.Keyid.fromId(options.keyid)]);
    if (keyPacket) {
      return keyPacket.isDecrypted;
    }
  }
}
