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
          if (keyring.getById(request.keyringId)) {
            sendResponse({data: true});
          }
          break;
        case 'create-keyring':
          if (keyring.createKeyring(request.keyringId)) {
            sendResponse({data: true});
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
        default:
          console.log('unknown event:', request);
      }
    } catch (err) {
      sendResponse({error: {message: err.message, code: err.code  || 'INTERNAL_ERROR'}});
    }
  }

  exports.handleApiEvent = handleApiEvent;

});
