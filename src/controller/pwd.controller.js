/**
 * Copyright (C) 2015-2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

'use strict';


import {SubController} from './sub.controller';
import * as uiLog from '../modules/uiLog';
import openpgp from 'openpgp';
import * as pwdCache from '../modules/pwdCache';

export default class PwdController extends SubController {
  constructor(port) {
    if (port) {
      throw new Error('Do not instantiate PwdController with a port');
    }
    super(null);
    this.mainType = 'pwdDialog';
    this.id = this.mvelo.util.getHash();
    this.pwdPopup = null;
    this.options = null;
    this.resolve = null;
    this.reject = null;
  }

  handlePortMessage(msg) {
    var that = this;
    //console.log('pwd.controller handlePortMessage msg', msg);
    switch (msg.event) {
      case 'pwd-dialog-init':
        // pass over keyid and userid to dialog
        this.ports.pwdDialog.postMessage({event: 'set-init-data', data: {
          userid: this.options.userid,
          keyid: this.options.key.primaryKey.getKeyId().toHex(),
          cache: this.prefs.data().security.password_cache,
          reason: this.options.reason
        }});
        break;
      case 'pwd-dialog-cancel':
        this.closePopup();
        var error = new Error(this.mvelo.l10n.get('pwd_dialog_cancel'));
        error.code = 'PWD_DIALOG_CANCEL';
        this.reject(error);
        break;
      case 'pwd-dialog-ok':
        this.model.unlockKey(this.options.key, this.options.keyid, msg.password)
          .then(function(key) {
            // password correct
            that.options.key = key;
            that.options.password = msg.password;
            if (msg.cache != that.prefs.data().security.password_cache) {
              // update pwd cache status
              return that.prefs.update({security: {password_cache: msg.cache}});
            }
          })
          .then(() => {
            if (msg.cache) {
              // set unlocked key and password in cache
              pwdCache.set(that.options, msg.password);
            }
            that.closePopup();
            that.resolve(that.options);
          })
          .catch(function(err) {
            if (err.message == 'Wrong password') {
              that.ports.pwdDialog.postMessage({event: 'wrong-password'});
            } else {
              if (that.ports.dDialog) {
                that.ports.dDialog.postMessage({event: 'error-message', error: err.message});
              }
              that.closePopup();
              that.reject(err);
            }
          });
        break;
      case 'pwd-user-input':
        uiLog.push(msg.source, msg.type);
        break;
      default:
        console.log('unknown event', msg);
    }
  }

  closePopup() {
    if (this.pwdPopup) {
      try {
        this.pwdPopup.close();
      } catch (e) {}
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
    var that = this;
    this.options = options;
    if (typeof options.reason == 'undefined') {
      this.options.reason = '';
    }
    if (typeof this.options.openPopup == 'undefined') {
      this.options.openPopup = true;
    }
    var cacheEntry = pwdCache.get(this.options.key.primaryKey.getKeyId().toHex(), this.options.keyid);
    if (cacheEntry && !options.noCache) {
      return new Promise(function(resolve) {
        that.options.password = cacheEntry.password;
        if (!cacheEntry.key) {
          pwdCache.unlock(that.options)
            .then(function() {
              resolve(that.options);
            });
        } else {
          that.options.key = cacheEntry.key;
          resolve(that.options);
        }
      });
    } else {
      return new Promise(function(resolve, reject) {
        if (that.keyIsDecrypted(that.options) && !options.noCache) {
          // secret-key data is not encrypted, nothing to do
          return resolve(that.options);
        }
        if (that.options.password) {
          // secret-key data is encrypted, but we have password
          return that.model.unlockKey(that.options.key, that.options.keyid, that.options.password)
            .then(function(key) {
              that.options.key = key;
              resolve(that.options);
            });
        }
        if (that.options.beforePasswordRequest) {
          that.options.beforePasswordRequest();
        }
        if (that.options.openPopup) {
          that.mvelo.windows.openPopup('components/enter-password/pwdDialog.html?id=' + that.id, {width: 470, height: 445, modal: false}, function(window) {
            that.pwdPopup = window;
          });
        }
        that.resolve = resolve;
        that.reject = reject;
      });
    }
  }

  keyIsDecrypted(options) {
    var keyPacket = options.key.getKeyPacket([openpgp.Keyid.fromId(options.keyid)]);
    if (keyPacket) {
      return keyPacket.isDecrypted;
    }
  }
}
