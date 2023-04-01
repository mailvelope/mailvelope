/**
 * Copyright (C) 2015-2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import {SymEncryptedSessionKeyPacket, PacketList, SymEncryptedIntegrityProtectedDataPacket, Message, enums} from 'openpgp';

export function randomString(length) {
  let result = '';
  const base = 32;
  const buf = new Uint8Array(length);
  window.crypto.getRandomValues(buf);
  for (let i = 0; i < buf.length; i++) {
    result += (buf[i] % base).toString(base);
  }
  return result;
}

/**
 * Encrypt the message symmetrically using a passphrase.
 *   https://tools.ietf.org/html/rfc4880#section-3.7.2.2
 * Copyright (C) 2015 Tankred Hase
 * @param {String} passphrase
 * @return {openpgp.Message} new message with encrypted content
 */
export async function symEncrypt(msg, passphrase) {
  if (!passphrase) {
    throw new Error('The passphrase cannot be empty!');
  }
  const sessionKeyAlgorithm = enums.symmetric.aes256;
  const packetlist = new PacketList();
  // create a Symmetric-key Encrypted Session Key (ESK)
  const symESKPacket = new SymEncryptedSessionKeyPacket();
  symESKPacket.version = 4;
  symESKPacket.sessionKeyAlgorithm = sessionKeyAlgorithm;
  // call encrypt one time to init S2K
  await symESKPacket.encrypt('123456');
  symESKPacket.sessionKey = null;
  symESKPacket.encrypted = null;
  // call decrypt to generate the session key
  await symESKPacket.decrypt(passphrase);
  packetlist.push(symESKPacket);
  // create integrity protected packet
  const symEncryptedPacket = new SymEncryptedIntegrityProtectedDataPacket();
  symEncryptedPacket.packets = msg.packets;
  await symEncryptedPacket.encrypt(sessionKeyAlgorithm, symESKPacket.sessionKey);
  packetlist.push(symEncryptedPacket);
  // remove packets after encryption
  symEncryptedPacket.packets = new PacketList();
  return new Message(packetlist);
}

/**
 * Return a secure random number in the specified range
 * @param {Number} from - min of the random number
 * @param {Number} to - max of the random number (max 32bit)
 * @return {Number} - a secure random number
 */
export function getSecureRandom(from, to) {
  let randUint = getSecureRandomUint();
  const bits = ((to - from)).toString(2).length;
  while ((randUint & (Math.pow(2, bits) - 1)) > (to - from)) {
    randUint = getSecureRandomUint();
  }
  return from + (Math.abs(randUint & (Math.pow(2, bits) - 1)));
}

function getSecureRandomUint() {
  const buf = new Uint8Array(4);
  const dv = new DataView(buf.buffer);
  window.crypto.getRandomValues(buf);
  return dv.getUint32(0);
}
