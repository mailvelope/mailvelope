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
 * @param  {Array<openpgp.Keyid>} options.encryptionKeyIds - message encrypted for keyids
 * @param  {Function} options.unlockKey - callback that unlocks private key
 * @param  {String} options.format - default is 'utf8', other value: 'binary'
 * @return {Object}
 */
export async function decrypt({message, keyring, senderAddress, selfSigned, encryptionKeyIds, unlockKey, format}) {
  let privateKey = keyring.getPrivateKeyByIds(encryptionKeyIds);
  privateKey = await unlockKey(privateKey);
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
  result.signatures = result.signatures.map(signature => {
    signature.keyid = signature.keyid.toHex();
    return signature;
  });
  return result;
}

/**
 * Encrypt message
 * @param  {String} options.data - data to be encrypted as native JavaScript string
 * @param  {KeyringBase} options.keyring - keyring used for encryption
 * @param  {Function} options.unlockKey - callback that unlocks private key
 * @param  {Array<String>} options.encryptionKeyIds - array of key Ids used for encryption
 * @param  {String} options.signingKeyId - key Id of signing key
 * @return {String}
 */
export async function encrypt({data, keyring, unlockKey, encryptionKeyIds, signingKeyId}) {
  let signingKey;
  if (signingKeyId) {
    signingKey = keyring.getPrivateKeyByIds(signingKeyId);
    signingKey = await unlockKey(signingKey);
  }
  const keys = keyring.getKeysByIds(encryptionKeyIds);
  const msg = await openpgp.encrypt({data, publicKeys: keys, privateKeys: signingKey});
  return msg.data;
}
