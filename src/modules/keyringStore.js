/**
 * Copyright (C) 2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from '../lib/lib-mvelo';
import * as openpgp from 'openpgp';

export async function createKeyringStore(keyringId) {
  const keyringStore = new KeyringStore(keyringId);
  await keyringStore.load();
  return new Keyring(keyringStore);
}

class Keyring extends openpgp.Keyring {
  async store() {
    await this.storeHandler.storePublic();
    await this.storeHandler.storePrivate();
  }
}

class KeyringStoreBase {
  constructor(id) {
    this.id = id;
    this.publicKeys = null;
    this.privateKeys = null;
  }

  clear() {
    this.publicKeys = [];
    this.privateKeys = [];
  }

  loadKeys(keysArmored, keyArray) {
    if (!keysArmored) {
      return;
    }
    keysArmored.forEach(keyArmored => {
      const key = openpgp.key.readArmored(keyArmored);
      if (!key.err) {
        keyArray.push(key.keys[0]);
      } else {
        console.log('Error reading key from storage:', key.err);
      }
    });
  }

  loadPublic() {
    return this.publicKeys;
  }

  loadPrivate() {
    return this.privateKeys;
  }
}

class KeyringStore extends KeyringStoreBase {
  async load() {
    this.clear();
    const pubArmored = await mvelo.storage.get(`mvelo.keyring.${this.id}.publicKeys`);
    this.loadKeys(pubArmored, this.publicKeys);
    const privArmored = await mvelo.storage.get(`mvelo.keyring.${this.id}.privateKeys`);
    this.loadKeys(privArmored, this.privateKeys);
  }

  async storePublic() {
    await this.storeKeys(`mvelo.keyring.${this.id}.publicKeys`, this.publicKeys);
  }

  async storePrivate() {
    await this.storeKeys(`mvelo.keyring.${this.id}.privateKeys`, this.privateKeys);
  }

  async storeKeys(storageKey, keys) {
    await mvelo.storage.set(storageKey, keys.map(key => key.armor()));
  }

  async remove() {
    await mvelo.storage.remove(`mvelo.keyring.${this.id}.publicKeys`);
    await mvelo.storage.remove(`mvelo.keyring.${this.id}.privateKeys`);
  }
}
