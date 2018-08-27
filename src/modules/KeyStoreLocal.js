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

  getDefaultKeyFpr() {
    let defaultKeyFpr = getKeyringAttr(this.id, 'default_key');
    if (defaultKeyFpr || defaultKeyFpr === '') {
      return defaultKeyFpr;
    }
    // if defaultKeyFpr is undefined check for legacy primary key setting and migrate to default key
    const primaryKeyId = getKeyringAttr(this.id, 'primary_key');
    if (primaryKeyId === '') {
      setKeyringAttr(this.id, {primary_key: undefined});
    }
    if (!primaryKeyId) {
      return '';
    }
    const primaryKey = this.privateKeys.getForId(primaryKeyId.toLowerCase());
    if (!primaryKey) {
      // primary key not found, delete primary key attribute
      setKeyringAttr(this.id, {primary_key: undefined});
      return '';
    }
    defaultKeyFpr = primaryKey.primaryKey.getFingerprint();
    this.setDefaultKey(defaultKeyFpr);
    return defaultKeyFpr;
  }

  async setDefaultKey(fpr) {
    await setKeyringAttr(this.id, {default_key: fpr});
  }

  async generateKey(options) {
    return openpgp.generateKey(options);
  }
}
