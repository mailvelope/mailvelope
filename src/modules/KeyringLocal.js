/**
 * Copyright (C) 2018 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import * as openpgp from 'openpgp';
import {getUserInfo, checkKeyId, sanitizeKey} from './key';
import KeyringBase from './KeyringBase';
import * as l10n from '../lib/l10n';
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
        if ((!defaultKey || defaultKey.primaryKey.created < key.primaryKey.created) && await this.validateDefaultKey(key)) {
          defaultKey = key;
        }
      }
      if (defaultKey) {
        await this.setDefaultKey(defaultKey.primaryKey.getFingerprint());
      }
    }
    return defaultKey ? defaultKey : null;
  }

  async getDefaultKeyFpr() {
    const defaultKey = await this.getDefaultKey();
    return defaultKey ? defaultKey.primaryKey.getFingerprint() : '';
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
      await this.setDefaultKey(this.keystore.privateKeys.keys[0].primaryKey.getFingerprint());
    }
    return result;
  }

  async importPublicKey(armored) {
    const result = [];
    const imported = await openpgp.key.readArmored(armored);
    if (imported.err) {
      for (const error of imported.err) {
        console.log('Error on key.readArmored', error);
        result.push({
          type: 'error',
          message: l10n.get('key_import_public_read', [error.message])
        });
      }
    }
    for (let pubKey of imported.keys) {
      // check for existing keys
      checkKeyId(pubKey, this.keystore);
      const fingerprint = pubKey.primaryKey.getFingerprint();
      let key = this.keystore.getKeysForId(fingerprint);
      const keyId = pubKey.primaryKey.getKeyId().toHex().toUpperCase();
      pubKey = await sanitizeKey(pubKey);
      if (!pubKey) {
        return result.push({
          type: 'error',
          message: l10n.get('key_import_error_no_uid', [keyId])
        });
      }
      if (key) {
        key = key[0];
        await key.update(pubKey);
        const {userId} = await getUserInfo(pubKey);
        result.push({
          type: 'success',
          message: l10n.get('key_import_public_update', [keyId, userId])
        });
        this.sync.add(fingerprint, keyringSync.UPDATE);
      } else {
        this.keystore.publicKeys.push(pubKey);
        const {userId} = await getUserInfo(pubKey);
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
    const imported = await openpgp.key.readArmored(armored);
    if (imported.err) {
      for (const error of imported.err) {
        console.log('Error on key.readArmored', error);
        result.push({
          type: 'error',
          message: l10n.get('key_import_private_read', [error.message])
        });
      }
    }
    for (let privKey of imported.keys) {
      // check for existing keys
      checkKeyId(privKey, this.keystore);
      const fingerprint = privKey.primaryKey.getFingerprint();
      let key = this.keystore.getKeysForId(fingerprint);
      const keyId = privKey.primaryKey.getKeyId().toHex().toUpperCase();
      privKey = await sanitizeKey(privKey);
      if (!privKey) {
        return result.push({
          type: 'error',
          message: l10n.get('key_import_error_no_uid', [keyId])
        });
      }
      if (key) {
        key = key[0];
        if (key.isPublic()) {
          await privKey.update(key);
          const {userId} = await getUserInfo(privKey);
          this.keystore.publicKeys.removeForId(fingerprint);
          this.keystore.privateKeys.push(privKey);
          result.push({
            type: 'success',
            message: l10n.get('key_import_private_exists', [keyId, userId])
          });
          this.sync.add(fingerprint, keyringSync.UPDATE);
        } else {
          await key.update(privKey);
          const {userId} = await getUserInfo(privKey);
          result.push({
            type: 'success',
            message: l10n.get('key_import_private_update', [keyId, userId])
          });
          this.sync.add(fingerprint, keyringSync.UPDATE);
        }
      } else {
        this.keystore.privateKeys.push(privKey);
        const {userId} = await getUserInfo(privKey);
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
      if (defaultKeyFpr  === removedKey.primaryKey.getFingerprint()) {
        await this.setDefaultKey('');
      }
    }
    this.sync.add(removedKey.primaryKey.getFingerprint(), keyringSync.DELETE);
    await this.keystore.store();
    await this.sync.commit();
  }

  async revokeKey(unlockedKey) {
    const {privateKey: revokedKey} = await openpgp.revokeKey({key: unlockedKey});
    const defaultKeyFpr = await this.keystore.getDefaultKeyFpr();
    if (defaultKeyFpr  === revokedKey.primaryKey.getFingerprint()) {
      await this.setDefaultKey('');
    }
    this.sync.add(revokedKey.primaryKey.getFingerprint(), keyringSync.UPDATE);
    const originalKey = this.getPrivateKeyByFpr(revokedKey.primaryKey.getFingerprint());
    await originalKey.update(revokedKey);
    await this.keystore.store();
    await this.sync.commit();
    return revokedKey;
  }

  async removeUser(privateKey, userId) {
    const index = privateKey.users.findIndex(({userId: {userid}}) => userid === userId);
    if (index !== -1) {
      privateKey.users.splice(index, 1);
    }
    const fingerprint = privateKey.primaryKey.getFingerprint();
    const defaultKeyFpr = await this.keystore.getDefaultKeyFpr();
    const isDefault = fingerprint === defaultKeyFpr;
    this.sync.add(fingerprint, keyringSync.DELETE);
    this.removeKey(fingerprint, 'private');
    this.sync.add(fingerprint, keyringSync.INSERT);
    this.addKey(privateKey);
    await this.keystore.store();
    await this.sync.commit();
    if (isDefault) {
      await this.setDefaultKey(fingerprint);
    }
    return privateKey;
  }

  async revokeUser(unlockedKey, userId) {
    const user = unlockedKey.users.find(({userId: {userid}}) => userid === userId);
    const dataToSign = {
      userId: user.userId,
      userAttribute: user.userAttribute,
      key: unlockedKey.primaryKey
    };
    const signingKey = await unlockedKey.getSigningKey();
    const date = new Date();
    const revocationSignature =  await openpgp.key.createSignaturePacket(dataToSign, null, signingKey.keyPacket, {
      signatureType: openpgp.enums.signature.cert_revocation,
      reasonForRevocationFlag: openpgp.enums.reasonForRevocation.no_reason,
      reasonForRevocationString: ''
    }, date);
    revocationSignature.signature = await openpgp.stream.readToEnd(revocationSignature.signature);
    user.revocationSignatures.push(revocationSignature);
    const fingerprint = unlockedKey.primaryKey.getFingerprint();
    const originalKey = this.getPrivateKeyByFpr(fingerprint);
    await originalKey.users.find(({userId: {userid}}) => userid === userId).update(user, unlockedKey.primaryKey);
    this.sync.add(fingerprint, keyringSync.UPDATE);
    await this.keystore.store();
    await this.sync.commit();
    return originalKey;
  }

  async addUser(unlockedKey, user) {
    const {user: {userId: {userid: primaryUserId}}, selfCertification: primaryUserSelfCertification} = await unlockedKey.getPrimaryUser();
    const {key: updatedKey} = await openpgp.reformatKey({privateKey: unlockedKey, userIds: [primaryUserId, user], keyExpirationTime: primaryUserSelfCertification.keyExpirationTime});
    const fingerprint = updatedKey.primaryKey.getFingerprint();
    this.sync.add(fingerprint, keyringSync.UPDATE);
    const originalKey = this.getPrivateKeyByFpr(fingerprint);
    originalKey.users.push(updatedKey.users[1]);
    if (primaryUserSelfCertification.isPrimaryUserID !== true) {
      // openpgp.reformatKey sets the first user ID as primary. We update the old user ID if primary flag is not yet set.
      await originalKey.users.find(({userId: {userid}}) => userid === primaryUserId).update(updatedKey.users[0], unlockedKey.primaryKey);
    }
    await this.keystore.store();
    await this.sync.commit();
    return originalKey;
  }

  async setKeyExDate(unlockedKey, newExDate) {
    const keyExpirationTime = newExDate ? (newExDate.getTime() - unlockedKey.primaryKey.created.getTime()) / 1000 : 0;
    const filteredUserIds = [];
    for (const user of unlockedKey.users) {
      if (await user.verify(unlockedKey.primaryKey) === openpgp.enums.keyStatus.valid) {
        if (!this.isRFC2822UserId(user)) {
          throw new Error('Key contains a non-RFC2822 user ID. Change of expiration date not supported.');
        }
        filteredUserIds.push(user);
      }
    }
    const filteredSubkeys = [];
    for (const subkey of unlockedKey.subKeys) {
      if (await subkey.verify(unlockedKey.primaryKey) === openpgp.enums.keyStatus.valid) {
        filteredSubkeys.push(subkey);
      }
    }
    unlockedKey.subKeys = filteredSubkeys;
    const {key: updatedKey} = await openpgp.reformatKey({privateKey: unlockedKey, userIds: filteredUserIds.map(({userId: {userid}}) => userid), keyExpirationTime});
    const fingerprint = updatedKey.primaryKey.getFingerprint();
    this.sync.add(fingerprint, keyringSync.UPDATE);
    const originalKey = this.getPrivateKeyByFpr(fingerprint);
    await originalKey.update(updatedKey);
    await this.keystore.store();
    await this.sync.commit();
    return originalKey;
  }

  isRFC2822UserId(user) {
    const userId = openpgp.util.parseUserId(user.userId.userid);
    return openpgp.util.formatUserId(userId) === user.userId.userid;
  }

  async setKeyPwd(unlockedKey, passphrase) {
    await unlockedKey.encrypt(passphrase);
    const updatedKey = unlockedKey;
    const fingerprint = updatedKey.primaryKey.getFingerprint();
    const defaultKeyFpr = await this.keystore.getDefaultKeyFpr();
    const isDefault = fingerprint === defaultKeyFpr;
    this.sync.add(fingerprint, keyringSync.DELETE);
    this.removeKey(fingerprint, 'private');
    this.sync.add(fingerprint, keyringSync.INSERT);
    this.addKey(updatedKey);
    await this.keystore.store();
    await this.sync.commit();
    if (isDefault) {
      await this.setDefaultKey(fingerprint);
    }
    return updatedKey;
  }

  async generateKey(options) {
    const newKey = await super.generateKey(options);
    if (options.unlocked) {
      const unlockedKey = await openpgp.decryptKey({privateKey: newKey.key, passphrase: options.passphrase});
      newKey.key = unlockedKey.key;
    }
    this.sync.add(newKey.key.primaryKey.getFingerprint(), keyringSync.INSERT);
    await this.keystore.store();
    await this.sync.commit();
    // if no default key in the keyring set the generated key as default
    if (!await this.hasDefaultKey()) {
      await this.setDefaultKey(newKey.key.primaryKey.getFingerprint());
    }
    return newKey;
  }
}
