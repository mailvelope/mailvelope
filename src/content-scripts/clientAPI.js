/**
 * Copyright (C) 2014-2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

'use strict';

import mvelo from '../mvelo';
import $ from 'jquery';
import {prefs, host, getMessageType} from './main';
import DecryptContainer from './decryptContainer';
import EditorContainer from './editorContainer';
import OptionsContainer from './optionsContainer';
import KeyGenContainer from './keyGenContainer';
import KeyBackupContainer from './keyBackupContainer';
import RestoreBackupContainer from './restoreBackupContainer';
import SyncHandler from './syncHandler';

const containers = new Map();

export let active = false;
// must be a singelton
let syncHandler = null;

export function init() {
  var apiTag = document.getElementById('mailvelope-api');
  if (apiTag) {
    if (apiTag.dataset.version !== prefs.version) {
      window.setTimeout(function() {
        window.dispatchEvent(new CustomEvent('mailvelope-disconnect', { detail: {version: prefs.version} }));
      }, 1);
    }
    return;
  }
  window.addEventListener('message', eventListener);
  if (!window.mailvelope) {
    $('<script/>', {
      id: 'mailvelope-api',
      src: mvelo.extension.getURL('client-API/mailvelope-client-api.js'),
      'data-version': prefs.version
    }).appendTo($('head'));
  }
}

export function postMessage(eventName, id, data, error) {
  window.postMessage({
    event: eventName,
    mvelo_extension: true,
    id: id,
    data: data,
    error: error
  }, window.location.origin);
}

function reply(id, error, data) {
  if (error) {
    error = { message: error.message || error, code: error.code  || 'INTERNAL_ERROR' };
  }
  postMessage('callback-reply', id, data, error);
}

const dataTypes = {
  identifier: 'string',
  selector: 'string',
  armored: 'string',
  options: 'object',
  recipients: 'array',
  emailAddr: 'string',
  dataURL: 'string',
  revision: 'number',
  fingerprint: 'string',
  syncHandlerObj: 'object',
  editorId: 'string',
  generatorId: 'string',
  popupId: 'string',
  syncHandlerId: 'string',
  syncType: 'string',
  syncData: 'object',
  error: 'object',
  restoreId: 'string',
  restoreBackup: 'string',
  id: 'string',
  confirmRequired: 'boolean'
};

const optionsTypes = {
  showExternalContent: 'boolean',
  quota: 'number',
  predefinedText: 'string',
  quotedMail: 'string',
  signMsg: 'boolean',
  quotedMailIndent: 'boolean',
  quotedMailHeader: 'string',
  userIds: 'array',
  keySize: 'number',
  initialSetup: 'boolean',
  senderAddress: 'string',
  restorePassword: 'boolean',
  email: 'string',
  fullName: 'string',
  keepAttachments: 'boolean',
  armoredDraft: 'string'
};

function checkTypes(data) {
  var error;
  if (data.id && typeof data.id !== 'string') {
    error = new Error('Type mismatch: data.id should be of type string.');
    error.code = 'TYPE_MISMATCH';
    throw error;
  }
  if (!data.data) {
    return;
  }
  enforceTypeWhitelist(data.data, dataTypes);
  if (data.data.options && typeof data.data.options === 'object') {
    enforceTypeWhitelist(data.data.options, optionsTypes);
  }
}

function enforceTypeWhitelist(data, whitelist) {
  var error;
  var parameters = Object.keys(data) || [];
  for (var i = 0; i < parameters.length; i++) {
    var parameter = parameters[i];
    var dataType = whitelist[parameter];
    var value = data[parameter];
    if (dataType === undefined) {
      console.log('Mailvelope client-API type checker: parameter ' + parameter + ' not accepted.');
      delete data[parameter];
      continue;
    }
    if (value === undefined || value === null) {
      continue;
    }
    var wrong = false;
    switch (dataType) {
      case 'array':
        if (!Array.isArray(value)) {
          wrong = true;
        }
        break;
      default:
        if (typeof value !== dataType) {
          wrong = true;
        }
    }
    if (wrong) {
      error = new Error('Type mismatch: ' + parameter + ' should be of type ' + dataType + '.');
      error.code = 'TYPE_MISMATCH';
      throw error;
    }
  }
}

function eventListener(event) {
  if (event.origin !== window.location.origin ||
      event.data.mvelo_extension ||
      !event.data.mvelo_client) {
    return;
  }
  //console.log('clientAPI eventListener', event.data.event);
  try {
    checkTypes(event.data);
    var data = event.data.data;
    var keyringId = null;
    if (data && data.identifier) {
      if (data.identifier.indexOf(mvelo.KEYRING_DELIMITER) !== -1) {
        throw {message: 'Identifier invalid.', code: 'INVALID_IDENTIFIER'};
      }
      keyringId = host + mvelo.KEYRING_DELIMITER + data.identifier;
    }
    switch (event.data.event) {
      case 'get-version':
        reply(event.data.id, null, prefs.version);
        break;
      case 'get-keyring':
        getKeyring(keyringId, reply.bind(null, event.data.id));
        break;
      case 'create-keyring':
        if (!data.identifier) {
          throw {message: 'Identifier invalid.', code: 'INVALID_IDENTIFIER'};
        }
        createKeyring(keyringId, reply.bind(null, event.data.id));
        break;
      case 'display-container':
        displayContainer(data.selector, data.armored, keyringId, data.options, reply.bind(null, event.data.id));
        break;
      case 'editor-container':
        editorContainer(data.selector, keyringId, data.options, reply.bind(null, event.data.id));
        break;
      case 'settings-container':
        settingsContainer(data.selector, keyringId, data.options, reply.bind(null, event.data.id));
        break;
      case 'open-settings':
        openSettings(keyringId, reply.bind(null, event.data.id));
        break;
      case 'key-gen-container':
        keyGenContainer(data.selector, keyringId, data.options, reply.bind(null, event.data.id));
        break;
      case 'key-backup-container':
        keyBackupContainer(data.selector, keyringId, data.options, reply.bind(null, event.data.id));
        break;
      case 'restore-backup-container':
        restoreBackupContainer(data.selector, keyringId, data.options, reply.bind(null, event.data.id));
        break;
      case 'restore-backup-isready':
        restoreBackupIsReady(data.restoreId, reply.bind(null, event.data.id));
        break;
      case 'keybackup-popup-isready':
        keyBackupPopupIsReady(data.popupId, reply.bind(null, event.data.id));
        break;
      case 'generator-generate':
        generatorGenerate(data.generatorId, data.confirmRequired, reply.bind(null, event.data.id));
        break;
      case 'generator-generate-confirm':
        generatorConfirm(data.generatorId);
        break;
      case 'generator-generate-reject':
        generatorReject(data.generatorId);
        break;
      case 'has-private-key':
        hasPrivateKey(keyringId, data.fingerprint, reply.bind(null, event.data.id));
        break;
      case 'editor-encrypt':
        editorEncrypt(data.editorId, data.recipients, reply.bind(null, event.data.id));
        break;
      case 'editor-create-draft':
        editorCreateDraft(data.editorId, reply.bind(null, event.data.id));
        break;
      case 'query-valid-key':
        validKeyForAddress(keyringId, data.recipients, reply.bind(null, event.data.id));
        break;
      case 'export-own-pub-key':
        exportOwnPublicKey(keyringId, data.emailAddr, reply.bind(null, event.data.id));
        break;
      case 'import-pub-key':
        importPublicKey(keyringId, data.armored, reply.bind(null, event.data.id));
        break;
      case 'set-logo':
        setLogo(keyringId, data.dataURL, data.revision, reply.bind(null, event.data.id));
        break;
      case 'add-sync-handler':
        addSyncHandler(keyringId, reply.bind(null, event.data.id));
        break;
      case 'sync-handler-done':
        syncHandlerDone(data);
        break;
      default:
        console.log('clientAPI unknown event', event.data.event);
    }
  } catch (err) {
    reply(event.data.id, err);
  }
}

function getKeyring(keyringId, callback) {
  mvelo.extension.sendMessage({
    event: 'get-keyring',
    api_event: true,
    keyringId: keyringId
  }, function(result) {
    callback(result.error, result.data);
  });
}

function createKeyring(keyringId, callback) {
  mvelo.extension.sendMessage({
    event: 'create-keyring',
    api_event: true,
    keyringId: keyringId
  }, function(result) {
    callback(result.error, result.data);
  });
}

function displayContainer(selector, armored, keyringId, options, callback) {
  var container, error;
  switch (getMessageType(armored)) {
    case mvelo.PGP_MESSAGE:
      container = new DecryptContainer(selector, keyringId, options);
      break;
    case mvelo.PGP_SIGNATURE:
      error = new Error('PGP signatures not supported.');
      error.code = 'WRONG_ARMORED_TYPE';
      throw error;
    case mvelo.PGP_PUBLIC_KEY:
      error = new Error('PGP keys not supported.');
      error.code = 'WRONG_ARMORED_TYPE';
      throw error;
    default:
      error = new Error('No valid armored block found.');
      error.code = 'WRONG_ARMORED_TYPE';
      throw error;
  }
  container.create(armored, callback);
}

function editorContainer(selector, keyringId, options = {}, callback) {
  if (options.quotedMailIndent === undefined && !options.armoredDraft) {
    options.quotedMailIndent = true;
  }
  if (options.quota) {
    // kilobyte -> byte
    options.quota = parseInt(options.quota) * 1024;
  }
  var container = new EditorContainer(selector, keyringId, options);
  containers.set(container.id, container);
  container.create(callback);
}

function settingsContainer(selector, keyringId, options, callback) {
  var container = new OptionsContainer(selector, keyringId, options);
  containers.set(container.id, container);
  container.create(callback);
}

function openSettings(keyringId, callback) {
  mvelo.extension.sendMessage({
    event: 'open-settings',
    api_event: true,
    keyringId: keyringId
  }, function(result) {
    callback(result.error, result.data);
  });
}

function keyGenContainer(selector, keyringId, options = {}, callback) {
  options.keySize = options.keySize || 2048;
  var container = new KeyGenContainer(selector, keyringId, options);
  containers.set(container.id, container);
  container.create(callback);
}

function keyBackupContainer(selector, keyringId, options = {}, callback) {
  var container = new KeyBackupContainer(selector, keyringId, options);
  containers.set(container.id, container);
  container.create(callback);
}

function restoreBackupContainer(selector, keyringId, options = {}, callback) {
  var container = new RestoreBackupContainer(selector, keyringId, options);
  containers.set(container.id, container);
  container.create(callback);
}

function restoreBackupIsReady(restoreId, callback) {
  containers.get(restoreId).restoreBackupReady(callback);
}

function keyBackupPopupIsReady(popupId, callback) {
  containers.get(popupId).keyBackupDone(callback);
}

function generatorGenerate(generatorId, confirmRequired, callback) {
  containers.get(generatorId).generate(confirmRequired, callback);
}

function generatorConfirm(generatorId) {
  containers.get(generatorId).confirm();
}

function generatorReject(generatorId) {
  containers.get(generatorId).reject();
}

function hasPrivateKey(keyringId, fingerprint, callback) {
  mvelo.extension.sendMessage({
    event: 'has-private-key',
    api_event: true,
    keyringId: keyringId,
    fingerprint: fingerprint
  }, function(result) {
    callback(result.error, result.data);
  });
}

function editorEncrypt(editorId, recipients, callback) {
  containers.get(editorId).encrypt(recipients, callback);
}

function editorCreateDraft(editorId, callback) {
  containers.get(editorId).createDraft(callback);
}

function validKeyForAddress(keyringId, recipients, callback) {
  mvelo.extension.sendMessage({
    event: 'query-valid-key',
    api_event: true,
    keyringId: keyringId,
    recipients: recipients
  }, function(result) {
    callback(result.error, result.data);
  });
}

function exportOwnPublicKey(keyringId, emailAddr, callback) {
  mvelo.extension.sendMessage({
    event: 'export-own-pub-key',
    api_event: true,
    keyringId: keyringId,
    emailAddr: emailAddr
  }, function(result) {
    callback(result.error, result.data);
  });
}

function importPublicKey(keyringId, armored, callback) {
  var error;
  switch (getMessageType(armored)) {
    case mvelo.PGP_PUBLIC_KEY:
      // ok
      break;
    case mvelo.PGP_PRIVATE_KEY:
      error = new Error('No import of private PGP keys allowed.');
      error.code = 'WRONG_ARMORED_TYPE';
      throw error;
    default:
      error = new Error('No valid armored block found.');
      error.code = 'WRONG_ARMORED_TYPE';
      throw error;
  }
  mvelo.extension.sendMessage({
    event: 'import-pub-key',
    api_event: true,
    keyringId: keyringId,
    armored: armored
  }, function(result) {
    callback(result.error, result.data);
  });
}

function setLogo(keyringId, dataURL, revision, callback) {
  var error;
  if (!/^data:image\/png;base64,/.test(dataURL)) {
    error = new Error('Data URL must start with "data:image/png;base64,".');
    error.code = 'LOGO_INVALID';
    throw error;
  }
  if (dataURL.length > 15 * 1024) {
    error = new Error('Data URL string size exceeds 15KB limit.');
    error.code = 'LOGO_INVALID';
    throw error;
  }
  mvelo.extension.sendMessage({
    event: 'set-logo',
    api_event: true,
    keyringId: keyringId,
    dataURL: dataURL,
    revision: revision
  }, function(result) {
    callback(result.error, result.data);
  });
}

function addSyncHandler(keyringId, callback) {
  syncHandler = syncHandler || new SyncHandler(keyringId);
  containers.set(syncHandler.id, syncHandler);

  callback(null, syncHandler.id);
}

function syncHandlerDone(data) {
  var container = containers.get(data.syncHandlerId);

  container.syncDone(data);
}
