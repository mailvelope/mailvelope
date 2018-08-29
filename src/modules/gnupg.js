/**
 * Copyright (C) 2018 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from '../lib/lib-mvelo';
const l10n = mvelo.l10n.getMessage;
import {gpgme} from '../lib/browser.runtime';

/**
 * Decrypt message
 * @param  {String} [armored] - armored PGP message
 * @param {String} [base64] - PGP message as base64 string
 * @return {Object}
 */
export async function decrypt({armored, base64, format}) {
  let {data, signatures, file_name} = await gpgme.decrypt({
    data: armored || base64,
    base64: Boolean(base64),
    expect: format === 'binary' ? 'base64' : null
  });
  signatures = mapSignatures(signatures);
  if (format === 'binary') {
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
  const base64 = dataURL ? mvelo.util.dataURL2base64(dataURL) : false;
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
    return result.data;
  } catch (e) {
    if (e.code === 'GNUPG_ERROR' && e.message.includes('Unusable public key')) {
      throw new mvelo.Error(l10n('gnupg_error_unusable_pub_key', [encryptionKeyFprs.join(', ')]), 'GNUPG_ERROR');
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

function mapSignatures({signatures} = {}) {
  let sigs = [];
  if (!signatures) {
    return sigs;
  }
  for (const good of signatures.good) {
    sigs.push({valid: true, fingerprint: good.fingerprint.toLowerCase()});
  }
  for (const bad of signatures.bad) {
    const sig = {};
    try {
      sig.fingerprint = bad.fingerprint.toLowerCase();
    } catch (e) {}
    if (bad.errorDetails['key-missing']) {
      sig.valid = null;
    } else {
      sig.valid = false;
    }
    sigs.push(sig);
  }
  sigs = sigs.map(sig => {
    if (sig.fingerprint && sig.fingerprint.length === 16) {
      sig.keyId = sig.fingerprint;
      delete sig.fingerprint;
    }
    return sig;
  });
  return sigs;
}
