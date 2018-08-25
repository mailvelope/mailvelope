/**
 * Copyright (C) 2018 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from '../lib/lib-mvelo';
import * as openpgp from 'openpgp';
import {KeyStoreBase} from './keyStore';
import {getKeyringAttr, setKeyringAttr} from './keyring';

export default class KeyStoreLocal extends KeyStoreBase {
  async load() {
    this.clear();
    const pubArmored = await mvelo.storage.get(`mvelo.keyring.${this.id}.publicKeys`);
    this.loadKeys(pubArmored, this.publicKeys);
    const privArmored = await mvelo.storage.get(`mvelo.keyring.${this.id}.privateKeys`);
    this.loadKeys(privArmored, this.privateKeys);
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

  getPrimaryKeyFpr() {
    let primaryKeyFpr = getKeyringAttr(this.id, 'primary_key');
    if (!primaryKeyFpr) {
      return '';
    }
    if (primaryKeyFpr.length === 16) {
      // migrate from keyId to fingerprint
      const primaryKey = this.privateKeys.getForId(primaryKeyFpr.toLowerCase());
      if (!primaryKey) {
        // primary key not found reset primary key attribute
        this.setPrimaryKey('');
        return;
      }
      primaryKeyFpr = primaryKey.primaryKey.getFingerprint();
      this.setPrimaryKey(primaryKeyFpr);
    }
    return primaryKeyFpr;
  }

  async setPrimaryKey(fpr) {
    await setKeyringAttr(this.id, {primary_key: fpr});
  }

  async generateKey(options) {
    return openpgp.generateKey(options);
  }
}
