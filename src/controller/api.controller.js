/**
 * Copyright (C) 2015-2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from '../lib/lib-mvelo';
import {getById as keyringById, createKeyring, setKeyringAttr, getKeyByAddress} from '../modules/keyring';
import * as sub from './sub.controller';
import * as openpgp from 'openpgp';
import {getLastModifiedDate, mapAddressKeyMapToFpr} from '../modules/key';
import * as ac from '../modules/autocryptWrapper';
import * as keyRegistry from '../modules/keyRegistry';

export function handleApiEvent(request, sender, sendResponse) {
  let keyring;
  let attr;
  try {
    switch (request.event) {
      case 'get-keyring':
        keyring = keyringById(request.keyringId);
        if (keyring) {
          attr = keyring.getAttributes();
          sendResponse({data: {revision: attr.logo_revision}});
          sub.setActiveKeyringId(request.keyringId);
        }
        break;
      case 'create-keyring':
        createKeyring(request.keyringId)
        .then(keyring => keyring.sync.activate())
        .then(() => {
          sendResponse({data: {}});
          sub.setActiveKeyringId(request.keyringId);
        })
        .catch(err => sendResponse({error: mvelo.util.mapError(err)}));
        return true;
      case 'query-valid-key':
        getKeyByAddress(request.keyringId, request.recipients)
        .then(keyMap => {
          Object.keys(keyMap).forEach(email => {
            if (keyMap[email]) {
              keyMap[email] = {
                keys: keyMap[email].map(key => ({
                  fingerprint: key.primaryKey.getFingerprint(),
                  lastModified: getLastModifiedDate(key).toISOString()
                }))
              };
            }
          });
          sendResponse({error: null, data: keyMap});
        });
        return true;
      case 'export-own-pub-key':
        keyringById(request.keyringId).getKeyByAddress(request.emailAddr, {pub: false, priv: true, sort: true})
        .then(keyMap => {
          const keyFprMap = mapAddressKeyMapToFpr(keyMap);
          const pubKeyFprs = keyFprMap[request.emailAddr];
          if (!pubKeyFprs) {
            sendResponse({error: {message: 'No key pair found for this email address.', code: 'NO_KEY_FOR_ADDRESS'}});
            return;
          }
          // only take first valid key
          const pubKeyFpr = pubKeyFprs[0];
          const armored = keyringById(request.keyringId).getArmoredKeys(pubKeyFpr, {pub: true});
          sendResponse({error: null, data: armored[0].armoredPublic});
        });
        return true;
      case 'import-pub-key':
        sub.factory.get('importKeyDialog').importKey(request.keyringId, request.armored)
        .then(status => sendResponse({data: status}))
        .catch(err => sendResponse({error: mvelo.util.mapError(err)}));
        return true;
      case 'locate-pub-key':
        keyRegistry.locate(request.emailAddr, request.keyringId, request.source)
        .then(key => sendResponse({error: null, data: key}))
        .catch(err => sendResponse({error: mvelo.util.mapError(err), data: 'error'}));
        return true;
      case 'process-autocrypt-header':
        ac.processHeader(request.headers, request.keyringId)
        .catch(err => sendResponse({error: mvelo.util.mapError(err)}));
        return true;
      case 'set-logo':
        attr = keyringById(request.keyringId).getAttributes();
        if (attr.logo_revision && attr.logo_revision > request.revision) {
          sendResponse({error: {message: 'New logo revision < existing revision.', code: 'REVISION_INVALID'}});
          return;
        }
        setKeyringAttr(request.keyringId, {logo_revision: request.revision, logo_data_url: request.dataURL})
        .then(() => {
          sendResponse({error: null, data: null});
        })
        .catch(err => sendResponse({error: mvelo.util.mapError(err)}));
        return true;
      case 'has-private-key':
        if (request.fingerprint) {
          const fingerprint = request.fingerprint.toLowerCase().replace(/\s/g, '');
          const key = keyringById(request.keyringId).keystore.privateKeys.getForId(fingerprint);
          if (!key) {
            return sendResponse({error: null, data: false});
          }
          key.verifyPrimaryKey()
          .then(status => sendResponse({error: null, data: status === openpgp.enums.keyStatus.valid}));
          return true;
        } else {
          const hasPrivateKey = keyringById(request.keyringId).hasPrivateKey();
          sendResponse({error: null, data: hasPrivateKey});
        }
        break;
      case 'open-settings': {
        request.keyringId = request.keyringId || mvelo.MAIN_KEYRING_ID;
        const hash = `?krid=${encodeURIComponent(request.keyringId)}#/settings`;
        mvelo.tabs.loadAppTab(hash);
        sendResponse({error: null, data: null});
        break;
      }
      default:
        console.log('unknown event:', request);
    }
  } catch (err) {
    sendResponse({error: mvelo.util.mapError(err)});
  }
}
