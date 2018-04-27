/**
 * Copyright (C) 2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import * as openpgp from 'openpgp';

export class KeyStoreBase extends openpgp.Keyring {
  constructor(keyringId) {
    super(new StoreHandler());
    this.id = keyringId;
  }

  loadKeys(keysArmored, keyArray = []) {
    if (!keysArmored) {
      return;
    }
    keysArmored.forEach(keyArmored => {
      const key = openpgp.key.readArmored(keyArmored);
      if (!key.err) {
        keyArray.push(key.keys[0]);
      } else {
        console.log('Error reading key:', key.err);
      }
    });
    return keyArray;
  }
}

class StoreHandler {
  loadPublic() {
    return [];
  }

  loadPrivate() {
    return [];
  }
}
