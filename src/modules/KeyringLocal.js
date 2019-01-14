/**
 * Copyright (C) 2018 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import * as openpgp from 'openpgp';
import {getUserId, checkKeyId} from './key';
import KeyringBase from './KeyringBase';
import * as l10n from '../lib/l10n';
import * as keyringSync from './keyringSync';
import * as openpgpjs from './openpgpjs';

export default class KeyringLocal extends KeyringBase {
  constructor(keyringId, keyStore) {
    super(keyringId, keyStore);
    this.sync = new keyringSync.KeyringSync(keyringId);
  }

  getPgpBackend() {
    return openpgpjs;
  }

  /**
   * Retrieve default key. If no default key set then take newest private key available.
   * @return {openpgp.key.Key}
   */
  async getDefaultKey() {
    let defaultKey;
    const defaultKeyFpr = await this.keystore.getDefaultKeyFpr();
    if (defaultKeyFpr) {
      defaultKey = this.keystore.privateKeys.getForId(defaultKeyFpr);
      if (!(defaultKey && await this.validateDefaultKey(defaultKey))) {
        // default key with this id does not exist or is invalid
        await this.setDefaultKey(''); // clear default key
        defaultKey = null;
      }
    }
    if (!defaultKey) {
      // get newest private key that is valid
      for (const key of this.keystore.privateKeys.keys) {
        if ((!defaultKey || defaultKey.primaryKey.created < key.primaryKey.created) && await this.validateDefaultKey(key)) {
          defaultKey = key;
        }
      }
      if (defaultKey) {
        await this.setDefaultKey(defaultKey.primaryKey.getFingerprint());
      }
    }
    return defaultKey ? defaultKey : null;
  }

  async getDefaultKeyFpr() {
    const defaultKey = await this.getDefaultKey();
    return defaultKey ? defaultKey.primaryKey.getFingerprint() : '';
  }

  /**
   * Import armored keys into the keyring
   * @param  {Object<armored: String, type: String>} armoredKeys - armored keys of type 'public' or 'private'
   * @return {Array<Object>} import result messages in the form {type, message}, type could be 'error' or 'success'
   */
  async importKeys(armoredKeys) {
    const result = [];
    // sort, public keys first
    armoredKeys = armoredKeys.sort((a, b) => b.type.localeCompare(a.type));
    // import
    await Promise.all(armoredKeys.map(async key => {
      try {
        if (key.type === 'public') {
          result.push(...await this.importPublicKey(key.armored, this.keystore));
        } else if (key.type === 'private') {
          result.push(...await this.importPrivateKey(key.armored, this.keystore));
        }
      } catch (e) {
        result.push({
          type: 'error',
          message: l10n.get('key_import_unable', [e])
        });
      }
    }));
    // exit if no import succeeded
    if (!result.some(message => message.type === 'success')) {
      return result;
    }
    await this.keystore.store();
    await this.sync.commit();
    // if no default key in the keyring set, then first found private key will be set as default for the keyring
    if (!await this.hasDefaultKey() && this.keystore.privateKeys.keys.length > 0) {
      await this.setDefaultKey(this.keystore.privateKeys.keys[0].primaryKey.getFingerprint());
    }
    return result;
  }

  async importPublicKey(armored) {
    const result = [];
    const imported = await openpgp.key.readArmored(armored);
    if (imported.err) {
      imported.err.forEach(error => {
        console.log('Error on key.readArmored', error);
        result.push({
          type: 'error',
          message: l10n.get('key_import_public_read', [error.message])
        });
      });
    }
    await Promise.all(imported.keys.map(async pubKey => {
      // check for existing keys
      checkKeyId(pubKey, this.keystore);
      const fingerprint = pubKey.primaryKey.getFingerprint();
      let key = this.keystore.getKeysForId(fingerprint);
      const keyId = pubKey.primaryKey.getKeyId().toHex().toUpperCase();
      if (key) {
        key = key[0];
        await key.update(pubKey);
        result.push({
          type: 'success',
          message: l10n.get('key_import_public_update', [keyId, await getUserId(pubKey)])
        });
        this.sync.add(fingerprint, keyringSync.UPDATE);
      } else {
        this.keystore.publicKeys.push(pubKey);
        result.push({
          type: 'success',
          message: l10n.get('key_import_public_success', [keyId, await getUserId(pubKey)])
        });
        this.sync.add(fingerprint, keyringSync.INSERT);
      }
    }));
    return result;
  }

  async importPrivateKey(armored) {
    const result = [];
    const imported = await openpgp.key.readArmored(armored);
    if (imported.err) {
      imported.err.forEach(error => {
        console.log('Error on key.readArmored', error);
        result.push({
          type: 'error',
          message: l10n.get('key_import_private_read', [error.message])
        });
      });
    }
    await Promise.all(imported.keys.map(async privKey => {
      // check for existing keys
      checkKeyId(privKey, this.keystore);
      const fingerprint = privKey.primaryKey.getFingerprint();
      let key = this.keystore.getKeysForId(fingerprint);
      const keyId = privKey.primaryKey.getKeyId().toHex().toUpperCase();
      if (key) {
        key = key[0];
        if (key.isPublic()) {
          await privKey.update(key);
          this.keystore.publicKeys.removeForId(fingerprint);
          this.keystore.privateKeys.push(privKey);
          result.push({
            type: 'success',
            message: l10n.get('key_import_private_exists', [keyId, await getUserId(privKey)])
          });
          this.sync.add(fingerprint, keyringSync.UPDATE);
        } else {
          await key.update(privKey);
          result.push({
            type: 'success',
            message: l10n.get('key_import_private_update', [keyId, await getUserId(privKey)])
          });
          this.sync.add(fingerprint, keyringSync.UPDATE);
        }
      } else {
        this.keystore.privateKeys.push(privKey);
        result.push({
          type: 'success',
          message: l10n.get('key_import_private_success', [keyId, await getUserId(privKey)])
        });
        this.sync.add(fingerprint, keyringSync.INSERT);
      }
    }));
    return result;
  }

  async removeKey(fingerprint, type) {
    const removedKey = super.removeKey(fingerprint, type);
    if (type === 'private') {
      const defaultKeyFpr = await this.keystore.getDefaultKeyFpr();
      // Remove the key from the keyring attributes if default
      if (defaultKeyFpr  === removedKey.primaryKey.getFingerprint()) {
        await this.setDefaultKey('');
      }
    }
    this.sync.add(removedKey.primaryKey.getFingerprint(), keyringSync.DELETE);
    await this.keystore.store();
    await this.sync.commit();
  }

  async generateKey(options) {
    const newKey = await super.generateKey(options);
    if (options.unlocked) {
      const unlockedKey = await openpgp.decryptKey({privateKey: newKey.key, passphrase: options.passphrase});
      newKey.key = unlockedKey.key;
    }
    this.sync.add(newKey.key.primaryKey.getFingerprint(), keyringSync.INSERT);
    await this.keystore.store();
    await this.sync.commit();
    // if no default key in the keyring set the generated key as default
    if (!await this.hasDefaultKey()) {
      await this.setDefaultKey(newKey.key.primaryKey.getFingerprint());
    }
    return newKey;
  }
}
