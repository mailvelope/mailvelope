/**
 * Copyright (C) 2012-2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from '../lib/lib-mvelo';
const l10n = mvelo.l10n.getMessage;
import * as openpgp from 'openpgp';
import * as defaults from './defaults';
import * as prefs from './prefs';
import * as pwdCache from './pwdCache';
import {randomString, symEncrypt} from './crypto';
import * as uiLog from './uiLog';
import {getById as getKeyringById, getKeyringWithPrivKey, syncPublicKeys, getPreferredKeyring} from './keyring';
import {getUserId, mapKeys} from './key';
import * as keyringSync from './keyringSync';
import * as trustKey from './trustKey';

export async function init() {
  await defaults.init();
  await prefs.init();
  pwdCache.init();
  initOpenPGP();
  trustKey.init();
}

function initOpenPGP() {
  openpgp.config.commentstring = 'https://www.mailvelope.com';
  openpgp.config.versionstring = `Mailvelope v${defaults.getVersion()}`;
  openpgp.initWorker({path: 'dep/openpgp.worker.js'});
}

/**
 * Decrypt armored PGP message
 * @param  {String} options.armored - armored PGP message
 * @param  {String} options.keyringId
 * @param  {Function} options.unlockKey - callback to unlock key
 * @param  {String|Array} options.senderAddress - email address of sender, used to indentify key for signature verification
 * @param  {Boolean} options.selfSigned - message is self signed (decrypt email draft scenario)
 * @return {Promise<Object>} - decryption result {data: String, signatures: Array}
 */
export async function decryptMessage({armored, keyringId, unlockKey, senderAddress, selfSigned}) {
  const message = readMessage({armoredText: armored});
  const encryptionKeyIds = message.getEncryptionKeyIds();
  const keyring = getKeyringWithPrivKey(encryptionKeyIds, keyringId);
  if (!keyring) {
    throw noKeyFoundError(encryptionKeyIds);
  }
  try {
    let {data, signatures} = await keyring.getPgpBackend().decrypt({armored, message, keyring, unlockKey, senderAddress, selfSigned, encryptionKeyIds});
    // collect fingerprints or keyIds of signatures
    const sigKeyIds = signatures.map(sig => sig.fingerprint || sig.keyId);
    // sync public keys for the signatures
    await syncPublicKeys({keyring, keyIds: sigKeyIds, keyringId});
    signatures = signatures.map(sig => addSigningKeyDetails(sig, keyring));
    return {data, signatures};
  } catch (e) {
    console.log('getPgpBackend().decrypt() error', e);
    throw e;
  }
}

/**
 * Add signing key details to signature. Only if fingerprint is available.
 * @param {Object} signature
 * @param {KeyringBase} keyring
 */
function addSigningKeyDetails(signature, keyring) {
  if (signature.valid !== null && signature.fingerprint) {
    const signingKey = keyring.keystore.getKeysForId(signature.fingerprint, true);
    if (!signingKey) {
      return;
    }
    [signature.keyDetails] = mapKeys(signingKey);
  }
  return signature;
}

function noKeyFoundError(encryptionKeyIds) {
  const keyId = encryptionKeyIds[0].toHex();
  let errorMsg = l10n('message_no_keys', [keyId.toUpperCase()]);
  for (let i = 1; i < encryptionKeyIds.length; i++) {
    errorMsg = `${errorMsg} ${l10n('word_or')} ${encryptionKeyIds[i].toHex().toUpperCase()}`;
  }
  return new mvelo.Error(errorMsg, 'NO_KEY_FOUND');
}

/**
 * Parse armored PGP message
 * @param  {String} options.armoredText
 * @param  {Uint8Array} options.binary]
 * @return {openppg.message.Message}
 */
export function readMessage({armoredText, binary}) {
  if (armoredText) {
    try {
      return openpgp.message.readArmored(armoredText);
    } catch (e) {
      console.log('Error parsing armored text', e);
      throw new mvelo.Error(l10n('message_read_error', [e]), 'ARMOR_PARSE_ERROR');
    }
  } else if (binary) {
    try {
      return openpgp.message.read(binary);
    } catch (e) {
      console.log('Error parsing binary file', e);
      throw new mvelo.Error(l10n('file_read_error', [e]), 'BINARY_PARSE_ERROR');
    }
  } else {
    throw new Error('No message to read');
  }
}

/**
 * Encrypt PGP message
 * @param {String} options.data - data to be encrypted as string
 * @param {String} options.keyringId
 * @param  {Function} options.unlockKey - callback to unlock key
 * @param {Array<String>} options.encryptionKeyFprs - fingerprint of encryption keys
 * @param {String} options.signingKeyFpr - fingerprint of signing key
 * @param {String} options.uiLogSource - UI source that triggered encryption, used for logging
 * @return {Promise<String>} - armored PGP message
 */
export async function encryptMessage({data, keyringId, unlockKey, encryptionKeyFprs, signingKeyFpr, uiLogSource}) {
  const keyring = getKeyringWithPrivKey(signingKeyFpr, keyringId);
  if (!keyring) {
    throw new mvelo.Error('No private key found', 'NO_PRIVATE_KEY_FOUND');
  }
  await syncPublicKeys({keyring, keyIds: encryptionKeyFprs, keyringId});
  try {
    const result = await keyring.getPgpBackend().encrypt({data, keyring, unlockKey, encryptionKeyFprs, signingKeyFpr, armor: true});
    logEncryption(uiLogSource, keyring, encryptionKeyFprs);
    return result;
  } catch (e) {
    console.log('getPgpBackend().encrypt() error', e);
    throw new mvelo.Error(l10n('encrypt_error', [e.message]), 'ENCRYPT_ERROR');
  }
}

/**
 * Log encryption operation
 * @param  {String} source - source that triggered encryption operation
 * @param {KeyringBase} keyring
 * @param  {Array<String>} keyFprs - fingerprint of used keys
 */
function logEncryption(source, keyring, keyFprs) {
  if (source) {
    const keys = keyring.getKeysByFprs(keyFprs);
    const recipients = keys.map(key => getUserId(key, false));
    uiLog.push(source, l10n('security_log_encryption_operation', [recipients.join(', ')]));
  }
}

function readCleartextMessage(armoredText) {
  try {
    return openpgp.cleartext.readArmored(armoredText);
  } catch (e) {
    console.log('openpgp.cleartext.readArmored', e);
    throw new mvelo.Error(l10n('cleartext_read_error', [e]), 'VERIFY_ERROR');
  }
}

export async function verifyMessage({armored, keyringId}) {
  try {
    const message = readCleartextMessage(armored);
    const signingKeyIds = message.getSigningKeyIds();
    if (!signingKeyIds.length) {
      throw new mvelo.Error('No signatures found');
    }
    const keyring = getPreferredKeyring(keyringId);
    await syncPublicKeys({keyring, keyIds: signingKeyIds, keyringId});
    let {data, signatures} = await keyring.getPgpBackend().verify({armored, message, keyring, signingKeyIds});
    signatures = signatures.map(sig => addSigningKeyDetails(sig, keyring));
    return {data, signatures};
  } catch (e) {
    throw new mvelo.Error(l10n('verify_error', [e]), 'VERIFY_ERROR');
  }
}

/**
 * Sign plaintext message
 * @param  {String} options.data - plaintext message
 * @param  {String} options.keyringId
 * @param  {[type]} options.unlockKey - callback to unlock key
 * @param  {[type]} options.signingKeyFpr - fingerprint of sign key
 * @return {Promise<String>}
 */
export async function signMessage({data, keyringId, unlockKey, signingKeyFpr}) {
  const keyring = getKeyringWithPrivKey(signingKeyFpr, keyringId);
  if (!keyring) {
    throw new mvelo.Error('No private key found', 'NO_PRIVATE_KEY_FOUND');
  }
  try {
    const result = await keyring.getPgpBackend().sign({data, keyring, unlockKey, signingKeyFpr});
    uiLog.push('security_log_editor', l10n('security_log_sign_operation', [signingKeyFpr.toUpperCase()]));
    return result;
  } catch (e) {
    console.log('getPgpBackend().sign() error', e);
    throw new mvelo.Error(l10n('sign_error', [e]), 'SIGN_ERROR');
  }
}

export function createPrivateKeyBackup(defaultKey, keyPwd) {
  let backupCode;
  return Promise.resolve()
  .then(() => {
    // create backup code
    backupCode = randomString(26);
    // create packet structure
    const packetList = new openpgp.packet.List();
    const literal = new openpgp.packet.Literal();
    let text = 'Version: 1\n';
    text += `Pwd: ${keyPwd}\n`;
    literal.setText(text);
    packetList.push(literal);
    packetList.concat(defaultKey.toPacketlist());
    // symmetrically encrypt with backup code
    const msg = new openpgp.message.Message(packetList);
    return symEncrypt(msg, backupCode);
  })
  .then(msg => ({backupCode, message: msg.armor()}));
}

function parseMetaInfo(txt) {
  const result = {};
  txt.replace(/\r/g, '').split('\n').forEach(row => {
    if (row.length) {
      const keyValue = row.split(/:\s/);
      result[keyValue[0]] = keyValue[1];
    }
  });
  return result;
}

export function restorePrivateKeyBackup(armoredBlock, code) {
  return Promise.resolve()
  .then(() => {
    const message = openpgp.message.readArmored(armoredBlock);
    if (!(message.packets.length === 2 &&
          message.packets[0].tag === 3 && // Symmetric-Key Encrypted Session Key Packet
          message.packets[0].sessionKeyAlgorithm === 'aes256' &&
          (message.packets[0].sessionKeyEncryptionAlgorithm === null || message.packets[0].sessionKeyEncryptionAlgorithm === 'aes256') &&
          message.packets[1].tag === 18 // Sym. Encrypted Integrity Protected Data Packet
    )) {
      throw {message: 'Illegal private key backup structure.'};
    }
    return message.decrypt(null, null, code)
    .catch(() => {
      throw {message: 'Could not decrypt message with this restore code', code: 'WRONG_RESTORE_CODE'};
    });
  })
  .then(message => {
    // extract password
    const pwd = parseMetaInfo(message.getText()).Pwd;
    // remove literal data packet
    const keyPackets = message.packets.slice(1);
    const privKey =  new openpgp.key.Key(keyPackets);
    return {key: privKey, password: pwd};
  })
  .catch(error => {
    throw mvelo.util.mapError(error);
  });
}

/**
 * @param  {openpgp.key.Key} key - key to decrypt and verify signature
 * @param  {openpgp.message.Message} message - sync packet
 * @return {Promise<Object,Error>}
 */
export function decryptSyncMessage(key, message) {
  return openpgp.decrypt({message, privateKey: key, publicKeys: key})
  .then(msg => {
    // check signature
    const sig = msg.signatures[0];
    if (!(sig && sig.valid && sig.keyid.equals(key.getSigningKeyPacket().getKeyId()))) {
      throw new Error('Signature of synced keyring is invalid');
    }
    const syncData = JSON.parse(msg.data);
    const publicKeys = [];
    const changeLog = {};
    let fingerprint;
    for (fingerprint in syncData.insertedKeys) {
      publicKeys.push({
        type: 'public',
        armored: syncData.insertedKeys[fingerprint].armored
      });
      changeLog[fingerprint] = {
        type: keyringSync.INSERT,
        time: syncData.insertedKeys[fingerprint].time
      };
    }
    for (fingerprint in syncData.deletedKeys) {
      changeLog[fingerprint] = {
        type: keyringSync.DELETE,
        time: syncData.deletedKeys[fingerprint].time
      };
    }
    return {
      changeLog,
      keys: publicKeys
    };
  });
}

/**
 * @param  {Key} key - used to sign and encrypt the package
 * @param  {Object} changeLog
 * @param  {String} keyringId - selects keyring for the sync
 * @return {Promise<Object, Error>} - the encrypted message and the own public key
 */
export async function encryptSyncMessage(key, changeLog, keyringId) {
  let syncData = {};
  syncData.insertedKeys = {};
  syncData.deletedKeys = {};
  const keyStore = getKeyringById(keyringId).keystore;
  keyStore.publicKeys.keys.forEach(pubKey => {
    convertChangeLog(pubKey, changeLog, syncData);
  });
  keyStore.privateKeys.keys.forEach(privKey => {
    convertChangeLog(privKey.toPublic(), changeLog, syncData);
  });
  for (const fingerprint in changeLog) {
    if (changeLog[fingerprint].type === keyringSync.DELETE) {
      syncData.deletedKeys[fingerprint] = {
        time: changeLog[fingerprint].time
      };
    }
  }
  syncData = JSON.stringify(syncData);
  const msg = await openpgp.encrypt({data: syncData, publicKeys: key, privateKeys: key});
  return msg.data;
}

function convertChangeLog(key, changeLog, syncData) {
  const fingerprint = key.primaryKey.getFingerprint();
  const logEntry = changeLog[fingerprint];
  if (!logEntry) {
    console.log(`Key ${fingerprint} in keyring but not in changeLog.`);
    return;
  }
  if (logEntry.type === keyringSync.INSERT) {
    syncData.insertedKeys[fingerprint] = {
      armored: key.armor(),
      time: logEntry.time
    };
  } else if (logEntry.type === keyringSync.DELETE) {
    console.log(`Key ${fingerprint} in keyring but has DELETE in changeLog.`);
  } else {
    console.log('Invalid changeLog type:', logEntry.type);
  }
}

/**
 * Encrypt file
 * @param  {Object} options.plainFile - {content, name} with contant as dataURL and name as filename
 * @param  {Array<String>} options.encryptionKeyFprs - fingerprint of encryption keys
 * @param  {Boolean} options.armor - request the output as armored block
 * @return {String} - encrypted file as armored block or JS binary string
 */
export async function encryptFile({plainFile, encryptionKeyFprs, armor}) {
  try {
    const keyring = getPreferredKeyring();
    await syncPublicKeys({keyring, keyIds: encryptionKeyFprs, allKeyrings: true});
    const result = await keyring.getPgpBackend().encrypt({dataURL: plainFile.content, keyring, encryptionKeyFprs, filename: plainFile.name, armor});
    logEncryption('security_log_encrypt_dialog', keyring, encryptionKeyFprs);
    return result;
  } catch (error) {
    console.log('pgpmodel.encryptFile() error', error);
    throw new mvelo.Error(l10n('encrypt_error', [error.message]), 'NO_KEY_FOUND');
  }
}

/**
 * Decrypt File
 * @param  {Object} encryptedFile - {content, name} with contant as dataURL and name as filename
 * @param  {Function} unlockKey - callback to unlock key
 * @return {Object<name, content>} - content as JS binary string
 */
export async function decryptFile(encryptedFile, unlockKey) {
  let armoredText;
  let binary;
  try {
    const content = mvelo.util.dataURL2str(encryptedFile.content);
    if (/^-----BEGIN PGP MESSAGE-----/.test(content)) {
      armoredText = content;
    } else {
      binary = mvelo.util.str2Uint8Array(content);
    }
    const message = readMessage({armoredText, binary});
    const encryptionKeyIds = message.getEncryptionKeyIds();
    const keyring = getKeyringWithPrivKey(encryptionKeyIds);
    if (!keyring) {
      throw noKeyFoundError(encryptionKeyIds);
    }
    const result = await keyring.getPgpBackend().decrypt({base64: mvelo.util.dataURL2base64(encryptedFile.content), message, keyring, unlockKey, encryptionKeyIds, format: 'binary'});
    if (!result.filename) {
      result.filename = encryptedFile.name.slice(0, -4);
    }
    return result;
  } catch (error) {
    console.log('pgpModel.decryptFile() error', error);
    throw error;
  }
}
