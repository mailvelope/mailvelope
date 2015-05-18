/**
 * Mailvelope - secure email with OpenPGP encryption for Webmail
 * Copyright (C) 2015  Thomas Oberndörfer
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License version 3
 * as published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

'use strict';

define(function(require, exports, module) {

  var keyring = require('../keyring');
  var sub = require('./sub.controller');

  function handleApiEvent(request, sender, sendResponse) {
    try {
      switch (request.event) {
        case 'get-keyring':
          var keyRing = keyring.getById(request.keyringId);
          if (keyRing) {
            var attr = keyRing.getAttributes();
            sendResponse({data: {revision: attr.logo_revision}});
          }
          break;
        case 'create-keyring':
          if (keyring.createKeyring(request.keyringId)) {
            sendResponse({data: {}});
          }
          break;
        case 'query-valid-key':
          var keyIdMap = keyring.getById(request.keyringId).getKeyIdByAddress(request.recipients, {validity: true});
          Object.keys(keyIdMap).forEach(function(email) {
            if (keyIdMap[email]) {
              keyIdMap[email] = {};
            }
          });
          sendResponse({error: null, data: keyIdMap});
          break;
        case 'export-own-pub-key':
          var keyIdMap = keyring.getById(request.keyringId).getKeyIdByAddress([request.emailAddr], {validity: true, pub: false, priv: true});
          if (!keyIdMap[request.emailAddr]) {
            sendResponse({error: {message: 'No key pair found for this email address.', code: 'NO_KEY_FOR_ADDRESS'}});
            return;
          }
          // only take first valid key
          if (keyIdMap[request.emailAddr].length > 1) {
            keyIdMap[request.emailAddr].length = 1;
          }
          var armored = keyring.getById(request.keyringId).getArmoredKeys(keyIdMap[request.emailAddr], {pub: true});
          sendResponse({error: null, data: armored[0].armoredPublic});
          break;
        case 'import-pub-key':
          sub.factory.get('importKeyDialog').importKey(request.keyringId, request.armored, function(err, status) {
            sendResponse({error: err, data: status});
          });
          return true;
        case 'set-logo':
          var attr = keyring.getById(request.keyringId).getAttributes();
          if (attr.logo_revision && attr.logo_revision > request.revision) {
            sendResponse({error: {message: 'New logo revision < existing revision.', code: 'REVISION_INVALID'}});
            return;
          }
          keyring.setKeyringAttr(request.keyringId, {logo_revision: request.revision, logo_data_url: request.dataURL});
          sendResponse({error: null, data: null});
          break;
        case 'has-private-key':
          var fingerprint = request.fingerprint.toLowerCase().replace(/\s/g, '');
          var key = keyring.getById(request.keyringId).keyring.privateKeys.getForId(fingerprint);

          sendResponse({error: null, data: (key ? true : false)});
          break;
        default:
          console.log('unknown event:', request);
      }
    } catch (err) {
      sendResponse({error: {message: err.message, code: err.code  || 'INTERNAL_ERROR'}});
    }
  }

  exports.handleApiEvent = handleApiEvent;

});
