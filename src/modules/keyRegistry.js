/**
 * Copyright (C) 2018 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import {isValidEncryptionKey, getLastModifiedDate} from './key';
import {readKey} from 'openpgp';
import * as mveloKeyServer from './mveloKeyServer';
import * as oks from './openpgpKeyServer';
import * as wkd from './wkdLocate';
import * as autocrypt from './autocryptWrapper';
/**
 * @fileOverview This file implements a registry for keys from different
 * sources.
 * It works as a bridge for automated lookup of keys from
 * the Mailvelope Key Server and Web Key Directories.
 * It also retrieves keys from the autocrypt Register.
 *
 * When looking up the key for an email address it will
 * also decide which key from the different sources seems best.
 *
 * Currently it will select the first key available when checking
 * * first Mailvelope Key Server
 * * then keys.openpgp.org
 * * then WKD
 * * and autocrypt last
 */

const sources = [mveloKeyServer, oks, wkd, autocrypt];

/**
 * Get a verified public key from external key sources by email address.
 *
 * This checks all key sources if they are enabled.
 * If none is enabled it will return fast.
 * So there is no need to check if the registry is enabled first.
 *
 * @param {Object<email, keyId, fingerprint>} query - Query object with one of the properties: email address, key ID or fingerprint
 * @param {String} identity - The id of the keyring that is currently being used.
 * @param {Boolean} latest - Query all sources and return the latest key
 * @param {Boolean} externalOnly - Only use external sources (excluding Autocrypt)
 * @return {Object<source, armored, lastSeen, fingerprint, lastModified>, undefined}
 */
export async function lookup({query, identity, latest, externalOnly}) {
  const result = [];
  for (const source of sources.filter(source => externalOnly ? source !== autocrypt : true)) {
    let key;
    try {
      key = await lookupKey({source, query, identity});
    } catch (e) {
      // Failures are not critical so we only info log them.
      console.log(`${source.name}: Did not find key (Errors are expected): ${e}`);
    }
    if (!key) {
      continue;
    }
    if (latest) {
      result.push(key);
    } else {
      return key;
    }
  }
  if (!result.length) {
    return;
  }
  // sort by latest key last
  result.sort((a, b) => new Date(a.lastModified) - new Date(b.lastModified));
  return result.pop();
}

async function lookupKey({source, query, identity}) {
  if (!source.isEnabled()) {
    return;
  }
  const result = await source.lookup(query, identity);
  if (!result) {
    return;
  }
  let key;
  try {
    key = await readKey({armoredKey: result.armored});
  } catch (e) {
    console.log('Failed parsing key from key source', e);
    return;
  }
  const valid = await isValidEncryptionKey(key);
  if (!valid) {
    return;
  }
  const fingerprint = key.getFingerprint();
  const lastModified = getLastModifiedDate(key).toISOString();
  return {
    source: source.name,
    armored: result.armored,
    lastSeen: result.date,
    fingerprint,
    lastModified
  };
}

export function getSourceLabels({externalOnly}) {
  const result = [];
  for (const source of sources.filter(source => externalOnly ? source !== autocrypt : true)) {
    if (!source.isEnabled()) {
      continue;
    }
    result.push({name: source.name, label: source.label, url: source.DEFAULT_URL});
  }
  return result;
}
