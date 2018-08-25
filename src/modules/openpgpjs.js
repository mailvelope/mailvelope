/**
 * Copyright (C) 2018 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from '../lib/lib-mvelo';
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
export async function decrypt({message, keyring, senderAddress, selfSigned, encryptionKeyIds, unlockKey, format}) {
  let privateKey = keyring.getPrivateKeyByIds(encryptionKeyIds);
  privateKey = await unlockKey({key: privateKey});
  let signingKeys;
  // normalize sender address to array
  senderAddress = mvelo.util.toArray(senderAddress);
  // verify signatures if sender address provided or self signed message (draft)
  if (senderAddress.length || selfSigned) {
    signingKeys = [];
    if (senderAddress.length) {
      signingKeys = keyring.getKeyByAddress(senderAddress);
      signingKeys = senderAddress.reduce((result, email) => result.concat(signingKeys[email] || []), []);
    }
    // if no signing keys found we use decryption key for verification
    // this covers the self signed message (draft) use case
    // also signingKeys parameter in decryptAndVerifyMessage has to contain at least one key
    if (!signingKeys.length) {
      signingKeys = [privateKey];
    }
  }
  const result = await openpgp.decrypt({message, privateKey, publicKeys: signingKeys, format});
  result.signatures = (result.signatures || []).map(signature => {
    signature.keyId = signature.keyid.toHex();
    delete signature.keyid;
    if (signature.valid !== null) {
      try {
        signature.fingerprint = keyring.getFprForKeyId(signature.keyId);
      } catch (e) {
        console.log('Error mapping keyId to fingerprint', e);
        // reject this signature
        signature.valid = false;
      }
    }
    return signature;
  });
  if (format === 'binary') {
    result.data = mvelo.util.Uint8Array2str(result.data);
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
  if (dataURL) {
    const content = mvelo.util.dataURL2str(dataURL);
    data = mvelo.util.str2Uint8Array(content);
  }
  if (signingKeyFpr) {
    signingKey = keyring.getPrivateKeyByIds(signingKeyFpr);
    signingKey = await unlockKey({key: signingKey});
  }
  const keys = keyring.getKeysByFprs(encryptionKeyFprs);
  const result = await openpgp.encrypt({data, publicKeys: keys, privateKeys: signingKey, filename, armor});
  return armor ? result.data : mvelo.util.Uint8Array2str(result.message.packets.write());
}

/**
 * Sign message
 * @param  {String} options.data - data to be signed as plaintext
 * @param  {KeyringBase} options.keyring - keyring used for signing
 * @param  {Function} options.unlockKey - callback that unlocks private key
 * @param  {String} options.signingKeyFpr - fingerprint of signing key
 * @return {String}
 */
export async function sign({data, keyring, unlockKey, signingKeyFpr}) {
  let signingKey = keyring.getPrivateKeyByIds(signingKeyFpr);
  signingKey = await unlockKey({key: signingKey});
  const result = await openpgp.sign({data, privateKeys: signingKey});
  return result.data;
}

/**
 * Verify message
 * @param  {openpgp.message.Message} options.message - message to be verified
 * @param  {KeyringBase} options.keyring - keyring used for verification
 * @param  {Array<String>} options.signingKeyIds - fingerprints of signing keys
 * @return {{data: String, signatures: Array<{keyId: String, fingerprint: String, valid: Boolean}>}}
 */
export async function verify({message, keyring, signingKeyIds}) {
  const publicKeys = [];
  for (const keyId of signingKeyIds) {
    const keys = keyring.keystore.getKeysForId(keyId.toHex(), true);
    if (keys) {
      const key = keys[0];
      publicKeys.push(key);
    }
  }
  let {data, signatures} = await openpgp.verify({message, publicKeys});
  signatures = signatures.map(signature => {
    const sig = {};
    sig.keyId = signature.keyid.toHex();
    sig.valid = signature.valid;
    const keys = keyring.keystore.getKeysForId(sig.keyId, true);
    if (keys) {
      sig.fingerprint = keys[0].primaryKey.getFingerprint();
    }
    return sig;
  });
  return {data, signatures};
}
