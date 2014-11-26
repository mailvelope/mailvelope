/**
 * Mailvelope - secure email with OpenPGP encryption for Webmail
 * Copyright (C) 2014  Thomas Oberndörfer
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

  function PwdController(port) {
    if (port) {
      throw new Error('Do not instantiate PwdController with a port');
    }
    sub.SubController.call(this, null);
    this.mainType = 'pwdDialog';
    this.id = this.mvelo.util.getHash();
    this.pwdPopup = null;
    this.message = null;
    this.done = null;
    this.pwdCache = require('../pwdCache');
  }

  PwdController.prototype = Object.create(sub.SubController.prototype);

  PwdController.prototype.handlePortMessage = function(msg) {
    var that = this;
    //console.log('pwd.controller handlePortMessage msg', msg);
    switch (msg.event) {
      case 'pwd-dialog-init':
        // pass over keyid and userid to dialog
        this.ports.pwdDialog.postMessage({event: 'message-userid', userid: this.message.userid, keyid: this.message.key.primaryKey.getKeyId().toHex(), cache: this.prefs.data().security.password_cache});
        break;
      case 'pwd-dialog-cancel':
        if (this.pwdPopup) {
          this.pwdPopup.close();
          this.pwdPopup = null;
        }
        this.done(msg.event);
        break;
      case 'pwd-dialog-ok':
        try {
          this.model.unlockKey(this.message.key, this.message.keyid, msg.password, function(err, key) {
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
              that.message.key = key;
              if (msg.cache != that.prefs.data().security.password_cache) {
                // update pwd cache status
                that.prefs.update({security: {password_cache: msg.cache}});
              }
              if (msg.cache) {
                // set unlocked key and password in cache
                that.pwdCache.set(that.message, msg.password);
              }
              if (that.pwdPopup) {
                that.pwdPopup.close();
                that.pwdPopup = null;
              }
              that.done();
            }
          });
        } catch (e) {
          if (this.pwdPopup) {
            // close pwd dialog
            this.pwdPopup.close();
            this.pwdPopup = null;
          }
          this.done(e.message);
        }
        break;
      default:
        console.log('unknown event', msg);
    }
  };

  PwdController.prototype.unlockKey = function(options, callback) {
    var that = this;
    this.message = options.message;
    this.done = callback;
    if (typeof options.openPopup == 'undefined') {
      options.openPopup = true;
    }
    if (options.openPopup) {
      this.mvelo.windows.openPopup('common/ui/modal/pwdDialog.html?id=' + this.id, {width: 462, height: 377, modal: true}, function(window) {
        that.pwdPopup = window;
      });
    }
  };

  exports.PwdController = PwdController;

});
