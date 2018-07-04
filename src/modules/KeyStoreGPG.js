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
    const gpgKeys = await gpgme.Keyring.getKeys();
    const pubArmored = gpgKeys.filter(key => !key.hasSecret).map(key => key.armored);
    this.loadKeys(pubArmored, this.publicKeys);
    const privArmored = gpgKeys.filter(key => key.hasSecret).map(key => key.armored);
    privArmored.forEach(armor => {
      const privKey = readArmoredPrivate(armor);
      if (privKey) {
        this.privateKeys.push(privKey);
      }
    });
    this.primaryKeyFpr = await gpgme.Keyring.getDefaultKey();
  }

  async store() {
    throw new Error('GPGME keyring does not implement store method');
  }

  async remove() {
    throw new Error('Delete of GPGME keyring not supported');
  }

  getPrimaryKeyId() {
    return this.primaryKeyFpr.substr(12, 8);
  }

  async importKeys(armoredKeys) {
    return gpgme.Keyring.importKey(armoredKeys);
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
    await gpgme.Keyring.deleteKey({fingerprint, secret: type === 'private'});
  }

  async generateKey({numBits, userIds, keyExpirationTime}) {
    const {publicKeyArmored} = await gpgme.Keyring.generateKey({numBits, userIds, keyExpirationTime});
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
