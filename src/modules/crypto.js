/**
 * Copyright (C) 2015-2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import * as openpgp from 'openpgp';

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
 * @return {openpgp.message.Message} new message with encrypted content
 */
export function symEncrypt(msg, passphrase) {
  if (!passphrase) {
    throw new Error('The passphrase cannot be empty!');
  }

  const algo = openpgp.enums.read(openpgp.enums.symmetric, openpgp.enums.symmetric.aes256);
  const packetlist = new openpgp.packet.List();

  // create a Symmetric-key Encrypted Session Key (ESK)
  const symESKPacket = new openpgp.packet.SymEncryptedSessionKey();
  symESKPacket.sessionKeyAlgorithm = algo;
  symESKPacket.decrypt(passphrase); // generate the session key
  packetlist.push(symESKPacket);

  // create integrity protected packet
  const symEncryptedPacket = new openpgp.packet.SymEncryptedIntegrityProtected();
  symEncryptedPacket.packets = msg.packets;
  symEncryptedPacket.encrypt(algo, symESKPacket.sessionKey);
  packetlist.push(symEncryptedPacket);

  // remove packets after encryption
  symEncryptedPacket.packets = new openpgp.packet.List();
  return new openpgp.message.Message(packetlist);
}
