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

  getForAddress(email) {
    const result = [];
    result.push(...this.publicKeys.getForAddress(email));
    result.push(...this.privateKeys.getForAddress(email));
    return result;
  }
}

class StoreHandler {
  async loadPublic() {
    return [];
  }

  async loadPrivate() {
    return [];
  }
}
