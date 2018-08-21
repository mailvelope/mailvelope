/**
 * Copyright (C) 2018 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from '../lib/lib-mvelo';
import {gpgme} from '../lib/browser.runtime';
import * as openpgp from 'openpgp';
import {KeyStoreBase} from './keyStore';

export default class KeyStoreGPG extends KeyStoreBase {
  async load() {
    this.clear();
    const t0 = performance.now();
    let {armored, secret_fprs} = await gpgme.Keyring.getKeysArmored(null, true);
    secret_fprs = secret_fprs.map(fpr => fpr.toLowerCase());
    const t1 = performance.now();
    console.log('getKeysArmored', t1 - t0);
    const {keys, err} = openpgp.key.readArmored(armored);
    const t2 = performance.now();
    console.log('readArmored', t2 - t1);
    console.log('keys', keys.length, secret_fprs, err);
    for (const key of keys) {
      if (secret_fprs.includes(key.primaryKey.getFingerprint())) {
        const privKey = new PrivateKeyGPG(key.toPacketlist());
        this.privateKeys.push(privKey);
      } else {
        this.publicKeys.push(key);
      }
    }
    const t3 = performance.now();
    console.log('create private keys', t3 - t2);
    const defaultKey = await gpgme.Keyring.getDefaultKey();
    const t4 = performance.now();
    console.log('getDefaultKey', t4 - t3);
    this.primaryKeyFingerprint = defaultKey.fingerprint.toLowerCase();
    const t5 = performance.now();
    console.log('getFingerprint', t5 - t4, this.primaryKeyFingerprint);
  }

  async store() {
    throw new Error('GPGME keyring does not implement store method');
  }

  async remove() {
    throw new Error('Delete of GPGME keyring not supported');
  }

  getPrimaryKeyFpr() {
    return this.primaryKeyFingerprint;
  }

  setPrimaryKey() {
    throw new mvelo.Error('Setting of primary key not supported in GPG keyring', 'GPG_NOT_SUPPORTED');
  }

  async importKeys(armoredKeys) {
    return gpgme.Keyring.importKey(armoredKeys, true);
  }

  async addPublicKeys(fprs) {
    const {armored} = await gpgme.Keyring.getKeysArmored(fprs);
    const {keys} = openpgp.key.readArmored(armored);
    this.publicKeys.keys.push(...keys);
  }

  async removeKey(fingerprint) {
    await gpgme.Keyring.deleteKey(fingerprint);
  }

  async generateKey({numBits, userIds, keyExpirationTime}) {
    const [gpgKey] = await gpgme.Keyring.generateKey(userIds[0], `rsa${numBits}`, keyExpirationTime);
    const publicKeyArmored = await gpgKey.getArmor();
    return {key: readArmoredPrivate(publicKeyArmored), publicKeyArmored};
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
