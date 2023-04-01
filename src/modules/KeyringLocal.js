/**
 * Copyright (C) 2018 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import {readKeys, revokeKey, reformatKey, UserIDPacket, encryptKey, decryptKey} from 'openpgp';
import {getUserInfo, checkKeyId, sanitizeKey, verifyUser, verifySubKey} from './key';
import KeyringBase from './KeyringBase';
import * as l10n from '../lib/l10n';
import {KEY_STATUS} from '../lib/constants';
import * as keyringSync from './keyringSync';
import * as openpgpjs from './openpgpjs';

export default class KeyringLocal extends KeyringBase {
  constructor(keyringId, keyStore) {
    super(keyringId, keyStore);
    this.sync = new keyringSync.KeyringSync(keyringId);
  }

  getPgpBackend() {
    return openpgpjs;
  }

  /**
   * Retrieve default key. If no default key set then take newest private key available.
   * @return {openpgp.key.Key}
   */
  async getDefaultKey() {
    let defaultKey;
    const defaultKeyFpr = await this.keystore.getDefaultKeyFpr();
    if (defaultKeyFpr) {
      defaultKey = this.keystore.privateKeys.getForId(defaultKeyFpr);
      if (!(defaultKey && await this.validateDefaultKey(defaultKey))) {
        // default key with this id does not exist or is invalid
        await this.setDefaultKey(''); // clear default key
        defaultKey = null;
      }
    }
    if (!defaultKey) {
      // get newest private key that is valid
      for (const key of this.keystore.privateKeys.keys) {
        if ((!defaultKey || defaultKey.keyPacket.created < key.keyPacket.created) && await this.validateDefaultKey(key)) {
          defaultKey = key;
        }
      }
      if (defaultKey) {
        await this.setDefaultKey(defaultKey.getFingerprint());
      }
    }
    return defaultKey ? defaultKey : null;
  }

  async getDefaultKeyFpr() {
    const defaultKey = await this.getDefaultKey();
    return defaultKey ? defaultKey.getFingerprint() : '';
  }

  /**
   * Import armored keys into the keyring
   * @param  {Object<armored: String, type: String>} armoredKeys - armored keys of type 'public' or 'private'
   * @return {Array<Object>} import result messages in the form {type, message}, type could be 'error' or 'success'
   */
  async importKeys(armoredKeys) {
    const result = [];
    // sort, public keys first
    armoredKeys = armoredKeys.sort((a, b) => b.type.localeCompare(a.type));
    // import
    for (const key of armoredKeys) {
      try {
        if (key.type === 'public') {
          result.push(...await this.importPublicKey(key.armored, this.keystore));
        } else if (key.type === 'private') {
          result.push(...await this.importPrivateKey(key.armored, this.keystore));
        }
      } catch (e) {
        console.log('Exception on key import:', e);
        result.push({
          type: 'error',
          message: l10n.get('key_import_unable', [e])
        });
      }
    }
    // exit if no import succeeded
    if (!result.some(message => message.type === 'success')) {
      return result;
    }
    try {
      await this.keystore.store();
      await this.sync.commit();
    } catch (e) {
      console.log('keystore.store() failed:', e);
      this.sync.clear();
      result.length = 0;
      result.push({type: 'error', message: e.message});
    }
    // if no default key in the keyring set, then first found private key will be set as default for the keyring
    if (!await this.hasDefaultKey() && this.keystore.privateKeys.keys.length > 0) {
      await this.setDefaultKey(this.keystore.privateKeys.keys[0].getFingerprint());
    }
    return result;
  }

  async importPublicKey(armored) {
    const result = [];
    let pubKeys;
    try {
      pubKeys = await readKeys({armoredKeys: armored});
    } catch (e) {
      console.log('Error parsing armored key:', e);
      result.push({
        type: 'error',
        message: l10n.get('key_import_public_read', [e.message])
      });
    }
    for (let pubKey of pubKeys) {
      // check for existing keys
      checkKeyId(pubKey, this.keystore);
      const fingerprint = pubKey.getFingerprint();
      const keyId = pubKey.getKeyID().toHex().toUpperCase();
      pubKey = await sanitizeKey(pubKey);
      if (!pubKey) {
        result.push({
          type: 'error',
          message: l10n.get('key_import_error_no_uid', [keyId])
        });
        continue;
      }
      const {userId} = await getUserInfo(pubKey);
      const key = this.keystore.getKeysForId(fingerprint);
      if (key) {
        await this.updateKey({srcKey: pubKey, destKey: key[0], store: false});
        result.push({
          type: 'success',
          message: l10n.get('key_import_public_update', [keyId, userId])
        });
      } else {
        this.keystore.publicKeys.push(pubKey);
        result.push({
          type: 'success',
          message: l10n.get('key_import_public_success', [keyId, userId])
        });
        this.sync.add(fingerprint, keyringSync.INSERT);
      }
    }
    return result;
  }

  async importPrivateKey(armored) {
    const result = [];
    let privKeys;
    try {
      privKeys = await readKeys({armoredKeys: armored});
    } catch (e) {
      console.log('Error parsing armored key:', e);
      result.push({
        type: 'error',
        message: l10n.get('key_import_private_read', [e.message])
      });
    }
    for (let privKey of privKeys) {
      // check for existing keys
      checkKeyId(privKey, this.keystore);
      const fingerprint = privKey.getFingerprint();
      const keyId = privKey.getKeyID().toHex().toUpperCase();
      privKey = await sanitizeKey(privKey);
      if (!privKey) {
        result.push({
          type: 'error',
          message: l10n.get('key_import_error_no_uid', [keyId])
        });
        continue;
      }
      const {userId} = await getUserInfo(privKey);
      let key = this.keystore.getKeysForId(fingerprint);
      if (key) {
        key = key[0];
        await this.updateKey({srcKey: privKey, destKey: key, store: false});
        result.push({
          type: 'success',
          message: l10n.get(key.isPrivate() ? 'key_import_private_update' : 'key_import_private_exists', [keyId, userId])
        });
      } else {
        this.keystore.privateKeys.push(privKey);
        result.push({
          type: 'success',
          message: l10n.get('key_import_private_success', [keyId, userId])
        });
        this.sync.add(fingerprint, keyringSync.INSERT);
      }
    }
    return result;
  }

  async removeKey(fingerprint, type) {
    const removedKey = super.removeKey(fingerprint, type);
    if (type === 'private') {
      const defaultKeyFpr = await this.keystore.getDefaultKeyFpr();
      // Remove the key from the keyring attributes if default
      if (defaultKeyFpr  === removedKey.getFingerprint()) {
        await this.setDefaultKey('');
      }
    }
    this.sync.add(removedKey.getFingerprint(), keyringSync.DELETE);
    await this.keystore.store();
    await this.sync.commit();
  }

  async revokeKey(unlockedKey) {
    const {privateKey: revokedKey} = await revokeKey({key: unlockedKey, format: 'object'});
    const defaultKeyFpr = await this.keystore.getDefaultKeyFpr();
    if (defaultKeyFpr  === revokedKey.getFingerprint()) {
      await this.setDefaultKey('');
    }
    await this.updateKey({srcKey: revokedKey});
  }

  async removeUser(privateKey, userId) {
    const index = privateKey.users.findIndex(({userID: {userID}}) => userID === userId);
    if (index !== -1) {
      privateKey.users.splice(index, 1);
    }
    const fingerprint = privateKey.getFingerprint();
    const defaultKeyFpr = await this.keystore.getDefaultKeyFpr();
    const isDefault = fingerprint === defaultKeyFpr;
    await this.removeKey(fingerprint, 'private');
    this.sync.add(fingerprint, keyringSync.INSERT);
    this.addKey(privateKey);
    await this.keystore.store();
    await this.sync.commit();
    if (isDefault) {
      await this.setDefaultKey(fingerprint);
    }
  }

  async revokeUser(unlockedKey, userId) {
    const user = unlockedKey.users.find(({userID: {userID}}) => userID === userId);
    const signingKey = await unlockedKey.getSigningKey();
    const revUser = await user.revoke(signingKey.keyPacket);
    const fingerprint = unlockedKey.getFingerprint();
    const originalKey = this.getPrivateKeyByFpr(fingerprint);
    await originalKey.users.find(({userID: {userID}}) => userID === userId).update(revUser);
    this.sync.add(fingerprint, keyringSync.UPDATE);
    await this.keystore.store();
    await this.sync.commit();
  }

  async addUser(unlockedKey, user) {
    const {user: {userID: primaryUserId}, selfCertification: primaryUserSelfCertification} = await unlockedKey.getPrimaryUser();
    const {privateKey: updatedKey} = await reformatKey({privateKey: unlockedKey, userIDs: [{name: primaryUserId.name, email: primaryUserId.email}, user], keyExpirationTime: primaryUserSelfCertification.keyExpirationTime, format: 'object'});
    const fingerprint = updatedKey.getFingerprint();
    this.sync.add(fingerprint, keyringSync.UPDATE);
    const originalKey = this.getPrivateKeyByFpr(fingerprint);
    originalKey.users.push(updatedKey.users[1]);
    if (primaryUserSelfCertification.isPrimaryUserID !== true) {
      // openpgp.reformatKey sets the first user ID as primary. We update the old user ID if primary flag is not yet set.
      await originalKey.users.find(({userID: {userID}}) => userID === primaryUserId.userID).update(updatedKey.users[0]);
    }
    await this.keystore.store();
    await this.sync.commit();
  }

  async setKeyExDate(unlockedKey, newExDate) {
    const keyExpirationTime = newExDate ? (newExDate.getTime() - unlockedKey.keyPacket.created.getTime()) / 1000 : 0;
    const userIDs = [];
    for (const user of unlockedKey.users) {
      if (await verifyUser(user) === KEY_STATUS.valid) {
        if (!this.isRFC2822UserId(user)) {
          throw new Error('Key contains a non-RFC2822 user ID. Change of expiration date not supported.');
        }
        userIDs.push({name: user.userID.name, email: user.userID.email});
      }
    }
    const filteredSubkeys = [];
    for (const subkey of unlockedKey.subkeys) {
      if (await verifySubKey(subkey) === KEY_STATUS.valid) {
        filteredSubkeys.push(subkey);
      }
    }
    unlockedKey.subkeys = filteredSubkeys;
    const {privateKey: reformatedKey} = await reformatKey({privateKey: unlockedKey, userIDs, keyExpirationTime, format: 'object'});
    await this.updateKey({srcKey: reformatedKey});
  }

  async updateKey({srcKey, destKey, store = true}) {
    const fingerprint = srcKey.getFingerprint();
    destKey ??= this.getPrivateKeyByFpr(fingerprint);
    if (!destKey) {
      throw new Error(`Key for update not found in store: ${fingerprint}`);
    }
    const updatedKey = await destKey.update(srcKey);
    super.removeKey(fingerprint, destKey.isPrivate() ? 'private' : 'public');
    this.addKey(updatedKey);
    this.sync.add(fingerprint, keyringSync.UPDATE);
    if (store) {
      await this.keystore.store();
      await this.sync.commit();
    }
  }

  isRFC2822UserId(user) {
    const {userID} = UserIDPacket.fromObject(user.userID);
    return userID === user.userID.userID;
  }

  async setKeyPwd(unlockedKey, passphrase) {
    const updatedKey = await encryptKey({privateKey: unlockedKey, passphrase});
    const fingerprint = updatedKey.getFingerprint();
    await super.removeKey(fingerprint, 'private');
    this.sync.add(fingerprint, keyringSync.UPDATE);
    this.addKey(updatedKey);
    await this.keystore.store();
    await this.sync.commit();
  }

  async generateKey(options) {
    const newKey = await super.generateKey(options);
    if (options.unlocked) {
      newKey.privateKey = await decryptKey({privateKey: newKey.privateKey, passphrase: options.passphrase});
    }
    this.sync.add(newKey.privateKey.getFingerprint(), keyringSync.INSERT);
    await this.keystore.store();
    await this.sync.commit();
    // if no default key in the keyring set the generated key as default
    if (!await this.hasDefaultKey()) {
      await this.setDefaultKey(newKey.privateKey.getFingerprint());
    }
    return newKey;
  }
}
