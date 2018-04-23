/**
 * Copyright (C) 2018 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from '../lib/lib-mvelo';
import * as openpgp from 'openpgp';
import {getUserId, checkKeyId} from './key';
import KeyringBase from './KeyringBase';
import {setKeyringAttr} from './keyring';
import {goog} from './closure-library/closure/goog/emailaddress';
const l10n = mvelo.l10n.getMessage;
import * as keyringSync from './keyringSync';
import KeyServer from './keyserver';

const keyServer = new KeyServer();

export default class KeyringLocal extends KeyringBase {
  constructor(keyringId, pgpKeyring) {
    super(keyringId, pgpKeyring);
    this.sync = new keyringSync.KeyringSync(keyringId);
  }

  async importKeys(armoredKeys) {
    let result = [];
    // sort, public keys first
    armoredKeys = armoredKeys.sort((a, b) => b.type.localeCompare(a.type));
    // import
    armoredKeys.forEach(key => {
      try {
        if (key.type === 'public') {
          result = result.concat(this.importPublicKey(key.armored, this.keyring));
        } else if (key.type === 'private') {
          result = result.concat(this.importPrivateKey(key.armored, this.keyring));
        }
      } catch (e) {
        result.push({
          type: 'error',
          message: l10n('key_import_unable', [e])
        });
      }
    });
    // exit if no import succeeded
    if (!result.some(message => message.type === 'success')) {
      return result;
    }
    await this.keyring.store();
    await this.sync.commit();
    // by no primary key in the keyring set the first found private keys as primary for the keyring
    if (!this.hasPrimaryKey() && this.keyring.privateKeys.keys.length > 0) {
      await setKeyringAttr(this.id, {primary_key: this.keyring.privateKeys.keys[0].primaryKey.keyid.toHex().toUpperCase()});
    }
    return result;
  }

  importPublicKey(armored) {
    const result = [];
    const imported = openpgp.key.readArmored(armored);
    if (imported.err) {
      imported.err.forEach(error => {
        console.log('Error on key.readArmored', error);
        result.push({
          type: 'error',
          message: l10n('key_import_public_read', [error.message])
        });
      });
    }
    imported.keys.forEach(pubKey => {
      // check for existing keys
      checkKeyId(pubKey, this.keyring);
      const fingerprint = pubKey.primaryKey.getFingerprint();
      let key = this.keyring.getKeysForId(fingerprint);
      const keyid = pubKey.primaryKey.getKeyId().toHex().toUpperCase();
      if (key) {
        key = key[0];
        key.update(pubKey);
        result.push({
          type: 'success',
          message: l10n('key_import_public_update', [keyid, getUserId(pubKey)])
        });
        this.sync.add(fingerprint, keyringSync.UPDATE);
      } else {
        this.keyring.publicKeys.push(pubKey);
        result.push({
          type: 'success',
          message: l10n('key_import_public_success', [keyid, getUserId(pubKey)])
        });
        this.sync.add(fingerprint, keyringSync.INSERT);
      }
    });
    return result;
  }

  importPrivateKey(armored) {
    const result = [];
    const imported = openpgp.key.readArmored(armored);
    if (imported.err) {
      imported.err.forEach(error => {
        console.log('Error on key.readArmored', error);
        result.push({
          type: 'error',
          message: l10n('key_import_private_read', [error.message])
        });
      });
    }
    imported.keys.forEach(privKey => {
      // check for existing keys
      checkKeyId(privKey, this.keyring);
      const fingerprint = privKey.primaryKey.getFingerprint();
      let key = this.keyring.getKeysForId(fingerprint);
      const keyid = privKey.primaryKey.getKeyId().toHex().toUpperCase();
      if (key) {
        key = key[0];
        if (key.isPublic()) {
          privKey.update(key);
          this.keyring.publicKeys.removeForId(fingerprint);
          this.keyring.privateKeys.push(privKey);
          result.push({
            type: 'success',
            message: l10n('key_import_private_exists', [keyid, getUserId(privKey)])
          });
          this.sync.add(fingerprint, keyringSync.UPDATE);
        } else {
          key.update(privKey);
          result.push({
            type: 'success',
            message: l10n('key_import_private_update', [keyid, getUserId(privKey)])
          });
          this.sync.add(fingerprint, keyringSync.UPDATE);
        }
      } else {
        this.keyring.privateKeys.push(privKey);
        result.push({
          type: 'success',
          message: l10n('key_import_private_success', [keyid, getUserId(privKey)])
        });
        this.sync.add(fingerprint, keyringSync.INSERT);
      }
    });
    return result;
  }

  async removeKey(fingerprint, type) {
    let removedKey;
    fingerprint = fingerprint.toLowerCase();
    if (type === 'public') {
      removedKey = this.keyring.publicKeys.removeForId(fingerprint);
    } else if (type === 'private') {
      removedKey = this.keyring.privateKeys.removeForId(fingerprint);
    }
    if (!removedKey) {
      // key not found
      return;
    }
    if (type === 'private') {
      const primaryKey = this.getAttributes().primary_key;
      // Remove the key from the keyring attributes if primary
      if (primaryKey && primaryKey.toLowerCase() === removedKey.primaryKey.keyid.toHex()) {
        await setKeyringAttr(this.id, {primary_key: ''});
      }
    }
    this.sync.add(removedKey.primaryKey.getFingerprint(), keyringSync.DELETE);
    await this.keyring.store();
    await this.sync.commit();
  }

  /**
   * Generate a new PGP keypair and optionally upload the public key to the
   * key server.
   * @param {number}  options.numBits           The keysize in bits
   * @param {Array}   options.userIds           Email addresses and names
   * @param {string}  options.passphrase        To protect the private key on disk
   * @param {boolean} options.uploadPublicKey   If upload to key server is desired
   * @param {Number}  options.keyExpirationTime The number of seconds after the key creation time that the key expires
   * @param {Boolean} options.unlocked          Returned secret part of the generated key is unlocked
   * @yield {Object}                            The generated key pair
   */
  async generateKey({numBits, userIds, passphrase, uploadPublicKey, keyExpirationTime, unlocked = false}) {
    userIds = userIds.map(userId => {
      if (userId.fullName) {
        return (new goog.format.EmailAddress(userId.email, userId.fullName)).toString();
      } else {
        return `<${userId.email}>`;
      }
    });
    const newKey = await openpgp.generateKey({userIds, passphrase, numBits: parseInt(numBits), keyExpirationTime, unlocked});
    this.keyring.privateKeys.push(newKey.key);
    this.sync.add(newKey.key.primaryKey.getFingerprint(), keyringSync.INSERT);
    await this.keyring.store();
    await this.sync.commit();
    // by no primary key in the keyring set the generated key as primary
    if (!this.hasPrimaryKey()) {
      await setKeyringAttr(this.id, {primary_key: newKey.key.primaryKey.keyid.toHex().toUpperCase()});
    }
    // upload public key
    if (uploadPublicKey) {
      await keyServer.upload({publicKeyArmored: newKey.publicKeyArmored});
    }
    return newKey;
  }
}
