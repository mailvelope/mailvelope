/**
 * Copyright (C) 2018 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import * as openpgp from 'openpgp';
import {mapKeys} from './key';

export async function decrypt({message, keyring, senderAddress, selfSigned, encryptionKeyIds, unlockKey}) {
  let privateKey = keyring.getPrivateKeyByIds(encryptionKeyIds);
  privateKey = await unlockKey({key: privateKey.key, keyid: privateKey.keyid});
  let signingKeys;
  // normalize sender address to array
  senderAddress = [].concat(senderAddress || []);
  // verify signatures if sender address provided or self signed message (draft)
  if (senderAddress.length || selfSigned) {
    signingKeys = [];
    if (senderAddress.length) {
      signingKeys = keyring.getKeyByAddress(senderAddress, {validity: true});
      signingKeys = senderAddress.reduce((result, email) => result.concat(signingKeys[email] || []), []);
    }
    // if no signing keys found we use decryption key for verification
    // this covers the self signed message (draft) use case
    // also signingKeys parameter in decryptAndVerifyMessage has to contain at least one key
    if (!signingKeys.length) {
      signingKeys = [privateKey];
    }
  }
  const result = await openpgp.decrypt({message, privateKey, publicKeys: signingKeys});
  result.signatures = mapSignatures(result.signatures, keyring);
  return result;
}

function mapSignatures(signatures = [], keyring) {
  return signatures.map(signature => {
    signature.keyid = signature.keyid.toHex();
    if (signature.valid !== null) {
      const signingKey = keyring.keystore.getKeysForId(signature.keyid, true);
      signature.keyDetails = mapKeys(signingKey)[0];
    }
    return signature;
  });
}
