/**
 * Copyright (C) 2014-2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import $ from 'jquery';
import {PGP_MESSAGE, PGP_SIGNATURE, PGP_PUBLIC_KEY, PGP_PRIVATE_KEY, KEYRING_DELIMITER} from '../lib/constants';
import {MvError} from '../lib/util';
import {prefs, host, getMessageType} from './main';
import {checkTypes} from './clientAPITypeCheck';
import DecryptContainer from './decryptContainer';
import EditorContainer from './editorContainer';
import EncryptedFormContainer from './encryptedFormContainer';
import AppContainer from './appContainer';
import KeyGenContainer from './keyGenContainer';
import KeyBackupContainer from './keyBackupContainer';
import RestoreBackupContainer from './restoreBackupContainer';
import SyncHandler from './syncHandler';

const containers = new Map();

// must be a singelton
let syncHandler = null;

export function init() {
  const apiTag = document.getElementById('mailvelope-api');
  if (apiTag) {
    if (apiTag.dataset.version !== prefs.version) {
      window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent('mailvelope-disconnect', {detail: {version: prefs.version}}));
      }, 1);
    }
    return;
  }
  window.addEventListener('message', eventListener);
  if (!window.mailvelope) {
    $('<script/>', {
      id: 'mailvelope-api',
      src: chrome.runtime.getURL('client-API/mailvelope-client-api.js'),
      'data-version': prefs.version
    }).appendTo($('head'));
  }
}

export function postMessage(eventName, id, data, error) {
  window.postMessage({
    event: eventName,
    mvelo_extension: true,
    id,
    data,
    error
  }, window.location.origin);
}

function reply(id, error, data) {
  if (error) {
    error = {message: error.message || error, code: error.code  || 'INTERNAL_ERROR'};
  }
  postMessage('callback-reply', id, data, error);
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
    const data = event.data.data;
    let keyringId = null;
    if (data && data.identifier) {
      if (data.identifier.indexOf(KEYRING_DELIMITER) !== -1) {
        throw {message: 'Identifier invalid.', code: 'INVALID_IDENTIFIER'};
      }
      keyringId = host + KEYRING_DELIMITER + data.identifier;
    }
    switch (event.data.event) {
      case 'get-version': {
        const [version] = prefs.version.match(/^\d{1,2}\.\d{1,2}\.\d{1,2}/);
        reply(event.data.id, null, version);
        break;
      }
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
      case 'encrypted-form-container':
        encryptedFormContainer(data.selector, data.formHtml, data.signature, reply.bind(null, event.data.id));
        break;
      default:
        console.log('clientAPI unknown event', event.data.event);
    }
  } catch (err) {
    reply(event.data.id, err);
  }
}

function getKeyring(keyringId, callback) {
  chrome.runtime.sendMessage({
    event: 'get-keyring',
    api_event: true,
    keyringId
  }, result => {
    callback(result.error, result.data);
  });
}

function createKeyring(keyringId, callback) {
  chrome.runtime.sendMessage({
    event: 'create-keyring',
    api_event: true,
    keyringId
  }, result => {
    callback(result.error, result.data);
  });
}

function displayContainer(selector, armored, keyringId, options = {}, callback) {
  let container;
  switch (getMessageType(armored)) {
    case PGP_MESSAGE:
      container = new DecryptContainer(selector, keyringId, options);
      break;
    case PGP_SIGNATURE:
      throw new MvError('PGP signatures not supported.', 'WRONG_ARMORED_TYPE');
    case PGP_PUBLIC_KEY:
      throw new MvError('PGP keys not supported.', 'WRONG_ARMORED_TYPE');
    default:
      throw new MvError('No valid armored block found.', 'WRONG_ARMORED_TYPE');
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
  const container = new EditorContainer(selector, keyringId, options);
  containers.set(container.id, container);
  container.create(callback);
}

function settingsContainer(selector, keyringId, options = {}, callback) {
  chrome.runtime.sendMessage({
    event: 'has-private-key',
    api_event: true,
    keyringId
  }, result => {
    options.hasPrivateKey = result.data;
    const container = new AppContainer(selector, keyringId, options);
    containers.set(container.id, container);
    container.create(callback);
  });
}

function openSettings(keyringId, callback) {
  chrome.runtime.sendMessage({
    event: 'open-settings',
    api_event: true,
    keyringId
  }, result => {
    callback(result.error, result.data);
  });
}

function keyGenContainer(selector, keyringId, options = {}, callback) {
  options.keySize = options.keySize || 2048;
  const container = new KeyGenContainer(selector, keyringId, options);
  containers.set(container.id, container);
  container.create(callback);
}

function keyBackupContainer(selector, keyringId, options = {}, callback) {
  const container = new KeyBackupContainer(selector, keyringId, options);
  containers.set(container.id, container);
  container.create(callback);
}

function restoreBackupContainer(selector, keyringId, options = {}, callback) {
  const container = new RestoreBackupContainer(selector, keyringId, options);
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
  chrome.runtime.sendMessage({
    event: 'has-private-key',
    api_event: true,
    keyringId,
    fingerprint
  }, result => {
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
  chrome.runtime.sendMessage({
    event: 'query-valid-key',
    api_event: true,
    keyringId,
    recipients
  }, result => {
    callback(result.error, result.data);
  });
}

function exportOwnPublicKey(keyringId, emailAddr, callback) {
  chrome.runtime.sendMessage({
    event: 'export-own-pub-key',
    api_event: true,
    keyringId,
    emailAddr
  }, result => {
    callback(result.error, result.data);
  });
}

function importPublicKey(keyringId, armored, callback) {
  switch (getMessageType(armored)) {
    case PGP_PUBLIC_KEY:
      // ok
      break;
    case PGP_PRIVATE_KEY:
      throw new MvError('No import of private PGP keys allowed.', 'WRONG_ARMORED_TYPE');
    default:
      throw new MvError('No valid armored block found.', 'WRONG_ARMORED_TYPE');
  }
  chrome.runtime.sendMessage({
    event: 'import-pub-key',
    api_event: true,
    keyringId,
    armored
  }, result => {
    callback(result.error, result.data);
  });
}

function setLogo(keyringId, dataURL, revision, callback) {
  if (!/^data:image\/png;base64,/.test(dataURL)) {
    throw new MvError('Data URL must start with "data:image/png;base64,".', 'LOGO_INVALID');
  }
  if (dataURL.length > 15 * 1024) {
    throw new MvError('Data URL string size exceeds 15KB limit.', 'LOGO_INVALID');
  }
  chrome.runtime.sendMessage({
    event: 'set-logo',
    api_event: true,
    keyringId,
    dataURL,
    revision
  }, result => {
    callback(result.error, result.data);
  });
}

function addSyncHandler(keyringId, callback) {
  syncHandler = syncHandler || new SyncHandler(keyringId);
  containers.set(syncHandler.id, syncHandler);

  callback(null, syncHandler.id);
}

function syncHandlerDone(data) {
  const container = containers.get(data.syncHandlerId);

  container.syncDone(data);
}

function encryptedFormContainer(selector, formHtml, signature, callback) {
  const container = new EncryptedFormContainer(selector, formHtml, signature);
  containers.set(container.id, container);
  container.create(callback);
}
