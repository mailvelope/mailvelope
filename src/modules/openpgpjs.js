/**
 * Copyright (C) 2018 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import {Uint8Array2str, dataURL2str, str2Uint8Array} from '../lib/util';
import * as openpgp from 'openpgp';

/**
 * Decrypt message
 * @param  {openppg.message.Message} options.message - message that will be decrypted
 * @param  {KeyringBase} options.keyring - keyring used for decryption
 * @param  {String} options.senderAddress - email address of sender, used for signature verification
 * @param  {Boolean} options.selfSigned - message is signed by user, therefore encryption key used for signature verification
 * @param  {Array<openpgp.Keyid>} options.encryptionKeyIds - message encrypted for keyIds
 * @param  {Function} options.unlockKey - callback that unlocks private key
 * @param  {String} options.format - default is 'utf8', other value: 'binary'
 * @return {Object}
 */
export async function decrypt({message, keyring, encryptionKeyIds, unlockKey, format}) {
  let privateKey = keyring.getPrivateKeyByIds(encryptionKeyIds);
  privateKey = await unlockKey({key: privateKey});
  let signingKeys = keyring.keystore.publicKeys.keys.concat(keyring.keystore.privateKeys.keys.map(k => k.toPublic()));
  const result = await openpgp.decrypt({message, privateKeys: privateKey, publicKeys: signingKeys, format});
  result.signatures = (result.signatures || []).map(signature => {
    const sig = {};
    sig.keyId = signature.keyid.toHex();
    sig.valid = signature.valid;
    sig.created = signature.signature.packets[0]?.created;
    if (sig.valid !== null) {
      try {
        sig.fingerprint = keyring.getFprForKeyId(sig.keyId);
      } catch (e) {
        console.log('Error mapping keyId to fingerprint', e);
        // reject this signature
        sig.valid = false;
      }
    }
    return sig;
  });
  if (format === 'binary') {
    result.data = Uint8Array2str(result.data);
  }
  return result;
}

/**
 * Encrypt message
 * @param  {String} options.dataURL - data to be encrypted as dataURL
 * @param  {KeyringBase} options.keyring - keyring used for encryption
 * @param  {Function} options.unlockKey - callback that unlocks private key
 * @param  {Array<String>} options.encryptionKeyFprs - array of fingerprints used for encryption
 * @param  {String} options.signingKeyFpr - fingerprint of signing key
 * @param  {String} [filename]
 * @param {Boolean} [armor] - request the output as armored block
 * @return {String|Uint8Array}
 */
export async function encrypt({data, dataURL, keyring, unlockKey, encryptionKeyFprs, signingKeyFpr, filename, armor}) {
  let signingKey;
  let message;
  if (data) {
    message = openpgp.message.fromText(data, filename);
  } else if (dataURL) {
    const content = dataURL2str(dataURL);
    data = str2Uint8Array(content);
    message = openpgp.message.fromBinary(data, filename);
  }
  if (signingKeyFpr) {
    signingKey = keyring.getPrivateKeyByIds(signingKeyFpr);
    signingKey = await unlockKey({key: signingKey});
  }
  const keys = keyring.getKeysByFprs(encryptionKeyFprs);
  const result = await openpgp.encrypt({message, publicKeys: keys, privateKeys: signingKey, armor});
  return armor ? result.data : Uint8Array2str(result.message.packets.write());
}

/**
 * Sign cleartext message
 * @param  {String} options.data - data to be signed as plaintext
 * @param  {KeyringBase} options.keyring - keyring used for signing
 * @param  {Function} options.unlockKey - callback that unlocks private key
 * @param  {String} options.signingKeyFpr - fingerprint of signing key
 * @return {String}
 */
export async function sign({data, keyring, unlockKey, signingKeyFpr}) {
  const message = openpgp.cleartext.fromText(data);
  let signingKey = keyring.getPrivateKeyByIds(signingKeyFpr);
  signingKey = await unlockKey({key: signingKey});
  const result = await openpgp.sign({message, privateKeys: signingKey});
  return result.data;
}

/**
 * Verify message
 * @param  {openpgp.message.Message} [options.message] - message to be verified
 * @param {String} [options.plaintext] - message to be verified as plaintext
 * @param {String} [detachedSignature] - signature as armored block
 * @param  {KeyringBase} options.keyring - keyring used for verification
 * @param  {Array<openpgp.key.Keyid|String>} options.signingKeyIds - fingerprints or Keyid objects of signing keys
 * @return {{data: String, signatures: Array<{keyId: String, fingerprint: String, valid: Boolean}>}}
 */
export async function verify({message, plaintext, detachedSignature, keyring, signingKeyIds}) {
  const publicKeys = [];
  for (const keyId of signingKeyIds) {
    const keys = keyring.keystore.getKeysForId(typeof keyId === 'string' ? keyId : keyId.toHex(), true);
    if (keys) {
      const key = keys[0];
      publicKeys.push(key);
    }
  }
  let signature;
  if (plaintext && detachedSignature) {
    signature = await openpgp.signature.readArmored(detachedSignature);
    message = openpgp.message.fromText(plaintext);
  }
  let {data, signatures} = await openpgp.verify({message, publicKeys, signature});
  signatures = signatures.map(signature => {
    const sig = {};
    sig.keyId = signature.keyid.toHex();
    sig.valid = signature.valid;
    sig.created = signature.signature.packets[0]?.created;
    const keys = keyring.keystore.getKeysForId(sig.keyId, true);
    if (keys) {
      sig.fingerprint = keys[0].primaryKey.getFingerprint();
    }
    return sig;
  });
  return {data, signatures};
}
