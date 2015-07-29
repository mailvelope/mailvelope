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
  var syncCtrl = require('./sync.controller');

  function PwdController(port) {
    if (port) {
      throw new Error('Do not instantiate PwdController with a port');
    }
    sub.SubController.call(this, null);
    this.mainType = 'pwdDialog';
    this.id = this.mvelo.util.getHash();
    this.pwdPopup = null;
    this.options = null;
    this.resolve = null;
    this.reject = null;
    this.pwdCache = require('../pwdCache');
  }

  PwdController.prototype = Object.create(sub.SubController.prototype);

  PwdController.prototype.handlePortMessage = function(msg) {
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
        if (this.pwdPopup) {
          this.pwdPopup.close();
          this.pwdPopup = null;
        }
        var error = new Error(msg.event);
        error.code = 'PWD_DIALOG_CANCEL';
        this.reject(error);
        break;
      case 'pwd-dialog-ok':
        try {
          this.model.unlockKey(this.options.key, this.options.keyid, msg.password, function(err, key) {
            if (err) {
              if (err.message == 'Wrong password') {
                that.ports.pwdDialog.postMessage({event: 'wrong-password'});
              } else {
                that.ports.dDialog.postMessage({event: 'error-message', error: err.message});
                if (that.pwdPopup) {
                  // close pwd dialog
                  that.pwdPopup.close();
                  that.pwdPopup = null;
                }
              }
            } else if (key) {
              // password correct
              that.options.key = key;
              that.options.password = msg.password;
              if (msg.cache != that.prefs.data().security.password_cache) {
                // update pwd cache status
                that.prefs.update({security: {password_cache: msg.cache}});
              }
              if (msg.cache) {
                // set unlocked key and password in cache
                that.pwdCache.set(that.options, msg.password);
              }
              if (that.pwdPopup) {
                that.pwdPopup.close();
                that.pwdPopup = null;
              }
              that.resolve(that.options);
              if (!that.options.noSync) {
                // trigger sync after short delay
                that.mvelo.util.setTimeout(function() {
                  syncCtrl.triggerSync({
                    keyringId: that.options.keyringId,
                    key: that.options.key
                  });
                }, 1000);
              }
            }
          });
        } catch (e) {
          if (this.pwdPopup) {
            // close pwd dialog
            this.pwdPopup.close();
            this.pwdPopup = null;
          }
          this.reject(e);
        }
        break;
      default:
        console.log('unknown event', msg);
    }
  };

  /**
   * @param {Object} options
   * @param {openpgp.key.Key} options.key - key to unlock
   * @param {String} options.keyid - keyid of key packet that needs to be unlocked
   * @param {String} options.userid - userid of key that needs to be unlocked
   * @param {String} options.keyringId - keyring assignment of provided key
   * @param {Boolean} [options.noSync=false] - do not trigger sync
   * @param {String} [options.reason] - optional explanation for password dialog
   * @param {Boolean} [options.openPopup=true] - password popup required (false if dialog appears integrated)
   * @param {Function} [options.beforePasswordRequest] - called before password entry required
   * @return {Promise<Object, Error>} - resolves with unlocked key and password
   */
  PwdController.prototype.unlockCachedKey = function(options) {
    var that = this;
    this.options = options;
    if (typeof options.reason == 'undefined') {
      this.options.reason = '';
    }
    if (typeof this.options.openPopup == 'undefined') {
      this.options.openPopup = true;
    }
    var cacheEntry = this.pwdCache.get(this.options.key.primaryKey.getKeyId().toHex(), this.options.keyid);
    if (cacheEntry) {
      return new Promise(function(resolve, reject) {
        that.options.password = cacheEntry.password;
        if (!cacheEntry.key) {
          that.pwdCache.unlock(cacheEntry, that.options, resolve.bind(null, that.options));
        } else {
          that.options.key = cacheEntry.key;
          resolve(that.options);
        }
      });
    } else {
      return new Promise(function(resolve, reject) {
        if (that.options.key.primaryKey.isDecrypted) {
          // secret-key data is not encrypted, nothing to do
          return resolve(that.options);
        }
        if (that.options.beforePasswordRequest) {
          that.options.beforePasswordRequest();
        }
        if (that.options.openPopup) {
          that.mvelo.windows.openPopup('common/ui/modal/pwdDialog.html?id=' + that.id, {width: 470, height: 417, modal: false}, function(window) {
            that.pwdPopup = window;
          });
        }
        that.resolve = resolve;
        that.reject = reject;
      });
    }
  };

  exports.PwdController = PwdController;

});
