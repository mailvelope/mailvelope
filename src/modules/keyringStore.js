/**
 * Copyright (C) 2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from '../lib/lib-mvelo';
import openpgp from 'openpgp';

export function createKeyringStore(keyringId) {
  const keyringStore = new KeyringStore(keyringId);
  return keyringStore.load()
  .then(() => new Keyring(keyringStore));
}

class Keyring extends openpgp.Keyring {
  store() {
    return this.storeHandler.storePublic()
    .then(() => this.storeHandler.storePrivate());
  }
}

class KeyringStore {
  constructor(id) {
    this.id = id;
    this.publicKeys = [];
    this.privateKeys = [];
  }

  load() {
    return mvelo.storage.get(`mvelo.keyring.${this.id}.publicKeys`)
    .then(pubArmored => this.loadKeys(pubArmored, this.publicKeys))
    .then(() => mvelo.storage.get(`mvelo.keyring.${this.id}.privateKeys`))
    .then(privArmored => this.loadKeys(privArmored, this.privateKeys));
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

  storePublic() {
    return this.storeKeys(`mvelo.keyring.${this.id}.publicKeys`, this.publicKeys);
  }

  storePrivate() {
    return this.storeKeys(`mvelo.keyring.${this.id}.privateKeys`, this.privateKeys);
  }

  storeKeys(storageKey, keys) {
    return mvelo.storage.set(storageKey, keys.map(key => key.armor()));
  }

  remove() {
    return mvelo.storage.remove(`mvelo.keyring.${this.id}.publicKeys`)
    .then(() => mvelo.storage.remove(`mvelo.keyring.${this.id}.privateKeys`));
  }
}
