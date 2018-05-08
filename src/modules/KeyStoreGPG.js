/**
 * Copyright (C) 2018 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import {gpgme} from '../lib/browser.runtime';
import * as openpgp from 'openpgp';
import {KeyStoreBase} from './keyStore';

export default class KeyStoreGPG extends KeyStoreBase {
  async load() {
    this.clear();
    const armored = await gpgme.keyring.getPublicKeys();
    const pubArmored = armored.filter(key => !key.secret).map(key => key.armor);
    this.loadKeys(pubArmored, this.publicKeys);
    const privArmored = armored.filter(key => key.secret).map(key => key.armor);
    privArmored.forEach(armor => {
      const privKey = readArmoredPrivate(armor);
      if (privKey) {
        this.privateKeys.push(privKey);
      }
    });
  }

  async store() {
    throw new Error('GPGME keyring does not implement store method');
  }

  async remove() {
    throw new Error('Delete of GPGME keyring not supported');
  }

  async importKeys(armoredKeys) {
    return gpgme.keyring.importKeys(armoredKeys);
  }

  addKey(armor, secret) {
    let key;
    if (secret) {
      key = readArmoredPrivate(armor);
      if (key) {
        this.privateKeys.push(key);
      }
    } else {
      this.loadKeys([armor], this.publicKeys);
    }
  }

  async removeKey(fingerprint, type) {
    await gpgme.keyring.deleteKey({fingerprint, secret: type === 'private'});
  }

  async generateKey({numBits, userIds, keyExpirationTime}) {
    const {publicKeyArmored} = await gpgme.generateKey({numBits, userIds, keyExpirationTime});
    return {key: readArmoredPrivate(publicKeyArmored)};
  }
}

class PrivateKeyGPG extends openpgp.key.Key {
  isPublic() {
    return false;
  }

  isPrivate() {
    return true;
  }
}

function readArmoredPrivate(armored) {
  try {
    const {data} = openpgp.armor.decode(armored);
    const packetlist = new openpgp.packet.List();
    packetlist.read(data);
    return new PrivateKeyGPG(packetlist);
  } catch (e) {
    console.log('Parsing armored key failed', e);
  }
}
