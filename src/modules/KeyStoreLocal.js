/**
 * Copyright (C) 2018 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from '../lib/lib-mvelo';
import {readKey, generateKey} from 'openpgp';
import {KeyStoreBase} from './keyStore';
import {getKeyringAttr, setKeyringAttr} from './keyring';

export default class KeyStoreLocal extends KeyStoreBase {
  async load() {
    const pubArmored = await mvelo.storage.get(`mvelo.keyring.${this.id}.publicKeys`);
    await this.loadKeys(pubArmored, this.publicKeys);
    const privArmored = await mvelo.storage.get(`mvelo.keyring.${this.id}.privateKeys`);
    await this.loadKeys(privArmored, this.privateKeys);
  }

  async loadKeys(keysArmored, keyArray = []) {
    if (!keysArmored) {
      return;
    }
    for (const armoredKey of keysArmored) {
      try {
        const key = await readKey({armoredKey});
        keyArray.push(key);
      } catch (e) {
        console.log('Error parsing armored PGP key:', e);
      }
    }
    return keyArray;
  }

  async store() {
    await this.storePublic();
    await this.storePrivate();
  }

  async storePublic() {
    await this.storeKeys(`mvelo.keyring.${this.id}.publicKeys`, this.publicKeys.keys);
  }

  async storePrivate() {
    await this.storeKeys(`mvelo.keyring.${this.id}.privateKeys`, this.privateKeys.keys);
  }

  async storeKeys(storageKey, keys) {
    await mvelo.storage.set(storageKey, keys.map(key => key.armor()));
  }

  async remove() {
    await mvelo.storage.remove(`mvelo.keyring.${this.id}.publicKeys`);
    await mvelo.storage.remove(`mvelo.keyring.${this.id}.privateKeys`);
  }

  async getDefaultKeyFpr() {
    let defaultKeyFpr = getKeyringAttr(this.id, 'default_key');
    if (defaultKeyFpr || defaultKeyFpr === '') {
      return defaultKeyFpr;
    }
    // if defaultKeyFpr is undefined check for legacy primary key setting and migrate to default key
    const primaryKeyId = getKeyringAttr(this.id, 'primary_key');
    if (primaryKeyId === '') {
      await setKeyringAttr(this.id, {primary_key: undefined});
    }
    if (!primaryKeyId) {
      return '';
    }
    const primaryKey = this.privateKeys.getForId(primaryKeyId.toLowerCase());
    if (!primaryKey) {
      // primary key not found, delete primary key attribute
      await setKeyringAttr(this.id, {primary_key: undefined});
      return '';
    }
    defaultKeyFpr = primaryKey.getFingerprint();
    await this.setDefaultKey(defaultKeyFpr);
    return defaultKeyFpr;
  }

  async setDefaultKey(fpr) {
    await setKeyringAttr(this.id, {default_key: fpr});
  }

  async generateKey({keyAlgo, userIds, passphrase, numBits, keyExpirationTime}) {
    const curve = keyAlgo === 'ecc' ? 'curve25519' : undefined;
    return generateKey({userIDs: userIds, passphrase, type: keyAlgo, rsaBits: numBits, curve, keyExpirationTime, format: 'object'});
  }
}
