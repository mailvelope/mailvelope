/**
 * Copyright (C) 2018 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from '../lib/lib-mvelo';
import * as openpgp from 'openpgp';
import {getUserId, checkKeyId} from './key';
import KeyringBase from './KeyringBase';
import {setKeyringAttr} from './keyring';
const l10n = mvelo.l10n.getMessage;
import * as keyringSync from './keyringSync';

export default class KeyringLocal extends KeyringBase {
  constructor(keyringId, keyStore) {
    super(keyringId, keyStore);
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
          result = result.concat(this.importPublicKey(key.armored, this.keystore));
        } else if (key.type === 'private') {
          result = result.concat(this.importPrivateKey(key.armored, this.keystore));
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
    await this.keystore.store();
    await this.sync.commit();
    // by no primary key in the keyring set the first found private keys as primary for the keyring
    if (!this.hasPrimaryKey() && this.keystore.privateKeys.keys.length > 0) {
      await setKeyringAttr(this.id, {primary_key: this.keystore.privateKeys.keys[0].primaryKey.keyid.toHex().toUpperCase()});
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
      checkKeyId(pubKey, this.keystore);
      const fingerprint = pubKey.primaryKey.getFingerprint();
      let key = this.keystore.getKeysForId(fingerprint);
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
        this.keystore.publicKeys.push(pubKey);
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
      checkKeyId(privKey, this.keystore);
      const fingerprint = privKey.primaryKey.getFingerprint();
      let key = this.keystore.getKeysForId(fingerprint);
      const keyid = privKey.primaryKey.getKeyId().toHex().toUpperCase();
      if (key) {
        key = key[0];
        if (key.isPublic()) {
          privKey.update(key);
          this.keystore.publicKeys.removeForId(fingerprint);
          this.keystore.privateKeys.push(privKey);
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
        this.keystore.privateKeys.push(privKey);
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
    fingerprint = fingerprint.toLowerCase();
    const removedKey = super.removeKey(fingerprint, type);
    if (type === 'private') {
      const primaryKey = this.getAttributes().primary_key;
      // Remove the key from the keyring attributes if primary
      if (primaryKey && primaryKey.toLowerCase() === removedKey.primaryKey.keyid.toHex()) {
        await setKeyringAttr(this.id, {primary_key: ''});
      }
    }
    this.sync.add(removedKey.primaryKey.getFingerprint(), keyringSync.DELETE);
    await this.keystore.store();
    await this.sync.commit();
  }

  async generateKey(options) {
    const newKey = await super.generateKey(options);
    this.sync.add(newKey.key.primaryKey.getFingerprint(), keyringSync.INSERT);
    await this.keystore.store();
    await this.sync.commit();
    // by no primary key in the keyring set the generated key as primary
    if (!this.hasPrimaryKey()) {
      await setKeyringAttr(this.id, {primary_key: newKey.key.primaryKey.keyid.toHex().toUpperCase()});
    }
    return newKey;
  }
}
