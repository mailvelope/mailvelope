/**
 * Copyright (C) 2018 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import {MvError} from '../lib/util';
import {gpgme} from '../lib/browser.runtime';
import * as openpgp from 'openpgp';
import {KeyStoreBase} from './keyStore';

export default class KeyStoreGPG extends KeyStoreBase {
  async load() {
    await super.load();
    let {armored, secret_fprs} = await gpgme.Keyring.getKeysArmored({with_secret_fpr: true});
    secret_fprs = secret_fprs.map(fpr => fpr.toLowerCase());
    const {keys, err} = await openpgp.key.readArmored(armored);
    if (err) {
      console.log('Error parsing armored GnuPG key:', err);
    }
    for (const key of keys) {
      if (secret_fprs.includes(key.primaryKey.getFingerprint())) {
        const privKey = new PrivateKeyGPG(key.toPacketlist());
        this.privateKeys.push(privKey);
      } else {
        this.publicKeys.push(key);
      }
    }
    try {
      const defaultKey = await gpgme.Keyring.getDefaultKey();
      this.defaultKeyFpr = defaultKey.fingerprint.toLowerCase();
    } catch (e) {
      this.defaultKeyFpr = '';
    }
  }

  async store() {
    throw new Error('GPGME keyring does not implement store method');
  }

  async remove() {
    throw new Error('Delete of GPGME keyring not supported');
  }

  async getDefaultKeyFpr() {
    return this.defaultKeyFpr;
  }

  setDefaultKey() {
    throw new MvError('Setting of default key not supported in GPG keyring', 'GPG_NOT_SUPPORTED');
  }

  async importKeys(armoredKeys) {
    return gpgme.Keyring.importKey(armoredKeys, true);
  }

  async addPublicKeys(fprs) {
    const {armored} = await gpgme.Keyring.getKeysArmored({pattern: fprs});
    const {keys} = await openpgp.key.readArmored(armored);
    this.publicKeys.keys.push(...keys);
  }

  async removeKey(fingerprint) {
    await gpgme.Keyring.deleteKey(fingerprint);
  }

  async generateKey({keyAlgo, userIds, keyExpirationTime}) {
    const [gpgKey] = await gpgme.Keyring.generateKey({userId: userIds[0], algo: keyAlgo, expires: keyExpirationTime});
    const publicKeyArmored = await gpgKey.getArmor();
    return {key: await readArmoredPrivate(publicKeyArmored), publicKeyArmored};
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

async function readArmoredPrivate(armored) {
  try {
    const {data} = await openpgp.armor.decode(armored);
    const packetlist = new openpgp.packet.List();
    await packetlist.read(data);
    return new PrivateKeyGPG(packetlist);
  } catch (e) {
    console.log('Parsing armored key failed', e);
  }
}
