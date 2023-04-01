/**
 * Copyright (C) 2018-2022 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import {MvError} from '../lib/util';
import {gpgme} from '../lib/browser.runtime';
import {readKey, readKeys, PublicKey, UserIDPacket} from 'openpgp';
import {KeyStoreBase} from './keyStore';

export default class KeyStoreGPG extends KeyStoreBase {
  async load() {
    let {armored, secret_fprs} = await gpgme.Keyring.getKeysArmored({with_secret_fpr: true});
    secret_fprs = secret_fprs.map(fpr => fpr.toLowerCase());
    let keys = [];
    try {
      keys = await readKeys({armoredKeys: armored});
    } catch (e) {
      console.log('Error parsing armored GnuPG key:', e);
    }
    for (const key of keys) {
      if (secret_fprs.includes(key.getFingerprint())) {
        const privKey = new PrivateKeyGPG(key.toPacketList());
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
    try {
      const keys = await readKeys({armoredKeys: armored});
      this.publicKeys.keys.push(...keys);
    } catch (e) {
      console.log('Error parsing armored GnuPG key:', e);
    }
  }

  async removeKey(fingerprint) {
    await gpgme.Keyring.deleteKey(fingerprint);
  }

  async generateKey({keyAlgo, userIds, keyExpirationTime}) {
    const {userID} = UserIDPacket.fromObject(userIds[0]);
    const [gpgKey] = await gpgme.Keyring.generateKey({userId: userID, algo: keyAlgo, expires: keyExpirationTime});
    const publicKeyArmored = await gpgKey.getArmor();
    return readArmoredPrivate(publicKeyArmored);
  }
}

class PrivateKeyGPG extends PublicKey {
  isPrivate() {
    return true;
  }
}

async function readArmoredPrivate(armored) {
  try {
    const publicKey = await readKey({armoredKey: armored});
    const privateKey = new PrivateKeyGPG(publicKey.toPacketList());
    return {publicKey, privateKey};
  } catch (e) {
    console.log('Parsing armored key from GnuPG failed', e);
  }
}
