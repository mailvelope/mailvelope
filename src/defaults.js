/**
 * Mailvelope - secure email with OpenPGP encryption for Webmail
 * Copyright (C) 2012  Thomas Oberndörfer
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

var defaults = {};

(function(public) {

  public.init = function(callback) {
    // apply defaults if don't exist
    if (pgpvm.getWatchList() === null) {
      $.get(chrome.extension.getURL('res/defaults.json'), function(data) {
        pgpvm.setWatchList(data.watch_list);
        callback();
      }, 'json');
    } else {
      callback();
    }
    // migration
    migrateTo0420();
  }

  function migrateTo0420() {
    for (var i = 0; i < openpgp.keyring.privateKeys.length; i++) {
      // check if corresponding public key
      var found = openpgp.keyring.getPublicKeysForKeyId(openpgp.keyring.privateKeys[i].obj.getKeyId());
      if (found.length === 0) {
        // create public key from private key
        var pubArmored = openpgp.keyring.privateKeys[i].obj.extractPublicKey();
        if (pubArmored === null) {
          // remove private key
          openpgp.keyring.removePrivateKey(i);
          i--;
        } else {
          // import public key
          var pubKey = openpgp.read_publicKey(pubArmored);
          for (var j = 0; j < pubKey.length; j++) {
            openpgp.keyring.publicKeys.push({armored: pubArmored, obj: pubKey[j], keyId: pubKey[j].getKeyId()});
          }
          openpgp.keyring.store();
        }
      }
    }
  }

}(defaults));
