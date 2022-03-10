/**
 * Copyright (C) 2021 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import {getKeyringAttr, setKeyringAttr, getAll as getAllKeyring} from './keyring';
import {addUpdateHandler} from './prefs';

const KEY_BINDING = 'key_binding';

export function init() {
  addUpdateHandler((before, after) => {
    // clear key binding storage if feature turned off
    if (before.keyserver.key_binding && after.keyserver?.key_binding === false) {
      for (const keyring of getAllKeyring()) {
        setKeyringAttr(keyring.id, {[KEY_BINDING]: {}});
      }
    }
  });
}

/**
 * Update key binding storage with latest seen information
 * @param  {KeyringBase} keyring
 * @param  {String} signerEmail
 * @param  {Array<{valid, created, fingerprint}>} signatures
 */
export async function updateKeyBinding(keyring, signerEmail, signatures) {
  if (!signerEmail) {
    return;
  }
  const validSig = signatures.filter(sig => sig.valid === true);
  if (!validSig.length) {
    return;
  }
  const {fingerprint, created} = validSig[0];
  const last_seen = created.getTime();
  const keyBindingMap = getKeyringAttr(keyring.id, KEY_BINDING) || {};
  const keyBinding = keyBindingMap[signerEmail];
  if (keyBinding && keyBinding.last_seen >= last_seen) {
    return;
  }
  keyBindingMap[signerEmail] = {fingerprint, last_seen};
  await setKeyringAttr(keyring.id, {[KEY_BINDING]: keyBindingMap});
}

export function getKeyBinding(keyring, email) {
  const keyBindingMap = getKeyringAttr(keyring.id, KEY_BINDING) || {};
  const keyBinding = keyBindingMap[email];
  if (keyBinding) {
    return keyBinding.fingerprint;
  }
}

export function isKeyBound(keyring, email, key) {
  const fpr = getKeyBinding(keyring, email);
  return key.getKeys().some(key => key.getFingerprint() === fpr);
}
