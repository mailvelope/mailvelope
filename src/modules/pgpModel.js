/**
 * Copyright (C) 2012-2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import * as l10n from '../lib/l10n';
import {dataURL2str, str2Uint8Array, dataURL2base64, MvError} from '../lib/util';
import {
  config as pgpConfig, readMessage as pgpReadMessage, createMessage, readCleartextMessage as pgpReadCleartextMessage,
  readSignature, enums, decrypt as pgpDecrypt, PrivateKey, encrypt as pgpEncrypt, SecretKeyPacket, UserIDPacket, SignaturePacket, SecretSubkeyPacket
} from 'openpgp';
import {readToEnd} from '@openpgp/web-stream-tools';
import * as defaults from './defaults';
import * as prefs from './prefs';
import * as pwdCache from './pwdCache';
import {randomString, symEncrypt} from './crypto';
import * as uiLog from './uiLog';
import {getById as getKeyringById, getKeyringWithPrivKey, syncPublicKeys, getPreferredKeyring} from './keyring';
import {getUserInfo, mapKeys, keyIDfromHex} from './key';
import * as keyringSync from './keyringSync';
import * as trustKey from './trustKey';
import {updateKeyBinding, init as initKeyBinding} from './keyBinding';

export async function init() {
  await defaults.init();
  await prefs.init();
  pwdCache.init();
  initKeyBinding();
  initOpenPGP();
  await trustKey.init();
}

export function initOpenPGP() {
  pgpConfig.commentString = 'https://mailvelope.com';
  pgpConfig.versionString = `Mailvelope v${defaults.getVersion()}`;
  if (prefs.prefs.security.hide_armored_header) {
    pgpConfig.showVersion = false;
    pgpConfig.showComment = false;
  } else {
    pgpConfig.showVersion = true;
    pgpConfig.showComment = true;
  }
}

/**
 * Decrypt armored PGP message
 * @param  {openpgp.Message} options.message - optional PGP message object
 * @param  {String} options.armored - armored PGP message
 * @param  {String} options.keyringId
 * @param  {Function} options.unlockKey - callback to unlock key
 * @param  {String|Array} options.senderAddress - email address of sender, used to indentify key for signature verification
 * @param  {Boolean} options.selfSigned - message is self signed (decrypt email draft scenario)
 * @return {Promise<Object>} - decryption result {data: String, signatures: Array}
 */
export async function decryptMessage({message, armored, keyringId, unlockKey, senderAddress, selfSigned, uiLogSource, lookupKey}) {
  message ??= await readMessage({armoredMessage: armored});
  const encryptionKeyIds = message.getEncryptionKeyIDs();
  const keyring = getKeyringWithPrivKey(encryptionKeyIds, keyringId);
  if (!keyring) {
    throw noKeyFoundError(encryptionKeyIds);
  }
  let local;
  if (lookupKey) {
    ({local} = await acquireSigningKeys({signerEmail: senderAddress, keyring, lookupKey}));
  }
  try {
    let {data, signatures} = await keyring.getPgpBackend().decrypt({armored, message, keyring, unlockKey: options => unlockKey({message, ...options}), senderAddress, selfSigned, encryptionKeyIds});
    await logDecryption(uiLogSource, keyring, encryptionKeyIds);
    if (local) {
      const unknownSig = signatures.find(sig => sig.valid === null);
      if (unknownSig) {
        // if local key existed, but unknown signature, we try key discovery
        const keyId = keyIDfromHex(unknownSig.keyId ?? unknownSig.fingerprint.slice(-16));
        await acquireSigningKeys({signerEmail: senderAddress, keyring, lookupKey, keyId});
      }
    }
    // collect fingerprints or keyIds of signatures
    const sigKeyIds = signatures.map(sig => sig.fingerprint || sig.keyId);
    // sync public keys for the signatures
    await syncPublicKeys({keyring, keyIds: sigKeyIds, keyringId});
    await updateKeyBinding(keyring, senderAddress, signatures);
    signatures = await Promise.all(signatures.map(sig => addSigningKeyDetails(sig, keyring)));
    return {data, signatures, keyringId: keyring.id};
  } catch (e) {
    console.log('getPgpBackend().decrypt() error', e);
    throw e;
  }
}

/**
 * Add signing key details to signature.
 * @param {Object} signature
 * @param {KeyringBase} keyring
 */
async function addSigningKeyDetails(signature, keyring) {
  if (signature.valid !== null) {
    const signingKey = keyring.keystore.getKeysForId(signature.fingerprint ?? signature.keyId, true);
    if (!signingKey) {
      return;
    }
    [signature.keyDetails] = await mapKeys(signingKey);
  }
  return signature;
}

export function noKeyFoundError(encryptionKeyIds) {
  const keyId = encryptionKeyIds[0].toHex();
  let errorMsg = l10n.get('message_no_keys', [keyId.toUpperCase()]);
  for (let i = 1; i < encryptionKeyIds.length; i++) {
    errorMsg = `${errorMsg} ${l10n.get('word_or')} ${encryptionKeyIds[i].toHex().toUpperCase()}`;
  }
  return new MvError(errorMsg, 'NO_KEY_FOUND');
}

/**
 * Parse armored PGP message
 * @param  {String} [options.armoredMessage]
 * @param  {Uint8Array} [options.binaryMessage]
 * @return {openpgp.Message}
 */
export async function readMessage({armoredMessage, binaryMessage}) {
  if (!armoredMessage && !binaryMessage) {
    throw new Error('No message to read');
  }
  try {
    return await pgpReadMessage({armoredMessage, binaryMessage});
  } catch (e) {
    console.log('Error in openpgp.readMessage', e);
    if (armoredMessage) {
      throw new MvError(l10n.get('message_read_error', [e]), 'ARMOR_PARSE_ERROR');
    }
    throw new MvError(l10n.get('file_read_error', [e]), 'BINARY_PARSE_ERROR');
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
 * @param {String} [options.filename] - file name set for this message
 * @param {Boolean} [noCache] - if true, no password cache should be used to unlock signing keys
 * @return {Promise<String>} - armored PGP message
 */
export async function encryptMessage({data, keyringId, unlockKey, encryptionKeyFprs, signingKeyFpr, uiLogSource, filename, noCache}) {
  const keyring = getKeyringWithPrivKey(signingKeyFpr, keyringId, noCache);
  if (!keyring) {
    throw new MvError('No private key found', 'NO_PRIVATE_KEY_FOUND');
  }
  await syncPublicKeys({keyring, keyIds: encryptionKeyFprs, keyringId});
  try {
    const result = await keyring.getPgpBackend().encrypt({data, keyring, unlockKey, encryptionKeyFprs, signingKeyFpr, armor: true, filename});
    await logEncryption(uiLogSource, keyring, encryptionKeyFprs);
    return result;
  } catch (e) {
    console.log('getPgpBackend().encrypt() error', e);
    throw new MvError(l10n.get('encrypt_error', [e.message]), 'ENCRYPT_ERROR');
  }
}

/**
 * Log encryption operation
 * @param  {String} source - source that triggered encryption operation
 * @param {KeyringBase} keyring
 * @param  {Array<String>} keyFprs - fingerprint of used keys
 */
async function logEncryption(source, keyring, keyFprs) {
  if (source) {
    const keys = keyring.getKeysByFprs(keyFprs);
    const recipients = await Promise.all(keys.map(async key => {
      const {userId} = await getUserInfo(key, {allowInvalid: true});
      return userId;
    }));
    uiLog.push(source, 'security_log_encryption_operation', [recipients.join(', ')], false);
  }
}

/**
 * Log decryption operation
 * @param  {String} source - source that triggered encryption operation
 * @param {KeyringBase} keyring
 * @param  {Array<String>} keyIds - ids of used keys
 */
async function logDecryption(source, keyring, keyIds) {
  if (source) {
    const key = keyring.getPrivateKeyByIds(keyIds);
    const {userId} = await getUserInfo(key, false);
    uiLog.push(source, 'security_log_decryption_operation', [userId], false);
  }
}

async function readCleartextMessage(armoredText) {
  try {
    return await pgpReadCleartextMessage({cleartextMessage: armoredText});
  } catch (e) {
    console.log('createCleartextMessage', e);
    throw new MvError(l10n.get('cleartext_read_error', [e]), 'VERIFY_ERROR');
  }
}

export async function verifyMessage({armored, keyringId, signerEmail, lookupKey}) {
  try {
    const message = await readCleartextMessage(armored);
    const signingKeyIds = message.getSigningKeyIDs();
    if (!signingKeyIds.length) {
      throw new MvError('No signatures found');
    }
    const keyring = getPreferredKeyring(keyringId);
    await syncPublicKeys({keyring, keyIds: signingKeyIds, keyringId});
    if (signerEmail) {
      for (const signingKeyId of signingKeyIds) {
        await acquireSigningKeys({signerEmail, keyring, lookupKey, keyId: signingKeyId});
      }
    }
    let {data, signatures} = await keyring.getPgpBackend().verify({armored, message, keyring, signingKeyIds});
    await updateKeyBinding(keyring, signerEmail, signatures);
    signatures = await Promise.all(signatures.map(sig => addSigningKeyDetails(sig, keyring)));
    return {data, signatures};
  } catch (e) {
    throw new MvError(l10n.get('verify_error', [e]), 'VERIFY_ERROR');
  }
}

export async function verifyDetachedSignature({plaintext, signerEmail, detachedSignature, keyringId, lookupKey}) {
  try {
    const keyring = getPreferredKeyring(keyringId);
    // determine issuer key id
    const signature = await readSignature({armoredSignature: detachedSignature});
    const [sigPacket] = signature.packets.filterByTag(enums.packet.signature);
    const {issuerKeyID} = sigPacket;
    // sync keys to preferred keyring
    await syncPublicKeys({keyring, keyIds: issuerKeyID, keyringId});
    // get keys for signer email address from preferred keyring
    const {signerKeys} = await acquireSigningKeys({signerEmail, keyring, lookupKey, keyId: issuerKeyID});
    const signerKeyFprs = signerKeys.map(signerKey => signerKey.getFingerprint());
    let {signatures} = await keyring.getPgpBackend().verify({plaintext, detachedSignature, keyring, signingKeyIds: signerKeyFprs});
    await updateKeyBinding(keyring, signerEmail, signatures);
    signatures = await Promise.all(signatures.map(sig => addSigningKeyDetails(sig, keyring)));
    return {signatures};
  } catch (e) {
    throw new MvError(l10n.get('verify_error', [e]), 'VERIFY_ERROR');
  }
}

async function acquireSigningKeys({signerEmail, keyring, lookupKey, keyId}) {
  let {[signerEmail]: signerKeys} = await keyring.getKeyByAddress(signerEmail, {keyId});
  if (signerKeys) {
    return {
      signerKeys,
      local: true
    };
  }
  // if no keys in local keyring, try key discovery mechanisms
  let rotation;
  if (keyId) {
    ({[signerEmail]: signerKeys} = await keyring.getKeyByAddress(signerEmail));
    if (signerKeys) {
      // potential key rotation event
      rotation = true;
    }
  }
  await lookupKey(rotation);
  ({[signerEmail]: signerKeys} = await keyring.getKeyByAddress(signerEmail, {keyId}));
  return {
    signerKeys: signerKeys || [],
    discovery: true
  };
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
    throw new MvError('No private key found', 'NO_PRIVATE_KEY_FOUND');
  }
  try {
    const result = await keyring.getPgpBackend().sign({data, keyring, unlockKey, signingKeyFpr});
    uiLog.push('security_log_editor', 'security_log_sign_operation', [signingKeyFpr.toUpperCase()], false);
    return result;
  } catch (e) {
    console.log('getPgpBackend().sign() error', e);
    throw new MvError(l10n.get('sign_error', [e]), 'SIGN_ERROR');
  }
}

export async function createPrivateKeyBackup(defaultKey, keyPwd = '') {
  // create backup code
  const backupCode = randomString(26);
  const text = `Version: 1\nPwd: ${keyPwd}\n`;
  let msg = await createMessage({text});
  // append key to message
  msg.packets = msg.packets.concat(defaultKey.toPacketList());
  // symmetrically encrypt with backup code
  msg = await symEncrypt(msg, backupCode);
  return {backupCode, message: msg.armor()};
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

export async function restorePrivateKeyBackup(armoredBlock, code) {
  let message = await pgpReadMessage({armoredMessage: armoredBlock});
  if (!(message.packets.length === 2 &&
        message.packets[0].constructor.tag === enums.packet.symEncryptedSessionKey && // Symmetric-Key Encrypted Session Key Packet
        message.packets[0].sessionKeyAlgorithm === enums.symmetric.aes256 &&
        (message.packets[0].sessionKeyEncryptionAlgorithm === null || message.packets[0].sessionKeyEncryptionAlgorithm === enums.symmetric.aes256) &&
        message.packets[1].constructor.tag === enums.packet.symEncryptedIntegrityProtectedData // Sym. Encrypted Integrity Protected Data Packet
  )) {
    throw new MvError('Illegal private key backup structure.');
  }
  try {
    message = await message.decrypt(null, [code], undefined, undefined, {...pgpConfig, additionalAllowedPackets: [SecretKeyPacket, UserIDPacket, SignaturePacket, SecretSubkeyPacket]});
  } catch (e) {
    throw new MvError('Could not decrypt message with this restore code', 'WRONG_RESTORE_CODE');
  }
  // extract password
  const metaInfo = await readToEnd(message.getText());
  const pwd = parseMetaInfo(metaInfo).Pwd;
  // remove literal data packet
  const keyPackets = await readToEnd(message.packets.stream, _ => _);
  const privKey =  new PrivateKey(keyPackets);
  return {key: privKey, password: pwd};
}

/**
 * @param  {openpgp.key.Key} key - key to decrypt and verify signature
 * @param  {openpgp.Message} message - sync packet
 * @return {Promise<Object,Error>}
 */
export async function decryptSyncMessage(key, message) {
  const msg = await pgpDecrypt({message, decryptionKeys: key, verificationKeys: key});
  // check signature
  const [sig] = msg.signatures;
  try {
    await sig.verified;
    await key.getSigningKey(sig.keyID);
  } catch (e) {
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
  const message = await createMessage({text: syncData});
  return pgpEncrypt({message, encryptionKeys: key, signingKeys: key});
}

function convertChangeLog(key, changeLog, syncData) {
  const fingerprint = key.getFingerprint();
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
export async function encryptFile({plainFile, keyringId, unlockKey, encryptionKeyFprs, signingKeyFpr, uiLogSource, armor, noCache}) {
  const keyring = getKeyringWithPrivKey(signingKeyFpr, keyringId, noCache);
  if (!keyring) {
    throw new MvError('No private key found', 'NO_PRIVATE_KEY_FOUND');
  }
  await syncPublicKeys({keyring, keyIds: encryptionKeyFprs, keyringId});
  try {
    const result = await keyring.getPgpBackend().encrypt({dataURL: plainFile.content, keyring, unlockKey, encryptionKeyFprs, signingKeyFpr, armor, filename: plainFile.name});
    await logEncryption(uiLogSource, keyring, encryptionKeyFprs);
    return result;
  } catch (error) {
    console.log('pgpmodel.encryptFile() error', error);
    throw new MvError(l10n.get('encrypt_error', [error.message]), 'NO_KEY_FOUND');
  }
}

/**
 * Decrypt File
 * @param  {Object} encryptedFile - {content, name} with contant as dataURL and name as filename
 * @param  {Function} unlockKey - callback to unlock key
 * @return {Object<name, content>} - content as JS binary string
 */
export async function decryptFile({encryptedFile, unlockKey, uiLogSource}) {
  let armoredMessage;
  let binaryMessage;
  try {
    const content = dataURL2str(encryptedFile.content);
    if (/^-----BEGIN PGP MESSAGE-----/.test(content)) {
      armoredMessage = content;
    } else {
      binaryMessage = str2Uint8Array(content);
    }
    const message = await readMessage({armoredMessage, binaryMessage});
    const encryptionKeyIds = message.getEncryptionKeyIDs();
    const keyring = getKeyringWithPrivKey(encryptionKeyIds);
    if (!keyring) {
      throw noKeyFoundError(encryptionKeyIds);
    }
    const result = await keyring.getPgpBackend().decrypt({base64: dataURL2base64(encryptedFile.content), message, keyring, unlockKey: options => unlockKey({message, ...options}), encryptionKeyIds, format: 'binary'});
    await logDecryption(uiLogSource, keyring, encryptionKeyIds);
    if (!result.filename) {
      result.filename = encryptedFile.name.slice(0, -4);
    }
    result.keyringId = keyring.id;
    return result;
  } catch (error) {
    console.log('pgpModel.decryptFile() error', error);
    throw error;
  }
}
