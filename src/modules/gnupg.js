/**
 * Copyright (C) 2018 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import * as l10n from '../lib/l10n';
import {dataURL2base64, MvError} from '../lib/util';
import {gpgme} from '../lib/browser.runtime';

/**
 * Decrypt message
 * @param  {String} [armored] - armored PGP message
 * @param {Function} [base64] - returns PGP message as base64 string
 * @param {String} [format] - default is 'utf8', other value: 'binary'
 * @param {KeyringBase} [keyring] - keyring used for decryption
 * @return {Object}
 */
export async function decrypt({armored, base64, format, keyring}) {
  let {data, signatures, file_name, format: resultFormat} = await gpgme.decrypt({
    data: armored ?? base64(),
    base64: Boolean(base64),
    expect: format === 'binary' ? 'base64' : null
  });
  signatures = mapSignatures(signatures, keyring);
  if (resultFormat === 'base64') {
    data = window.atob(data);
  }
  return {data, signatures, filename: file_name};
}

/**
 * Encrypt message
 * @param  {String} data - data to be encrypted as string
 * @param  {String} dataURL - data to be encrytped as data URL
 * @param  {Array<String>} encryptionKeyFprs - fingerprint of encryption keys
 * @param  {Array<String>} signingKeyFpr - fingerprint of signing keys
 * @param  {Boolean} armor - request the output as armored block
 * @return {String}
 */
export async function encrypt({data, dataURL, encryptionKeyFprs, signingKeyFpr, armor, filename}) {
  const base64 = dataURL ? dataURL2base64(dataURL) : false;
  const additional = filename ? {file_name: filename} : null;
  try {
    const result = await gpgme.encrypt({
      data: data || base64,
      publicKeys: encryptionKeyFprs,
      secretKeys: signingKeyFpr,
      base64: Boolean(base64),
      armor,
      additional
    });
    if (result.format === 'base64') {
      return window.atob(result.data);
    }
    return result.data;
  } catch (e) {
    if (e.code === 'GNUPG_ERROR' && e.message.includes('Unusable public key')) {
      throw new MvError(l10n.get('gnupg_error_unusable_pub_key', [encryptionKeyFprs.join(', ')]), 'GNUPG_ERROR');
    }
    throw e;
  }
}

/**
 * Sign message
 * @param  {String} data - data to be signed as plaintext
 * @param  {String} signingKeyFpr - fingerprint of signing key
 * @return {String}
 */
export async function sign({data, signingKeyFpr}) {
  const result = await gpgme.sign({data, keys: signingKeyFpr, mode: 'clearsign'});
  return result.data;
}

/**
 * Verify message
 * @param {String} armored - cleartext signed message
 * @param {String} [options.plaintext] - message to be verified as plaintext
 * @param {String} [detachedSignature] - signature as armored block
 * @return {{data: String, signatures: Array<{keyId: String, fingerprint: String, valid: Boolean}>}}
 */
export async function verify({armored, plaintext, detachedSignature}) {
  let {data, signatures} = await gpgme.verify({data: armored || plaintext, signature: detachedSignature});
  signatures = mapSignatures(signatures);
  return {data, signatures};
}

function mapSignatures({signatures} = {}, keyring) {
  let sigs = [];
  if (!signatures) {
    return sigs;
  }
  for (const good of signatures.good) {
    sigs.push({valid: true, fingerprint: good.fingerprint.toLowerCase(), created: good.timestamp});
  }
  for (const bad of signatures.bad) {
    const sig = {};
    try {
      sig.fingerprint = bad.fingerprint.toLowerCase();
    } catch (e) {}
    if (bad.errorDetails['key-missing'] || bad._rawSigObject.status_code === 9) {
      sig.valid = null;
    } else if (bad._rawSigObject && bad._rawSigObject.status_code === 0 && bad._rawSigObject.validity === 3) {
      // status of success (0) and validity of marginal (3) means the signature was verified successfully,
      // but the trust model of GnuPG considers the public key as unsufficiently trusted. As in the Mailvelope model
      // all keys in the keyring are trusted, we consider this signature as valid.
      sig.valid = true;
      sig.created = bad.timestamp;
    } else {
      sig.valid = false;
    }
    sigs.push(sig);
  }
  sigs = sigs.map(sig => {
    if (sig.fingerprint && sig.fingerprint.length === 16) {
      sig.keyId = sig.fingerprint;
      delete sig.fingerprint;
      if (keyring && sig.valid !== null) {
        try {
          sig.fingerprint = keyring.getFprForKeyId(sig.keyId);
        } catch (e) {
          console.log('Error mapping keyId to fingerprint', e);
          if (e.code === 'LONG_KEY_ID_COLLISION') {
            sig.valid = false;
          }
        }
      }
    }
    return sig;
  });
  return sigs;
}
