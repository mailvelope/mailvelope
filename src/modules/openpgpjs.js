/**
 * Copyright (C) 2018 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import {Uint8Array2str, dataURL2str, str2Uint8Array} from '../lib/util';
import {
  decrypt as pgpDecrypt, createMessage, encrypt as pgpEncrypt, createCleartextMessage,
  sign as pgpSign, readSignature, verify as pgpVerify
} from 'openpgp';

/**
 * Decrypt message
 * @param  {openpgp.Message} options.message - message that will be decrypted
 * @param  {KeyringBase} options.keyring - keyring used for decryption
 * @param  {Array<openpgp.Keyid>} options.encryptionKeyIds - message encrypted for keyIds
 * @param  {Function} options.unlockKey - callback that unlocks private key
 * @param  {String} options.format - default is 'utf8', other value: 'binary'
 * @return {Object}
 */
export async function decrypt({message, keyring, encryptionKeyIds, unlockKey, format}) {
  let privateKey = keyring.getPrivateKeyByIds(encryptionKeyIds);
  privateKey = await unlockKey({key: privateKey});
  const verificationKeys = keyring.keystore.getAllKeys();
  const result = await pgpDecrypt({message, decryptionKeys: privateKey, verificationKeys, format});
  result.signatures = await mapSignatures(result.signatures, keyring);
  if (format === 'binary') {
    result.data = Uint8Array2str(result.data);
  }
  return result;
}

async function mapSignatures(signatures, keyring) {
  return Promise.all(signatures.map(async signature => {
    const sig = {};
    sig.keyId = signature.keyID.toHex();
    try {
      sig.valid = await signature.verified;
    } catch (e) {
      sig.valid = /^Could not find signing key with key ID/.test(e.message) ? null : false;
    }
    try {
      sig.created = (await signature.signature).packets[0]?.created;
    } catch (e) {}
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
  }));
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
    message = await createMessage({text: data, filename});
  } else if (dataURL) {
    const content = dataURL2str(dataURL);
    data = str2Uint8Array(content);
    message = await createMessage({binary: data, filename});
  }
  if (signingKeyFpr) {
    signingKey = keyring.getPrivateKeyByIds(signingKeyFpr);
    signingKey = await unlockKey({key: signingKey});
  }
  const keys = keyring.getKeysByFprs(encryptionKeyFprs);
  const result = await pgpEncrypt({message, encryptionKeys: keys, signingKeys: signingKey, format: armor ? 'armored' : 'binary'});
  return armor ? result : Uint8Array2str(result);
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
  const message = await createCleartextMessage({text: data});
  let signingKey = keyring.getPrivateKeyByIds(signingKeyFpr);
  signingKey = await unlockKey({key: signingKey});
  const result = await pgpSign({message, signingKeys: [signingKey]});
  return result;
}

/**
 * Verify message
 * @param  {openpgp.Message} [options.message] - message to be verified
 * @param {String} [options.plaintext] - message to be verified as plaintext
 * @param {String} [detachedSignature] - signature as armored block
 * @param  {KeyringBase} options.keyring - keyring used for verification
 * @return {{data: String, signatures: Array<{keyId: String, fingerprint: String, valid: Boolean}>}}
 */
export async function verify({message, plaintext, detachedSignature, keyring}) {
  let signature;
  if (plaintext && detachedSignature) {
    signature = await readSignature({armoredSignature: detachedSignature});
    message = await createMessage({text: plaintext});
  }
  const verificationKeys = keyring.keystore.getAllKeys();
  let {data, signatures} = await pgpVerify({message, verificationKeys, signature});
  signatures = await mapSignatures(signatures, keyring);
  return {data, signatures};
}
