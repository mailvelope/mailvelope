/**
 * Copyright (C) 2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from '../lib/lib-mvelo';
const l10n = mvelo.l10n.getMessage;
import KeyringBase from './KeyringBase';

export default class KeyringGPG extends KeyringBase {
  async importKeys(armoredKeys) {
    armoredKeys = armoredKeys.map(key => key.armored);
    const importResult = await this.keystore.importKeys(armoredKeys);
    const importPromises = importResult.map(async imported => {
      if (imported.error) {
        console.log('Error on key import in GnuPG', imported.error);
        return {type: 'error', message: l10n(imported.key.secret ? 'key_import_private_read' : 'key_import_public_read', [imported.error.message])};
      }
      // import successful, remove existing keys with this fingerprint
      this.keystore.removeKeysForId(imported.key.fingerprint);
      this.keystore.addKey(imported.key.armor);
      // TODO: success message
    });
    return Promise.all(importPromises);
  }

  async removeKey(fingerprint, type) {
    fingerprint = fingerprint.toLowerCase();
    await this.keystore.removeKey(fingerprint, type);
    super.removeKey(fingerprint, type);
  }
}
