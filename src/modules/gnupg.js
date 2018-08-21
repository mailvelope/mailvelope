/**
 * Copyright (C) 2018 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from '../lib/lib-mvelo';
import {gpgme} from '../lib/browser.runtime';

/**
 * Decrypt message
 * @param  {String} [armored] - armored PGP message
 * @param {String} [base64] - PGP message as base64 string
 * @return {Object}
 */
export async function decrypt({armored, base64}) {
  const result = await gpgme.decrypt(armored || base64, Boolean(base64));
  console.log('gpgme.decrypt', result);
  return {data: result.data, signatures: []};
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
export async function encrypt({data, dataURL, encryptionKeyFprs, signingKeyFpr, armor}) {
  const base64 = dataURL ? mvelo.util.dataURL2base64(dataURL) : false;
  const result = await gpgme.encrypt(data || base64, encryptionKeyFprs, signingKeyFpr, Boolean(base64), armor);
  console.log('gpgme.encrypt', result);
  return armor ? result.data : window.atob(result.data);
}

/**
 * Sign message
 * @param  {String} data - data to be signed as plaintext
 * @param  {String} signingKeyFpr - fingerprint of signing key
 * @return {String}
 */
export async function sign({data, signingKeyFpr}) {
  const result = await gpgme.sign(data, signingKeyFpr, 'clearsign');
  return result.data;
}

/**
 * Verify message
 * @param {String} armored - cleartext signed message
 * @return {{data: String, signatures: Array<{keyId: String, fingerprint: String, valid: Boolean}>}}
 */
export async function verify({armored}) {
  const {data, signatures} = await gpgme.verify(armored);
  let sigs = [];
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
  return {data, signatures: sigs};
}
